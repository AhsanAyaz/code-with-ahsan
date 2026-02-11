import { NextRequest, NextResponse } from "next/server";
import { db, storage } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { canApproveRoadmap, canEditRoadmap } from "@/lib/permissions";
import { sanitizeMarkdownRaw } from "@/lib/validation/sanitize";
import { verifyAuth } from "@/lib/auth";
import type { PermissionUser } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch roadmap document
    const roadmapRef = db.collection("roadmaps").doc(id);
    const roadmapDoc = await roadmapRef.get();

    if (!roadmapDoc.exists) {
      return NextResponse.json(
        { error: "Roadmap not found" },
        { status: 404 }
      );
    }

    const roadmapData = roadmapDoc.data();

    // Fetch content from Storage if contentUrl exists
    let content: string | undefined;
    if (roadmapData?.contentUrl) {
      try {
        const response = await fetch(roadmapData.contentUrl);
        if (response.ok) {
          content = await response.text();
        }
      } catch (error) {
        console.error("Error fetching roadmap content:", error);
        // Continue without content rather than failing
      }
    }

    // Convert Firestore Timestamps to ISO strings for JSON serialization
    const roadmap = {
      id: roadmapDoc.id,
      ...roadmapData,
      content,
      createdAt: roadmapData?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: roadmapData?.updatedAt?.toDate?.()?.toISOString() || null,
      approvedAt: roadmapData?.approvedAt?.toDate?.()?.toISOString() || null,
      feedbackAt: roadmapData?.feedbackAt?.toDate?.()?.toISOString() || null,
    };

    return NextResponse.json({ roadmap }, { status: 200 });
  } catch (error) {
    console.error("Error fetching roadmap:", error);
    return NextResponse.json(
      { error: "Failed to fetch roadmap" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      action,
      feedback,
      title,
      description,
      domain,
      difficulty,
      estimatedHours,
      content,
      changeDescription,
    } = body;

    // Fetch roadmap document
    const roadmapRef = db.collection("roadmaps").doc(id);
    const roadmapDoc = await roadmapRef.get();

    if (!roadmapDoc.exists) {
      return NextResponse.json(
        { error: "Roadmap not found" },
        { status: 404 }
      );
    }

    const roadmapData = roadmapDoc.data();

    // Fetch actor's mentorship_profiles doc for permission checks
    const actorDoc = await db
      .collection("mentorship_profiles")
      .doc(authResult.uid)
      .get();

    const actorData = actorDoc.exists ? actorDoc.data() : null;

    // Build PermissionUser from profile data
    const permissionUser: PermissionUser = {
      uid: authResult.uid,
      role: actorData?.role || null,
      status: actorData?.status,
      isAdmin: actorData?.isAdmin,
    };

    // Handle different actions
    if (action === "submit") {
      // Verify roadmap status is "draft"
      if (roadmapData?.status !== "draft") {
        return NextResponse.json(
          { error: "Only draft roadmaps can be submitted" },
          { status: 400 }
        );
      }

      // Verify actor is the creator
      if (authResult.uid !== roadmapData.creatorId) {
        return NextResponse.json(
          {
            error: "Permission denied",
            message: "Only the creator can submit their draft",
          },
          { status: 403 }
        );
      }

      // Update status to pending
      await roadmapRef.update({
        status: "pending",
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        { success: true, message: "Roadmap submitted for review" },
        { status: 200 }
      );
    } else if (action === "approve") {
      // Check admin permission
      if (!canApproveRoadmap(permissionUser, roadmapData as any)) {
        return NextResponse.json(
          {
            error: "Permission denied",
            message: "Only admins can approve roadmaps",
          },
          { status: 403 }
        );
      }

      // Verify roadmap status is "pending"
      if (roadmapData?.status !== "pending") {
        return NextResponse.json(
          { error: "Only pending roadmaps can be approved" },
          { status: 400 }
        );
      }

      // Update status to approved
      await roadmapRef.update({
        status: "approved",
        approvedAt: FieldValue.serverTimestamp(),
        approvedBy: authResult.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        { success: true, message: "Roadmap approved" },
        { status: 200 }
      );
    } else if (action === "request-changes") {
      // Check admin permission
      if (!canApproveRoadmap(permissionUser, roadmapData as any)) {
        return NextResponse.json(
          {
            error: "Permission denied",
            message: "Only admins can request changes",
          },
          { status: 403 }
        );
      }

      // Verify roadmap status is "pending"
      if (roadmapData?.status !== "pending") {
        return NextResponse.json(
          { error: "Only pending roadmaps can have changes requested" },
          { status: 400 }
        );
      }

      // Require feedback
      if (!feedback || typeof feedback !== "string" || feedback.length < 10) {
        return NextResponse.json(
          { error: "Feedback is required and must be at least 10 characters" },
          { status: 400 }
        );
      }

      // Update status back to draft with feedback
      await roadmapRef.update({
        status: "draft",
        feedback,
        feedbackAt: FieldValue.serverTimestamp(),
        feedbackBy: authResult.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        { success: true, message: "Changes requested" },
        { status: 200 }
      );
    } else if (action === "edit") {
      // Construct roadmap-like object for permission check
      const roadmapForPermission = {
        creatorId: roadmapData?.creatorId,
      };

      // Check edit permission (owner or admin)
      if (!canEditRoadmap(permissionUser, roadmapForPermission as any)) {
        return NextResponse.json(
          {
            error: "Permission denied",
            message: "Only the creator or admin can edit roadmaps",
          },
          { status: 403 }
        );
      }

      // Require content
      if (!content || typeof content !== "string" || content.length < 50) {
        return NextResponse.json(
          { error: "Content is required and must be at least 50 characters" },
          { status: 400 }
        );
      }

      // Calculate new version
      const newVersion = (roadmapData?.version || 1) + 1;

      // Sanitize content
      const sanitizedContent = sanitizeMarkdownRaw(content);

      // Upload to Storage
      const storagePath = `roadmaps/${id}/v${newVersion}-${Date.now()}.md`;
      const file = storage.file(storagePath);

      await file.save(sanitizedContent, {
        contentType: "text/markdown",
        metadata: {
          metadata: {
            version: String(newVersion),
            roadmapId: id,
          },
        },
      });

      // Make file public
      await file.makePublic();
      const contentUrl = file.publicUrl();

      // Build update object with optional fields
      const updateData: any = {
        contentUrl,
        version: newVersion,
        status: "draft", // Reset to draft for re-approval
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (domain !== undefined) updateData.domain = domain;
      if (difficulty !== undefined) updateData.difficulty = difficulty;
      if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;

      // Update main document
      await roadmapRef.update(updateData);

      // Create version in subcollection
      await db
        .collection("roadmaps")
        .doc(id)
        .collection("versions")
        .add({
          roadmapId: id,
          version: newVersion,
          contentUrl,
          createdBy: authResult.uid,
          createdAt: FieldValue.serverTimestamp(),
          changeDescription: changeDescription || `Version ${newVersion}`,
        });

      return NextResponse.json(
        {
          success: true,
          message: "Roadmap updated",
          version: newVersion,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error updating roadmap:", error);
    return NextResponse.json(
      { error: "Failed to update roadmap" },
      { status: 500 }
    );
  }
}
