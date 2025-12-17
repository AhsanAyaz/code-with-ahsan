import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "UID required" }, { status: 400 });
    }

    const doc = await db.collection("logic-buddy-progress").doc(uid).get();

    if (!doc.exists) {
      return NextResponse.json({
        currentProblemIndex: 0,
        completedProblems: [],
      });
    }

    return NextResponse.json(doc.data());
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, currentProblemIndex, completedProblems } = body;

    if (!uid) {
      return NextResponse.json({ error: "UID required" }, { status: 400 });
    }

    await db.collection("logic-buddy-progress").doc(uid).set(
      {
        currentProblemIndex,
        completedProblems, // Array of problem IDs or indices
        lastUpdated: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving progress:", error);
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }
}
