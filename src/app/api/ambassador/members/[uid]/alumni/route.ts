/**
 * Phase 5 (ALUMNI-01, ALUMNI-03):
 * POST /api/ambassador/members/[uid]/alumni
 *
 * Admin-triggered term-completion transition. Atomic Firestore batch:
 *   (1) profile.roles arrayUnion("alumni-ambassador")
 *   (2) profile.roles arrayRemove("ambassador")
 *   (3) subdoc { active: false, endedAt: serverTimestamp }
 *   (4) public_ambassadors/{uid} update { active: false }   <- NOT deleted (ALUMNI-03)
 *
 * Pitfall 1: arrayUnion + arrayRemove on the same field require two
 * sequential batch.update calls — Firestore disallows both transforms
 * in a single update().
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import {
  PUBLIC_AMBASSADORS_COLLECTION,
  type AmbassadorSubdoc,
} from "@/types/ambassador";
import { syncAmbassadorClaim } from "@/lib/ambassador/acceptance";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ambassador/members/[uid]/alumni");

export async function POST(
  request: NextRequest,
  { params }: { params: { uid: string } | Promise<{ uid: string }> },
) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { uid } = await Promise.resolve(params);
  if (!uid) return NextResponse.json({ error: "Invalid uid" }, { status: 400 });

  const profileRef = db.collection("mentorship_profiles").doc(uid);
  const subdocRef = profileRef.collection("ambassador").doc("v1");
  const subdocSnap = await subdocRef.get();
  if (!subdocSnap.exists) {
    return NextResponse.json({ error: "Ambassador not found" }, { status: 404 });
  }
  const subdoc = subdocSnap.data() as AmbassadorSubdoc;
  if (subdoc.active === false) {
    return NextResponse.json(
      { error: "Ambassador already transitioned out of active state" },
      { status: 409 },
    );
  }

  // Atomic batch — Pitfall 1: two sequential batch.update calls on the same ref.
  const batch = db.batch();
  // (1) Add alumni role
  batch.update(profileRef, {
    roles: FieldValue.arrayUnion("alumni-ambassador"),
  });
  // (2) Remove ambassador role — separate update because Firestore rejects
  //     arrayUnion + arrayRemove on the same field in one update().
  batch.update(profileRef, {
    roles: FieldValue.arrayRemove("ambassador"),
  });
  // (3) Subdoc — flip active, set endedAt only (ALUMNI-02: no strike-offboard timestamp here).
  batch.update(subdocRef, {
    active: false,
    endedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  // (4) Public projection — flip to inactive but DO NOT delete (ALUMNI-03).
  batch.update(db.collection(PUBLIC_AMBASSADORS_COLLECTION).doc(uid), {
    active: false,
  });
  await batch.commit();

  // Non-fatal claim sync.
  try {
    await syncAmbassadorClaim(uid);
  } catch (e) {
    logger.error("syncAmbassadorClaim after alumni transition failed", { uid, error: e });
  }

  return NextResponse.json({ success: true });
}
