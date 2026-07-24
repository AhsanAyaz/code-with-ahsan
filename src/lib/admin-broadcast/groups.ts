/**
 * Admin broadcast — recipient-group definitions and pure recipient helpers (GH#298).
 *
 * A "broadcast" lets an admin compose a plain-text message and send it to one
 * selected audience via the existing email channel. This module holds the group
 * enum + framework-agnostic helpers so they can be unit-tested without Firestore.
 */

/** The audiences an admin can broadcast to in v1. */
export const BROADCAST_GROUPS = ["mentors", "mentees", "collaborators", "ambassadors"] as const;

export type BroadcastGroup = (typeof BROADCAST_GROUPS)[number];

/** Human-friendly labels for the UI select. */
export const BROADCAST_GROUP_LABELS: Record<BroadcastGroup, string> = {
  mentors: "Mentors",
  mentees: "Mentees",
  collaborators: "Project Collaborators",
  ambassadors: "Ambassadors",
};

/** A resolved recipient of a broadcast. */
export interface BroadcastRecipient {
  name: string;
  email: string;
}

/** Runtime type guard for untrusted request input. */
export function isBroadcastGroup(value: unknown): value is BroadcastGroup {
  return typeof value === "string" && (BROADCAST_GROUPS as readonly string[]).includes(value);
}

/**
 * Drop recipients without a usable email and remove duplicate emails
 * (case-insensitive), keeping the first occurrence. Emails are trimmed.
 * A single person can be in multiple projects/roles, so dedupe is required
 * before handing the list to the batch sender.
 */
export function dedupeRecipients(recipients: BroadcastRecipient[]): BroadcastRecipient[] {
  const seen = new Set<string>();
  const out: BroadcastRecipient[] = [];
  for (const r of recipients) {
    const email = (r.email ?? "").trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: r.name, email });
  }
  return out;
}
