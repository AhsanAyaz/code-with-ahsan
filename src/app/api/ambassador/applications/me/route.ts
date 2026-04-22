/**
 * GET /api/ambassador/applications/me — Returns the authenticated user's own applications (APPLY-07).
 *
 * Admin-only fields (reviewerNotes, reviewedBy) are stripped before returning to the applicant
 * so internal notes never leak to applicant-facing surfaces.
 *
 * Pitfall 3: isAmbassadorProgramEnabled() is the FIRST check.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/auth";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { AMBASSADOR_APPLICATIONS_COLLECTION } from "@/lib/ambassador/constants";
import type { ApplicationDoc } from "@/types/ambassador";

export async function GET(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await db
    .collection(AMBASSADOR_APPLICATIONS_COLLECTION)
    .where("applicantUid", "==", auth.uid)
    .orderBy("submittedAt", "desc")
    .get();

  const items = snap.docs.map((d) => {
    const data = d.data() as ApplicationDoc;
    // Strip admin-only fields so we never leak reviewerNotes to applicant surfaces.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { reviewerNotes, reviewedBy, ...safe } = data;
    return { ...safe, applicationId: d.id };
  });

  return NextResponse.json({ items });
}
