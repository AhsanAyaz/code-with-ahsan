import { NextRequest, NextResponse } from "next/server";
import { getChallenge, updateChallenge } from "@/services/ChallengeService";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { parseChallengeUpdatePayload } from "@/lib/challenges";

/**
 * GET /api/admin/challenges/[id]
 * Retrieves a single challenge for the admin edit page.
 * Requires admin authentication.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await verifyAdminRequest(request))) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const challenge = await getChallenge(id);
    if (!challenge) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ challenge }, { status: 200 });
  } catch (error) {
    console.error("Error fetching admin challenge:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/challenges/[id]
 * Updates an existing challenge.
 * Requires admin authentication and only updates provided fields.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await verifyAdminRequest(request))) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const parsed = parseChallengeUpdatePayload(await request.json());
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      );
    }

    await updateChallenge(id, parsed.data);
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating challenge:", error);
    return NextResponse.json(
      { error: "Failed to update challenge" },
      { status: 500 }
    );
  }
}
