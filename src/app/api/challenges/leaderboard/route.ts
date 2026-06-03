import { NextResponse } from "next/server";
import {
  getLeaderboard,
  getMonthlyLeaderboard,
} from "@/services/ChallengeService";
import { parseLeaderboardQuery } from "@/lib/challenges";

/**
 * GET /api/challenges/leaderboard
 * Fetches the global all-time leaderboard and the monthly leaderboard.
 * Accepts optional query parameters: 'limit' (number) and 'month' (YYYY-MM).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseLeaderboardQuery(searchParams);

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const [allTimeLeaderboard, monthly] = await Promise.all([
      getLeaderboard(parsed.limit),
      getMonthlyLeaderboard(parsed.month, parsed.limit),
    ]);

    return NextResponse.json(
      {
        leaderboard: allTimeLeaderboard,
        allTimeLeaderboard,
        monthlyLeaderboard: monthly.leaderboard,
        month: monthly.month,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
