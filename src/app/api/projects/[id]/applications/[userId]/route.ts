import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { addMemberToChannel, sendDirectMessage, sendChannelMessage, lookupMemberByUsername } from "@/lib/discord";
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
    const { action, feedback } = body;

    // Validate action
    if (!action || !["approve", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'decline'" },
        { status: 400 }
      );
    }

    // Find application by composite key
    const applicationId = `${projectId}_${userId}`;
    const applicationRef = db
      .collection("project_applications")
      .doc(applicationId);
    const applicationDoc = await applicationRef.get();

    if (!applicationDoc.exists) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const applicationData = applicationDoc.data();

    if (action === "approve") {
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

      // Check for stale invitation to delete (must happen before batch)
      const staleInvitationRef = db.collection("project_invitations").doc(applicationId);
      const staleInvitationDoc = await staleInvitationRef.get();

      // Use Firestore batch for atomicity
      const batch = db.batch();

      // 1. Update application status to approved
      batch.update(applicationRef, {
        status: "approved",
        approvedAt: FieldValue.serverTimestamp(),
      });

      // 2. Create project_members document
      const memberId = `${projectId}_${userId}`;
      const memberRef = db.collection("project_members").doc(memberId);
      batch.set(memberRef, {
        projectId,
        userId,
        userProfile: applicationData?.userProfile || {
          displayName: userData?.displayName || "",
          photoURL: userData?.photoURL || "",
          username: userData?.username,
          discordUsername: userData?.discordUsername,
        },
        role: "member",
        joinedAt: FieldValue.serverTimestamp(),
      });

      // 3. Update project lastActivityAt and increment memberCount
      const projectRef = db.collection("projects").doc(projectId);
      batch.update(projectRef, {
        lastActivityAt: FieldValue.serverTimestamp(),
        memberCount: FieldValue.increment(1),
      });

      // 4. Delete any stale invitation for this user+project (e.g., previously declined)
      if (staleInvitationDoc.exists) {
        batch.delete(staleInvitationRef);
      }

      // Commit batch
      await batch.commit();

      // Non-blocking Discord operations
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://codewithahsan.dev";
      const projectTitle = projectData?.title || "Untitled Project";

      if (projectData?.discordChannelId && userData?.discordUsername) {
        // Look up Discord member to get their ID for tagging
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
          const tag = discordUserId ? `<@${discordUserId}>` : `**${applicationData?.userProfile?.displayName || userData?.displayName || "A new member"}**`;
          await sendChannelMessage(
            projectData.discordChannelId,
            `👋 ${tag} has joined the project! Welcome to the team!`
          );
        } catch (channelMsgError) {
          console.error("Discord channel welcome message failed:", channelMsgError);
        }

        // Send approval DM
        try {
          const dmMessage =
            `Your application to join **"${projectTitle}"** has been approved! 🎉\n\n` +
            (projectData?.discordChannelUrl
              ? `Join the project channel: ${projectData.discordChannelUrl}\n\n`
              : "") +
            `View the project: ${siteUrl}/projects/${projectId}`;
          await sendDirectMessage(userData.discordUsername, dmMessage);
        } catch (dmError) {
          console.error("Discord approval DM failed:", dmError);
        }
      }

      return NextResponse.json(
        { success: true, message: "Application approved" },
        { status: 200 }
      );
    } else if (action === "decline") {
      // Fetch user profile for Discord DM
      const userDoc = await db
        .collection("mentorship_profiles")
        .doc(userId)
        .get();
      const userData = userDoc.data();

      // Update application status to declined
      await applicationRef.update({
        status: "declined",
        declinedAt: FieldValue.serverTimestamp(),
        feedback: feedback || null,
      });

      // Non-blocking: Send decline DM
      if (userData?.discordUsername) {
        try {
          const projectDoc = await db.collection("projects").doc(projectId).get();
          const projectTitle = projectDoc.data()?.title || "Untitled Project";
          const dmMessage =
            `Your application to join **"${projectTitle}"** was not approved.\n\n` +
            (feedback ? `**Feedback:** ${feedback}\n\n` : "") +
            `You can browse other projects at ${process.env.NEXT_PUBLIC_SITE_URL || "https://codewithahsan.dev"}/projects/discover`;
          await sendDirectMessage(userData.discordUsername, dmMessage);
        } catch (dmError) {
          console.error("Discord decline DM failed:", dmError);
        }
      }

      return NextResponse.json(
        { success: true, message: "Application declined" },
        { status: 200 }
      );
    }

    // Should never reach here
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing application:", error);
    return NextResponse.json(
      { error: "Failed to process application" },
      { status: 500 }
    );
  }
}
