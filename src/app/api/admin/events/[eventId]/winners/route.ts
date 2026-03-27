import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { WinnersData } from "@/types/events";

// ─── Auth helper — same pattern as src/app/api/admin/courses/route.ts ───────

async function checkAdminAuth(request: NextRequest): Promise<NextResponse | null> {
  const token = request.headers.get("x-admin-token");
  if (!token) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }
  const sessionDoc = await db.collection("admin_sessions").doc(token).get();
  if (!sessionDoc.exists) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }
  const session = sessionDoc.data();
  const expiresAt = session?.expiresAt?.toDate?.() || new Date(0);
  if (expiresAt < new Date()) {
    await db.collection("admin_sessions").doc(token).delete();
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }
  return null;
}

// ─── GET /api/admin/events/[eventId]/winners — public read ───────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  try {
    const snap = await db.doc(`events/${eventId}/winners/data`).get();
    if (!snap.exists) {
      return NextResponse.json(null);
    }
    const data = snap.data() as WinnersData & { announcedAt?: FirebaseFirestore.Timestamp };
    return NextResponse.json({
      ...data,
      announcedAt: data.announcedAt?.toDate?.().toISOString() ?? null,
    });
  } catch (error) {
    console.error("Error fetching winners:", error);
    return NextResponse.json({ error: "Failed to fetch winners" }, { status: 500 });
  }
}

// ─── PUT /api/admin/events/[eventId]/winners — admin write ───────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  const { eventId } = await params;

  let body: Omit<WinnersData, "announcedAt">;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.first || !body.second || !body.third) {
    return NextResponse.json({ error: "first, second, and third placements required" }, { status: 400 });
  }

  try {
    await db.doc(`events/${eventId}/winners/data`).set({
      first: body.first,
      second: body.second,
      third: body.third,
      announcedAt: new Date(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving winners:", error);
    return NextResponse.json({ error: "Failed to save winners" }, { status: 500 });
  }
}
