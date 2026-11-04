/**
 * Admin broadcast — resolve a recipient group to concrete {name, email} rows (GH#298).
 *
 * Reuses the exact collections the existing admin features read from, so we add
 * no new data model:
 *   - mentors / mentees  → `mentorship_profiles` filtered by `roles array-contains`
 *   - ambassadors        → collection-group `ambassador` (active) → parent profile
 *   - collaborators      → `project_members` → member profile
 *
 * Ambassadors and collaborators reference a user by uid; their display name +
 * email live on `mentorship_profiles/{uid}` (doc id === uid), so we batch-fetch
 * those profiles via getAll. Results are de-duplicated by the caller.
 */

import type { Firestore } from "firebase-admin/firestore";
import {
  dedupeRecipients,
  type BroadcastGroup,
  type BroadcastRecipient,
} from "@/lib/admin-broadcast/groups";

/** Guard against unbounded fan-out; the batch sender also caps at 500. */
const MAX_UIDS = 500;

interface ProfileShape {
  displayName?: string;
  email?: string;
}

function toRecipient(data: ProfileShape | undefined): BroadcastRecipient | null {
  const email = (data?.email ?? "").trim();
  if (!email) return null;
  return { name: (data?.displayName ?? "").trim() || email, email };
}

/** Recipients for a role-based mentorship group (mentor | mentee). */
async function resolveByRole(
  db: Firestore,
  role: "mentor" | "mentee"
): Promise<BroadcastRecipient[]> {
  const snap = await db
    .collection("mentorship_profiles")
    .where("roles", "array-contains", role)
    .get();
  return snap.docs
    .map((d) => toRecipient(d.data() as ProfileShape))
    .filter((r): r is BroadcastRecipient => r !== null);
}

/** Fetch mentorship profiles for a set of uids and map to recipients. */
async function profilesForUids(db: Firestore, uids: string[]): Promise<BroadcastRecipient[]> {
  const unique = Array.from(new Set(uids)).filter(Boolean).slice(0, MAX_UIDS);
  if (unique.length === 0) return [];
  const refs = unique.map((uid) => db.collection("mentorship_profiles").doc(uid));
  const snaps = await db.getAll(...refs);
  return snaps
    .map((s) => toRecipient(s.data() as ProfileShape | undefined))
    .filter((r): r is BroadcastRecipient => r !== null);
}

/** Recipients for all active ambassadors. */
async function resolveAmbassadors(db: Firestore): Promise<BroadcastRecipient[]> {
  const subdocs = await db.collectionGroup("ambassador").where("active", "==", true).get();
  const uids = subdocs.docs.map((d) => d.ref.parent.parent?.id ?? "").filter(Boolean);
  return profilesForUids(db, uids);
}

/** Recipients for all project collaborators (project_members). */
async function resolveCollaborators(db: Firestore): Promise<BroadcastRecipient[]> {
  const members = await db.collection("project_members").get();
  const uids = members.docs
    .map((d) => (d.data().userId as string | undefined) ?? "")
    .filter(Boolean);
  return profilesForUids(db, uids);
}

/**
 * Resolve a broadcast group to a de-duplicated recipient list.
 * Returns an empty array when the group has no addressable members.
 */
export async function resolveGroupRecipients(
  db: Firestore,
  group: BroadcastGroup
): Promise<BroadcastRecipient[]> {
  let recipients: BroadcastRecipient[];
  switch (group) {
    case "mentors":
      recipients = await resolveByRole(db, "mentor");
      break;
    case "mentees":
      recipients = await resolveByRole(db, "mentee");
      break;
    case "ambassadors":
      recipients = await resolveAmbassadors(db);
      break;
    case "collaborators":
      recipients = await resolveCollaborators(db);
      break;
  }
  return dedupeRecipients(recipients);
}
