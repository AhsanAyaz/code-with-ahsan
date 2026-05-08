import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/ambassador/adminAuth";

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * POST /api/raffle/spin
 *
 * Body shapes (all admin-gated):
 *   { action: "spin", title: string }
 *     → Writes state "spinning" with title, picks random winner, returns { winnerName, docId }
 *   { action: "confirm", winnerName: string, docId: string }
 *     → Writes state "winner" (preserves existing title), marks winner doc won:true (email preserved)
 *   { action: "reset" }
 *     → Writes state "idle" (preserves existing title), winnerName null
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action } = body;
  const today = getTodayUTC();
  const stateRef = db.collection("raffle-state").doc("current");

  // ── SPIN ──────────────────────────────────────────────────────────────────
  if (action === "spin") {
    const snap = await db
      .collection("raffle-entries")
      .where("date", "==", today)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { error: "No entries for today" },
        { status: 400 },
      );
    }

    // Exclude already-won entries so the same person can't win twice
    const entries = snap.docs.filter((d) => !d.data().won);
    if (entries.length === 0) {
      return NextResponse.json(
        { error: "All entries have already won today" },
        { status: 400 },
      );
    }

    const winner = entries[Math.floor(Math.random() * entries.length)];
    const winnerData = winner.data();

    const spinTitle = (typeof body.title === "string" && body.title.trim()) ? body.title.trim() : "Raffle";

    // Write "spinning" state so all public viewers see the animation
    await stateRef.set({
      state: "spinning",
      winnerName: winnerData.name as string,
      date: today,
      updatedAt: FieldValue.serverTimestamp(),
      title: spinTitle,
    });

    return NextResponse.json({
      winnerName: winnerData.name as string,
      docId: winner.id,
    });
  }

  // ── CONFIRM ───────────────────────────────────────────────────────────────
  if (action === "confirm") {
    const { winnerName, docId } = body;
    if (typeof winnerName !== "string" || typeof docId !== "string") {
      return NextResponse.json(
        { error: "winnerName and docId are required for confirm" },
        { status: 400 },
      );
    }

    // Preserve existing title from raffle-state/current
    const existing = await stateRef.get();
    const existingTitle = (existing.exists && (existing.data()?.title as string | undefined)) ?? "Raffle";

    // Write "winner" state — all viewers see the winner reveal
    await stateRef.set({
      state: "winner",
      winnerName,
      date: today,
      updatedAt: FieldValue.serverTimestamp(),
      title: existingTitle,
    });

    // Mark winner so they're excluded from future spins — email is kept
    try {
      await db.collection("raffle-entries").doc(docId).update({
        won: true,
        wonAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      // Non-fatal: log and continue — winner is already shown
      console.error("[raffle/spin] Failed to mark winner doc:", err);
    }

    return NextResponse.json({ ok: true });
  }

  // ── RESET ─────────────────────────────────────────────────────────────────
  if (action === "reset") {
    // Preserve existing title so admin can spin again with same event branding
    const existing = await stateRef.get();
    const existingTitle = (existing.exists && (existing.data()?.title as string | undefined)) ?? "Raffle";

    await stateRef.set({
      state: "idle",
      winnerName: null,
      date: today,
      updatedAt: FieldValue.serverTimestamp(),
      title: existingTitle,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "Invalid action. Use spin | confirm | reset" },
    { status: 400 },
  );
}
