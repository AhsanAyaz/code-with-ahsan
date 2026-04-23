/**
 * Phase 4 (EVENT-02): Ambassador-scoped per-event edit/delete with 30-day window.
 *
 *   PATCH  /api/ambassador/events/[eventId]
 *   DELETE /api/ambassador/events/[eventId]
 *
 * Server-side window enforcement is mandatory (RESEARCH Pitfall 6). Client hides
 * the button but the server is the source of truth.
 */
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { verifyAuth } from "@/lib/auth";
import { hasRoleClaim, type DecodedRoleClaim } from "@/lib/permissions";
import {
  UpdateEventSchema,
  AMBASSADOR_EVENTS_COLLECTION,
  EVENT_EDIT_WINDOW_MS,
} from "@/types/ambassador";

type RouteParams = { params: Promise<{ eventId: string }> };

/** Returns the event date as milliseconds since epoch for window math. */
function toDateMs(value: unknown): number {
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return new Date(value).getTime();
  return 0;
}

async function loadOwnedEvent(
  eventId: string,
  uid: string,
): Promise<
  | { ok: true; ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData }
  | { ok: false; status: number; error: string }
> {
  const ref = db.collection(AMBASSADOR_EVENTS_COLLECTION).doc(eventId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, status: 404, error: "Event not found" };
  const data = snap.data() as FirebaseFirestore.DocumentData;
  if (data.ambassadorId !== uid) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, ref, data };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ctx = await verifyAuth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { eventId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = UpdateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const loaded = await loadOwnedEvent(eventId, ctx.uid);
  if (!loaded.ok) return NextResponse.json({ error: loaded.error }, { status: loaded.status });

  // Server-side 30-day window (RESEARCH Pitfall 6)
  const eventMs = toDateMs(loaded.data.date);
  if (Date.now() - eventMs > EVENT_EDIT_WINDOW_MS) {
    return NextResponse.json(
      { error: "Edit window has closed (30 days after event date)" },
      { status: 409 },
    );
  }

  const updatePayload: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (parsed.data.date) updatePayload.date = new Date(parsed.data.date);
  if (parsed.data.type) updatePayload.type = parsed.data.type;
  if (typeof parsed.data.attendanceEstimate === "number") {
    updatePayload.attendanceEstimate = parsed.data.attendanceEstimate;
  }
  if (typeof parsed.data.link === "string") {
    // Empty string means "clear" — use FieldValue.delete()
    updatePayload.link =
      parsed.data.link.trim().length === 0 ? FieldValue.delete() : parsed.data.link.trim();
  }
  if (typeof parsed.data.notes === "string") {
    updatePayload.notes =
      parsed.data.notes.trim().length === 0 ? FieldValue.delete() : parsed.data.notes.trim();
  }

  await loaded.ref.update(updatePayload);
  return NextResponse.json({ success: true }, { status: 200 });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ctx = await verifyAuth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { eventId } = await params;
  const loaded = await loadOwnedEvent(eventId, ctx.uid);
  if (!loaded.ok) return NextResponse.json({ error: loaded.error }, { status: loaded.status });

  const eventMs = toDateMs(loaded.data.date);
  if (Date.now() - eventMs > EVENT_EDIT_WINDOW_MS) {
    return NextResponse.json(
      { error: "Edit window has closed (30 days after event date)" },
      { status: 409 },
    );
  }

  await loaded.ref.delete();
  return NextResponse.json({ success: true }, { status: 200 });
}
