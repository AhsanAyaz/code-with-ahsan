/**
 * GET /api/ambassador/eligibility
 *
 * Server-side eligibility check for the apply wizard EligibilityStep.
 * Replaces the client-side Firebase Auth age calculation so admin-granted
 * bypasses (ambassador_eligibility_bypasses/{uid}) take effect before step 1.
 *
 * Returns: { eligible, bypassed?, profileAgeDays?, requiredDays }
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { ensureDiscordAgeEligible } from "@/lib/ambassador/applications";

export async function GET(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await ensureDiscordAgeEligible(auth.uid);
  return NextResponse.json(result);
}
