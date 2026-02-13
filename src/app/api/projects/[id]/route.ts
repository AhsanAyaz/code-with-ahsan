import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import {
  createProjectChannel,
  sendProjectDetailsMessage,
  archiveProjectChannel,
  sendDirectMessage,
} from "@/lib/discord";
import { verifyAuth } from "@/lib/auth";
import { canDeleteProject } from "@/lib/permissions";
import { auth } from "@/lib/firebaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch project document
    const projectRef = db.collection("projects").doc(id);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();

    // Convert Firestore Timestamps to ISO strings for JSON serialization
    const project = {
      id: projectDoc.id,
      ...projectData,
      createdAt: projectData?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: projectData?.updatedAt?.toDate?.()?.toISOString() || null,
      approvedAt: projectData?.approvedAt?.toDate?.()?.toISOString() || null,
      lastActivityAt: projectData?.lastActivityAt?.toDate?.()?.toISOString() || null,
      completedAt: projectData?.completedAt?.toDate?.()?.toISOString() || null,
    };

    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Phase 1: Authentication - check admin token OR Firebase auth
    let userId: string | null = null;
    let isAdmin = false;

    // Check for admin token first
    const adminToken = request.headers.get("x-admin-token");
    if (adminToken) {
      const sessionDoc = await db.collection("admin_sessions").doc(adminToken).get();

      if (sessionDoc.exists) {
        const session = sessionDoc.data();
        const expiresAt = session?.expiresAt?.toDate?.() || new Date(0);

        if (expiresAt >= new Date()) {
          // Valid admin session
          userId = session?.adminId;
          isAdmin = true;
        }
      }
    }

    // If not admin, try Firebase auth via verifyAuth (existing pattern)
    let authResult = null;
    if (!userId) {
      authResult = await verifyAuth(request);
      if (authResult) {
        userId = authResult.uid;
      }
    }

    // If still no userId, authentication failed
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action, declineReason, demoUrl, demoDescription, title, description, githubRepo, techStack, difficulty, maxTeamSize } = body;

    // Fetch project document
    const projectRef = db.collection("projects").doc(id);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();

    // Determine if this is a field update request (vs action-based)
    const isFieldUpdate = !action && (title !== undefined || description !== undefined || githubRepo !== undefined || techStack !== undefined || difficulty !== undefined || maxTeamSize !== undefined);

    if (isFieldUpdate) {
      // Field update flow: edit project fields
      // Phase 2: Authorization check
      if (!isAdmin) {
        // Non-admin: must be creator and project must be pending or declined
        if (projectData?.creatorId !== userId) {
          return NextResponse.json(
            { error: "You can only edit your own projects" },
            { status: 403 }
          );
        }

        if (projectData?.status !== "pending" && projectData?.status !== "declined") {
          return NextResponse.json(
            { error: "You can only edit pending or declined projects" },
            { status: 403 }
          );
        }
      }
      // Admin can edit any project at any status

      // Phase 3: Validation
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
        // Basic GitHub URL validation
        if (!githubRepo.startsWith("https://github.com/")) {
          return NextResponse.json(
            { error: "GitHub URL must start with https://github.com/" },
            { status: 400 }
          );
        }
      }

      if (techStack !== undefined) {
        if (!Array.isArray(techStack)) {
          return NextResponse.json(
            { error: "techStack must be an array" },
            { status: 400 }
          );
        }
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

      // Phase 4: Build update object
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

      // Phase 6: Fetch and return updated project
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
    }

    // Action-based flow (existing logic)
    // Handle different actions
    if (action === "approve") {
      // Update project status to active
      await projectRef.update({
        status: "active",
        approvedAt: FieldValue.serverTimestamp(),
        approvedBy: userId,
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
      });

      // Fetch full creator profile for Discord username
      const creatorDoc = await db
        .collection("mentorship_profiles")
        .doc(projectData?.creatorId)
        .get();
      const creatorData = creatorDoc.exists ? creatorDoc.data() : null;

      // Create Discord channel (non-blocking - log error but don't fail)
      let discordChannelId: string | undefined;
      let discordChannelUrl: string | undefined;

      try {
        const channelResult = await createProjectChannel(
          projectData?.title || "Untitled Project",
          projectData?.creatorProfile?.displayName || "Creator",
          id,
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
            title: projectData?.title || "Untitled Project",
            description: projectData?.description || "",
            githubRepo: projectData?.githubRepo,
            techStack: projectData?.techStack || [],
            difficulty: projectData?.difficulty || "intermediate",
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
      // Send decline reason to project creator via Discord DM (non-blocking)
      if (declineReason && projectData?.creatorId) {
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
          // Non-blocking - continue with deletion even if DM fails
        }
      }

      // Soft-delete: mark as declined instead of permanent deletion
      await projectRef.update({
        status: "declined",
        declinedAt: FieldValue.serverTimestamp(),
        declinedBy: userId,
        declineReason: declineReason || null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        { success: true, message: "Project declined" },
        { status: 200 }
      );
    } else if (action === "complete") {
      // Verify creator owns the project
      if (projectData?.creatorId !== userId) {
        return NextResponse.json(
          {
            error: "Permission denied",
            message: "Only the project creator can complete the project",
          },
          { status: 403 }
        );
      }

      // Validate demo URL if provided
      if (demoUrl) {
        try {
          const url = new URL(demoUrl);
          if (url.protocol !== "https:") {
            return NextResponse.json(
              {
                error: "Invalid demo URL",
                message: "Demo URL must use HTTPS protocol",
              },
              { status: 400 }
            );
          }
        } catch (error) {
          return NextResponse.json(
            {
              error: "Invalid demo URL",
              message: "Please provide a valid URL",
            },
            { status: 400 }
          );
        }
      }

      // Validate demo description if provided
      if (demoDescription && typeof demoDescription === "string") {
        if (demoDescription.length > 1000) {
          return NextResponse.json(
            {
              error: "Invalid demo description",
              message: "Demo description must be 1000 characters or less",
            },
            { status: 400 }
          );
        }
      }

      // Update project status to completed
      await projectRef.update({
        status: "completed",
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
        ...(demoUrl && { demoUrl }),
        ...(demoDescription && { demoDescription }),
      });

      // Archive Discord channel if it exists
      if (projectData?.discordChannelId) {
        try {
          await archiveProjectChannel(
            projectData.discordChannelId,
            projectData?.title || "Untitled Project"
          );
        } catch (discordError) {
          console.error("Discord channel archival failed:", discordError);
          // Continue - project is still completed even if archival fails
        }
      }

      return NextResponse.json(
        { success: true, message: "Project completed" },
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
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Fetch project document
    const projectRef = db.collection("projects").doc(id);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();

    // Fetch user profile to check admin status
    const userDoc = await db.collection("mentorship_profiles").doc(authResult.uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    // Check permission using canDeleteProject
    const permissionUser = {
      uid: authResult.uid,
      role: userData?.role || null,
      isAdmin: userData?.isAdmin === true,
    };

    const canDelete = canDeleteProject(permissionUser, {
      ...projectData,
      id,
    } as any);

    if (!canDelete) {
      return NextResponse.json(
        {
          error: "Permission denied",
          message: projectData?.status === "declined"
            ? "Only the project creator can delete declined projects"
            : "Only declined projects can be deleted by creators (admins can delete any project)",
        },
        { status: 403 }
      );
    }

    // Permanently delete the project document
    await projectRef.delete();

    return NextResponse.json(
      { success: true, message: "Project deleted successfully" },
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
