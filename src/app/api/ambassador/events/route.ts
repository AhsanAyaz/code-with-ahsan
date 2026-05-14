/**
 * Phase 4 (EVENT-01, EVENT-04): Ambassador-scoped event endpoints.
 *   GET  /api/ambassador/events      — list own non-hidden events, sorted by date desc
 *   POST /api/ambassador/events      — log a new event
 *
 * Gate order (canonical, from Phase 2 Pitfall 3):
 *   1. isAmbassadorProgramEnabled()
 *   2. verifyAuth()
 *   3. hasRoleClaim(ctx, "ambassador")  -- "alumni-ambassador" NOT allowed to log new events
 *   4. Zod parse
 *   5. Firestore write
 */
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { verifyAuth } from "@/lib/auth";
import { hasRoleClaim, type DecodedRoleClaim } from "@/lib/permissions";
import { LogEventSchema, AMBASSADOR_EVENTS_COLLECTION } from "@/types/ambassador";

export async function GET(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ctx = await verifyAuth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snap = await db
    .collection(AMBASSADOR_EVENTS_COLLECTION)
    .where("ambassadorId", "==", ctx.uid)
    .where("hidden", "==", false)
    .orderBy("date", "desc")
    .get();

  const events = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      // Normalize Firestore Timestamp → ISO string for client JSON
      date: data.date?.toDate?.()?.toISOString() ?? data.date,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
    };
  });

  return NextResponse.json({ events }, { status: 200 });
}

export async function POST(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ctx = await verifyAuth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = LogEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Read subdoc to get the ambassador's cohortId
  const subdocSnap = await db
    .collection("mentorship_profiles")
    .doc(ctx.uid)
    .collection("ambassador")
    .doc("v1")
    .get();
  if (!subdocSnap.exists) {
    return NextResponse.json({ error: "Ambassador subdoc missing" }, { status: 409 });
  }
  const subdoc = subdocSnap.data() ?? {};
  const cohortId = subdoc.cohortId as string | undefined;
  if (!cohortId) {
    return NextResponse.json({ error: "No cohort attached" }, { status: 409 });
  }

  // Build payload with conditional spread for optional fields (Admin SDK rejects undefined)
  const payload: Record<string, unknown> = {
    ambassadorId: ctx.uid,
    cohortId,
    date: new Date(parsed.data.date),
    type: parsed.data.type,
    attendanceEstimate: parsed.data.attendanceEstimate,
    hidden: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (typeof parsed.data.link === "string" && parsed.data.link.trim().length > 0) {
    payload.link = parsed.data.link.trim();
  }
  if (typeof parsed.data.notes === "string" && parsed.data.notes.trim().length > 0) {
    payload.notes = parsed.data.notes.trim();
  }

  const ref = await db.collection(AMBASSADOR_EVENTS_COLLECTION).add(payload);

  return NextResponse.json({ eventId: ref.id }, { status: 201 });
}
