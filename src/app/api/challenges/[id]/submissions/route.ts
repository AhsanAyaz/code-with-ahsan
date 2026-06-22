import { NextRequest, NextResponse } from "next/server";
import {
  createSubmission,
  DuplicateSubmissionError,
  NotJoinedChallengeError,
  getChallenge,
  getSubmissionsForChallenge,
} from "@/services/ChallengeService";
import { verifyAuth } from "@/lib/auth";
import { getChallengeParticipantProfile } from "@/lib/challengeProfiles";
import { validateGitHubUrl, isValidLinkedInUrl } from "@/lib/validation/urls";

function isValidHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * GET /api/challenges/[id]/submissions
 * Retrieves a list of approved submissions for a specific challenge.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const submissions = await getSubmissionsForChallenge(id);
    return NextResponse.json({ submissions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/challenges/[id]/submissions
 * Creates a new project submission for a challenge.
 * Validates authentication, challenge status, and payload formats
 * (e.g., verifying it's a valid GitHub URL).
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

    if (challenge.status !== "active") {
      return NextResponse.json(
        { error: "This challenge is not currently active" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { repoUrl, demoUrl, linkedinUrl, description } = body;

    if (!repoUrl || typeof repoUrl !== "string") {
      return NextResponse.json(
        { error: "Repository URL is required" },
        { status: 400 },
      );
    }

    try {
      validateGitHubUrl(repoUrl);
    } catch {
      return NextResponse.json(
        { error: "Repository URL must be a valid GitHub repository URL" },
        { status: 400 },
      );
    }

    if (!linkedinUrl || typeof linkedinUrl !== "string") {
      return NextResponse.json(
        { error: "LinkedIn post URL is required" },
        { status: 400 },
      );
    }

    if (!isValidLinkedInUrl(linkedinUrl)) {
      return NextResponse.json(
        { error: "LinkedIn post URL must be a valid LinkedIn URL" },
        { status: 400 },
      );
    }

    if (demoUrl && (typeof demoUrl !== "string" || !isValidHttpUrl(demoUrl))) {
      return NextResponse.json(
        { error: "Demo URL must be a valid URL" },
        { status: 400 },
      );
    }

    if (
      description &&
      (typeof description !== "string" || description.length > 1000)
    ) {
      return NextResponse.json(
        { error: "Description must be 1000 characters or less" },
        { status: 400 },
      );
    }

    const { userName, userAvatar } =
      await getChallengeParticipantProfile(userId);

    const submission = await createSubmission({
      challengeId,
      userId,
      userName,
      userAvatar,
      repoUrl,
      demoUrl: demoUrl || undefined,
      linkedinUrl: linkedinUrl.trim(),
      description: description || "",
    });

    return NextResponse.json({ success: true, submission }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof NotJoinedChallengeError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Failed to submit project" },
      { status: 500 },
    );
  }
}
