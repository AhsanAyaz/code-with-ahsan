import { db } from "@/lib/firebaseAdmin";
import { AMBASSADOR_COHORTS_COLLECTION } from "./constants";

/**
 * Resolves the "current cohort" used by the public /ambassadors page
 * per D-09 in 03-CONTEXT.md:
 *
 *   1. Prefer the cohort with `status === "active"`. There is at most
 *      one active cohort at a time (enforced in the admin cohort
 *      lifecycle — Phase 2).
 *   2. Fall back to the cohort with the most recent `startDate` if
 *      none are currently active (e.g. between cohorts, or pre-launch).
 *   3. Return `null` if no cohort documents exist at all.
 *
 * Server-only. Uses Admin SDK. Consumers MUST handle the `null` case.
 */
export async function getCurrentCohortId(): Promise<string | null> {
  const col = db.collection(AMBASSADOR_COHORTS_COLLECTION);

  // Step 1: try active cohort first.
  const activeSnap = await col
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (!activeSnap.empty) {
    return activeSnap.docs[0].id;
  }

  // Step 2: fall back to the cohort with the most recent startDate.
  const latestSnap = await col
    .orderBy("startDate", "desc")
    .limit(1)
    .get();

  if (!latestSnap.empty) {
    return latestSnap.docs[0].id;
  }

  // Step 3: no cohorts exist yet.
  return null;
}
