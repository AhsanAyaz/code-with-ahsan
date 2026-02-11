import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Query invitations for current user with pending status
    const query = db
      .collection("project_invitations")
      .where("userId", "==", authResult.uid)
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc");

    const snapshot = await query.get();

    // Extract unique projectIds
    const projectIds = Array.from(
      new Set(snapshot.docs.map((doc) => doc.data().projectId))
    );

    // Batch-fetch project documents
    const projectMap = new Map<string, any>();
    if (projectIds.length > 0) {
      const projectRefs = projectIds.map((id) =>
        db.collection("projects").doc(id)
      );
      const projectDocs = await db.getAll(...projectRefs);

      projectDocs.forEach((doc) => {
        if (doc.exists) {
          const data = doc.data();
          projectMap.set(doc.id, {
            id: doc.id,
            title: data?.title,
            status: data?.status,
            difficulty: data?.difficulty,
            techStack: data?.techStack || [],
            creatorProfile: data?.creatorProfile,
            maxTeamSize: data?.maxTeamSize,
            memberCount: data?.memberCount || 0,
          });
        }
      });
    }

    // Build enriched invitations array
    const invitations = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        projectId: data.projectId,
        userId: data.userId,
        invitedBy: data.invitedBy,
        status: data.status,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        project: projectMap.get(data.projectId) || null,
      };
    });

    return NextResponse.json({ invitations }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}
