import { NextRequest, NextResponse } from "next/server";
import { getAllSubmissionsForChallenge, getChallenge } from "@/services/ChallengeService";
import { requireAdminAccess } from "@/lib/adminAccess/server";

/**
 * GET /api/admin/challenges/[id]/submissions
 * Retrieves all submissions (all statuses) for a challenge.
 * Staff only (challenges.read).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireAdminAccess(request, "challenges.read");
    if (!access.ok) return access.response;

    const { id } = await params;
    const challenge = await getChallenge(id);
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    const submissions = await getAllSubmissionsForChallenge(id);
    return NextResponse.json({ challenge, submissions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching admin submissions:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
