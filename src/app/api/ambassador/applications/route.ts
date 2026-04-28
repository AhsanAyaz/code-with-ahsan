/**
 * POST /api/ambassador/applications — Submit a new ambassador application (APPLY-01..06).
 * GET  /api/ambassador/applications — Admin list with cursor pagination (x-admin-token required).
 *
 * Pitfall 3 (RESEARCH.md): isAmbassadorProgramEnabled() guard is the FIRST check in every handler.
 * Pitfall 4: Firestore rules (Plan 03) deny-all client writes to applications/*; Admin SDK is the sole write path.
 */

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/auth";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import { ApplicationSubmitSchema, type ApplicationDoc } from "@/types/ambassador";
import { AMBASSADOR_APPLICATIONS_COLLECTION } from "@/lib/ambassador/constants";
import {
  ensureDiscordAgeEligible,
  resolveDiscordMemberSoft,
  checkDuplicateApplication,
  checkCohortAcceptingSubmissions,
  buildApplicationDoc,
  runServerSideContentChecks,
  classifyAcademicEmailPath,
} from "@/lib/ambassador/applications";
import { sendAmbassadorApplicationSubmittedEmail } from "@/lib/email";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ambassador/applications");

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Suppress unused import — FieldValue is available for future use in this module
void FieldValue;

export async function POST(request: NextRequest) {
  // Pitfall 3: feature flag check — must be FIRST
  if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Parse + Zod validate
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = ApplicationSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid application body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;
  // Normalize Discord handle server-side: strip leading @ and legacy #discriminator
  input.discordHandle = input.discordHandle.trim().replace(/^@/, "").replace(/#\d+$/, "");

  // Cross-field + regex re-validation (defense-in-depth — D-07, D-15)
  const contentCheck = runServerSideContentChecks(input);
  if (!contentCheck.ok) {
    return NextResponse.json({ error: contentCheck.error, field: contentCheck.field }, { status: 400 });
  }

  // APPLY-01: Discord/profile age gate (returns 403 when too_new or profile_missing)
  const eligibility = await ensureDiscordAgeEligible(auth.uid);
  if (!eligibility.eligible) {
    return NextResponse.json(
      {
        error: "Not yet eligible",
        reason: eligibility.reason,
        profileAgeDays: eligibility.profileAgeDays,
        requiredDays: eligibility.requiredDays,
      },
      { status: 403 },
    );
  }

  // Cohort window gate: applicationWindowOpen + status=upcoming + not full
  const cohortCheck = await checkCohortAcceptingSubmissions(input.targetCohortId);
  if (!cohortCheck.open) {
    return NextResponse.json(
      { error: `Cohort is not accepting submissions (${cohortCheck.reason})` },
      { status: 409 },
    );
  }

  // Duplicate guard: one active application per (uid, cohortId)
  const dup = await checkDuplicateApplication(auth.uid, input.targetCohortId);
  if (dup.duplicate) {
    return NextResponse.json(
      {
        error: "You already have an active application for this cohort.",
        existingApplicationId: dup.existingApplicationId,
        existingStatus: dup.existingStatus,
      },
      { status: 409 },
    );
  }

  // Load applicant profile for name (we trust Firebase auth email over the body)
  const profileSnap = await db.collection("mentorship_profiles").doc(auth.uid).get();
  const profile = profileSnap.data() ?? {};
  const applicantEmail = auth.email || (profile.email as string | undefined) || "";
  const applicantName =
    (input as { applicantName?: string }).applicantName ||
    (profile.displayName as string | undefined) ||
    (profile.name as string | undefined) ||
    applicantEmail.split("@")[0] ||
    "Applicant";
  if (!applicantEmail) {
    return NextResponse.json({ error: "Missing applicant email on profile" }, { status: 400 });
  }

  // DISC-01: fail-soft Discord resolution — never blocks submission (D-16)
  const discordMember = await resolveDiscordMemberSoft(input.discordHandle);

  // APPLY-04: classify academic email path; determines academicEmailVerified on doc
  const { verified: academicEmailVerified } = classifyAcademicEmailPath(input);

  // Firestore write via Admin SDK (sole write path — Pitfall 4)
  const docRef = db.collection(AMBASSADOR_APPLICATIONS_COLLECTION).doc(); // auto-id
  const payload = buildApplicationDoc(
    {
      applicantUid: auth.uid,
      applicantEmail,
      applicantName,
      input,
      discordMemberId: discordMember?.id ?? null,
      academicEmailVerified,
    },
    docRef.id,
  );
  await docRef.set(payload);

  // EMAIL-01: trigger submission confirmation email (non-fatal — submission persists on send failure)
  try {
    await sendAmbassadorApplicationSubmittedEmail(
      applicantEmail,
      applicantName,
      cohortCheck.cohortName ?? "the next cohort",
    );
  } catch (e) {
    logger.error("EMAIL-01 send failed", { uid: auth.uid, applicationId: docRef.id, error: e });
  }

  return NextResponse.json(
    {
      applicationId: docRef.id,
      status: "submitted",
      discordResolved: discordMember != null,
    },
    { status: 201 },
  );
}

/**
 * Admin list with cursor pagination.
 * Query params: ?status=submitted&cohortId=X&cursor=<docId>&pageSize=20
 */
export async function GET(request: NextRequest) {
  // Pitfall 3: feature flag check — must be FIRST
  if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const adminResult = await requireAdmin(request);
  if (!adminResult.ok) {
    return NextResponse.json({ error: adminResult.error }, { status: adminResult.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");       // optional filter
  const cohortId = searchParams.get("cohortId");   // optional filter
  const cursor = searchParams.get("cursor");        // last docId from previous page
  const pageSizeRaw = Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(
    Math.max(1, Number.isFinite(pageSizeRaw) ? pageSizeRaw : DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );

  let q = db
    .collection(AMBASSADOR_APPLICATIONS_COLLECTION)
    .orderBy("submittedAt", "desc") as FirebaseFirestore.Query;

  if (status) q = q.where("status", "==", status);
  if (cohortId) q = q.where("targetCohortId", "==", cohortId);
  if (cursor) {
    const cursorSnap = await db.collection(AMBASSADOR_APPLICATIONS_COLLECTION).doc(cursor).get();
    if (cursorSnap.exists) q = q.startAfter(cursorSnap);
  }
  q = q.limit(pageSize);

  const snap = await q.get();
  const items = snap.docs.map((d) => ({ ...(d.data() as ApplicationDoc), applicationId: d.id }));
  const nextCursor = items.length === pageSize ? items[items.length - 1].applicationId : null;

  return NextResponse.json({ items, nextCursor, pageSize });
}
