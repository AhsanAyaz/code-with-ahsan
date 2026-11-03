/**
 * DELETE /api/admin/ambassador/eligibility-bypasses/[uid]
 *
 * Revokes an admin-granted eligibility bypass for the given user UID.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireAdminAccess, logAdminAction } from "@/lib/adminAccess/server";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { AMBASSADOR_ELIGIBILITY_BYPASSES_COLLECTION } from "@/lib/ambassador/constants";

type RouteParams = { params: Promise<{ uid: string }> };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const access = await requireAdminAccess(request, "ambassador.eligibilityBypass.revoke");
  if (!access.ok) return access.response;

  const { uid } = await params;

  const ref = db.collection(AMBASSADOR_ELIGIBILITY_BYPASSES_COLLECTION).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Bypass not found" }, { status: 404 });
  }

  await ref.delete();
  await logAdminAction(access.actor, "ambassador.eligibilityBypass.revoke", {
    type: "ambassador_eligibility_bypass",
    id: uid,
    ...(snap.data()?.email ? { label: snap.data()?.email as string } : {}),
  });
  return NextResponse.json({ ok: true });
}
