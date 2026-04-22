import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { getCurrentCohortId } from "@/lib/ambassador/currentCohort";
import {
  PUBLIC_AMBASSADORS_COLLECTION,
  type PublicAmbassadorDoc,
} from "@/types/ambassador";

/**
 * GET /api/ambassadors/public
 *
 * Public, unauthenticated read of the current cohort's accepted ambassadors
 * (PRESENT-01). Backed by the denormalized `public_ambassadors/{uid}`
 * projection that plan 03-02 seeds in the acceptance transaction — single
 * Firestore query, no joins, no N+1.
 *
 * Sort order: by `updatedAt` ascending. `joinedAt` is on the subdoc and
 * intentionally NOT duplicated on the projection; `updatedAt` is a close
 * monotonic proxy since projections rarely churn after accept in v1.
 *
 * Feature-flag gated: returns 404 when the program is disabled (matches
 * the /ambassadors route-tree gate).
 */
export async function GET() {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const cohortId = await getCurrentCohortId();
  if (!cohortId) {
    return NextResponse.json({ cohortId: null, items: [] });
  }

  const snap = await db
    .collection(PUBLIC_AMBASSADORS_COLLECTION)
    .where("active", "==", true)
    .where("cohortId", "==", cohortId)
    .orderBy("updatedAt", "asc")
    .get();

  const items: PublicAmbassadorDoc[] = snap.docs.map(
    (d) => d.data() as PublicAmbassadorDoc
  );

  return NextResponse.json({ cohortId, items });
}
