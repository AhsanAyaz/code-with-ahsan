import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    // Authentication: verify admin session token
    const token = request.headers.get("x-admin-token");

    if (!token) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    // Verify admin session
    const sessionDoc = await db.collection("admin_sessions").doc(token).get();

    if (!sessionDoc.exists) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    const session = sessionDoc.data();
    const expiresAt = session?.expiresAt?.toDate?.() || new Date(0);

    if (expiresAt < new Date()) {
      // Session expired, delete it
      await db.collection("admin_sessions").doc(token).delete();
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    // Build Firestore query
    let query = db.collection("projects").orderBy("createdAt", "desc");

    // Apply status filter via Firestore (single-field, auto-indexed)
    if (status) {
      query = query.where("status", "==", status) as any;
    }

    // Execute query
    const snapshot = await query.get();

    // For each project, query counts in parallel
    const projectIds = snapshot.docs.map((doc) => doc.id);

    const countsData = await Promise.all(
      projectIds.map(async (projectId) => {
        const [membersSnap, applicationsSnap, invitationsSnap] = await Promise.all([
          db.collection("project_members").where("projectId", "==", projectId).get(),
          db.collection("project_applications").where("projectId", "==", projectId).get(),
          db.collection("project_invitations").where("projectId", "==", projectId).get(),
        ]);

        return {
          projectId,
          memberCount: membersSnap.size,
          applicationCount: applicationsSnap.size,
          invitationCount: invitationsSnap.size,
        };
      })
    );

    // Build counts map
    const countsMap = new Map(
      countsData.map((c) => [c.projectId, c])
    );

    // Convert Firestore documents to JSON-serializable format with counts
    let projects: any[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const counts = countsMap.get(doc.id) || {
        memberCount: 0,
        applicationCount: 0,
        invitationCount: 0,
      };

      return {
        id: doc.id,
        ...data,
        memberCount: counts.memberCount,
        applicationCount: counts.applicationCount,
        invitationCount: counts.invitationCount,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        approvedAt: data.approvedAt?.toDate?.()?.toISOString() || null,
        lastActivityAt: data.lastActivityAt?.toDate?.()?.toISOString() || null,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
      };
    });

    // Apply client-side text search filter
    if (search) {
      const searchLower = search.toLowerCase();
      projects = projects.filter(
        (p) =>
          p.title?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply client-side date range filters
    if (fromDate) {
      const fromDateTime = new Date(fromDate).getTime();
      projects = projects.filter((p) => {
        if (!p.createdAt) return false;
        return new Date(p.createdAt).getTime() >= fromDateTime;
      });
    }

    if (toDate) {
      const toDateTime = new Date(toDate).getTime();
      projects = projects.filter((p) => {
        if (!p.createdAt) return false;
        return new Date(p.createdAt).getTime() <= toDateTime;
      });
    }

    return NextResponse.json(
      {
        projects,
        total: projects.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching admin projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
