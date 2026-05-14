/**
 * Phase 5 (DASH-03..07) — Leaderboard snapshot module.
 *
 * Module structure mirrors src/lib/ambassador/acceptance.ts:
 *   - Exported interfaces at the top (consumed by both cron and API).
 *   - `buildLeaderboardSnapshot` helper exported for the cron writer.
 *   - Pure functions; no Firestore writes here — the cron script invokes
 *     this module and writes the resulting doc itself.
 */

import { db } from "@/lib/firebaseAdmin";
import {
  AMBASSADOR_EVENTS_COLLECTION,
  LEADERBOARD_GRACE_PERIOD_MS,
  MONTHLY_REPORTS_COLLECTION,
  REFERRALS_COLLECTION,
} from "@/lib/ambassador/constants";
import { AMBASSADOR_COHORTS_COLLECTION } from "@/lib/ambassador/constants";
import {
  PUBLIC_AMBASSADORS_COLLECTION,
  type PublicAmbassadorDoc,
} from "@/types/ambassador";

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
 * Standard competition ranking ("1224"):
 *   counts [10, 8, 8, 5] → ranks [1, 2, 2, 4].
 * Pure function (no Firestore) — testable in isolation.
 */
export function rankByCount<T extends { uid: string; count: number }>(
  entries: T[],
): Map<string, number> {
  const sorted = [...entries].sort((a, b) => b.count - a.count);
  const ranks = new Map<string, number>();
  let lastCount: number | null = null;
  let lastRank = 0;
  sorted.forEach((entry, idx) => {
    const position = idx + 1;
    if (lastCount !== null && entry.count === lastCount) {
      ranks.set(entry.uid, lastRank);
    } else {
      ranks.set(entry.uid, position);
      lastRank = position;
      lastCount = entry.count;
    }
  });
  return ranks;
}

