import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { addMemberToChannel, sendChannelMessage, sendDirectMessage, lookupMemberByUsername } from "@/lib/discord";
import { verifyAuth } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: projectId, userId } = await params;
    const body = await request.json();
    const { action } = body;

    // Validate action
    if (!action || !["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    // Find invitation by composite key
    const invitationId = `${projectId}_${userId}`;
    const invitationRef = db
      .collection("project_invitations")
      .doc(invitationId);
    const invitationDoc = await invitationRef.get();

    if (!invitationDoc.exists) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const invitationData = invitationDoc.data();

    if (action === "accept") {
      // Fetch project for Discord info and capacity check
      const projectDoc = await db.collection("projects").doc(projectId).get();
      const projectData = projectDoc.data();

      // Enforce maxTeamSize: count current members
      const membersSnapshot = await db
        .collection("project_members")
        .where("projectId", "==", projectId)
        .count()
        .get();
      const currentMemberCount = membersSnapshot.data().count;

      if (projectData?.maxTeamSize && currentMemberCount >= projectData.maxTeamSize) {
        return NextResponse.json(
          { error: "Team is full. Maximum team size reached." },
          { status: 409 }
        );
      }

      // Fetch user profile for Discord username
      const userDoc = await db
        .collection("mentorship_profiles")
        .doc(userId)
        .get();
      const userData = userDoc.data();

      // Check for any existing application for this user+project
      const applicationRef = db.collection("project_applications").doc(invitationId);
      const applicationDoc = await applicationRef.get();

      // Use Firestore batch for atomicity
      const batch = db.batch();

      // 1. Delete invitation (accepted invitations are removed)
      batch.delete(invitationRef);

      // 2. Delete any existing application for this user+project (regardless of status)
      if (applicationDoc.exists) {
        batch.delete(applicationRef);
      }

      // 3. Create project_members document
      const memberId = `${projectId}_${userId}`;
      const memberRef = db.collection("project_members").doc(memberId);
      batch.set(memberRef, {
        projectId,
        userId,
        userProfile: invitationData?.userProfile || {
          displayName: userData?.displayName || "",
          photoURL: userData?.photoURL || "",
          username: userData?.username,
          discordUsername: userData?.discordUsername,
        },
        role: "member",
        joinedAt: FieldValue.serverTimestamp(),
      });

      // 4. Update project lastActivityAt and increment memberCount
      const projectRef = db.collection("projects").doc(projectId);
      batch.update(projectRef, {
        lastActivityAt: FieldValue.serverTimestamp(),
        memberCount: FieldValue.increment(1),
      });

      // Commit batch
      await batch.commit();

      // Non-blocking Discord operations
      const projectTitle = projectData?.title || "Untitled Project";

      if (projectData?.discordChannelId && userData?.discordUsername) {
        // Look up Discord member for tagging
        let discordUserId: string | null = null;
        try {
          const member = await lookupMemberByUsername(userData.discordUsername);
          discordUserId = member?.id || null;
        } catch {
          // Continue without tag
        }

        // Add to Discord channel first
        try {
          await addMemberToChannel(
            projectData.discordChannelId,
            userData.discordUsername
          );
        } catch (discordError) {
          console.error("Discord member add failed:", discordError);
        }

        // Send welcome message with tag to project channel
        try {
          const tag = discordUserId
            ? `<@${discordUserId}>`
            : `**${userData?.displayName || "A new member"}**`;
          await sendChannelMessage(
            projectData.discordChannelId,
            `👋 ${tag} has joined the project! Welcome to the team!`
          );
        } catch (channelMsgError) {
          console.error("Discord channel welcome message failed:", channelMsgError);
        }

        // Send DM to the member
        try {
          const siteUrl =
            process.env.NEXT_PUBLIC_SITE_URL || "https://codewithahsan.dev";
          const dmMessage =
            `You've joined **"${projectTitle}"**! 🎉\n\n` +
            (projectData?.discordChannelUrl
              ? `Project channel: ${projectData.discordChannelUrl}\n\n`
              : "") +
            `View the project: ${siteUrl}/projects/${projectId}`;
          await sendDirectMessage(userData.discordUsername, dmMessage);
        } catch (dmError) {
          console.error("Discord DM failed:", dmError);
        }
      }

      return NextResponse.json(
        { success: true, message: "Invitation accepted" },
        { status: 200 }
      );
    } else if (action === "decline") {
      // Update invitation status to declined
      await invitationRef.update({
        status: "declined",
        declinedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        { success: true, message: "Invitation declined" },
        { status: 200 }
      );
    }

    // Should never reach here
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing invitation:", error);
    return NextResponse.json(
      { error: "Failed to process invitation" },
      { status: 500 }
    );
  }
}
