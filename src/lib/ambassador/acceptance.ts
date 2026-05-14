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

import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { assignDiscordRole, DISCORD_AMBASSADOR_ROLE_ID } from "@/lib/discord";
import { syncRoleClaim } from "@/lib/ambassador/roleMutation";
import {
  AMBASSADOR_APPLICATIONS_COLLECTION,
  AMBASSADOR_COHORTS_COLLECTION,
  REFERRAL_CODES_COLLECTION,
} from "@/lib/ambassador/constants";
import { generateUniqueReferralCode } from "@/lib/ambassador/referralCode";
import type { ApplicationDoc, CohortDoc } from "@/types/ambassador";
import {
  buildPublicAmbassadorProjection,
} from "@/lib/ambassador/publicProjection";
import {
  PUBLIC_AMBASSADORS_COLLECTION,
} from "@/types/ambassador";
import {
  deriveBaseUsername,
  ensureUniqueUsername,
} from "@/lib/ambassador/username";

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
      referralCode?: string; // Phase 4 (REF-01) — present on first-accept path
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
  // ── Pre-transaction: resolve the applicant's mentorship_profiles doc to check if
  // a username backfill is needed (D-01a). Username uniqueness requires a
  // `where().limit().get()` query which is ILLEGAL inside a Firestore transaction
  // (`txn.get` only accepts document refs). So we read the applicant + profile here,
  // derive/resolve the username here, then pass `resolvedUsername` into the txn body.
  //
  // The txn body re-reads appRef/profileRef via `txn.get` to preserve Firestore's
  // read-before-write invariant — costs 2 extra reads per acceptance, which is
  // acceptable for a rare, one-time-per-applicant operation.
  const preAppSnap = await db
    .collection(AMBASSADOR_APPLICATIONS_COLLECTION)
    .doc(applicationId)
    .get();
  if (!preAppSnap.exists) return { ok: false, error: "application_not_found" };
  const preApp = preAppSnap.data() as ApplicationDoc;

  const preProfileSnap = await db
    .collection("mentorship_profiles")
    .doc(preApp.applicantUid)
    .get();
  const preProfileData = preProfileSnap.exists
    ? (preProfileSnap.data() as { username?: string; linkedinUrl?: string; photoURL?: string; displayName?: string })
    : undefined;

  let resolvedUsername = preProfileData?.username;
  if (!resolvedUsername || resolvedUsername.trim().length === 0) {
    const base = deriveBaseUsername(preApp.applicantName, preApp.applicantEmail);
    resolvedUsername = await ensureUniqueUsername(base);
  }

  // Phase 4 (REF-01): Generate unique referral code before entering the transaction.
  // Collection lookup (.doc().get()) is illegal inside db.runTransaction via txn.get for
  // a non-document query; we read outside and pass resolvedReferralCode into the txn body.
  // The txn itself writes the referral_codes/{code} lookup doc, making the generation+write atomic.
  const resolvedReferralCode = await generateUniqueReferralCode(resolvedUsername);

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
    const ambassadorRef = profileRef.collection("ambassador").doc("v1");
    const [profileSnap, ambassadorSnap] = await Promise.all([
      txn.get(profileRef),
      txn.get(ambassadorRef),
    ]);

    // alreadyAccepted is only true when the application is accepted AND the ambassador
    // subdoc still exists. If the subdoc was deleted (member removed via admin), treat
    // this as a fresh accept so the subdoc, public projection, referral code, and email
    // are all re-created.
    const alreadyAccepted = app.status === "accepted" && ambassadorSnap.exists;

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
    // Username backfill (D-01a): if the parent profile has no username, set
    // `resolvedUsername` (derived pre-txn via ensureUniqueUsername) alongside
    // the roles update. No-op if a username already exists.
    if (profileSnap.exists) {
      const existingUsername = (profileSnap.data() as { username?: string })?.username;
      const profileUpdate: Record<string, unknown> = {
        roles: FieldValue.arrayUnion("ambassador"),
      };
      if (!existingUsername || existingUsername.trim().length === 0) {
        profileUpdate.username = resolvedUsername;
      }
      txn.update(profileRef, profileUpdate);
    } else {
      // Edge case: profile doc missing — create it with ambassador role AND the
      // resolved username so /u/[username] doesn't fall back to /u/{uid}.
      txn.set(
        profileRef,
        {
          uid: app.applicantUid,
          email: app.applicantEmail,
          displayName: app.applicantName,
          username: resolvedUsername,
          roles: ["ambassador"],
          createdAt: now,
        },
        { merge: true },
      );
    }

    // Ambassador subdoc + cohort increment + public projection — only on first accept.
    // Subdoc snapshot + public projection write are FIRST-ACCEPT-ONLY. Re-accept
    // is a no-op for both: in-life edits flow through PATCH /api/ambassador/profile
    // (plan 03-03), which batches subdoc + projection updates atomically.
    if (!alreadyAccepted) {
      const subdocPayload: Record<string, unknown> = {
        cohortId: app.targetCohortId,
        joinedAt: now,
        active: true,
        strikes: 0,
        discordMemberId: app.discordMemberId ?? null,
        referralCode: resolvedReferralCode, // REF-01: Phase 4 — set at first-accept only
      };
      // D-06: snapshot university + city from the application doc onto the subdoc
      // on FIRST accept. Conditionally spread — Admin SDK rejects undefined.
      if (typeof app.university === "string" && app.university.trim().length > 0) {
        subdocPayload.university = app.university.trim();
      }
      if (typeof app.city === "string" && app.city.trim().length > 0) {
        subdocPayload.city = app.city.trim();
      }
      txn.set(ambassadorRef, subdocPayload);

      // Phase 4 (REF-01): Write the top-level lookup doc atomically with the subdoc.
      // RESEARCH Pitfall 3 — avoids a collection-group index on ambassador.referralCode.
      const refCodeRef = db.collection(REFERRAL_CODES_COLLECTION).doc(resolvedReferralCode);
      txn.set(refCodeRef, {
        ambassadorId: app.applicantUid,
        uid: app.applicantUid,
      });

      txn.update(cohortRef, {
        acceptedCount: FieldValue.increment(1),
        updatedAt: now,
      });

      // D-08 path 1: write the denormalized public_ambassadors projection inside the
      // SAME transaction so /ambassadors never sees an ambassador whose projection
      // is missing. Joins parent profile fields (photoURL, displayName, linkedinUrl)
      // with the application's university/city snapshot.
      //
      // Subdoc snapshot + public projection write are FIRST-ACCEPT-ONLY. Re-accept
      // is a no-op for both: in-life edits flow through PATCH /api/ambassador/profile
      // (plan 03-03), which batches subdoc + projection updates atomically.
      const parentProfile =
        profileSnap.exists
          ? (profileSnap.data() as {
              username?: string;
              displayName?: string;
              photoURL?: string;
              linkedinUrl?: string;
            })
          : undefined;

      const publicRef = db.collection(PUBLIC_AMBASSADORS_COLLECTION).doc(app.applicantUid);
      const projection = buildPublicAmbassadorProjection({
        uid: app.applicantUid,
        username: resolvedUsername,
        displayName:
          parentProfile?.displayName ?? app.applicantName ?? "Ambassador",
        photoURL: parentProfile?.photoURL ?? "",
        cohortId: app.targetCohortId,
        linkedinUrl: parentProfile?.linkedinUrl,
        university:
          typeof app.university === "string" && app.university.trim().length > 0
            ? app.university.trim()
            : undefined,
        city:
          typeof app.city === "string" && app.city.trim().length > 0
            ? app.city.trim()
            : undefined,
        // Phase-3 editable fields are absent at acceptance time; PATCH populates them later.
        updatedAt: now,
      });
      txn.set(publicRef, projection);
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
      // Phase 4 (REF-01): include referral code on first-accept so callers can log it.
      // Re-accept is a no-op for referral code — skip to avoid confusion.
      ...(alreadyAccepted ? {} : { referralCode: resolvedReferralCode }),
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
