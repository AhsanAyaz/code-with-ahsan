/**
 * Cascade-delete a mentee (or any mentorship user) and all associated data.
 *
 * Board decision GH#239 / VIS-142 (Option A): when an admin deletes a mentee,
 * every document tied to that user is removed. This module owns the Firestore +
 * Firebase Auth + best-effort Discord teardown so the API route stays thin.
 *
 * Deletion is intentionally best-effort per subsystem: a failure removing a
 * Discord channel must NOT block the Firestore/Auth deletion. Each step reports
 * what it removed so the caller can persist an audit log and surface a summary.
 */

import {
  DISCORD_MENTEE_ROLE_ID,
  DISCORD_MENTOR_ROLE_ID,
  deleteDiscordChannel,
  removeDiscordRole,
} from "@/lib/discord";
import { auth, db } from "@/lib/firebaseAdmin";

/** Firestore allows at most 500 writes per batch; stay comfortably under. */
const BATCH_LIMIT = 450;
/** Firestore `in` / `array-contains-any` queries accept at most 30 values. */
const IN_QUERY_LIMIT = 30;

export interface CascadeDeletionSummary {
  uid: string;
  profileDeleted: boolean;
  userDocDeleted: boolean;
  authAccountDeleted: boolean;
  counts: {
    sessions: number;
    goals: number;
    scheduledSessions: number;
    alerts: number;
    bookings: number;
    ratings: number;
    projectApplications: number;
    projectMembers: number;
    projectInvitations: number;
  };
  discord: {
    channelsDeleted: number;
    rolesRemoved: number;
  };
  errors: string[];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Delete a list of document refs in batches, returning the count deleted. */
async function batchDelete(refs: FirebaseFirestore.DocumentReference[]): Promise<number> {
  let deleted = 0;
  for (const group of chunk(refs, BATCH_LIMIT)) {
    const batch = db.batch();
    for (const ref of group) batch.delete(ref);
    await batch.commit();
    deleted += group.length;
  }
  return deleted;
}

/** Merge query snapshots into a de-duplicated (by doc id) list of docs. */
function mergeSnapshots(
  snapshots: FirebaseFirestore.QuerySnapshot[]
): FirebaseFirestore.QueryDocumentSnapshot[] {
  const seen = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const snap of snapshots) {
    for (const doc of snap.docs) seen.set(doc.id, doc);
  }
  return Array.from(seen.values());
}

/**
 * Query a collection for docs where ANY of the given fields equals `uid`,
 * de-duplicating by document id. Firestore has no OR across fields, so we run
 * one equality query per field and merge.
 */
async function findDocsByUserFields(
  collection: string,
  fields: string[],
  uid: string
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const snapshots = await Promise.all(
    fields.map((field) => db.collection(collection).where(field, "==", uid).get())
  );
  return mergeSnapshots(snapshots);
}

/** Query a collection for docs where `field` is IN the given id list (chunked). */
async function findDocsByFieldIn(
  collection: string,
  field: string,
  ids: string[]
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  if (ids.length === 0) return [];
  const snapshots = await Promise.all(
    chunk(ids, IN_QUERY_LIMIT).map((group) =>
      db.collection(collection).where(field, "in", group).get()
    )
  );
  return mergeSnapshots(snapshots);
}

/**
 * Cascade-delete every record associated with `uid`.
 *
 * Order matters: read the user's sessions first (they anchor goals / scheduled
 * sessions / alerts and hold the Discord channel ids), tear down Discord
 * best-effort, then delete Firestore documents, and finally the Auth account.
 */
