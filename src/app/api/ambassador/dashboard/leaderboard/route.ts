/**
 * Phase 5 (DASH-07): Cohort leaderboard view endpoint.
 *
 * GET /api/ambassador/dashboard/leaderboard?view=cumulative|this_month
 *   Default view = "cumulative".
 *   Computes live via buildLeaderboardSnapshot with a 5-minute in-memory cache.
 *   (Snapshot cron removed — cohort is small enough that live computation is cheap.)
 *
 * CRITICAL (RESEARCH §"Anti-Patterns to Avoid"):
 *   - The full ambassadorRanks map MUST NOT leak to the client.
 *   - Return only `top3` per category + ownRank for the requesting ambassador.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { hasRoleClaim, type DecodedRoleClaim } from "@/lib/permissions";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { getCurrentCohortId } from "@/lib/ambassador/currentCohort";
import { buildLeaderboardSnapshot, type LeaderboardSnapshot } from "@/lib/ambassador/leaderboard";

// 5-minute in-memory cache keyed by cohortId
const cache = new Map<string, { snapshot: LeaderboardSnapshot; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

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

  const now = Date.now();
  const cached = cache.get(cohortId);
  let data: LeaderboardSnapshot;

  if (cached && now < cached.expiresAt) {
    data = cached.snapshot;
  } else {
    data = await buildLeaderboardSnapshot(cohortId);
    cache.set(cohortId, { snapshot: data, expiresAt: now + CACHE_TTL_MS });
  }

  const window = view === "this_month" ? data.thisMonth : data.cumulative;

  // Anti-pattern guard: extract own rank only — never spread ambassadorRanks.
  const ownRank = window.ambassadorRanks?.[ctx.uid] ?? null;

  return NextResponse.json({
    view,
    cohortId,
    top3: {
      referrals: window.referrals,
      events: window.events,
      reportsOnTime: window.reportsOnTime,
    },
    ownRank,
    updatedAt: data.updatedAt,
    graceEndDate: data.graceEndDate ?? null,
    month: view === "this_month" ? data.thisMonth.month : null,
  });
}
