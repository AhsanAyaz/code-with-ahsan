import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { canManageProjectMembers } from "@/lib/permissions";
import { removeMemberFromChannel, sendChannelMessage } from "@/lib/discord";
import { verifyAuth } from "@/lib/auth";
import type { PermissionUser } from "@/lib/permissions";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: projectId, memberId } = await params;
    const requestorId = authResult.uid;

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

    // Find member document — memberId may be a userId or composite key ({projectId}_{userId})
    const isCompositeKey = memberId.includes("_");
    const memberDocId = isCompositeKey ? memberId : `${projectId}_${memberId}`;
    const memberUserId = isCompositeKey ? memberId.split("_").slice(1).join("_") : memberId;
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
      .doc(memberUserId)
      .get();
    const memberProfileData = memberProfileDoc.data();

    // Non-blocking Discord operations: message first, then remove
    if (projectData?.discordChannelId) {
      const displayName = memberData?.userProfile?.displayName || memberProfileData?.displayName || "A member";

      // Send departure message to project channel
      try {
        await sendChannelMessage(
          projectData.discordChannelId,
          `📤 **${displayName}** has been removed from the project.`
        );
      } catch (channelMsgError) {
        console.error("Discord channel removal message failed:", channelMsgError);
      }

      // Remove from Discord channel
      if (memberProfileData?.discordUsername) {
        try {
          await removeMemberFromChannel(
            projectData.discordChannelId,
            memberProfileData.discordUsername
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

    // 2. Update project lastActivityAt and decrement memberCount
    const projectRef = db.collection("projects").doc(projectId);
    batch.update(projectRef, {
      lastActivityAt: FieldValue.serverTimestamp(),
      memberCount: FieldValue.increment(-1),
    });

    // Commit batch
    await batch.commit();

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
