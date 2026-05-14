/**
 * GET  /api/admin/ambassador/eligibility-bypasses  — list all active bypasses
 * POST /api/admin/ambassador/eligibility-bypasses  — grant bypass by email
 *
 * Doc shape in ambassador_eligibility_bypasses/{uid}:
 *   { uid, email, displayName, grantedBy, grantedAt, reason? }
 */

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db, auth } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { AMBASSADOR_ELIGIBILITY_BYPASSES_COLLECTION } from "@/lib/ambassador/constants";
import { z } from "zod";

const GrantSchema = z.object({
  email: z.string().email(),
  reason: z.string().trim().max(500).optional(),
});

export async function GET(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const snap = await db
    .collection(AMBASSADOR_ELIGIBILITY_BYPASSES_COLLECTION)
    .orderBy("grantedAt", "desc")
    .get();

  const bypasses = snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      email: data.email ?? "",
      displayName: data.displayName ?? "",
      grantedBy: data.grantedBy ?? "",
      grantedAt: data.grantedAt?._seconds
        ? new Date(data.grantedAt._seconds * 1000).toISOString()
        : null,
      reason: data.reason ?? null,
    };
  });

  return NextResponse.json({ bypasses });
}

export async function POST(request: NextRequest) {
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

  const parsed = GrantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  const { email, reason } = parsed.data;

  // Look up the Firebase Auth user by email to get their UID and display name.
  let targetUser: { uid: string; email: string; displayName: string };
  try {
    const record = await auth.getUserByEmail(email);
    targetUser = {
      uid: record.uid,
      email: record.email ?? email,
      displayName: record.displayName ?? record.email ?? email,
    };
  } catch {
    return NextResponse.json({ error: `No CWA account found for ${email}` }, { status: 404 });
  }

  const doc: Record<string, unknown> = {
    uid: targetUser.uid,
    email: targetUser.email,
    displayName: targetUser.displayName,
    grantedBy: admin.uid,
    grantedAt: FieldValue.serverTimestamp(),
  };
  if (reason) doc.reason = reason;

  await db
    .collection(AMBASSADOR_ELIGIBILITY_BYPASSES_COLLECTION)
    .doc(targetUser.uid)
    .set(doc);

  return NextResponse.json({
    uid: targetUser.uid,
    email: targetUser.email,
    displayName: targetUser.displayName,
  });
}
