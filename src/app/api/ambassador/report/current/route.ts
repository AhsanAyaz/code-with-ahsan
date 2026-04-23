/**
 * Phase 4 (REPORT-03): Current-month report status for the authed ambassador.
 *   GET /api/ambassador/report/current
 *
 * Returns `{ submitted: boolean, month: string, deadlineIso: string, report?: MonthlyReportDoc }`.
 * Consumed by `<ReportStatusBadge />` on `/ambassadors/report`.
 * Deadline is end-of-month in the ambassador's local timezone (D-04), serialized as UTC ISO string.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { verifyAuth } from "@/lib/auth";
import { hasRoleClaim, type DecodedRoleClaim } from "@/lib/permissions";
import { MONTHLY_REPORTS_COLLECTION } from "@/types/ambassador";
import {
  getCurrentMonthKey,
  getDeadlineUTC,
} from "@/lib/ambassador/reportDeadline";

export async function GET(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ctx = await verifyAuth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Read ambassador subdoc to get timezone
  const subdocSnap = await db
    .collection("mentorship_profiles")
    .doc(ctx.uid)
    .collection("ambassador")
    .doc("v1")
    .get();
  const subdoc = subdocSnap.data() ?? {};
  const timezone = (typeof subdoc.timezone === "string" && subdoc.timezone.length > 0)
    ? subdoc.timezone
    : "UTC";

  const month = getCurrentMonthKey(timezone);
  const [yearStr, monthStr] = month.split("-");
  const deadlineIso = new Date(
    getDeadlineUTC(Number(yearStr), Number(monthStr), timezone),
  ).toISOString();

  const docId = `${ctx.uid}_${month}`;
  const reportSnap = await db
    .collection(MONTHLY_REPORTS_COLLECTION)
    .doc(docId)
    .get();

  if (!reportSnap.exists) {
    return NextResponse.json(
      { submitted: false, month, deadlineIso },
      { status: 200 },
    );
  }

  const data = reportSnap.data() ?? {};
  // Defensive: ensure the doc truly belongs to this ambassador (deterministic id guarantees,
  // but guard in case of manual writes / migration artefacts).
  if (data.ambassadorId !== ctx.uid) {
    return NextResponse.json(
      { submitted: false, month, deadlineIso },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      submitted: true,
      month,
      deadlineIso,
      report: {
        ...data,
        submittedAt: data.submittedAt?.toDate?.()?.toISOString() ?? data.submittedAt,
      },
    },
    { status: 200 },
  );
}
