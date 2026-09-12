import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { verifyHostRequest } from "@/lib/hostAuth";
import type { WinnersData } from "@/types/events";

// ─── Auth helper — same pattern as src/app/api/admin/courses/route.ts ───────
//
// Writes are allowed for a site admin (x-admin-token) or the event presenter
// (x-host-token), so the host can announce winners from the deck without the
// admin password. Host tokens live in their own `host_sessions` collection and
// are never accepted by the admin_sessions lookups elsewhere.

async function checkAdminSession(token: string): Promise<boolean> {
  const sessionDoc = await db.collection("admin_sessions").doc(token).get();
  if (!sessionDoc.exists) return false;
  const session = sessionDoc.data();
  const expiresAt = session?.expiresAt?.toDate?.() || new Date(0);
  if (expiresAt < new Date()) {
    await db.collection("admin_sessions").doc(token).delete();
    return false;
  }
  return true;
}

async function checkAdminAuth(request: NextRequest): Promise<NextResponse | null> {
  const unauthorized = NextResponse.json(
    { error: "Admin or host authentication required" },
    { status: 401 }
  );

  const adminToken = request.headers.get("x-admin-token");
  if (adminToken && (await checkAdminSession(adminToken))) {
    return null;
  }

  if (await verifyHostRequest(request)) {
    return null;
  }

  return unauthorized;
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

// ─── DELETE /api/admin/events/[eventId]/winners — admin clear ────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  const { eventId } = await params;
  try {
    await db.doc(`events/${eventId}/winners/data`).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing winners:", error);
    return NextResponse.json({ error: "Failed to clear winners" }, { status: 500 });
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

  if (!body.first?.teamName || !body.second?.teamName || !body.third?.teamName) {
    return NextResponse.json(
      { error: "All three placements must have a team selected" },
      { status: 400 }
    );
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
