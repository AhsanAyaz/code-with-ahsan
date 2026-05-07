import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/ambassador/adminAuth";

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/mas-raffle/entries/count — admin-gated
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const today = getTodayUTC();
    const snap = await db
      .collection("mas-raffle-emails")
      .where("date", "==", today)
      .count()
      .get();

    return NextResponse.json({ count: snap.data().count });
  } catch (error) {
    console.error("[mas-raffle/entries/count] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
