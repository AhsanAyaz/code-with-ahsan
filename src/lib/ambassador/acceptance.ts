/**
 * src/lib/ambassador/acceptance.ts
 *
 * Shared helpers for the ambassador application accept/decline pipeline.
 *
 * Design rationale (from plan must_haves / D-17):
 *   - `runAcceptanceTransaction` uses db.runTransaction() (NOT batch writes) so the
 *     COHORT-04 maxSize check is atomic (Pitfall 1).
 *   - Discord role assignment (assignAmbassadorDiscordRoleSoft) runs AFTER the
 *     transaction commits and NEVER rolls back Firestore on failure (D-17).
 *   - `FieldValue.arrayUnion("ambassador")` is idempotent, so re-accepting an
 *     application is a no-op for the roles array (DISC-03).
 *   - `syncRoleClaim` is called OUTSIDE the transaction to avoid double work on
 *     retry paths; the PATCH route calls `syncAmbassadorClaim` after commit.
 */

import { db, FieldValue } from "@/lib/firebaseAdmin";
import { assignDiscordRole, DISCORD_AMBASSADOR_ROLE_ID } from "@/lib/discord";
import { syncRoleClaim } from "@/lib/ambassador/roleMutation";
import {
  AMBASSADOR_APPLICATIONS_COLLECTION,
  AMBASSADOR_COHORTS_COLLECTION,
} from "@/lib/ambassador/constants";
import type { ApplicationDoc, CohortDoc } from "@/types/ambassador";

// ─── Return types ───────────────────────────────────────────────────────────

export type AcceptanceResult =
  | {
      ok: true;
      alreadyAccepted?: boolean;
      applicationId: string;
      applicantUid: string;
      applicantEmail: string;
      applicantName: string;
      cohortId: string;
      cohortName: string;
      discordHandle: string;
      discordMemberId: string | null;
    }
  | {
      ok: false;
      error: "application_not_found" | "cohort_not_found" | "cohort_full" | "already_declined";
    };

export type DiscordAssignmentResult =
  | { ok: true }
  | { ok: false; reason: "missing_member_id" | "discord_api_failure" };

// ─── Transaction helper ─────────────────────────────────────────────────────

/**
 * COHORT-04 race-safe acceptance transaction.
 *
 * All Firestore reads happen inside the transaction before any writes (required by
 * Firestore transaction semantics). If the cohort is full, returns an error without
 * writing anything. If the application is already accepted (idempotent call), skips
 * the count increment and subdoc creation.
 */
