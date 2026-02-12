import { NextRequest, NextResponse } from "next/server";
import { db, storage } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { canApproveRoadmap, canEditRoadmap } from "@/lib/permissions";
import { sanitizeMarkdownRaw } from "@/lib/validation/sanitize";
import { verifyAuth } from "@/lib/auth";
import type { PermissionUser } from "@/lib/permissions";
import { sendRoadmapSubmissionNotification, sendRoadmapStatusNotification } from "@/lib/discord";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const previewDraft = searchParams.get('preview') === 'draft';

    // Fetch roadmap document
    const roadmapRef = db.collection("roadmaps").doc(id);
    const roadmapDoc = await roadmapRef.get();

    if (!roadmapDoc.exists) {
      return NextResponse.json(
        { error: "Roadmap not found" },
        { status: 404 }
      );
    }

    let roadmapData = roadmapDoc.data();
    let contentUrl = roadmapData?.contentUrl;

    // If preview=draft, fetch the draft version and overlay its data
    // This includes both pending drafts and rejected drafts (with feedback)
    if (previewDraft && roadmapData?.draftVersionNumber && (roadmapData?.hasPendingDraft || roadmapData?.feedback)) {
      try {
        const versionsSnapshot = await db
          .collection("roadmaps")
          .doc(id)
          .collection("versions")
          .where("version", "==", roadmapData.draftVersionNumber)
          .where("status", "in", ["draft", "rejected"])
          .limit(1)
          .get();

        if (!versionsSnapshot.empty) {
          const draftData = versionsSnapshot.docs[0].data();
          // Overlay draft metadata and use draft contentUrl
          roadmapData = {
            ...roadmapData,
            title: draftData.title !== undefined ? draftData.title : roadmapData.title,
            description: draftData.description !== undefined ? draftData.description : roadmapData.description,
            domain: draftData.domain !== undefined ? draftData.domain : roadmapData.domain,
            difficulty: draftData.difficulty !== undefined ? draftData.difficulty : roadmapData.difficulty,
            estimatedHours: draftData.estimatedHours !== undefined ? draftData.estimatedHours : roadmapData.estimatedHours,
            version: draftData.version, // Show draft version number
          };
          contentUrl = draftData.contentUrl; // Use draft content
        }
      } catch (error) {
        console.error("Error fetching draft version:", error);
        // Fall back to published version if draft fetch fails
      }
    }

    // Fetch content from Storage if contentUrl exists
    let content: string | undefined;
    if (contentUrl) {
      try {
        const response = await fetch(contentUrl);
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

      // Send Discord notification to moderators (non-blocking)
      try {
        await sendRoadmapSubmissionNotification(
          roadmapData.title,
          roadmapData.creatorProfile?.displayName || "Unknown",
          id
        );
      } catch (error) {
        console.error("[Discord] Failed to send roadmap submission notification:", error);
      }

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

      // Send Discord DM to creator (non-blocking)
      if (roadmapData?.creatorProfile?.discordUsername) {
        try {
          await sendRoadmapStatusNotification(
            roadmapData.creatorProfile.discordUsername,
            roadmapData.title,
            "approved"
          );
        } catch (error) {
          console.error("[Discord] Failed to send roadmap approval notification:", error);
        }
      }

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

      // Require feedback
      if (!feedback || typeof feedback !== "string" || feedback.length < 10) {
        return NextResponse.json(
          { error: "Feedback is required and must be at least 10 characters" },
          { status: 400 }
        );
      }

      const isPendingDraft = roadmapData?.hasPendingDraft === true;
      const isPendingInitial = roadmapData?.status === "pending";

      // Must be either pending initial submission or pending draft
      if (!isPendingInitial && !isPendingDraft) {
        return NextResponse.json(
          { error: "Only pending roadmaps or draft versions can have changes requested" },
          { status: 400 }
        );
      }

      if (isPendingDraft) {
        // Handle draft version (v2, v3, etc.)
        const draftVersion = roadmapData.draftVersionNumber;

        // Fetch draft version from subcollection
        const versionsSnapshot = await db
          .collection("roadmaps")
          .doc(id)
          .collection("versions")
          .where("version", "==", draftVersion)
          .where("status", "==", "draft")
          .limit(1)
          .get();

        if (versionsSnapshot.empty) {
          return NextResponse.json(
            { error: "Draft version not found in versions subcollection" },
            { status: 404 }
          );
        }

        const draftDoc = versionsSnapshot.docs[0];

        // Update draft version with feedback and mark as rejected
        await draftDoc.ref.update({
          status: "rejected",
          feedback,
          feedbackAt: FieldValue.serverTimestamp(),
          feedbackBy: authResult.uid,
        });

        // Clear pending flag but KEEP draftVersionNumber so mentor can edit rejected draft
        // This allows mentor to continue working on v7 instead of starting over from v6
        await roadmapRef.update({
          hasPendingDraft: false,
          // draftVersionNumber: KEEP IT (don't set to null!)
          feedback,
          feedbackAt: FieldValue.serverTimestamp(),
          feedbackBy: authResult.uid,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Send Discord DM to creator (non-blocking)
        if (roadmapData?.creatorProfile?.discordUsername) {
          try {
            await sendRoadmapStatusNotification(
              roadmapData.creatorProfile.discordUsername,
              roadmapData.title,
              "draft-changes-requested",
              feedback
            );
          } catch (error) {
            console.error("[Discord] Failed to send draft changes notification:", error);
          }
        }

        return NextResponse.json(
          { success: true, message: "Changes requested on draft version" },
          { status: 200 }
        );
      } else {
        // Handle initial submission (existing logic)
        await roadmapRef.update({
          status: "draft",
          feedback,
          feedbackAt: FieldValue.serverTimestamp(),
          feedbackBy: authResult.uid,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Send Discord DM to creator (non-blocking)
        if (roadmapData?.creatorProfile?.discordUsername) {
          try {
            await sendRoadmapStatusNotification(
              roadmapData.creatorProfile.discordUsername,
              roadmapData.title,
              "changes-requested",
              feedback
            );
          } catch (error) {
            console.error("[Discord] Failed to send changes notification:", error);
          }
        }

        return NextResponse.json(
          { success: true, message: "Changes requested" },
          { status: 200 }
        );
      }
    } else if (action === "approve-draft") {
      // Check admin permission
      if (!canApproveRoadmap(permissionUser, roadmapData as any)) {
        return NextResponse.json(
          {
            error: "Permission denied",
            message: "Only admins can approve draft versions",
          },
          { status: 403 }
        );
      }

      // Verify there's a pending draft
      if (!roadmapData?.hasPendingDraft) {
        return NextResponse.json(
          { error: "No pending draft version found" },
          { status: 400 }
        );
      }

      const draftVersion = roadmapData.draftVersionNumber;

      // Fetch draft version from subcollection
      const versionsSnapshot = await db
        .collection("roadmaps")
        .doc(id)
        .collection("versions")
        .where("version", "==", draftVersion)
        .where("status", "==", "draft")
        .limit(1)
        .get();

      if (versionsSnapshot.empty) {
        return NextResponse.json(
          { error: "Draft version not found in versions subcollection" },
          { status: 404 }
        );
      }

      const draftDoc = versionsSnapshot.docs[0];
      const draftData = draftDoc.data();

      // Update main document with draft content
      const updateData: any = {
        contentUrl: draftData.contentUrl,
        version: draftVersion,
        status: "approved",
        hasPendingDraft: false,
        draftVersionNumber: null,
        approvedAt: FieldValue.serverTimestamp(),
        approvedBy: authResult.uid,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (draftData.title !== undefined) updateData.title = draftData.title;
      if (draftData.description !== undefined) updateData.description = draftData.description;
      if (draftData.domain !== undefined) updateData.domain = draftData.domain;
      if (draftData.difficulty !== undefined) updateData.difficulty = draftData.difficulty;
      if (draftData.estimatedHours !== undefined) updateData.estimatedHours = draftData.estimatedHours;

      await roadmapRef.update(updateData);

      // Mark draft version as approved in subcollection
      await draftDoc.ref.update({
        status: "approved",
        approvedAt: FieldValue.serverTimestamp(),
        approvedBy: authResult.uid,
      });

      // Send Discord DM to creator (non-blocking)
      if (roadmapData?.creatorProfile?.discordUsername) {
        try {
          await sendRoadmapStatusNotification(
            roadmapData.creatorProfile.discordUsername,
            roadmapData.title,
            "draft-approved"
          );
        } catch (error) {
          console.error("[Discord] Failed to send draft approval notification:", error);
        }
      }

      return NextResponse.json(
        { success: true, message: "Draft version approved and published" },
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

      // Check if there's already a pending draft (prevent concurrent edits)
      // Exception: If there's feedback, the draft was rejected and mentor can edit again
      const hasFeedback = roadmapData?.feedback && roadmapData?.feedbackAt;
      if (roadmapData?.hasPendingDraft && !hasFeedback) {
        return NextResponse.json(
          {
            error: "Draft already exists",
            message: "This roadmap already has pending changes. Please wait for them to be approved or rejected before making new edits.",
          },
          { status: 409 }
        );
      }

      // Require content
      if (!content || typeof content !== "string" || content.length < 50) {
        return NextResponse.json(
          { error: "Content is required and must be at least 50 characters" },
          { status: 400 }
        );
      }

      const isApproved = roadmapData?.status === "approved";
      const currentVersion = roadmapData?.version || 1;

      // Check if we're editing a rejected draft (has draftVersionNumber + feedback)
      const hasRejectedDraft = roadmapData?.draftVersionNumber && roadmapData?.feedback;

      // Determine version number:
      // - If editing approved roadmap: increment to create new draft
      // - If editing rejected draft: keep the draft version (don't increment)
      // - Otherwise: keep current version (initial draft)
      const newVersion = isApproved ? currentVersion + 1 : (hasRejectedDraft ? roadmapData.draftVersionNumber : currentVersion);

      // Sanitize content
      const sanitizedContent = sanitizeMarkdownRaw(content);

      // Upload to Storage
      const storagePath = `roadmaps/${id}/v${newVersion}-draft-${Date.now()}.md`;
      const file = storage.file(storagePath);

      await file.save(sanitizedContent, {
        contentType: "text/markdown",
        metadata: {
          metadata: {
            version: String(newVersion),
            roadmapId: id,
            status: "draft",
          },
        },
      });

      // Make file public
      await file.makePublic();
      const contentUrl = file.publicUrl();

      if (isApproved) {
        // If roadmap is approved, keep it published and mark as having pending draft
        const updateData: any = {
          hasPendingDraft: true,
          draftVersionNumber: newVersion,
          updatedAt: FieldValue.serverTimestamp(),
        };

        // Clear feedback fields when starting new draft (feedback has been addressed)
        if (hasFeedback) {
          updateData.feedback = null;
          updateData.feedbackAt = null;
          updateData.feedbackBy = null;
        }

        await roadmapRef.update(updateData);

        // Create draft version in subcollection
        await db
          .collection("roadmaps")
          .doc(id)
          .collection("versions")
          .add({
            roadmapId: id,
            version: newVersion,
            contentUrl,
            status: "draft",
            title: title !== undefined ? title : roadmapData.title,
            description: description !== undefined ? description : roadmapData.description,
            domain: domain !== undefined ? domain : roadmapData.domain,
            difficulty: difficulty !== undefined ? difficulty : roadmapData.difficulty,
            estimatedHours: estimatedHours !== undefined ? estimatedHours : roadmapData.estimatedHours,
            createdBy: authResult.uid,
            createdAt: FieldValue.serverTimestamp(),
            changeDescription: changeDescription || `Version ${newVersion}`,
          });

        // Send Discord notification to moderators for new version (non-blocking)
        try {
          await sendRoadmapSubmissionNotification(
            title !== undefined ? title : roadmapData.title,
            roadmapData.creatorProfile?.displayName || "Unknown",
            id,
            true
          );
        } catch (error) {
          console.error("[Discord] Failed to send roadmap version submission notification:", error);
        }

        return NextResponse.json(
          {
            success: true,
            message: "Draft version created. Current version remains published until approved.",
            version: newVersion,
          },
          { status: 200 }
        );
      } else {
        // If roadmap is draft or pending
        if (hasRejectedDraft) {
          // Editing a rejected draft - update existing draft in subcollection
          const versionsSnapshot = await db
            .collection("roadmaps")
            .doc(id)
            .collection("versions")
            .where("version", "==", newVersion)
            .where("status", "in", ["draft", "rejected"])
            .limit(1)
            .get();

          if (!versionsSnapshot.empty) {
            // Update existing draft version
            const draftDoc = versionsSnapshot.docs[0];
            const draftUpdateData: any = {
              contentUrl,
              updatedAt: FieldValue.serverTimestamp(),
              changeDescription: changeDescription || `Version ${newVersion} (revised)`,
            };

            if (title !== undefined) draftUpdateData.title = title;
            if (description !== undefined) draftUpdateData.description = description;
            if (domain !== undefined) draftUpdateData.domain = domain;
            if (difficulty !== undefined) draftUpdateData.difficulty = difficulty;
            if (estimatedHours !== undefined) draftUpdateData.estimatedHours = estimatedHours;

            await draftDoc.ref.update(draftUpdateData);

            // Clear feedback in main doc (feedback has been addressed)
            await roadmapRef.update({
              feedback: null,
              feedbackAt: null,
              feedbackBy: null,
              updatedAt: FieldValue.serverTimestamp(),
            });

            return NextResponse.json(
              {
                success: true,
                message: "Draft updated (addressing feedback)",
                version: newVersion,
              },
              { status: 200 }
            );
          }
        }

        // Otherwise, update main document directly (initial draft, never approved)
        const updateData: any = {
          contentUrl,
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (domain !== undefined) updateData.domain = domain;
        if (difficulty !== undefined) updateData.difficulty = difficulty;
        if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;

        // Clear feedback fields when updating (feedback has been addressed)
        if (hasFeedback) {
          updateData.feedback = null;
          updateData.feedbackAt = null;
          updateData.feedbackBy = null;
        }

        await roadmapRef.update(updateData);

        // Update or create version in subcollection
        const versionsSnapshot = await db
          .collection("roadmaps")
          .doc(id)
          .collection("versions")
          .where("version", "==", newVersion)
          .limit(1)
          .get();

        if (!versionsSnapshot.empty) {
          // Update existing version
          await versionsSnapshot.docs[0].ref.update({
            contentUrl,
            updatedAt: FieldValue.serverTimestamp(),
            changeDescription: changeDescription || `Version ${newVersion} (updated)`,
          });
        } else {
          // Create new version entry
          await db
            .collection("roadmaps")
            .doc(id)
            .collection("versions")
            .add({
              roadmapId: id,
              version: newVersion,
              contentUrl,
              status: roadmapData?.status || "draft",
              createdBy: authResult.uid,
              createdAt: FieldValue.serverTimestamp(),
              changeDescription: changeDescription || `Version ${newVersion}`,
            });
        }

        return NextResponse.json(
          {
            success: true,
            message: "Roadmap updated",
            version: newVersion,
          },
          { status: 200 }
        );
      }
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

export async function DELETE(
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

    // Check permission: only creator or admin can delete
    const roadmapForPermission = {
      creatorId: roadmapData?.creatorId,
    };

    if (!canEditRoadmap(permissionUser, roadmapForPermission as any)) {
      return NextResponse.json(
        {
          error: "Permission denied",
          message: "Only the creator or admin can delete roadmaps",
        },
        { status: 403 }
      );
    }

    // Only allow deletion of draft or pending roadmaps (not approved)
    if (roadmapData?.status === "approved") {
      return NextResponse.json(
        {
          error: "Cannot delete approved roadmap",
          message: "Approved roadmaps cannot be deleted. Please contact an admin if you need to remove it.",
        },
        { status: 400 }
      );
    }

    // Delete the roadmap document
    await roadmapRef.delete();

    // Note: We're not deleting Storage files or version history for audit trail
    // Storage files can be cleaned up separately if needed

    return NextResponse.json(
      { success: true, message: "Roadmap deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting roadmap:", error);
    return NextResponse.json(
      { error: "Failed to delete roadmap" },
      { status: 500 }
    );
  }
}
