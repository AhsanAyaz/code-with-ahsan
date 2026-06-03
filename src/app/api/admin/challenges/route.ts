import { NextRequest, NextResponse } from "next/server";
import { createChallenge, getChallenges } from "@/services/ChallengeService";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { parseChallengeCreatePayload } from "@/lib/challenges";
import { announceChallenge, isDiscordConfigured } from "@/lib/discord";

/**
 * GET /api/admin/challenges
 * Retrieves all challenges for the admin dashboard.
 * Requires admin authentication.
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await verifyAdminRequest(request))) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    const challenges = await getChallenges();
    return NextResponse.json({ challenges }, { status: 200 });
  } catch (error) {
    console.error("Error fetching admin challenges:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenges" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/challenges
 * Creates a new challenge.
 * Requires admin authentication and validates the incoming payload.
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await verifyAdminRequest(request))) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    const parsed = parseChallengeCreatePayload(await request.json());
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      );
    }

    const challenge = await createChallenge(parsed.data);

    if (challenge.status === "active" && isDiscordConfigured()) {
      try {
        await announceChallenge(challenge);
      } catch (err) {
        console.error("Failed to send Discord challenge announcement:", err);
      }
    }

    return NextResponse.json({ success: true, challenge }, { status: 201 });
  } catch (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json(
      { error: "Failed to create challenge" },
      { status: 500 }
    );
  }
}
