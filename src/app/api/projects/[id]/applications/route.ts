import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { canApplyToProject } from "@/lib/permissions";
import type { PermissionUser } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { userId, message } = body;

    // Validate required fields
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Application message is required" },
        { status: 400 }
      );
    }

    if (message.length < 10 || message.length > 500) {
      return NextResponse.json(
        { error: "Message must be between 10 and 500 characters" },
        { status: 400 }
      );
    }

    // Fetch project document
    const projectRef = db.collection("projects").doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();

    // Check project status is "active"
    if (projectData?.status !== "active") {
      return NextResponse.json(
        { error: "Project is not accepting applications" },
        { status: 400 }
      );
    }

    // Fetch user profile
    const userDoc = await db
      .collection("mentorship_profiles")
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Check permission: canApplyToProject
    const permissionUser: PermissionUser = {
      uid: userId,
      role: userData?.role || null,
      status: userData?.status,
      isAdmin: userData?.isAdmin,
    };

    const project = {
      id: projectId,
      ...projectData,
    };

    if (!canApplyToProject(permissionUser, project as any)) {
      return NextResponse.json(
        {
          error: "Permission denied",
          message: "You cannot apply to this project",
        },
        { status: 403 }
      );
    }

    // Check for duplicate application (composite key)
    const applicationId = `${projectId}_${userId}`;
    const existingApplication = await db
      .collection("project_applications")
      .doc(applicationId)
      .get();

    if (existingApplication.exists) {
      return NextResponse.json(
        { error: "You have already applied to this project" },
        { status: 409 }
      );
    }

    // Create application document
    const applicationData = {
      projectId,
      userId,
      userProfile: {
        displayName: userData?.displayName || "",
        photoURL: userData?.photoURL || "",
        username: userData?.username,
      },
      message,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    };

    await db
      .collection("project_applications")
      .doc(applicationId)
      .set(applicationData);

    // Update project lastActivityAt
    await projectRef.update({
      lastActivityAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      { success: true, applicationId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating application:", error);
    return NextResponse.json(
      { error: "Failed to create application" },
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");

    // Build query
    let query = db
      .collection("project_applications")
      .where("projectId", "==", projectId);

    // If userId provided, filter by userId (for checking user's own application status)
    if (userId) {
      query = query.where("userId", "==", userId) as any;
    }

    // If status provided, filter by status
    if (status) {
      query = query.where("status", "==", status) as any;
    }

    // Order by createdAt descending
    query = query.orderBy("createdAt", "desc") as any;

    const snapshot = await query.get();

    // Convert Firestore Timestamps to ISO strings
    const applications = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        approvedAt: data.approvedAt?.toDate?.()?.toISOString() || null,
        declinedAt: data.declinedAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ applications }, { status: 200 });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
