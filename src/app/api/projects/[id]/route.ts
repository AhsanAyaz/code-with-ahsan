import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { canApproveProject } from "@/lib/permissions";
import {
  createProjectChannel,
  sendProjectDetailsMessage,
  archiveProjectChannel,
} from "@/lib/discord";
import type { PermissionUser } from "@/lib/permissions";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, adminId, creatorId, declineReason } = body;

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

    // Handle different actions
    if (action === "approve") {
      if (!adminId) {
        return NextResponse.json(
          { error: "Admin ID is required for approval" },
          { status: 400 }
        );
      }

      // Fetch admin profile and check permission
      const adminDoc = await db
        .collection("mentorship_profiles")
        .doc(adminId)
        .get();

      if (!adminDoc.exists) {
        return NextResponse.json(
          { error: "Admin profile not found" },
          { status: 404 }
        );
      }

      const adminData = adminDoc.data();
      const permissionUser: PermissionUser = {
        uid: adminId,
        role: adminData?.role || null,
        status: adminData?.status,
        isAdmin: adminData?.isAdmin,
      };

      if (!canApproveProject(permissionUser, projectData as any)) {
        return NextResponse.json(
          {
            error: "Permission denied",
            message: "Only admins can approve projects",
          },
          { status: 403 }
        );
      }

      // Update project status to active
      await projectRef.update({
        status: "active",
        approvedAt: FieldValue.serverTimestamp(),
        approvedBy: adminId,
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
      if (!adminId) {
        return NextResponse.json(
          { error: "Admin ID is required for declining" },
          { status: 400 }
        );
      }

      // Fetch admin profile and check permission
      const adminDoc = await db
        .collection("mentorship_profiles")
        .doc(adminId)
        .get();

      if (!adminDoc.exists) {
        return NextResponse.json(
          { error: "Admin profile not found" },
          { status: 404 }
        );
      }

      const adminData = adminDoc.data();
      const permissionUser: PermissionUser = {
        uid: adminId,
        role: adminData?.role || null,
        status: adminData?.status,
        isAdmin: adminData?.isAdmin,
      };

      if (!canApproveProject(permissionUser, projectData as any)) {
        return NextResponse.json(
          {
            error: "Permission denied",
            message: "Only admins can decline projects",
          },
          { status: 403 }
        );
      }

      // Update project status to declined
      await projectRef.update({
        status: "declined",
        declineReason: declineReason || "No reason provided",
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        { success: true, message: "Project declined" },
        { status: 200 }
      );
    } else if (action === "complete") {
      if (!creatorId) {
        return NextResponse.json(
          { error: "Creator ID is required for completion" },
          { status: 400 }
        );
      }

      // Verify creator owns the project
      if (projectData?.creatorId !== creatorId) {
        return NextResponse.json(
          {
            error: "Permission denied",
            message: "Only the project creator can complete the project",
          },
          { status: 403 }
        );
      }

      // Update project status to completed
      await projectRef.update({
        status: "completed",
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
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
