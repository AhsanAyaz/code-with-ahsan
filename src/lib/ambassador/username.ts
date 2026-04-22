/**
 * src/lib/ambassador/username.ts
 *
 * Username backfill for ambassador-only users (D-01a).
 *
 * Ambassador-only users (applicants who never went through /mentorship/onboarding)
 * may hit acceptance with no `username` on their mentorship_profiles doc. Without
 * a username, the canonical /u/[username] URL falls back to /u/{uid} which is
 * ugly and leaks the Firebase uid. Backfilling at acceptance time keeps the URL
 * stable and human-readable.
 *
 * Mirrors the collision-loop algorithm in src/app/api/mentorship/profile/route.ts
 * lines 72–97. The LOOKUP runs outside Firestore transactions (where() queries are
 * illegal inside txn.get) — the caller is responsible for writing the returned
 * username via txn.update.
 */

import { db } from "@/lib/firebaseAdmin";

/**
 * Derive a URL-safe base username from displayName, falling back to email local-part,
 * falling back to `user{timestamp}`. Lowercased, stripped of non [a-z0-9_-] chars.
 */
export function deriveBaseUsername(displayName: string, email: string): string {
  const fromName = (displayName ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_-]/g, "");
  if (fromName.length >= 3) return fromName;

  const fromEmail = (email ?? "")
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  if (fromEmail.length >= 3) return fromEmail;

  return `user${Date.now()}`;
}

/**
 * Return a username guaranteed unique in `mentorship_profiles.username`, appending
 * a numeric suffix on collision. Matches the POST /api/mentorship/profile algorithm.
 *
 * Runs OUTSIDE any Firestore transaction — `where().limit().get()` is illegal inside
 * a transaction. Acceptable for backfill because the race window between this check
 * and the txn.update that persists the username is tiny; a collision would at worst
 * produce two profiles with the same username, which is recoverable.
 */
export async function ensureUniqueUsername(base: string): Promise<string> {
  let candidate = base;
  let counter = 1;
  // Bounded loop — pathological input cannot block acceptance forever.
  while (counter < 100) {
    const existing = await db
      .collection("mentorship_profiles")
      .where("username", "==", candidate)
      .limit(1)
      .get();
    if (existing.empty) return candidate;
    candidate = `${base}${counter}`;
    counter++;
  }
  // Absolute fallback — timestamp suffix cannot plausibly collide.
  return `${base}${Date.now()}`;
}