export async function cascadeDeleteMentee(uid: string): Promise<CascadeDeletionSummary> {
  const summary: CascadeDeletionSummary = {
    uid,
    profileDeleted: false,
    userDocDeleted: false,
    authAccountDeleted: false,
    counts: {
      sessions: 0,
      goals: 0,
      scheduledSessions: 0,
      alerts: 0,
      bookings: 0,
      ratings: 0,
      projectApplications: 0,
      projectMembers: 0,
      projectInvitations: 0,
    },
    discord: { channelsDeleted: 0, rolesRemoved: 0 },
    errors: [],
  };

  // --- 1. Sessions (mentorship requests + matches) tied to this user ---------
  const sessionDocs = await findDocsByUserFields(
    "mentorship_sessions",
    ["menteeId", "mentorId"],
    uid
  );
  const sessionIds = sessionDocs.map((d) => d.id);
  const discordChannelIds = sessionDocs
    .map((d) => d.data().discordChannelId as string | undefined)
    .filter((id): id is string => Boolean(id));

  // --- 2. Session-anchored children -----------------------------------------
  const [goalDocs, scheduledDocs] = await Promise.all([
    findDocsByFieldIn("mentorship_goals", "matchId", sessionIds),
    findDocsByFieldIn("mentorship_scheduled_sessions", "sessionId", sessionIds),
  ]);
  const scheduledIds = scheduledDocs.map((d) => d.id);
  const alertDocs = await findDocsByFieldIn(
    "mentorship_alerts",
    "scheduledSessionId",
    scheduledIds
  );

  // --- 3. Directly user-keyed collections -----------------------------------
  const [bookingDocs, ratingDocs, projectApps, projectMembers, projectInvites] = await Promise.all([
    findDocsByUserFields("mentorship_bookings", ["menteeId", "mentorId", "userId"], uid),
    findDocsByUserFields("mentor_ratings", ["menteeId", "mentorId"], uid),
    findDocsByUserFields("project_applications", ["userId"], uid),
    findDocsByUserFields("project_members", ["userId"], uid),
    findDocsByUserFields("project_invitations", ["userId", "uid"], uid),
  ]);

  // --- 4. Best-effort Discord teardown --------------------------------------
  for (const channelId of discordChannelIds) {
    try {
      const ok = await deleteDiscordChannel(channelId, `Mentee ${uid} deleted by admin (GH#239)`);
      if (ok) summary.discord.channelsDeleted++;
    } catch (err) {
      summary.errors.push(
        `Discord channel ${channelId}: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }
  // Remove mentorship Discord roles from the member (uses discord username on profile)
  try {
    const profileSnap = await db.collection("mentorship_profiles").doc(uid).get();
    const discordUsername = profileSnap.data()?.discordUsername as string | undefined;
    if (discordUsername) {
      for (const roleId of [DISCORD_MENTEE_ROLE_ID, DISCORD_MENTOR_ROLE_ID]) {
        try {
          const ok = await removeDiscordRole(discordUsername, roleId);
          if (ok) summary.discord.rolesRemoved++;
        } catch (err) {
          summary.errors.push(
            `Discord role ${roleId}: ${err instanceof Error ? err.message : "unknown error"}`
          );
        }
      }
    }
  } catch (err) {
    summary.errors.push(
      `Discord role cleanup: ${err instanceof Error ? err.message : "unknown error"}`
    );
  }

  // --- 5. Delete Firestore documents ----------------------------------------
  summary.counts.sessions = await batchDelete(sessionDocs.map((d) => d.ref));
  summary.counts.goals = await batchDelete(goalDocs.map((d) => d.ref));
  summary.counts.scheduledSessions = await batchDelete(scheduledDocs.map((d) => d.ref));
  summary.counts.alerts = await batchDelete(alertDocs.map((d) => d.ref));
  summary.counts.bookings = await batchDelete(bookingDocs.map((d) => d.ref));
  summary.counts.ratings = await batchDelete(ratingDocs.map((d) => d.ref));
  summary.counts.projectApplications = await batchDelete(projectApps.map((d) => d.ref));
  summary.counts.projectMembers = await batchDelete(projectMembers.map((d) => d.ref));
  summary.counts.projectInvitations = await batchDelete(projectInvites.map((d) => d.ref));

  // Profile + users doc (keyed by uid)
  try {
    await db.collection("mentorship_profiles").doc(uid).delete();
    summary.profileDeleted = true;
  } catch (err) {
    summary.errors.push(`Delete profile: ${err instanceof Error ? err.message : "unknown error"}`);
  }
  try {
    await db.collection("users").doc(uid).delete();
    summary.userDocDeleted = true;
  } catch (err) {
    summary.errors.push(`Delete user doc: ${err instanceof Error ? err.message : "unknown error"}`);
  }

  // --- 6. Firebase Auth account ---------------------------------------------
  try {
    await auth.deleteUser(uid);
    summary.authAccountDeleted = true;
  } catch (err) {
    // auth/user-not-found is acceptable — nothing to delete.
    const code = (err as { code?: string })?.code;
    if (code === "auth/user-not-found") {
      summary.authAccountDeleted = false;
    } else {
      summary.errors.push(
        `Delete auth account: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  return summary;
}
