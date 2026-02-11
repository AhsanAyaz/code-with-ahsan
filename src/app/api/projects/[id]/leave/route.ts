import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { removeMemberFromChannel, sendChannelMessage, lookupMemberByUsername } from "@/lib/discord";
import { verifyAuth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const userId = authResult.uid;

    // Fetch project
    const projectDoc = await db.collection("projects").doc(projectId).get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();

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

    const memberData = memberDoc.data();

    // Fetch member's profile for Discord username
    const memberProfileDoc = await db
      .collection("mentorship_profiles")
      .doc(userId)
      .get();
    const memberProfileData = memberProfileDoc.data();

    // Non-blocking Discord operations: message first, then remove
    if (projectData?.discordChannelId) {
      // Resolve Discord username with fallback
      const discordUsername = memberProfileData?.discordUsername || memberData?.userProfile?.discordUsername;

      // Look up Discord member for tagging
      let tag: string;
      if (discordUsername) {
        try {
          const discordMember = await lookupMemberByUsername(discordUsername);
          tag = discordMember ? `<@${discordMember.id}>` : `**${memberProfileData?.displayName || "A member"}**`;
        } catch {
          tag = `**${memberProfileData?.displayName || "A member"}**`;
        }
      } else {
        tag = `**${memberProfileData?.displayName || "A member"}**`;
      }

      // Send departure message to project channel first
      try {
        await sendChannelMessage(
          projectData.discordChannelId,
          `📤 ${tag} has left the project.`
        );
      } catch (channelMsgError) {
        console.error("Discord channel departure message failed:", channelMsgError);
      }

      // Then remove from Discord channel (skip if user is the creator)
      if (discordUsername && userId !== projectData?.creatorId) {
        try {
          await removeMemberFromChannel(
            projectData.discordChannelId,
            discordUsername
          );
        } catch (discordError) {
          console.error("Discord member removal failed:", discordError);
        }
      }
    }

    // Use Firestore batch for atomicity
    const batch = db.batch();

    // 1. Delete project_members document
    batch.delete(memberRef);

    // 2. Delete related project_applications document
    const applicationRef = db
      .collection("project_applications")
      .doc(`${projectId}_${userId}`);
    batch.delete(applicationRef);

    // 3. Update project lastActivityAt and decrement memberCount
    const projectRef = db.collection("projects").doc(projectId);
    batch.update(projectRef, {
      lastActivityAt: FieldValue.serverTimestamp(),
      memberCount: FieldValue.increment(-1),
    });

    // Commit batch
    await batch.commit();

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
