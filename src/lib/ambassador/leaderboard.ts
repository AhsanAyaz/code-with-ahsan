/**
 * Phase 5 (DASH-03..07) — Leaderboard snapshot module.
 *
 * Module structure mirrors src/lib/ambassador/acceptance.ts:
 *   - Exported interfaces at the top (consumed by both cron and API).
 *   - `buildLeaderboardSnapshot` helper exported for the cron writer.
 *   - Pure functions; no Firestore writes here — the cron script invokes
 *     this module and writes the resulting doc itself.
 *
 * Full implementation lands in Plan 02; this file ships the type
 * contract first so Plan 03 (dashboard API) can compile against it.
 */

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL: string;
  count: number;
}

export interface LeaderboardCategoryRanks {
  referralsRank: number;
  eventsRank: number;
  reportsRank: number;
}

export interface LeaderboardWindow {
  referrals: LeaderboardEntry[]; // top-3 only
  events: LeaderboardEntry[];
  reportsOnTime: LeaderboardEntry[];
  ambassadorRanks: Record<string, LeaderboardCategoryRanks>;
}

export interface LeaderboardSnapshot {
  cohortId: string;
  /** ISO string at write time. Stored as Firestore Timestamp; route handlers
   *  normalize via toDate().toISOString() before returning to the client. */
  updatedAt: string;
  /** Cohort.startDate + 28 days, ISO string. UI compares to now to gate DASH-06. */
  graceEndDate: string;
  cumulative: LeaderboardWindow;
  thisMonth: LeaderboardWindow & { month: string }; // YYYY-MM (UTC) per Open Question 1 recommendation
}

/**
 * Build the leaderboard snapshot for a cohort.
 *
 * Plan 02 fills in the body. The signature is locked here so Plan 02 can
 * develop in parallel with Plan 03 / Plan 04 (which import only the types).
 */
export async function buildLeaderboardSnapshot(
  cohortId: string,
): Promise<LeaderboardSnapshot> {
  // Full implementation in Plan 02 (Wave 2).
  void cohortId;
  throw new Error("buildLeaderboardSnapshot: not implemented (Plan 02)");
}
