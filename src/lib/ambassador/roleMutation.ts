/**
 * src/lib/ambassador/roleMutation.ts
 *
 * Shared helper for synchronizing Firebase Auth custom claims with
 * mentorship_profiles.roles (+ isAdmin). Called by every write path that mutates
 * these fields so the claim is fresh within seconds of the Firestore write,
 * rather than waiting for the next ID-token refresh (per D-14 in 01-CONTEXT.md).
 *
 * Phase 1: stub — this module only exposes syncRoleClaim. Phase 2 hardens it
 * into the owner of the full accept-ambassador mutation (write profile doc +
 * sync claims + assign Discord role + audit-log) per ARCHITECTURE.md §6.2.
 *
 * Merge semantics: REPLACES roles + admin keys; DROPS legacy `role` key; PRESERVES
 * any other custom claims (same pattern as scripts/sync-custom-claims.ts). This
 * matters because setCustomUserClaims atomically replaces the entire claims object.
 */

import { auth } from "@/lib/firebaseAdmin";

export interface SyncRoleClaimInput {
  /** The roles-array to write. Pass the final post-mutation array (possibly empty). */
  roles: string[];
  /** The isAdmin flag to mirror as the admin claim. */
  admin: boolean;
}

export type SyncRoleClaimResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Synchronize the Firebase Auth custom claims for uid to match the given roles + admin.
 *
 * Merge rules (per D-13 in 01-CONTEXT.md):
 *   - Reads the user's current custom claims (preserving any we don't own)
 *   - Overwrites roles and admin; drops legacy `role` key
 *   - Leaves all other keys intact
 *
 * Failure handling: returns { ok: false, error } instead of throwing. Callers
 * MUST treat sync failure as non-fatal (the Firestore write is authoritative;
 * claims will catch up on next scripts/sync-custom-claims.ts run or next mutation).
 */
export async function syncRoleClaim(
  uid: string,
  input: SyncRoleClaimInput
): Promise<SyncRoleClaimResult> {
  try {
    const userRecord = await auth.getUser(uid);
    const { role: _legacyRole, ...preserved } = (userRecord.customClaims ?? {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = {
      ...preserved,
      roles: input.roles,
      admin: input.admin,
    };
    await auth.setCustomUserClaims(uid, merged);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Do NOT rethrow — callers need to know claim sync failed but not abort the txn.
    return { ok: false, error: message };
  }
}