/** Returns "YYYY-MM" for the current UTC month — used by the this-month window. */
export function currentUtcMonth(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Returns the UTC start-of-month Date for a "YYYY-MM" string. */
export function utcMonthStart(month: string): Date {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
}

export interface AmbassadorCounts {
  uid: string;
  displayName: string;
  photoURL: string;
  cumulative: { referrals: number; events: number; reports: number };
  thisMonth: { referrals: number; events: number; reports: number };
}

/**
 * Compute counts for one ambassador. Public for cron testability;
 * NOT exported from the route handlers.
 */
export async function computeAmbassadorCounts(
  uid: string,
  monthStart: Date,
  displayName: string,
  photoURL: string,
): Promise<AmbassadorCounts> {
  const [
    cumReferrals,
    cumEvents,
    cumReports,
    thisMonthReferrals,
    thisMonthEvents,
    thisMonthReports,
  ] = await Promise.all([
    db.collection(REFERRALS_COLLECTION).where("ambassadorId", "==", uid).count().get(),
    db
      .collection(AMBASSADOR_EVENTS_COLLECTION)
      .where("ambassadorId", "==", uid)
      .where("hidden", "==", false)
      .count()
      .get(),
    db.collection(MONTHLY_REPORTS_COLLECTION).where("ambassadorId", "==", uid).count().get(),
    db
      .collection(REFERRALS_COLLECTION)
      .where("ambassadorId", "==", uid)
      .where("convertedAt", ">=", monthStart)
      .count()
      .get(),
    db
      .collection(AMBASSADOR_EVENTS_COLLECTION)
      .where("ambassadorId", "==", uid)
      .where("hidden", "==", false)
      .where("date", ">=", monthStart)
      .count()
      .get(),
    db
      .collection(MONTHLY_REPORTS_COLLECTION)
      .where("ambassadorId", "==", uid)
      .where("submittedAt", ">=", monthStart)
      .count()
      .get(),
  ]);
  return {
    uid,
    displayName,
    photoURL,
    cumulative: {
      referrals: cumReferrals.data().count ?? 0,
      events: cumEvents.data().count ?? 0,
      reports: cumReports.data().count ?? 0,
    },
    thisMonth: {
      referrals: thisMonthReferrals.data().count ?? 0,
      events: thisMonthEvents.data().count ?? 0,
      reports: thisMonthReports.data().count ?? 0,
    },
  };
}

/** Build top-3 entries + complete rank map for one category. */
function buildWindowCategory(
  entries: Array<{ uid: string; displayName: string; photoURL: string; count: number }>,
): { top3: LeaderboardEntry[]; ranks: Map<string, number> } {
  const ranks = rankByCount(entries);
  const top3 = [...entries]
    .sort((a, b) => b.count - a.count)
    .filter((e) => e.count > 0)
    .slice(0, 3);
  return { top3, ranks };
}

/**
 * Build the leaderboard snapshot for a cohort.
 *
 * Reads:
 *   - cohorts/{cohortId} (for startDate)
 *   - public_ambassadors where active==true && cohortId==cohortId (Pitfall 7)
 *   - per-ambassador: referrals + events + monthly_reports counts (cumulative + this-month)
 *
 * Returns a fully-shaped LeaderboardSnapshot — NOT written to Firestore here.
 * The cron script invokes this and persists the result.
 */
export async function buildLeaderboardSnapshot(
  cohortId: string,
): Promise<LeaderboardSnapshot> {
  const cohortSnap = await db
    .collection(AMBASSADOR_COHORTS_COLLECTION)
    .doc(cohortId)
    .get();
  if (!cohortSnap.exists) {
    throw new Error(`Cohort not found: ${cohortId}`);
  }
  const cohort = cohortSnap.data() as { startDate?: FirebaseFirestore.Timestamp };
  if (!cohort.startDate) {
    throw new Error(`Cohort ${cohortId} missing startDate`);
  }
  const startMs = cohort.startDate.toDate().getTime();
  const graceEndDate = new Date(startMs + LEADERBOARD_GRACE_PERIOD_MS).toISOString();

  const month = currentUtcMonth();
  const monthStart = utcMonthStart(month);

  // Pitfall 7: enumerate via public_ambassadors (flat collection), not collectionGroup
  const ambassadorsSnap = await db
    .collection(PUBLIC_AMBASSADORS_COLLECTION)
    .where("active", "==", true)
    .where("cohortId", "==", cohortId)
    .get();

  const ambassadors = ambassadorsSnap.docs.map((d) => d.data() as PublicAmbassadorDoc);

  const counts = await Promise.all(
    ambassadors.map((a) =>
      computeAmbassadorCounts(a.uid, monthStart, a.displayName, a.photoURL),
    ),
  );

  const cumReferrals = counts.map((c) => ({
    uid: c.uid,
    displayName: c.displayName,
    photoURL: c.photoURL,
    count: c.cumulative.referrals,
  }));
  const cumEvents = counts.map((c) => ({
    uid: c.uid,
    displayName: c.displayName,
    photoURL: c.photoURL,
    count: c.cumulative.events,
  }));
  const cumReports = counts.map((c) => ({
    uid: c.uid,
    displayName: c.displayName,
    photoURL: c.photoURL,
    count: c.cumulative.reports,
  }));

  const tmReferrals = counts.map((c) => ({
    uid: c.uid,
    displayName: c.displayName,
    photoURL: c.photoURL,
    count: c.thisMonth.referrals,
  }));
  const tmEvents = counts.map((c) => ({
    uid: c.uid,
    displayName: c.displayName,
    photoURL: c.photoURL,
    count: c.thisMonth.events,
  }));
  const tmReports = counts.map((c) => ({
    uid: c.uid,
    displayName: c.displayName,
    photoURL: c.photoURL,
    count: c.thisMonth.reports,
  }));

  const cumRefBuilt = buildWindowCategory(cumReferrals);
  const cumEvtBuilt = buildWindowCategory(cumEvents);
  const cumRptBuilt = buildWindowCategory(cumReports);
  const tmRefBuilt = buildWindowCategory(tmReferrals);
  const tmEvtBuilt = buildWindowCategory(tmEvents);
  const tmRptBuilt = buildWindowCategory(tmReports);

  const cumulativeRanks: Record<string, LeaderboardCategoryRanks> = {};
  const thisMonthRanks: Record<string, LeaderboardCategoryRanks> = {};
  for (const a of ambassadors) {
    cumulativeRanks[a.uid] = {
      referralsRank: cumRefBuilt.ranks.get(a.uid) ?? 0,
      eventsRank: cumEvtBuilt.ranks.get(a.uid) ?? 0,
      reportsRank: cumRptBuilt.ranks.get(a.uid) ?? 0,
    };
    thisMonthRanks[a.uid] = {
      referralsRank: tmRefBuilt.ranks.get(a.uid) ?? 0,
      eventsRank: tmEvtBuilt.ranks.get(a.uid) ?? 0,
      reportsRank: tmRptBuilt.ranks.get(a.uid) ?? 0,
    };
  }

  return {
    cohortId,
    updatedAt: new Date().toISOString(),
    graceEndDate,
    cumulative: {
      referrals: cumRefBuilt.top3,
      events: cumEvtBuilt.top3,
      reportsOnTime: cumRptBuilt.top3,
      ambassadorRanks: cumulativeRanks,
    },
    thisMonth: {
      month,
      referrals: tmRefBuilt.top3,
      events: tmEvtBuilt.top3,
      reportsOnTime: tmRptBuilt.top3,
      ambassadorRanks: thisMonthRanks,
    },
  };
}
