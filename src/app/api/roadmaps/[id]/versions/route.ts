import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Query versions subcollection ordered by version descending
    const versionsSnapshot = await db
      .collection("roadmaps")
      .doc(id)
      .collection("versions")
      .orderBy("version", "desc")
      .get();

    // Convert Firestore Timestamps to ISO strings for JSON serialization
    const versions = versionsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ versions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching roadmap versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch roadmap versions" },
      { status: 500 }
    );
  }
}
