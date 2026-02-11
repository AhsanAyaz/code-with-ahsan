import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { addMemberToChannel, sendChannelMessage, lookupMemberByUsername } from "@/lib/discord";
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

    // Only creator can use this endpoint
    if (projectData?.creatorId !== userId) {
      return NextResponse.json(
        { error: "Only the project creator can join via this endpoint" },
        { status: 403 }
      );
    }

    // Check project is active
    if (projectData?.status !== "active") {
      return NextResponse.json(
        { error: "Can only join active projects" },
        { status: 400 }
      );
    }

    // Check not already a member (composite key lookup)
    const memberDocId = `${projectId}_${userId}`;
    const memberRef = db.collection("project_members").doc(memberDocId);
    const existingMember = await memberRef.get();

    if (existingMember.exists) {
      return NextResponse.json(
        { error: "You are already a team member" },
        { status: 409 }
      );
    }

    // Check team capacity using memberCount from project document
    if (projectData?.maxTeamSize && projectData.memberCount >= projectData.maxTeamSize) {
      return NextResponse.json(
        { error: "Team is full" },
        { status: 409 }
      );
    }

    // Fetch creator's profile for member document
    const creatorProfileDoc = await db
      .collection("mentorship_profiles")
      .doc(userId)
      .get();
    const creatorProfileData = creatorProfileDoc.data();

    // Batch write: create member doc + update project
    const batch = db.batch();

    // 1. Create ProjectMember document with composite key
    batch.set(memberRef, {
      projectId,
      userId,
      userProfile: {
        displayName: creatorProfileData?.displayName || projectData?.creatorProfile?.displayName || "",
        photoURL: creatorProfileData?.photoURL || projectData?.creatorProfile?.photoURL || "",
        username: creatorProfileData?.username || projectData?.creatorProfile?.username || "",
        discordUsername: creatorProfileData?.discordUsername || projectData?.creatorProfile?.discordUsername || "",
      },
      role: "member",
      joinedAt: FieldValue.serverTimestamp(),
    });

    // 2. Increment memberCount and update lastActivityAt
    const projectRef = db.collection("projects").doc(projectId);
    batch.update(projectRef, {
      memberCount: FieldValue.increment(1),
      lastActivityAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // Non-blocking Discord operations
    // Creator already has Discord channel access from project approval (createProjectChannel adds creator).
    // Just send a notification message to the channel.
    if (projectData?.discordChannelId) {
      const discordUsername = creatorProfileData?.discordUsername || projectData?.creatorProfile?.discordUsername;
      let tag: string;

      if (discordUsername) {
        try {
          const discordMember = await lookupMemberByUsername(discordUsername);
          tag = discordMember ? `<@${discordMember.id}>` : `**${creatorProfileData?.displayName || "The creator"}**`;
        } catch {
          tag = `**${creatorProfileData?.displayName || "The creator"}**`;
        }
      } else {
        tag = `**${creatorProfileData?.displayName || "The creator"}**`;
      }

      try {
        await sendChannelMessage(
          projectData.discordChannelId,
          `🎉 ${tag} (project creator) has joined the team as a member!`
        );
      } catch (error) {
        console.error("Discord join message failed:", error);
      }

      // If creator somehow doesn't have channel access, add them
      if (discordUsername) {
        try {
          await addMemberToChannel(projectData.discordChannelId, discordUsername);
        } catch (error) {
          console.error("Discord member add failed:", error);
        }
      }
    }

    return NextResponse.json(
      { success: true, message: "Successfully joined the project" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error joining project:", error);
    return NextResponse.json(
      { error: "Failed to join project" },
      { status: 500 }
    );
  }
}
