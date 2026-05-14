/**
 * Phase 4 (D-05): Admin list of active ambassadors.
 *   GET /api/ambassador/members
 *
 * Returns minimal shape for the MembersList table: uid, displayName, cohort,
 * strikes, referralCode, unresolvedFlagCount. Full detail is at [uid] endpoint.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import { AMBASSADOR_CRON_FLAGS_COLLECTION } from "@/types/ambassador";

export async function GET(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  // Collection-group read of all ambassador subdocs where active === true.
  // .limit(200) guards against unbounded fan-out: each result triggers 2 extra
  // Firestore RPCs (profile + flag count), so N ambassadors = 1+2N reads.
  // Paginate at the call site if the program grows beyond this cap (WR-03).
  const subdocsSnap = await db
    .collectionGroup("ambassador")
    .where("active", "==", true)
    .limit(200)
    .get();

  const members = await Promise.all(
    subdocsSnap.docs.map(async (subdocSnap) => {
      const subdoc = subdocSnap.data();
      const uid = subdocSnap.ref.parent.parent?.id ?? "";
      // Parent profile for displayName + email
      const profileSnap = uid
        ? await db.collection("mentorship_profiles").doc(uid).get()
        : null;
      const profile = profileSnap?.data() ?? {};

      // Unresolved flag count
      const flagsSnap = await db
        .collection(AMBASSADOR_CRON_FLAGS_COLLECTION)
        .where("ambassadorId", "==", uid)
        .where("resolved", "==", false)
        .count()
        .get();

      return {
        uid,
        displayName: (profile.displayName as string | undefined) ?? uid,
        email: (profile.email as string | undefined) ?? null,
        cohortId: (subdoc.cohortId as string | undefined) ?? null,
        strikes: (subdoc.strikes as number | undefined) ?? 0,
        referralCode: (subdoc.referralCode as string | undefined) ?? null,
        active: subdoc.active === true,
        unresolvedFlagCount: flagsSnap.data().count ?? 0,
      };
    }),
  );

  members.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return NextResponse.json({ members }, { status: 200 });
}
