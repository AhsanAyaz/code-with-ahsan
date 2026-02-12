import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify auth
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;

    // 2. Parse request body
    const body = await request.json();
    const { newOwnerId } = body;

    if (!newOwnerId) {
      return NextResponse.json(
        { error: "newOwnerId is required" },
        { status: 400 }
      );
    }

    // 3. Fetch the project document
    const projectRef = db.collection("projects").doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();

    // 4. Verify the requesting user IS the current creator (not admin)
    if (projectData?.creatorId !== authResult.uid) {
      return NextResponse.json(
        {
          error: "Permission denied",
          message: "Only the current project creator can transfer ownership",
        },
        { status: 403 }
      );
    }

    // 5. Verify the project status is "active"
    if (projectData?.status !== "active") {
      return NextResponse.json(
        {
          error: "Invalid project status",
          message: "Can only transfer active projects",
        },
        { status: 400 }
      );
    }

    // 6. Verify newOwnerId !== current creatorId
    if (newOwnerId === projectData?.creatorId) {
      return NextResponse.json(
        {
          error: "Invalid transfer",
          message: "Cannot transfer ownership to yourself",
        },
        { status: 400 }
      );
    }

    // 7. Verify newOwnerId is a project member
    const newOwnerMemberRef = db
      .collection("project_members")
      .doc(`${projectId}_${newOwnerId}`);
    const newOwnerMemberDoc = await newOwnerMemberRef.get();

    if (!newOwnerMemberDoc.exists) {
      return NextResponse.json(
        {
          error: "Invalid new owner",
          message: "New owner must be a project member",
        },
        { status: 400 }
      );
    }

    // 8. Fetch the new owner's profile for denormalized creatorProfile field
    const newOwnerProfileRef = db
      .collection("mentorship_profiles")
      .doc(newOwnerId);
    const newOwnerProfileDoc = await newOwnerProfileRef.get();

    if (!newOwnerProfileDoc.exists) {
      return NextResponse.json(
        { error: "New owner profile not found" },
        { status: 404 }
      );
    }

    const newOwnerProfile = newOwnerProfileDoc.data();

    // 9. Check if the OLD creator is also a project member (no action needed, just for logging)
    const oldCreatorId = projectData?.creatorId;
    const oldCreatorMemberRef = db
      .collection("project_members")
      .doc(`${projectId}_${oldCreatorId}`);
    const oldCreatorMemberDoc = await oldCreatorMemberRef.get();
    const oldCreatorIsMember = oldCreatorMemberDoc.exists;

    console.log(
      `Transferring project ${projectId} from ${oldCreatorId} to ${newOwnerId}. Old creator is member: ${oldCreatorIsMember}`
    );

    // 10. Use a Firestore batch write
    const batch = db.batch();

    // a. Update the project document
    batch.update(projectRef, {
      creatorId: newOwnerId,
      creatorProfile: {
        displayName: newOwnerProfile?.displayName,
        photoURL: newOwnerProfile?.photoURL,
        username: newOwnerProfile?.username,
        discordUsername: newOwnerProfile?.discordUsername,
      },
      updatedAt: FieldValue.serverTimestamp(),
      lastActivityAt: FieldValue.serverTimestamp(),
    });

    // b. If old creator is NOT a project member: no additional cleanup needed
    // c. If old creator IS a project member: no changes to their membership

    // 11. Commit the batch
    await batch.commit();

    // 12. Return success
    return NextResponse.json(
      { success: true, message: "Ownership transferred successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error transferring ownership:", error);
    return NextResponse.json(
      { error: "Failed to transfer ownership" },
      { status: 500 }
    );
  }
}
