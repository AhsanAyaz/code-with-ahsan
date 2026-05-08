import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/ambassador/adminAuth";

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/raffle/entries/count — admin-gated
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const today = getTodayUTC();
    // Fetch all today's entries and filter in code so entries without the
    // won field (submitted before the won flag was introduced) are counted correctly.
    const snap = await db
      .collection("raffle-entries")
      .where("date", "==", today)
      .get();

    const eligible = snap.docs.filter((d) => !d.data().won).length;

    return NextResponse.json({ count: eligible });
  } catch (error) {
    console.error("[raffle/entries/count] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
