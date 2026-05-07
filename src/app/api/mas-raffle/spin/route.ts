import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/ambassador/adminAuth";

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * POST /api/mas-raffle/spin
 *
 * Body shapes (all admin-gated):
 *   { action: "spin" }
 *     → Writes state "spinning", picks random winner, returns { winnerName, docId }
 *   { action: "confirm", winnerName: string, docId: string }
 *     → Writes state "winner", marks winner doc won:true (email preserved)
 *   { action: "reset" }
 *     → Writes state "idle", winnerName null
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
  const stateRef = db.collection("mas-raffle-state").doc("current");

  // ── SPIN ──────────────────────────────────────────────────────────────────
  if (action === "spin") {
    const snap = await db
      .collection("mas-raffle-emails")
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

    // Write "spinning" state so all public viewers see the animation
    await stateRef.set({
      state: "spinning",
      winnerName: winnerData.name as string,
      date: today,
      updatedAt: FieldValue.serverTimestamp(),
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

    // Write "winner" state — all viewers see the winner reveal
    await stateRef.set({
      state: "winner",
      winnerName,
      date: today,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Mark winner so they're excluded from future spins — email is kept
    try {
      await db.collection("mas-raffle-emails").doc(docId).update({
        won: true,
        wonAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      // Non-fatal: log and continue — winner is already shown
      console.error("[mas-raffle/spin] Failed to mark winner doc:", err);
    }

    return NextResponse.json({ ok: true });
  }

  // ── RESET ─────────────────────────────────────────────────────────────────
  if (action === "reset") {
    await stateRef.set({
      state: "idle",
      winnerName: null,
      date: today,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "Invalid action. Use spin | confirm | reset" },
    { status: 400 },
  );
}
