/**
 * Phase 4 (EVENT-03): Admin-scoped event management.
 *   GET   /api/ambassador/events/admin?cohortId=X  — list ALL events for cohort
 *   PATCH /api/ambassador/events/admin             — toggle hidden flag on an event
 *
 * Admin-only. Does NOT include ownership checks (admins see all).
 */
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { db } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import { AMBASSADOR_EVENTS_COLLECTION } from "@/types/ambassador";

const AdminHidePatchSchema = z.object({
  eventId: z.string().min(1),
  hidden: z.boolean(),
});

export async function GET(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const cohortId = request.nextUrl.searchParams.get("cohortId");
  if (!cohortId) {
    return NextResponse.json({ error: "Missing cohortId" }, { status: 400 });
  }

  const snap = await db
    .collection(AMBASSADOR_EVENTS_COLLECTION)
    .where("cohortId", "==", cohortId)
    .orderBy("date", "desc")
    .get();

  const events = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      date: data.date?.toDate?.()?.toISOString() ?? data.date,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
    };
  });
  return NextResponse.json({ events }, { status: 200 });
}

export async function PATCH(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = AdminHidePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const ref = db.collection(AMBASSADOR_EVENTS_COLLECTION).doc(parsed.data.eventId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  await ref.update({
    hidden: parsed.data.hidden,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
