import { NextResponse } from "next/server";
import { getChallenges } from "@/services/ChallengeService";
import { ChallengeStatus } from "@/types/challenges";
import { isChallengeStatus } from "@/lib/challenges";

/**
 * GET /api/challenges
 * Retrieves a list of challenges, optionally filtered by status.
 * Used for the main challenges archive and spotlight views.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ChallengeStatus | null;

    if (status && !isChallengeStatus(status)) {
      return NextResponse.json(
        { error: "Invalid challenge status" },
        { status: 400 }
      );
    }

    const challenges = await getChallenges(status || undefined);

    return NextResponse.json({ challenges }, { status: 200 });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
}
