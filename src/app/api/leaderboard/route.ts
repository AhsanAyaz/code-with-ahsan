import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const snapshot = await db
      .collection("logic-buddy-leaderboard")
      .orderBy("score", "desc")
      .limit(10)
      .get();

    const leaderboard = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return NextResponse.json(leaderboard);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Graceful fallback for auth errors to avoid crashing the page
    console.error("Error fetching leaderboard:", error);
    if (error.code === 2 || error.message?.includes("invalid_grant")) {
      console.warn(
        "Leaderboard disabled due to auth error (likely local environment)."
      );
      return NextResponse.json([]);
    }
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, score, logicTitle, uid, photoURL, problemId } = body;

    // We strictly require UID now for this new logic to work well
    if (!uid || !problemId || typeof score !== "number") {
      return NextResponse.json(
        { error: "Invalid data: uid and problemId required" },
        { status: 400 }
      );
    }

    const leaderboardRef = db.collection("logic-buddy-leaderboard");
    const querySnapshot = await leaderboardRef
      .where("uid", "==", uid)
      .limit(1)
      .get();

    if (!querySnapshot.empty) {
      // Update existing
      const doc = querySnapshot.docs[0];
      const data = doc.data();

      const scoresMap = data.scoresMap || {};

      // Update or add the score for this specific problem
      scoresMap[problemId] = score;

      // Recalculate total
      const totalScore = Object.values(scoresMap).reduce(
        (acc: number, val: unknown) => acc + (val as number),
        0
      );

      await doc.ref.update({
        name, // Update name in case it changed
        photoURL,
        scoresMap,
        score: totalScore, // This is the main field we sort by
        lastUpdated: new Date(),
      });
    } else {
      // Create new
      const scoresMap = { [problemId]: score };
      await leaderboardRef.add({
        uid,
        name,
        photoURL,
        scoresMap,
        score, // Initial total
        logicTitle, // Keep last title or just generic
        date: new Date(),
        lastUpdated: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding to leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to add to leaderboard" },
      { status: 500 }
    );
  }
}
