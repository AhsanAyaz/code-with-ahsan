import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    // Fetch completed projects, ordered by completedAt descending
    const snapshot = await db
      .collection("projects")
      .where("status", "==", "completed")
      .orderBy("completedAt", "desc")
      .get();

    const projects = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        creatorId: data.creatorId,
        creatorProfile: data.creatorProfile || null,
        status: data.status,
        techStack: data.techStack || [],
        difficulty: data.difficulty,
        maxTeamSize: data.maxTeamSize,
        memberCount: data.memberCount || 0,
        githubRepo: data.githubRepo || null,
        demoUrl: data.demoUrl || null,
        demoDescription: data.demoDescription || null,
        templateId: data.templateId || null,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ projects }, { status: 200 });
  } catch (error) {
    console.error("Error fetching showcase projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch showcase projects" },
      { status: 500 }
    );
  }
}
