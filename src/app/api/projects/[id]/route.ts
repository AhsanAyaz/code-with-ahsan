import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import {
  createProjectChannel,
  sendProjectDetailsMessage,
  archiveProjectChannel,
} from "@/lib/discord";

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

      // Update project status to active (admin auth handled by frontend)
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
            // TODO: Send Discord DM with decline reason
            // For now, just log it - Discord DM API integration needed
            console.log(`[Project Declined] Would send DM to ${discordUsername}:`, {
              projectTitle: projectData.title,
              reason: declineReason,
            });
          }
        } catch (error) {
          console.error("Error sending decline notification:", error);
          // Non-blocking - continue with deletion even if DM fails
        }
      }

      // Delete the declined project instead of marking it as declined
      await projectRef.delete();

      return NextResponse.json(
        { success: true, message: "Project declined and deleted" },
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
