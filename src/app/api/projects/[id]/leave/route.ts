import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { removeMemberFromChannel } from "@/lib/discord";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { userId } = body;

    // Validate userId
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Fetch project
    const projectDoc = await db.collection("projects").doc(projectId).get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();

    // Prevent creator from leaving
    if (projectData?.creatorId === userId) {
      return NextResponse.json(
        {
          error: "Project creator cannot leave. Transfer ownership first.",
        },
        { status: 403 }
      );
    }

    // Find member document by composite key
    const memberDocId = `${projectId}_${userId}`;
    const memberRef = db.collection("project_members").doc(memberDocId);
    const memberDoc = await memberRef.get();

    if (!memberDoc.exists) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Fetch member's profile for Discord username
    const memberProfileDoc = await db
      .collection("mentorship_profiles")
      .doc(userId)
      .get();
    const memberProfileData = memberProfileDoc.data();

    // Use Firestore batch for atomicity
    const batch = db.batch();

    // 1. Delete project_members document
    batch.delete(memberRef);

    // 2. Update project lastActivityAt and decrement memberCount
    const projectRef = db.collection("projects").doc(projectId);
    batch.update(projectRef, {
      lastActivityAt: FieldValue.serverTimestamp(),
      memberCount: FieldValue.increment(-1),
    });

    // Commit batch
    await batch.commit();

    // Non-blocking: Remove from Discord channel
    if (projectData?.discordChannelId && memberProfileData?.discordUsername) {
      try {
        await removeMemberFromChannel(
          projectData.discordChannelId,
          memberProfileData.discordUsername
        );
      } catch (discordError) {
        console.error("Discord member removal failed:", discordError);
        // Continue - member removed from Firestore even if Discord fails
      }
    }

    return NextResponse.json(
      { success: true, message: "Successfully left the project" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error leaving project:", error);
    return NextResponse.json(
      { error: "Failed to leave project" },
      { status: 500 }
    );
  }
}
