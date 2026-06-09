import { NextRequest, NextResponse } from "next/server";
import {
  getChallenge,
  getChallengeParticipantsCount,
  isChallengeParticipant,
  joinChallenge,
} from "@/services/ChallengeService";
import { verifyAuth } from "@/lib/auth";
import { getChallengeParticipantProfile } from "@/lib/challengeProfiles";

/**
 * GET /api/challenges/[id]/participants
 * Retrieves participation metrics for a specific challenge.
 * Returns the total participant count and whether the currently
 * authenticated user has already joined.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const challenge = await getChallenge(id);

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 },
      );
    }

    const authResult = await verifyAuth(request);
    const joined = authResult
      ? await isChallengeParticipant(id, authResult.uid)
      : false;

    const count = await getChallengeParticipantsCount(id);
    return NextResponse.json({ joined, count }, { status: 200 });
  } catch (error) {
    console.error("Error fetching challenge participant status:", error);
    return NextResponse.json(
      { error: "Failed to fetch participant status" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/challenges/[id]/participants
 * Enrolls the currently authenticated user in a specific challenge.
 * Requires the user to be logged in and the challenge to not be in the 'past'.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const userId = authResult.uid;
    const { id: challengeId } = await params;

    const challenge = await getChallenge(challengeId);
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 },
      );
    }

    if (challenge.status === "past") {
      return NextResponse.json(
        { error: "Cannot join a challenge that has already ended" },
        { status: 400 },
      );
    }

    const { userName, userAvatar, email, discordUsername } =
      await getChallengeParticipantProfile(userId);

    const participant = await joinChallenge({
      challengeId,
      userId,
      userName,
      userAvatar,
      email,
      discordUsername,
    });

    return NextResponse.json({ success: true, participant }, { status: 201 });
  } catch (error) {
    console.error("Error joining challenge:", error);
    return NextResponse.json(
      { error: "Failed to join challenge" },
      { status: 500 },
    );
  }
}
