import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

// GET /api/mas-raffle/state — public, no auth
// Returns the current raffle state for client polling.
export async function GET() {
  try {
    const snap = await db.collection("mas-raffle-state").doc("current").get();
    if (!snap.exists) {
      return NextResponse.json({ state: "idle", winnerName: null });
    }
    const data = snap.data()!;
    return NextResponse.json({
      state: data.state ?? "idle",
      winnerName: data.winnerName ?? null,
    });
  } catch (error) {
    console.error("[mas-raffle/state] GET error:", error);
    return NextResponse.json({ state: "idle", winnerName: null });
  }
}
