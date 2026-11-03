/**
 * Phase 4 (REPORT-06): Admin-only strike increment for an ambassador.
 *   POST /api/ambassador/members/[uid]/strike
 *
 * Atomic: uses FieldValue.increment(1). Returns the post-increment count.
 * Does NOT touch roles, Discord state, or any audit collection — Phase 5 will
 * add offboarding + audit trail per CONTEXT D-05.
 *
 * Gate order:
 *   1. isAmbassadorProgramEnabled()
 *   2. requireAdminAccess(request, "ambassador.member.strike")
 *   3. Verify target subdoc exists
 *   4. Atomic increment on `strikes`
 */
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { requireAdminAccess, logAdminAction } from "@/lib/adminAccess/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { uid: string } | Promise<{ uid: string }> }
) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const access = await requireAdminAccess(request, "ambassador.member.strike");
  if (!access.ok) return access.response;

  // Next 15+: params may be a Promise — await defensively
  const { uid } = await Promise.resolve(params);
  if (!uid || typeof uid !== "string") {
    return NextResponse.json({ error: "Invalid uid" }, { status: 400 });
  }

  const subdocRef = db
    .collection("mentorship_profiles")
    .doc(uid)
    .collection("ambassador")
    .doc("v1");

  // Transaction: read, verify exists, increment. Re-reads the fresh count to return.
  const result = await db.runTransaction(async (txn) => {
    const snap = await txn.get(subdocRef);
    if (!snap.exists) {
      return { ok: false as const, error: "Ambassador not found", status: 404 };
    }
    const current = snap.data() ?? {};
    const next = typeof current.strikes === "number" ? current.strikes + 1 : 1;
    txn.update(subdocRef, {
      strikes: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true as const, strikes: next };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await logAdminAction(
    access.actor,
    "ambassador.member.strike",
    { type: "ambassador", id: uid },
    { strikes: result.strikes }
  );

  return NextResponse.json({ uid, strikes: result.strikes }, { status: 200 });
}
