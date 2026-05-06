/**
 * Phase 5 (DASH-07): Cohort leaderboard view endpoint.
 *
 * GET /api/ambassador/dashboard/leaderboard?view=cumulative|this_month
 *   Default view = "cumulative".
 *   Reads: leaderboard_snapshots/{currentCohortId} (single doc; written hourly by Plan 02 cron)
 *
 * CRITICAL (RESEARCH §"Anti-Patterns to Avoid"):
 *   - The full ambassadorRanks map MUST NOT leak to the client.
 *   - Return only `top3` per category + ownRank for the requesting ambassador.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/auth";
import { hasRoleClaim, type DecodedRoleClaim } from "@/lib/permissions";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { LEADERBOARD_SNAPSHOTS_COLLECTION } from "@/lib/ambassador/constants";
import { getCurrentCohortId } from "@/lib/ambassador/currentCohort";
import type { LeaderboardSnapshot } from "@/lib/ambassador/leaderboard";

function isoOrNull(v: unknown): string | null {
  if (!v) return null;
  const t = v as { toDate?: () => Date };
  if (typeof t.toDate === "function") return t.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return null;
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

  const snap = await db
    .collection(LEADERBOARD_SNAPSHOTS_COLLECTION)
    .doc(cohortId)
    .get();

  if (!snap.exists) {
    return NextResponse.json({ snapshot: null }, { status: 200 });
  }

  const data = snap.data() as LeaderboardSnapshot & {
    updatedAt?: { toDate?: () => Date } | string;
  };
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
    updatedAt: isoOrNull(data.updatedAt),
    graceEndDate: data.graceEndDate ?? null,
    month: view === "this_month" ? data.thisMonth.month : null,
  });
}
