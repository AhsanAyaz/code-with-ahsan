import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { canCreateProject } from "@/lib/permissions";
import { validateGitHubUrl } from "@/lib/validation/urls";
import { verifyAuth } from "@/lib/auth";
import type { PermissionUser } from "@/lib/permissions";
import { sendProjectSubmissionNotification } from "@/lib/discord";

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      githubRepo,
      techStack,
      difficulty,
      maxTeamSize,
      templateId,
    } = body;

    const creatorId = authResult.uid;

    // Validate required fields
    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required and must be a string" },
        { status: 400 }
      );
    }

    if (title.length < 3 || title.length > 100) {
      return NextResponse.json(
        { error: "Title must be between 3 and 100 characters" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Description is required and must be a string" },
        { status: 400 }
      );
    }

    if (description.length < 10 || description.length > 2000) {
      return NextResponse.json(
        { error: "Description must be between 10 and 2000 characters" },
        { status: 400 }
      );
    }

    // Validate GitHub URL if provided
    if (githubRepo) {
      try {
        validateGitHubUrl(githubRepo);
      } catch (err) {
        return NextResponse.json(
          { error: "Invalid GitHub repository URL" },
          { status: 400 }
        );
      }
    }

    // Fetch creator's mentorship profile
    const creatorDoc = await db
      .collection("mentorship_profiles")
      .doc(creatorId)
      .get();

    if (!creatorDoc.exists) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    const creatorData = creatorDoc.data();

    // Check permission: only authenticated users can create projects
    const permissionUser: PermissionUser = {
      uid: creatorId,
      role: creatorData?.role || null,
      status: creatorData?.status,
      isAdmin: creatorData?.isAdmin,
    };

    if (!canCreateProject(permissionUser)) {
      return NextResponse.json(
        {
          error: "Permission denied",
          message: "Only authenticated users can create projects",
        },
        { status: 403 }
      );
    }

    // Validate templateId if provided
    if (templateId) {
      const validTemplateIds = ["fullstack-app", "ai-tool", "open-source-library"];
      if (!validTemplateIds.includes(templateId)) {
        return NextResponse.json(
          { error: "Invalid templateId" },
          { status: 400 }
        );
      }
    }

    // Create project document
    const projectData = {
      title,
      description,
      creatorId,
      creatorProfile: {
        displayName: creatorData?.displayName || "",
        photoURL: creatorData?.photoURL || "",
        username: creatorData?.username,
        discordUsername: creatorData?.discordUsername,
      },
      status: "pending",
      githubRepo: githubRepo || null,
      techStack: Array.isArray(techStack) ? techStack : [],
      difficulty: difficulty || "intermediate",
      maxTeamSize: maxTeamSize || 4,
      memberCount: 0,
      ...(templateId && { templateId }),
      lastActivityAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("projects").add(projectData);

    // Send Discord notification to moderators (non-blocking)
    try {
      await sendProjectSubmissionNotification(
        title,
        creatorData?.displayName || "Unknown",
        docRef.id
      );
    } catch (error) {
      console.error("Discord notification failed:", error);
      // Non-blocking - project creation succeeds even if notification fails
    }

    return NextResponse.json(
      { success: true, projectId: docRef.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const creatorId = searchParams.get("creatorId");
    const member = searchParams.get("member");
    const techStack = searchParams.get("techStack");

    // For public discovery (no creator/member filter), default to approved projects only
    const isPublicListing = !creatorId && !member;

    // If member filter: look up project_members first, then batch-fetch projects
    if (member) {
      const membershipsSnapshot = await db
        .collection("project_members")
        .where("userId", "==", member)
        .get();

      if (membershipsSnapshot.empty) {
        return NextResponse.json({ projects: [] }, { status: 200 });
      }

      const projectIds = membershipsSnapshot.docs.map(
        (doc) => doc.data().projectId
      );

      // Batch-fetch projects by their IDs
      const projectRefs = projectIds.map((id) =>
        db.collection("projects").doc(id)
      );
      const projectDocs = await db.getAll(...projectRefs);

      const projects = projectDocs
        .filter((doc) => doc.exists)
        .map((doc) => {
          const data = doc.data()!;
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
            approvedAt: data.approvedAt?.toDate?.()?.toISOString() || null,
            lastActivityAt:
              data.lastActivityAt?.toDate?.()?.toISOString() || null,
          };
        });

      return NextResponse.json({ projects }, { status: 200 });
    }

    // Build query
    let query = db.collection("projects");

    if (status) {
      query = query.where("status", "==", status) as any;
    } else if (isPublicListing) {
      // Public listings: only show approved projects (active or completed)
      query = query.where("status", "in", ["active", "completed"]) as any;
    }

    if (creatorId) {
      query = query.where("creatorId", "==", creatorId) as any;
    }

    if (techStack) {
      const techList = techStack.split(",").map((t) => t.trim()).slice(0, 10); // limit to 10 for array-contains-any
      if (techList.length > 0) {
        query = query.where("techStack", "array-contains-any", techList) as any;
      }
    }

    // Order by creation date descending
    query = query.orderBy("createdAt", "desc") as any;

    const snapshot = await query.get();

    // Enrich with pending application counts when creatorId filter is present
    let pendingCountMap = new Map<string, number>();
    if (creatorId) {
      const projectIds = snapshot.docs.map((doc) => doc.id);
      const pendingCounts = await Promise.all(
        projectIds.map(async (pid) => {
          const countSnap = await db
            .collection("project_applications")
            .where("projectId", "==", pid)
            .where("status", "==", "pending")
            .get();
          return { id: pid, count: countSnap.size };
        })
      );
      pendingCountMap = new Map(pendingCounts.map((p) => [p.id, p.count]));
    }

    // Convert Firestore Timestamps to ISO strings for JSON serialization
    const projects = snapshot.docs.map((doc) => {
      const data = doc.data();
      const baseProject = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        approvedAt: data.approvedAt?.toDate?.()?.toISOString() || null,
        lastActivityAt: data.lastActivityAt?.toDate?.()?.toISOString() || null,
      };

      // Add pendingApplicationCount only when creatorId is present
      if (creatorId) {
        return {
          ...baseProject,
          pendingApplicationCount: pendingCountMap.get(doc.id) || 0,
        };
      }

      return baseProject;
    });

    return NextResponse.json({ projects }, { status: 200 });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