export async function runAcceptanceTransaction(
  applicationId: string,
  adminUid: string,
  notes: string | undefined,
): Promise<AcceptanceResult> {
  return db.runTransaction<AcceptanceResult>(async (txn) => {
    // ── Reads (all before writes) ─────────────────────────────────────────
    const appRef = db.collection(AMBASSADOR_APPLICATIONS_COLLECTION).doc(applicationId);
    const appSnap = await txn.get(appRef);
    if (!appSnap.exists) return { ok: false, error: "application_not_found" };
    const app = appSnap.data() as ApplicationDoc;

    if (app.status === "declined") return { ok: false, error: "already_declined" };

    const cohortRef = db.collection(AMBASSADOR_COHORTS_COLLECTION).doc(app.targetCohortId);
    const cohortSnap = await txn.get(cohortRef);
    if (!cohortSnap.exists) return { ok: false, error: "cohort_not_found" };
    const cohort = cohortSnap.data() as CohortDoc;

    const profileRef = db.collection("mentorship_profiles").doc(app.applicantUid);
    const profileSnap = await txn.get(profileRef);

    const alreadyAccepted = app.status === "accepted";

    // ── COHORT-04: enforce maxSize on first accept only ────────────────────
    if (!alreadyAccepted) {
      const current = typeof cohort.acceptedCount === "number" ? cohort.acceptedCount : 0;
      const max = typeof cohort.maxSize === "number" ? cohort.maxSize : Infinity;
      if (current >= max) return { ok: false, error: "cohort_full" };
    }

    const now = FieldValue.serverTimestamp();

    // ── Writes ────────────────────────────────────────────────────────────

    // Application doc — status + audit fields.
    const appUpdate: Record<string, unknown> = {
      status: "accepted",
      reviewedBy: adminUid,
    };
    if (notes !== undefined) appUpdate.reviewerNotes = notes;
    if (!alreadyAccepted) appUpdate.decidedAt = now;
    txn.update(appRef, appUpdate);

    // Profile roles — arrayUnion is idempotent, safe to call on re-accept.
    if (profileSnap.exists) {
      txn.update(profileRef, { roles: FieldValue.arrayUnion("ambassador") });
    } else {
      // Edge case: profile doc missing — create it with ambassador role.
      txn.set(
        profileRef,
        {
          uid: app.applicantUid,
          email: app.applicantEmail,
          displayName: app.applicantName,
          roles: ["ambassador"],
          createdAt: now,
        },
        { merge: true },
      );
    }

    // Ambassador subdoc + cohort increment — only on first accept.
    if (!alreadyAccepted) {
      const ambassadorRef = profileRef.collection("ambassador").doc("v1");
      txn.set(ambassadorRef, {
        cohortId: app.targetCohortId,
        joinedAt: now,
        active: true,
        strikes: 0,
        discordMemberId: app.discordMemberId ?? null,
      });
      txn.update(cohortRef, {
        acceptedCount: FieldValue.increment(1),
        updatedAt: now,
      });
    }

    return {
      ok: true,
      alreadyAccepted,
      applicationId,
      applicantUid: app.applicantUid,
      applicantEmail: app.applicantEmail,
      applicantName: app.applicantName,
      cohortId: app.targetCohortId,
      cohortName: cohort.name,
      discordHandle: app.discordHandle,
      discordMemberId: app.discordMemberId ?? null,
    };
  });
}

// ─── Discord soft-assign helper ─────────────────────────────────────────────

/**
 * Wrapper around assignDiscordRole that NEVER throws and persists the result
 * back to the application doc.
 *
 * D-17: Discord failure NEVER rolls back Firestore.
 * Called AFTER runAcceptanceTransaction has committed.
 */
export async function assignAmbassadorDiscordRoleSoft(
  applicationId: string,
  discordHandleOrMemberId: string | null,
): Promise<DiscordAssignmentResult> {
  const appRef = db.collection(AMBASSADOR_APPLICATIONS_COLLECTION).doc(applicationId);

  if (!discordHandleOrMemberId) {
    await appRef.update({ discordRoleAssigned: false, discordRetryNeeded: true });
    return { ok: false, reason: "missing_member_id" };
  }

  let succeeded = false;
  try {
    succeeded = await assignDiscordRole(discordHandleOrMemberId, DISCORD_AMBASSADOR_ROLE_ID);
  } catch {
    succeeded = false;
  }

  await appRef.update({
    discordRoleAssigned: succeeded,
    discordRetryNeeded: !succeeded,
  });

  return succeeded ? { ok: true } : { ok: false, reason: "discord_api_failure" };
}

// ─── Claims sync helper ─────────────────────────────────────────────────────

/**
 * Read the profile's current roles from Firestore and sync them to Firebase Auth
 * custom claims.
 *
 * Called by the PATCH route AFTER the transaction commits so the ambassador claim
 * is fresh within seconds (D-14 invariant). Non-fatal — failure is logged by caller.
 */
export async function syncAmbassadorClaim(uid: string): Promise<void> {
  const snap = await db.collection("mentorship_profiles").doc(uid).get();
  const data = snap.data() as { roles?: string[]; admin?: boolean } | undefined;
  const roles = data?.roles ?? ["ambassador"];
  // syncRoleClaim requires admin: boolean (not optional)
  await syncRoleClaim(uid, { roles, admin: data?.admin === true });
}
