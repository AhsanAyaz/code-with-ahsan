import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Query project_members for this project
    const query = db
      .collection("project_members")
      .where("projectId", "==", projectId)
      .orderBy("joinedAt", "asc"); // Creator first, then by join date

    const snapshot = await query.get();

    // Convert Firestore Timestamps to ISO strings
    const members = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        joinedAt: data.joinedAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}
