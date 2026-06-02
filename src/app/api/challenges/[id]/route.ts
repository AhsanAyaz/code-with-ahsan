import { NextResponse } from "next/server";
import { getChallenge } from "@/services/ChallengeService";

/**
 * GET /api/challenges/[id]
 * Retrieves the details of a single challenge by its ID.
 * Used for the individual challenge dashboard and submission pages.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const challenge = await getChallenge(id);

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ challenge }, { status: 200 });
  } catch (error) {
    console.error('Error fetching challenge:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenge' },
      { status: 500 }
    );
  }
}
