/**
 * Phase 5 (DASH-07, quick 260522-b08): Cohort leaderboard view endpoint.
 *
 * GET /api/ambassador/dashboard/leaderboard?view=cumulative|this_month
 *   Default view = "cumulative".
 *
 * Read strategy (quick 260522-b08 — restores snapshot pipeline at DAILY cadence):
 *   1. Read `leaderboard_snapshots/{cohortId}` doc (daily 07:00 UTC cron writes this).
 *   2. If the doc is missing (cohort just started, before first cron tick) fall back to
 *      live `buildLeaderboardSnapshot(cohortId)` — same shape, just slower.
 *   3. Normalize Firestore Timestamp fields (`updatedAt`, `graceEndDate`) → ISO strings.
 *   4. Compute `graceActive` server-side from graceEndDate (UI does not need to do date math).
 *
 * CRITICAL (RESEARCH §"Anti-Patterns to Avoid"):
 *   - The full ambassadorRanks map MUST NOT leak to the client.
 *   - Return only `top3` per category + ownRank for the requesting ambassador.
 *
 * Quick 260522-b08 also removed the previous 5-minute in-memory Map cache:
 *   - The Firestore doc IS the cache layer now (daily refresh).
 *   - In-memory caches are wrong for serverless (each cold start re-computes; cache doesn't survive deploys).
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { hasRoleClaim, type DecodedRoleClaim } from "@/lib/permissions";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { getCurrentCohortId } from "@/lib/ambassador/currentCohort";
import { buildLeaderboardSnapshot, type LeaderboardSnapshot } from "@/lib/ambassador/leaderboard";
import { LEADERBOARD_SNAPSHOTS_COLLECTION } from "@/lib/ambassador/constants";
import { db } from "@/lib/firebaseAdmin";

/** Narrow helper for Firestore Timestamp → ISO string normalization.
 *  Accepts either a Timestamp-shaped object (`.toDate()`) or a string passed through. */
function normalizeTimestamp(value: unknown): string {
  if (value && typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

export async function GET(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ctx = await verifyAuth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const viewParam = url.searchParams.get("view");
  const view: "cumulative" | "this_month" =
    viewParam === "this_month" ? "this_month" : "cumulative";

  const cohortId = await getCurrentCohortId();
  if (!cohortId) {
    return NextResponse.json({ snapshot: null }, { status: 200 });
  }

  // Read snapshot doc first; fall back to live compute if missing (cold-start safety).
  const docSnap = await db
    .collection(LEADERBOARD_SNAPSHOTS_COLLECTION)
    .doc(cohortId)
    .get();

  let data: LeaderboardSnapshot;
  if (docSnap.exists) {
    const raw = docSnap.data() as Record<string, unknown>;
    const updatedAtIso = normalizeTimestamp(raw.updatedAt);
    const graceEndIso = normalizeTimestamp(raw.graceEndDate);
    data = {
      ...(raw as unknown as LeaderboardSnapshot),
      updatedAt: updatedAtIso,
      graceEndDate: graceEndIso,
    };
  } else {
    // Fallback: live compute (cohort just started, before first cron tick)
    data = await buildLeaderboardSnapshot(cohortId);
  }

  const graceActive = data.graceEndDate
    ? Date.now() < Date.parse(data.graceEndDate)
    : false;

  const window = view === "this_month" ? data.thisMonth : data.cumulative;

  // Anti-pattern guard: extract own rank only — never spread ambassadorRanks.
  const ownRanks = window.ambassadorRanks?.[ctx.uid];
  const ownRank = ownRanks
    ? {
        referrals: ownRanks.referrals,
        events: ownRanks.events,
        reportsOnTime: ownRanks.reportsOnTime,
      }
    : { referrals: null, events: null, reportsOnTime: null };

  return NextResponse.json({
    view,
    cohortId,
    graceActive,
    graceEndDate: data.graceEndDate ?? null,
    month: view === "this_month" ? data.thisMonth.month : null,
    top3: {
      referrals: window.referrals, // each entry now carries `rank` from Task 1
      events: window.events,
      reportsOnTime: window.reportsOnTime,
    },
    ownRank,
    updatedAt: data.updatedAt,
  });
}
