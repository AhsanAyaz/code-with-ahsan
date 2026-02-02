import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendDirectMessage } from "@/lib/discord";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { invitedBy, email, discordUsername } = body;

    // Validate required fields
    if (!invitedBy || typeof invitedBy !== "string") {
      return NextResponse.json(
        { error: "invitedBy is required" },
        { status: 400 }
      );
    }

    // Must provide email OR discordUsername
    if (!email && !discordUsername) {
      return NextResponse.json(
        { error: "Must provide email or discordUsername" },
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

    // Look up user by email or discordUsername
    let userQuery = db.collection("mentorship_profiles");

    if (email) {
      userQuery = userQuery.where("email", "==", email) as any;
    } else if (discordUsername) {
      userQuery = userQuery.where(
        "discordUsername",
        "==",
        discordUsername
      ) as any;
    }

    const userSnapshot = await userQuery.limit(1).get();

    if (userSnapshot.empty) {
      const identifier = email || discordUsername;
      return NextResponse.json(
        {
          error: `No user found with that ${email ? "email" : "Discord username"}. They must create a profile first.`,
        },
        { status: 404 }
      );
    }

    const userDoc = userSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    // Check if already a team member
    const memberCheckId = `${projectId}_${userId}`;
    const memberDoc = await db
      .collection("project_members")
      .doc(memberCheckId)
      .get();

    if (memberDoc.exists) {
      return NextResponse.json(
        { error: "User is already a team member" },
        { status: 409 }
      );
    }

    // Check if invitation already sent
    const invitationId = `${projectId}_${userId}`;
    const existingInvitation = await db
      .collection("project_invitations")
      .doc(invitationId)
      .get();

    if (existingInvitation.exists) {
      return NextResponse.json(
        { error: "Invitation already sent to this user" },
        { status: 409 }
      );
    }

    // Create invitation document
    const invitationData = {
      projectId,
      userId,
      userProfile: {
        displayName: userData?.displayName || "",
        photoURL: userData?.photoURL || "",
        username: userData?.username,
      },
      invitedBy,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    };

    await db
      .collection("project_invitations")
      .doc(invitationId)
      .set(invitationData);

    // Update project lastActivityAt
    await db.collection("projects").doc(projectId).update({
      lastActivityAt: FieldValue.serverTimestamp(),
    });

    // Send Discord DM notification (non-blocking)
    if (userData?.discordUsername) {
      try {
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL || "https://codewithahsan.dev";
        const message = `You've been invited to join the project "${projectData?.title}"! Visit ${siteUrl}/projects/${projectId} to accept or decline.`;
        await sendDirectMessage(userData.discordUsername, message);
      } catch (discordError) {
        console.error("Discord DM failed:", discordError);
        // Continue - invitation created even if DM fails
      }
    }

    return NextResponse.json(
      { success: true, invitationId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Query invitations for this project
    const query = db
      .collection("project_invitations")
      .where("projectId", "==", projectId)
      .orderBy("createdAt", "desc");

    const snapshot = await query.get();

    // Convert Firestore Timestamps to ISO strings
    const invitations = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        acceptedAt: data.acceptedAt?.toDate?.()?.toISOString() || null,
        declinedAt: data.declinedAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ invitations }, { status: 200 });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}
