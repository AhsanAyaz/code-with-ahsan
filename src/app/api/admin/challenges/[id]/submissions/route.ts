import { NextRequest, NextResponse } from "next/server";
import { getAllSubmissionsForChallenge, getChallenge } from "@/services/ChallengeService";
import { verifyAdminRequest } from "@/lib/adminAuth";

/**
 * GET /api/admin/challenges/[id]/submissions
 * Retrieves all submissions (all statuses) for a challenge.
 * Admin-only — uses verifyAdminRequest.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await verifyAdminRequest(request))) {
      return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
    }

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
