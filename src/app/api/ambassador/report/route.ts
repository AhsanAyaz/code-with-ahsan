/**
 * Phase 4 (REPORT-01, REPORT-02): Ambassador monthly self-report submission.
 *   POST /api/ambassador/report      — submit this month's report
 *
 * Gate order (canonical):
 *   1. isAmbassadorProgramEnabled()
 *   2. verifyAuth()
 *   3. hasRoleClaim(ctx, "ambassador")
 *   4. Zod parse (MonthlyReportSchema)
 *   5. Read ambassador subdoc (for cohortId + timezone)
 *   6. Compute deterministic doc id: `${uid}_${getCurrentMonthKey(timezone)}`
 *   7. db.runTransaction: read doc → if exists, 409; else write
 *
 * Race safety: deterministic doc id + transactional existence check — two concurrent
 * submits CANNOT produce two docs because the second txn sees the first's write
 * (RESEARCH Pitfall 7).
 */
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { verifyAuth } from "@/lib/auth";
import { hasRoleClaim, type DecodedRoleClaim } from "@/lib/permissions";
import {
  MonthlyReportSchema,
  MONTHLY_REPORTS_COLLECTION,
} from "@/types/ambassador";
import { getCurrentMonthKey } from "@/lib/ambassador/reportDeadline";

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

  const parsed = MonthlyReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Read the ambassador subdoc for cohortId + timezone
  const subdocRef = db
    .collection("mentorship_profiles")
    .doc(ctx.uid)
    .collection("ambassador")
    .doc("v1");
  const subdocSnap = await subdocRef.get();
  if (!subdocSnap.exists) {
    return NextResponse.json({ error: "Ambassador subdoc missing" }, { status: 409 });
  }
  const subdoc = subdocSnap.data() ?? {};
  const cohortId = subdoc.cohortId as string | undefined;
  if (!cohortId) {
    return NextResponse.json({ error: "No cohort attached" }, { status: 409 });
  }
  const timezone = (typeof subdoc.timezone === "string" && subdoc.timezone.length > 0)
    ? subdoc.timezone
    : "UTC";

  // Deterministic doc id: {uid}_{YYYY-MM-in-ambassador-local}
  const month = getCurrentMonthKey(timezone);
  const docId = `${ctx.uid}_${month}`;
  const ref = db.collection(MONTHLY_REPORTS_COLLECTION).doc(docId);

  // Transactional write: second concurrent submit sees the first's doc and gets 409.
  try {
    await db.runTransaction(async (txn) => {
      const existing = await txn.get(ref);
      if (existing.exists) {
        // Signal to outer handler via thrown marker
        throw new Error("__ALREADY_SUBMITTED__");
      }
      txn.set(ref, {
        ambassadorId: ctx.uid,
        cohortId,
        month,
        whatWorked: parsed.data.whatWorked.trim(),
        whatBlocked: parsed.data.whatBlocked.trim(),
        whatNeeded: parsed.data.whatNeeded.trim(),
        submittedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "__ALREADY_SUBMITTED__") {
      return NextResponse.json({ error: "Already submitted" }, { status: 409 });
    }
    console.error("[ambassador.report.POST] transaction failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ reportId: docId, month }, { status: 201 });
}
