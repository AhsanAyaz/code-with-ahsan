import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { verifyHostRequest } from "@/lib/hostAuth";
import { requireAdminAccess, logAdminAction, type AdminActor } from "@/lib/adminAccess/server";
import type { AdminAction } from "@/lib/adminAccess/actions";
import type { WinnersData } from "@/types/events";

// ─── Auth helper ─────────────────────────────────────────────────────────────
//
// Writes are allowed for a staff member signed in to the admin portal (Bearer
// ID token, checked per action: editing is moderator, clearing is admin only)
// or for the event presenter (x-host-token), so the host can announce winners
// from the deck. Host tokens live in their own `host_sessions` collection.

type WinnersWriteAuth =
  | { ok: true; actor: AdminActor | null }
  | { ok: false; response: NextResponse };

async function authorizeWinnersWrite(
  request: NextRequest,
  action: AdminAction
): Promise<WinnersWriteAuth> {
  if (await verifyHostRequest(request)) {
    return { ok: true, actor: null };
  }

  const access = await requireAdminAccess(request, action);
  if (access.ok) return { ok: true, actor: access.actor };

  // No staff credential either: answer as the combined admin-or-host gate.
  if (!request.headers.get("Authorization")) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Admin or host authentication required" },
        { status: 401 }
      ),
    };
  }
  return access;
}

// ─── GET /api/admin/events/[eventId]/winners: public read ───────────────────

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

// ─── DELETE /api/admin/events/[eventId]/winners: admin or host clear ────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const auth = await authorizeWinnersWrite(request, "events.winners.delete");
  if (!auth.ok) return auth.response;

  const { eventId } = await params;
  try {
    await db.doc(`events/${eventId}/winners/data`).delete();
    if (auth.actor) {
      await logAdminAction(auth.actor, "events.winners.delete", {
        type: "event_winners",
        id: eventId,
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing winners:", error);
    return NextResponse.json({ error: "Failed to clear winners" }, { status: 500 });
  }
}

// ─── PUT /api/admin/events/[eventId]/winners: staff or host write ───────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const auth = await authorizeWinnersWrite(request, "events.winners.edit");
  if (!auth.ok) return auth.response;

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
    if (auth.actor) {
      await logAdminAction(
        auth.actor,
        "events.winners.edit",
        { type: "event_winners", id: eventId },
        {
          first: body.first.teamName,
          second: body.second.teamName,
          third: body.third.teamName,
        }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving winners:", error);
    return NextResponse.json({ error: "Failed to save winners" }, { status: 500 });
  }
}
