import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { addMemberToChannel } from "@/lib/discord";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
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

      // Commit batch
      await batch.commit();

      // Non-blocking: Add to Discord channel
      if (projectData?.discordChannelId && userData?.discordUsername) {
        try {
          await addMemberToChannel(
            projectData.discordChannelId,
            userData.discordUsername
          );
        } catch (discordError) {
          console.error("Discord member add failed:", discordError);
          // Continue - member added to Firestore even if Discord fails
        }
      }

      return NextResponse.json(
        { success: true, message: "Application approved" },
        { status: 200 }
      );
    } else if (action === "decline") {
      // Update application status to declined
      await applicationRef.update({
        status: "declined",
        declinedAt: FieldValue.serverTimestamp(),
        feedback: feedback || null,
      });

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
