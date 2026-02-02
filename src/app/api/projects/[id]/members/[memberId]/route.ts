import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { canManageProjectMembers } from "@/lib/permissions";
import { removeMemberFromChannel } from "@/lib/discord";
import type { PermissionUser } from "@/lib/permissions";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: projectId, memberId } = await params;
    const body = await request.json();
    const { requestorId } = body;

    // Validate requestorId
    if (!requestorId || typeof requestorId !== "string") {
      return NextResponse.json(
        { error: "Requestor ID is required" },
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

    // Fetch requestor profile for permission check
    const requestorDoc = await db
      .collection("mentorship_profiles")
      .doc(requestorId)
      .get();

    if (!requestorDoc.exists) {
      return NextResponse.json(
        { error: "Requestor profile not found" },
        { status: 404 }
      );
    }

    const requestorData = requestorDoc.data();

    // Check permission: canManageProjectMembers
    const permissionUser: PermissionUser = {
      uid: requestorId,
      role: requestorData?.role || null,
      status: requestorData?.status,
      isAdmin: requestorData?.isAdmin,
    };

    const project = {
      id: projectId,
      ...projectData,
    };

    if (!canManageProjectMembers(permissionUser, project as any)) {
      return NextResponse.json(
        {
          error: "Permission denied",
          message: "Only project creator or admin can remove members",
        },
        { status: 403 }
      );
    }

    // Find member document by composite key
    const memberDocId = `${projectId}_${memberId}`;
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
      .doc(memberId)
      .get();
    const memberProfileData = memberProfileDoc.data();

    // Use Firestore batch for atomicity
    const batch = db.batch();

    // 1. Delete project_members document
    batch.delete(memberRef);

    // 2. Update project lastActivityAt
    const projectRef = db.collection("projects").doc(projectId);
    batch.update(projectRef, {
      lastActivityAt: FieldValue.serverTimestamp(),
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
      { success: true, message: "Member removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
