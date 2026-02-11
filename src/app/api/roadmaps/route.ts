import { NextRequest, NextResponse } from "next/server";
import { db, storage } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { canCreateRoadmap } from "@/lib/permissions";
import { sanitizeMarkdownRaw } from "@/lib/validation/sanitize";
import { verifyAuth } from "@/lib/auth";
import type { PermissionUser } from "@/lib/permissions";
import type { RoadmapDomain } from "@/types/mentorship";

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
      domain,
      difficulty,
      estimatedHours,
      content,
    } = body;

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

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    const validDomains: RoadmapDomain[] = [
      "web-dev",
      "frontend",
      "backend",
      "ml",
      "ai",
      "mcp",
      "agents",
      "prompt-engineering",
    ];

    if (!validDomains.includes(domain as RoadmapDomain)) {
      return NextResponse.json(
        { error: "Invalid domain. Must be one of: " + validDomains.join(", ") },
        { status: 400 }
      );
    }

    if (!difficulty || typeof difficulty !== "string") {
      return NextResponse.json(
        { error: "Difficulty is required" },
        { status: 400 }
      );
    }

    const validDifficulties = ["beginner", "intermediate", "advanced"];
    if (!validDifficulties.includes(difficulty)) {
      return NextResponse.json(
        { error: "Invalid difficulty. Must be one of: " + validDifficulties.join(", ") },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (content.length < 50) {
      return NextResponse.json(
        { error: "Content must be at least 50 characters" },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (estimatedHours !== undefined && estimatedHours !== null) {
      if (typeof estimatedHours !== "number" || estimatedHours <= 0 || estimatedHours > 1000) {
        return NextResponse.json(
          { error: "Estimated hours must be a number between 1 and 1000" },
          { status: 400 }
        );
      }
    }

    if (description && typeof description !== "string") {
      return NextResponse.json(
        { error: "Description must be a string" },
        { status: 400 }
      );
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: "Description must be 500 characters or less" },
        { status: 400 }
      );
    }

    // Fetch creator profile from mentorship_profiles collection
    const creatorDoc = await db
      .collection("mentorship_profiles")
      .doc(authResult.uid)
      .get();

    if (!creatorDoc.exists) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    const creatorData = creatorDoc.data();

    // Check permission: only accepted mentors can create roadmaps
    const permissionUser: PermissionUser = {
      uid: authResult.uid,
      role: creatorData?.role || null,
      status: creatorData?.status,
      isAdmin: creatorData?.isAdmin,
    };

    if (!canCreateRoadmap(permissionUser)) {
      return NextResponse.json(
        {
          error: "Permission denied",
          message: "Only accepted mentors can create roadmaps",
        },
        { status: 403 }
      );
    }

    // Sanitize content
    const sanitizedContent = sanitizeMarkdownRaw(content);

    // Create Firestore document first (to get the doc ID)
    const roadmapData = {
      title,
      description: description || "",
      domain,
      difficulty,
      estimatedHours: estimatedHours || null,
      creatorId: authResult.uid,
      creatorProfile: {
        displayName: creatorData?.displayName || "",
        photoURL: creatorData?.photoURL || "",
        username: creatorData?.username,
      },
      status: "draft",
      version: 1,
      contentUrl: null, // will be updated after upload
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("roadmaps").add(roadmapData);

    // Upload sanitized content to Firebase Storage
    const storagePath = `roadmaps/${docRef.id}/v1-${Date.now()}.md`;
    const file = storage.file(storagePath);

    await file.save(sanitizedContent, {
      contentType: "text/markdown",
      metadata: {
        metadata: {
          version: "1",
          roadmapId: docRef.id,
        },
      },
    });

    // Make file public
    await file.makePublic();
    const contentUrl = file.publicUrl();

    // Update Firestore doc with contentUrl
    await docRef.update({ contentUrl });

    // Create initial version in subcollection
    await db
      .collection("roadmaps")
      .doc(docRef.id)
      .collection("versions")
      .add({
        roadmapId: docRef.id,
        version: 1,
        contentUrl,
        createdBy: authResult.uid,
        createdAt: FieldValue.serverTimestamp(),
        changeDescription: "Initial version",
      });

    return NextResponse.json(
      { success: true, id: docRef.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating roadmap:", error);
    return NextResponse.json(
      { error: "Failed to create roadmap" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const creatorId = searchParams.get("creatorId");

    // Build query
    let query = db.collection("roadmaps");

    if (status) {
      query = query.where("status", "==", status) as any;
    }

    if (creatorId) {
      query = query.where("creatorId", "==", creatorId) as any;
    }

    // Order by creation date descending
    query = query.orderBy("createdAt", "desc").limit(50) as any;

    const snapshot = await query.get();

    // Convert Firestore Timestamps to ISO strings for JSON serialization
    const roadmaps = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        approvedAt: data.approvedAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ roadmaps }, { status: 200 });
  } catch (error) {
    console.error("Error fetching roadmaps:", error);
    return NextResponse.json(
      { error: "Failed to fetch roadmaps" },
      { status: 500 }
    );
  }
}
