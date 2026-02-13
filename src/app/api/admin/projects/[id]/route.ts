import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import {
  deleteDiscordChannel,
  getChannel,
  sendDirectMessage,
  createProjectChannel,
  sendProjectDetailsMessage,
} from "@/lib/discord";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Phase 1: Authentication
    const token = request.headers.get("x-admin-token");

    if (!token) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    // Verify admin session
    const sessionDoc = await db.collection("admin_sessions").doc(token).get();

    if (!sessionDoc.exists) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    const session = sessionDoc.data();
    const expiresAt = session?.expiresAt?.toDate?.() || new Date(0);

    if (expiresAt < new Date()) {
      // Session expired, delete it
      await db.collection("admin_sessions").doc(token).delete();
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { action, declineReason } = body;

    // Fetch project doc
    const { id: projectId } = await params;
    const projectRef = db.collection("projects").doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data()!;

    // Handle approve action
    if (action === "approve") {
      // Verify project is pending
      if (projectData.status !== "pending") {
        return NextResponse.json(
          { error: "Only pending projects can be approved" },
          { status: 400 }
        );
      }

      // Update project status to active
      await projectRef.update({
        status: "active",
        approvedAt: FieldValue.serverTimestamp(),
        approvedBy: "admin",
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
      });

      // Fetch full creator profile for Discord username
      const creatorDoc = await db
        .collection("mentorship_profiles")
        .doc(projectData.creatorId)
        .get();
      const creatorData = creatorDoc.exists ? creatorDoc.data() : null;

      // Create Discord channel (non-blocking - log error but don't fail)
      let discordChannelId: string | undefined;
      let discordChannelUrl: string | undefined;

      try {
        const channelResult = await createProjectChannel(
          projectData.title || "Untitled Project",
          projectData.creatorProfile?.displayName || "Creator",
          projectId,
          creatorData?.discordUsername
        );

        if (channelResult) {
          discordChannelId = channelResult.channelId;
          discordChannelUrl = channelResult.channelUrl;

          // Update project with Discord channel info
          await projectRef.update({
            discordChannelId,
            discordChannelUrl,
          });

          // Send and pin project details message
          await sendProjectDetailsMessage(channelResult.channelId, {
            title: projectData.title || "Untitled Project",
            description: projectData.description || "",
            githubRepo: projectData.githubRepo,
            techStack: projectData.techStack || [],
            difficulty: projectData.difficulty || "intermediate",
          });
        }
      } catch (discordError) {
        console.error("Discord channel creation failed:", discordError);
        // Continue - project is still approved even if Discord fails
      }

      return NextResponse.json(
        {
          success: true,
          message: "Project approved and activated",
          discordChannelId,
          discordChannelUrl,
        },
        { status: 200 }
      );
    } else if (action === "decline") {
      // Validate decline reason
      if (!declineReason || typeof declineReason !== "string") {
        return NextResponse.json(
          { error: "Decline reason is required" },
          { status: 400 }
        );
      }

      if (declineReason.length < 10) {
        return NextResponse.json(
          { error: "Decline reason must be at least 10 characters" },
          { status: 400 }
        );
      }

      // Verify project is pending
      if (projectData.status !== "pending") {
        return NextResponse.json(
          { error: "Only pending projects can be declined" },
          { status: 400 }
        );
      }

      // Update project status to declined
      await projectRef.update({
        status: "declined",
        declinedAt: FieldValue.serverTimestamp(),
        declinedBy: "admin",
        declineReason,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Send Discord DM to creator (non-blocking)
      if (projectData.creatorId) {
        try {
          // Fetch creator's Discord username
          const creatorDoc = await db
            .collection("mentorship_profiles")
            .doc(projectData.creatorId)
            .get();

          const creatorData = creatorDoc.exists ? creatorDoc.data() : null;
          const discordUsername = creatorData?.discordUsername;

          if (discordUsername) {
            const siteUrl =
              process.env.NEXT_PUBLIC_SITE_URL || "https://codewithahsan.dev";
            const dmMessage =
              `Your project "${projectData.title}" was not approved.\n\n` +
              `**Reason:** ${declineReason}\n\n` +
              `You can revise and resubmit at ${siteUrl}/projects/create`;
            await sendDirectMessage(discordUsername, dmMessage);
          }
        } catch (error) {
          console.error("Error sending decline notification:", error);
          // Non-blocking - continue even if DM fails
        }
      }

      return NextResponse.json(
        { success: true, message: "Project declined" },
        { status: 200 }
      );
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Phase 1: Authentication and Validation
    const token = request.headers.get("x-admin-token");

    if (!token) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    // Verify admin session
    const sessionDoc = await db.collection("admin_sessions").doc(token).get();

    if (!sessionDoc.exists) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    const session = sessionDoc.data();
    const expiresAt = session?.expiresAt?.toDate?.() || new Date(0);

    if (expiresAt < new Date()) {
      // Session expired, delete it
      await db.collection("admin_sessions").doc(token).delete();
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    // Parse request body for reason
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== "string") {
      return NextResponse.json(
        { error: "Deletion reason is required" },
        { status: 400 }
      );
    }

    if (reason.length < 10) {
      return NextResponse.json(
        { error: "Deletion reason must be at least 10 characters" },
        { status: 400 }
      );
    }

    // Fetch project doc
    const { id: projectId } = await params;
    const projectDoc = await db.collection("projects").doc(projectId).get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data()!;

    // Phase 2: Gather Related Data
    const [membersSnap, applicationsSnap, invitationsSnap] = await Promise.all([
      db.collection("project_members").where("projectId", "==", projectId).get(),
      db.collection("project_applications").where("projectId", "==", projectId).get(),
      db.collection("project_invitations").where("projectId", "==", projectId).get(),
    ]);

    // Collect Discord usernames for notifications
    const discordUsernames = new Set<string>();

    // Add creator
    if (projectData.creatorProfile?.discordUsername) {
      discordUsernames.add(projectData.creatorProfile.discordUsername);
    }

    // Add members
    membersSnap.docs.forEach((doc) => {
      const memberData = doc.data();
      if (memberData.userProfile?.discordUsername) {
        discordUsernames.add(memberData.userProfile.discordUsername);
      }
    });

    // Phase 3: Discord Channel Deletion (fail-fast pattern)
    if (projectData.discordChannelId) {
      // Check if channel exists
      const channel = await getChannel(projectData.discordChannelId);

      if (channel) {
        // Channel exists, try to delete it
        const deleted = await deleteDiscordChannel(
          projectData.discordChannelId,
          `Admin deletion: ${reason}`
        );

        if (!deleted) {
          return NextResponse.json(
            {
              error:
                "Failed to delete Discord channel. Cannot proceed with atomic deletion.",
            },
            { status: 500 }
          );
        }
      }
      // If channel doesn't exist (null from getChannel), treat as success
    }

    // Phase 4: Firestore Atomic Batch Delete
    const MAX_BATCH_SIZE = 500;
    const allDocs = [
      projectDoc.ref,
      ...membersSnap.docs.map((d) => d.ref),
      ...applicationsSnap.docs.map((d) => d.ref),
      ...invitationsSnap.docs.map((d) => d.ref),
    ];

    // Split into batches of 500
    for (let i = 0; i < allDocs.length; i += MAX_BATCH_SIZE) {
      const batch = db.batch();
      const chunk = allDocs.slice(i, i + MAX_BATCH_SIZE);
      chunk.forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    // Phase 5: Notifications (non-blocking, best-effort)
    const notificationMessage =
      `**Project Deleted by Administrator**\n\n` +
      `The project "${projectData.title}" has been deleted by an admin.\n\n` +
      `**Reason:** ${reason}\n\n` +
      `If you have questions, please contact the community moderators.`;

    const notificationResults = await Promise.allSettled(
      Array.from(discordUsernames).map((username) =>
        sendDirectMessage(username, notificationMessage)
      )
    );

    const notificationSuccess = notificationResults.filter(
      (r) => r.status === "fulfilled" && r.value === true
    ).length;
    const notificationFailed = notificationResults.length - notificationSuccess;

    // Phase 6: Response
    return NextResponse.json(
      {
        success: true,
        message: "Project and all related data deleted successfully",
        summary: {
          projectTitle: projectData.title,
          membersRemoved: membersSnap.size,
          applicationsDeleted: applicationsSnap.size,
          invitationsDeleted: invitationsSnap.size,
          discordChannelDeleted: !!projectData.discordChannelId,
          membersNotified: notificationSuccess,
          notificationsFailed: notificationFailed,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Phase 1: Authentication
    const token = request.headers.get("x-admin-token");

    if (!token) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    // Verify admin session
    const sessionDoc = await db.collection("admin_sessions").doc(token).get();

    if (!sessionDoc.exists) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    const session = sessionDoc.data();
    const expiresAt = session?.expiresAt?.toDate?.() || new Date(0);

    if (expiresAt < new Date()) {
      // Session expired, delete it
      await db.collection("admin_sessions").doc(token).delete();
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    // Phase 2: Parse and validate request
    const { id } = await params;
    const body = await request.json();

    // Allowed editable fields
    const { title, description, githubRepo, techStack, difficulty, maxTeamSize } = body;

    // Validation
    if (title !== undefined) {
      if (typeof title !== "string" || title.length < 3 || title.length > 100) {
        return NextResponse.json(
          { error: "Title must be between 3 and 100 characters" },
          { status: 400 }
        );
      }
    }

    if (description !== undefined) {
      if (typeof description !== "string" || description.length < 10 || description.length > 2000) {
        return NextResponse.json(
          { error: "Description must be between 10 and 2000 characters" },
          { status: 400 }
        );
      }
    }

    if (githubRepo !== undefined && githubRepo !== null && githubRepo !== "") {
      // Basic GitHub URL validation (https://github.com/...)
      if (!githubRepo.startsWith("https://github.com/")) {
        return NextResponse.json(
          { error: "GitHub URL must start with https://github.com/" },
          { status: 400 }
        );
      }
    }

    if (techStack !== undefined && !Array.isArray(techStack)) {
      return NextResponse.json(
        { error: "techStack must be an array" },
        { status: 400 }
      );
    }

    if (difficulty !== undefined) {
      if (!["beginner", "intermediate", "advanced"].includes(difficulty)) {
        return NextResponse.json(
          { error: "Invalid difficulty level" },
          { status: 400 }
        );
      }
    }

    if (maxTeamSize !== undefined) {
      if (typeof maxTeamSize !== "number" || maxTeamSize < 1 || maxTeamSize > 20) {
        return NextResponse.json(
          { error: "maxTeamSize must be between 1 and 20" },
          { status: 400 }
        );
      }
    }

    // Phase 3: Fetch project
    const projectRef = db.collection("projects").doc(id);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Phase 4: Build update object with only provided fields
    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
      lastActivityAt: FieldValue.serverTimestamp(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (githubRepo !== undefined) {
      // Allow clearing GitHub repo by passing empty string
      updateData.githubRepo = githubRepo || FieldValue.delete();
    }
    if (techStack !== undefined) updateData.techStack = techStack;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (maxTeamSize !== undefined) updateData.maxTeamSize = maxTeamSize;

    // Phase 5: Update project
    await projectRef.update(updateData);

    // Phase 6: Fetch updated project
    const updatedDoc = await projectRef.get();
    const updatedData = updatedDoc.data();

    const project = {
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: updatedData?.updatedAt?.toDate?.()?.toISOString() || null,
      approvedAt: updatedData?.approvedAt?.toDate?.()?.toISOString() || null,
      lastActivityAt: updatedData?.lastActivityAt?.toDate?.()?.toISOString() || null,
      completedAt: updatedData?.completedAt?.toDate?.()?.toISOString() || null,
    };

    return NextResponse.json(
      { success: true, project },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}
