---
phase: 02-application-subsystem
plan: 05
type: execute
wave: 2
depends_on:
  - "02-01"
  - "02-02"
  - "02-03"
  - "02-04"
files_modified:
  - src/app/api/ambassador/applications/route.ts
  - src/app/api/ambassador/applications/me/route.ts
  - src/app/api/ambassador/applications/student-id-upload-url/route.ts
  - src/lib/ambassador/applications.ts
autonomous: true
requirements:
  - APPLY-01
  - APPLY-02
  - APPLY-03
  - APPLY-04
  - APPLY-05
  - APPLY-06
  - APPLY-07
  - APPLY-08
  - DISC-01
  - EMAIL-01
must_haves:
  truths:
    - "POST /api/ambassador/applications validates the body with ApplicationSubmitSchema and rejects 400 on any validation error (malformed video URL, missing motivation, wrong schema shape)."
    - "POST returns 403 if the authenticated user's CWA profile createdAt is younger than AMBASSADOR_DISCORD_MIN_AGE_DAYS (APPLY-01 age gate)."
    - "POST returns 409 if the user already has a non-declined application for the same cohort (prevents duplicates)."
    - "POST resolves Discord handle to discordMemberId via lookupMemberByUsername — failure is soft (discordMemberId: null), never blocks submission (DISC-01 + D-16)."
    - "POST writes the application doc to Firestore applications/{applicationId} with status='submitted' and triggers EMAIL-01 before returning 201."
    - "POST returns 404 when FEATURE_AMBASSADOR_PROGRAM is off (Pitfall 3 — must gate API routes, not just layout)."
    - "GET /api/ambassador/applications?admin=1 returns a paginated admin list (x-admin-token required, cursor pagination via startAfter)."
    - "GET /api/ambassador/applications/me returns the authenticated user's own applications (APPLY-07)."
    - "POST /api/ambassador/applications/student-id-upload-url returns a 10-minute signed upload URL for path applications/{applicantUid}/{applicationId}/student_id.{ext} (APPLY-05, D-14)."
  artifacts:
    - path: "src/app/api/ambassador/applications/route.ts"
      provides: "POST submit (applicant), GET list (admin paginated)"
      exports:
        - "POST"
        - "GET"
    - path: "src/app/api/ambassador/applications/me/route.ts"
      provides: "GET own-application status endpoint for APPLY-07"
      exports:
        - "GET"
    - path: "src/app/api/ambassador/applications/student-id-upload-url/route.ts"
      provides: "POST returns a signed upload URL for student-ID photo (APPLY-05)"
      exports:
        - "POST"
    - path: "src/lib/ambassador/applications.ts"
      provides: "Shared helpers: buildApplicationDoc, ensureEligibility, resolveDiscordMember, isValidVideoUrl+classifyVideoUrl passthrough, runSubmissionPipeline"
      exports:
        - "ensureDiscordAgeEligible"
        - "resolveDiscordMemberSoft"
        - "checkDuplicateApplication"
        - "buildApplicationDoc"
  key_links:
    - from: "src/app/api/ambassador/applications/route.ts"
      to: "isAmbassadorProgramEnabled"
      via: "feature-flag guard at top of every handler (Pitfall 3)"
      pattern: "isAmbassadorProgramEnabled"
    - from: "src/app/api/ambassador/applications/route.ts"
      to: "ApplicationSubmitSchema"
      via: "Zod .safeParse on POST body"
      pattern: "ApplicationSubmitSchema.*safeParse"
    - from: "src/app/api/ambassador/applications/route.ts"
      to: "isValidVideoUrl + classifyVideoUrl"
      via: "server-side re-validation of videoUrl (D-07) and videoEmbedType derivation (D-08)"
      pattern: "classifyVideoUrl|isValidVideoUrl"
    - from: "src/app/api/ambassador/applications/route.ts"
      to: "validateAcademicEmail"
      via: "server-side re-validation of academic email — D-15 soft warning, never hard reject"
      pattern: "validateAcademicEmail"
    - from: "src/app/api/ambassador/applications/route.ts"
      to: "lookupMemberByUsername"
      via: "DISC-01 soft-resolve Discord member at submission; store null on failure"
      pattern: "lookupMemberByUsername"
    - from: "src/app/api/ambassador/applications/route.ts"
      to: "sendAmbassadorApplicationSubmittedEmail"
      via: "EMAIL-01 trigger after Firestore write"
      pattern: "sendAmbassadorApplicationSubmittedEmail"
    - from: "src/app/api/ambassador/applications/route.ts"
      to: "cohort.applicationWindowOpen && cohort.status == 'upcoming'"
      via: "server-side gate: Firestore read of targetCohortId before accepting submission"
      pattern: "applicationWindowOpen"
    - from: "src/app/api/ambassador/applications/student-id-upload-url/route.ts"
      to: "storage.file(path).getSignedUrl({action:'write'})"
      via: "Firebase Admin Storage signed UPLOAD URL, 10-minute expiry, content-type constrained"
      pattern: "getSignedUrl.*action.*write"
---

<objective>
Build the public submission pipeline (POST), the applicant status endpoint (GET me), and the student-ID signed-upload-URL endpoint. These three routes cover every APPLY-* requirement except APPLY-07's UI surfacing (Plan 08 admin detail renders it for admins; Plan 07 wizard UI renders it for applicants). DISC-01 is fail-soft here; DISC-02/03 (accept-time) live in Plan 06. EMAIL-01 fires here; EMAIL-02/03 fire in Plan 06.

Purpose:
- One server-side choke point for application writes. Firestore rules (Plan 03) already deny client writes to applications/*, so the only way to create an application is through POST /api/ambassador/applications.
- Server-side re-validation of every field the wizard validates client-side — never trust the client. Zod schema, video URL regex, academic email check, cohort window check, and duplicate check all re-run server-side.
- Fail-soft Discord resolution (D-16): submission never blocks on Discord API being down. discordMemberId is null on the doc; admin sees banner in Plan 08.
- Direct-to-Storage uploads (APPLY-05): rather than shipping file bytes through this API route, return a short-lived signed upload URL so the Next.js route stays lightweight and Storage charges go through the browser.

Output:
- POST /api/ambassador/applications (submit) — Wave 2 blocker for Plan 07 (wizard UI).
- GET /api/ambassador/applications?admin=1 (admin list, cursor paginated) — Wave 2 blocker for Plan 08 (admin list).
- GET /api/ambassador/applications/me (applicant own status) — APPLY-07.
- POST /api/ambassador/applications/student-id-upload-url (signed upload URL) — APPLY-05.
- src/lib/ambassador/applications.ts — shared helpers.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-application-subsystem/02-CONTEXT.md
@.planning/phases/02-application-subsystem/02-RESEARCH.md
@.planning/phases/02-application-subsystem/02-01-SUMMARY.md
@.planning/phases/02-application-subsystem/02-02-SUMMARY.md
@.planning/phases/02-application-subsystem/02-03-SUMMARY.md
@.planning/phases/02-application-subsystem/02-04-SUMMARY.md

<interfaces>
<!-- Contracts the executor needs — no codebase scavenging required. -->

From @/types/ambassador (Plan 01):
```typescript
export const ApplicationSubmitSchema: z.ZodType<ApplicationSubmitInput>;
export type ApplicationSubmitInput = {
  targetCohortId: string;
  university: string;
  yearOfStudy: string;
  country: string;
  city: string;
  discordHandle: string;
  academicEmail?: string;              // path A
  studentIdStoragePath?: string;       // path B (filled after upload)
  motivation: string;                  // prompt 1 (min 60 chars)
  experience: string;                  // prompt 2 (min 60 chars)
  pitch: string;                       // prompt 3 (min 60 chars)
  videoUrl: string;
};
export interface ApplicationDoc { /* from Plan 01; see RESEARCH.md line 480 */ }
export type ApplicationStatus = "submitted" | "under_review" | "accepted" | "declined";
```

From @/lib/ambassador/constants (Plan 01):
```typescript
export const AMBASSADOR_DISCORD_MIN_AGE_DAYS: number;      // default 30, Plan 09 checkpoint
export const AMBASSADOR_APPLICATIONS_COLLECTION: "applications";
export const AMBASSADOR_COHORTS_COLLECTION: "cohorts";
```

From @/lib/ambassador/videoUrl (Plan 02):
```typescript
export function isValidVideoUrl(url: string): boolean;
export function classifyVideoUrl(url: string): "youtube" | "loom" | "drive" | "unknown";
```

From @/lib/ambassador/academicEmail (Plan 02):
```typescript
export function validateAcademicEmail(email: string): {
  syntaxValid: boolean;
  academicTldMatch: boolean;
  hipoMatch: boolean;
  needsManualVerification: boolean;
  normalizedDomain: string | null;
};
```

From @/lib/ambassador/adminAuth (Plan 04):
```typescript
export function isValidAdminToken(token: string | null): Promise<boolean>;
export function getAdminToken(request: Request): string | null;
export async function requireAdmin(request: Request): Promise<{ ok: true; uid: string } | { ok: false; status: number; error: string }>;
```

From @/lib/email (Plan 03):
```typescript
export function sendAmbassadorApplicationSubmittedEmail(
  applicantEmail: string,
  applicantName: string,
  cohortName: string,
): Promise<boolean>;
```

From @/lib/discord (existing):
```typescript
export async function lookupMemberByUsername(username: string): Promise<{ id: string; username: string } | null>;
// Returns null on any failure. NEVER throws.
```

From @/lib/auth (existing):
```typescript
export type AuthContext = { uid: string; email?: string; roles?: string[]; admin?: boolean; role?: string };
export async function verifyAuth(request: Request): Promise<AuthContext | null>;
// Validates Firebase ID token from Authorization: Bearer header.
```

From @/lib/firebaseAdmin (existing):
```typescript
export const db: admin.firestore.Firestore;
export const storage: admin.storage.Bucket | null;   // null in local dev when bucket env missing
export const FieldValue: typeof admin.firestore.FieldValue;
export const Timestamp: typeof admin.firestore.Timestamp;
```

From @/lib/features (existing):
```typescript
export function isAmbassadorProgramEnabled(): boolean;
```

Existing API route conventions (reference — DO NOT duplicate helpers already present):
- src/app/api/mentorship/profile/route.ts — POST validates via Zod, uses `verifyAuth`, returns `NextResponse.json`.
- src/app/api/mentorship/applications/route.ts — GET list with x-admin-token check (closest existing pattern).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Build src/lib/ambassador/applications.ts shared helpers</name>
  <files>src/lib/ambassador/applications.ts</files>
  <read_first>
    - @src/lib/discord.ts (lines 100-180 for lookupMemberByUsername signature)
    - @src/lib/firebaseAdmin.ts (to confirm exports: db, storage, FieldValue, Timestamp)
    - @src/types/ambassador.ts (ApplicationDoc, ApplicationSubmitInput)
    - @src/lib/ambassador/constants.ts (AMBASSADOR_DISCORD_MIN_AGE_DAYS, AMBASSADOR_APPLICATIONS_COLLECTION)
    - @src/lib/ambassador/videoUrl.ts (isValidVideoUrl, classifyVideoUrl)
    - @src/lib/ambassador/academicEmail.ts (validateAcademicEmail)
  </read_first>
  <action>
Create `src/lib/ambassador/applications.ts` exporting these pure-ish helpers (Firestore Admin SDK is the only I/O; no HTTP):

```typescript
import { Timestamp } from "firebase-admin/firestore";
import { db, FieldValue } from "@/lib/firebaseAdmin";
import {
  AMBASSADOR_APPLICATIONS_COLLECTION,
  AMBASSADOR_COHORTS_COLLECTION,
  AMBASSADOR_DISCORD_MIN_AGE_DAYS,
} from "@/lib/ambassador/constants";
import { classifyVideoUrl, isValidVideoUrl } from "@/lib/ambassador/videoUrl";
import { validateAcademicEmail } from "@/lib/ambassador/academicEmail";
import { lookupMemberByUsername } from "@/lib/discord";
import type { ApplicationDoc, ApplicationSubmitInput } from "@/types/ambassador";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface EligibilityCheck {
  eligible: boolean;
  reason?: "profile_missing" | "too_new";
  profileAgeDays?: number;
  requiredDays: number;
}

/** APPLY-01 age gate. Reads mentorship_profiles/{uid}.createdAt. Returns eligible:false if the doc is missing (safer default). */
export async function ensureDiscordAgeEligible(uid: string): Promise<EligibilityCheck> {
  const snap = await db.collection("mentorship_profiles").doc(uid).get();
  if (!snap.exists) {
    return { eligible: false, reason: "profile_missing", requiredDays: AMBASSADOR_DISCORD_MIN_AGE_DAYS };
  }
  const data = snap.data();
  const createdAt = data?.createdAt;
  if (!createdAt) {
    return { eligible: false, reason: "profile_missing", requiredDays: AMBASSADOR_DISCORD_MIN_AGE_DAYS };
  }
  // createdAt may be a Firestore Timestamp or a serialized number. Handle both.
  const createdMs = typeof createdAt.toMillis === "function" ? createdAt.toMillis() : Number(createdAt);
  const ageDays = (Date.now() - createdMs) / MS_PER_DAY;
  if (ageDays < AMBASSADOR_DISCORD_MIN_AGE_DAYS) {
    return { eligible: false, reason: "too_new", profileAgeDays: Math.floor(ageDays), requiredDays: AMBASSADOR_DISCORD_MIN_AGE_DAYS };
  }
  return { eligible: true, profileAgeDays: Math.floor(ageDays), requiredDays: AMBASSADOR_DISCORD_MIN_AGE_DAYS };
}

/** DISC-01 fail-soft resolver. Always returns a value — never throws, never blocks. */
export async function resolveDiscordMemberSoft(discordHandle: string): Promise<{ id: string; username: string } | null> {
  try {
    return await lookupMemberByUsername(discordHandle);
  } catch {
    return null;
  }
}

/** Prevent duplicate submitted/under_review/accepted applications for the same (uid, cohortId). */
export async function checkDuplicateApplication(
  applicantUid: string,
  targetCohortId: string,
): Promise<{ duplicate: boolean; existingApplicationId?: string; existingStatus?: string }> {
  const snap = await db
    .collection(AMBASSADOR_APPLICATIONS_COLLECTION)
    .where("applicantUid", "==", applicantUid)
    .where("targetCohortId", "==", targetCohortId)
    .where("status", "in", ["submitted", "under_review", "accepted"])
    .limit(1)
    .get();
  if (snap.empty) return { duplicate: false };
  const doc = snap.docs[0];
  return { duplicate: true, existingApplicationId: doc.id, existingStatus: (doc.data() as ApplicationDoc).status };
}

export interface CohortWindowCheck {
  open: boolean;
  cohortName?: string;
  reason?: "not_found" | "window_closed" | "wrong_status" | "full";
}

/** Server-side gate — a client can't bypass by calling the API with a closed cohort. */
export async function checkCohortAcceptingSubmissions(cohortId: string): Promise<CohortWindowCheck> {
  const snap = await db.collection(AMBASSADOR_COHORTS_COLLECTION).doc(cohortId).get();
  if (!snap.exists) return { open: false, reason: "not_found" };
  const c = snap.data()!;
  if (c.status !== "upcoming") return { open: false, reason: "wrong_status", cohortName: c.name };
  if (c.applicationWindowOpen !== true) return { open: false, reason: "window_closed", cohortName: c.name };
  // COHORT-04 is re-checked at accept time (Plan 06); here we just block submission to a cohort that is already full to avoid wasted review work.
  if (typeof c.maxSize === "number" && typeof c.acceptedCount === "number" && c.acceptedCount >= c.maxSize) {
    return { open: false, reason: "full", cohortName: c.name };
  }
  return { open: true, cohortName: c.name };
}

export interface BuildApplicationArgs {
  applicantUid: string;
  applicantEmail: string;
  applicantName: string;
  input: ApplicationSubmitInput;
  discordMemberId: string | null;
  academicEmailVerified: boolean;
}

/** Shape the Firestore write payload. Caller generates the applicationId and the doc ref. */
export function buildApplicationDoc(args: BuildApplicationArgs, applicationId: string): Omit<ApplicationDoc, "applicationId"> & { applicationId: string } {
  const { input, applicantUid, applicantEmail, applicantName, discordMemberId, academicEmailVerified } = args;
  const now = FieldValue.serverTimestamp() as unknown as Timestamp;
  const videoEmbedType = classifyVideoUrl(input.videoUrl);
  return {
    applicationId,
    applicantUid,
    applicantEmail,
    applicantName,
    university: input.university,
    yearOfStudy: input.yearOfStudy,
    country: input.country,
    city: input.city,
    discordHandle: input.discordHandle,
    discordMemberId,
    academicEmail: input.academicEmail,
    academicEmailVerified,
    studentIdStoragePath: input.studentIdStoragePath,
    motivation: input.motivation,
    experience: input.experience,
    pitch: input.pitch,
    videoUrl: input.videoUrl,
    videoEmbedType: videoEmbedType === "unknown" ? "loom" : videoEmbedType, // never persist "unknown"; validation above rejects invalid URLs before this point
    targetCohortId: input.targetCohortId,
    status: "submitted",
    submittedAt: now,
    discordRoleAssigned: false,
    discordRetryNeeded: false,
  } as ApplicationDoc;
}

/** Additional validation guards for POST handler — does NOT duplicate Zod shape checks, only runtime rules Zod can't express. */
export function runServerSideContentChecks(input: ApplicationSubmitInput): { ok: true } | { ok: false; field: string; error: string } {
  if (!isValidVideoUrl(input.videoUrl)) {
    return { ok: false, field: "videoUrl", error: "Video URL must be a Loom, YouTube, or Google Drive link." };
  }
  if (!input.academicEmail && !input.studentIdStoragePath) {
    return { ok: false, field: "academicEmail", error: "Provide either an academic email or a student-ID photo." };
  }
  return { ok: true };
}

/** APPLY-04: classify the academic email and return the persisted `academicEmailVerified` flag + admin-review hint. */
export function classifyAcademicEmailPath(input: ApplicationSubmitInput): { verified: boolean; needsManualVerification: boolean } {
  if (input.studentIdStoragePath) {
    // D-13 path B: uploader path always needs manual verification regardless of email
    return { verified: false, needsManualVerification: true };
  }
  if (!input.academicEmail) return { verified: false, needsManualVerification: true };
  const r = validateAcademicEmail(input.academicEmail);
  return { verified: r.syntaxValid && (r.academicTldMatch || r.hipoMatch), needsManualVerification: r.needsManualVerification };
}
```

Notes:
- `academicEmailVerified` is derived from Plan 02's validator. Path B (student ID) is always flagged for manual review per D-13.
- No HTTP, no Next.js imports in this file — all request/response handling is in route.ts files.
- Firestore collection names MUST come from constants.ts (Plan 01), NOT hardcoded strings.
- The `runServerSideContentChecks` helper catches the two cross-field rules Zod doesn't express: video-URL pattern match (defense-in-depth; Zod already does this via `.refine(isValidVideoUrl)`) and at-least-one-of-academicEmail-or-studentId.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>src/lib/ambassador/applications.ts exists, typechecks against ApplicationDoc / ApplicationSubmitInput from Plan 01, and exports: ensureDiscordAgeEligible, resolveDiscordMemberSoft, checkDuplicateApplication, checkCohortAcceptingSubmissions, buildApplicationDoc, runServerSideContentChecks, classifyAcademicEmailPath.</done>
  <acceptance_criteria>
    - `grep -q "ensureDiscordAgeEligible" src/lib/ambassador/applications.ts`
    - `grep -q "resolveDiscordMemberSoft" src/lib/ambassador/applications.ts`
    - `grep -q "checkDuplicateApplication" src/lib/ambassador/applications.ts`
    - `grep -q "checkCohortAcceptingSubmissions" src/lib/ambassador/applications.ts`
    - `grep -q "buildApplicationDoc" src/lib/ambassador/applications.ts`
    - `grep -q "AMBASSADOR_DISCORD_MIN_AGE_DAYS" src/lib/ambassador/applications.ts` (imports the constant, does NOT hardcode 30)
    - `grep -q "AMBASSADOR_APPLICATIONS_COLLECTION" src/lib/ambassador/applications.ts` (uses constant for collection name)
    - `grep -q "lookupMemberByUsername" src/lib/ambassador/applications.ts` (DISC-01 integration)
    - `grep -q "classifyVideoUrl" src/lib/ambassador/applications.ts` (reuses Plan 02 helper)
    - `grep -q "validateAcademicEmail" src/lib/ambassador/applications.ts` (reuses Plan 02 helper)
    - File does NOT import from "next/server" (no HTTP in this module)
    - `npx tsc --noEmit` passes with zero errors
  </acceptance_criteria>
</task>

<task type="auto" tdd="false">
  <name>Task 2: POST submit + GET admin list at /api/ambassador/applications</name>
  <files>src/app/api/ambassador/applications/route.ts</files>
  <read_first>
    - @src/app/api/mentorship/profile/route.ts (existing Zod-validated POST pattern)
    - @src/app/api/mentorship/admin/auth/route.ts (x-admin-token pattern)
    - @src/lib/ambassador/adminAuth.ts (Plan 04 shared helper)
    - @src/lib/ambassador/applications.ts (Task 1 helpers)
    - @src/types/ambassador.ts (ApplicationSubmitSchema, ApplicationDoc)
    - @src/lib/email.ts (sendAmbassadorApplicationSubmittedEmail from Plan 03)
    - @src/lib/features.ts (isAmbassadorProgramEnabled)
    - @src/lib/auth.ts (verifyAuth)
    - @src/lib/logger.ts (createLogger)
  </read_first>
  <action>
Create `src/app/api/ambassador/applications/route.ts` with POST (submit) and GET (admin list).

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db, FieldValue } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/auth";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import {
  ApplicationSubmitSchema,
  type ApplicationDoc,
} from "@/types/ambassador";
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

export async function POST(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Parse + Zod validate
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = ApplicationSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid application body", details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  // Cross-field + regex re-validation (defense-in-depth)
  const content = runServerSideContentChecks(input);
  if (!content.ok) return NextResponse.json({ error: content.error, field: content.field }, { status: 400 });

  // APPLY-01 Discord/profile age gate
  const eligibility = await ensureDiscordAgeEligible(auth.uid);
  if (!eligibility.eligible) {
    return NextResponse.json(
      { error: "Not yet eligible", reason: eligibility.reason, profileAgeDays: eligibility.profileAgeDays, requiredDays: eligibility.requiredDays },
      { status: 403 },
    );
  }

  // Cohort window gate (applicationWindowOpen + status=upcoming + !full)
  const cohortCheck = await checkCohortAcceptingSubmissions(input.targetCohortId);
  if (!cohortCheck.open) {
    return NextResponse.json({ error: `Cohort is not accepting submissions (${cohortCheck.reason})` }, { status: 409 });
  }

  // Duplicate guard (one active application per uid per cohort)
  const dup = await checkDuplicateApplication(auth.uid, input.targetCohortId);
  if (dup.duplicate) {
    return NextResponse.json(
      { error: "You already have an active application for this cohort.", existingApplicationId: dup.existingApplicationId, existingStatus: dup.existingStatus },
      { status: 409 },
    );
  }

  // Load applicant profile for name/email (we trust Firebase auth email over the body)
  const profileSnap = await db.collection("mentorship_profiles").doc(auth.uid).get();
  const profile = profileSnap.data() ?? {};
  const applicantEmail = auth.email ?? profile.email ?? "";
  const applicantName = profile.displayName ?? profile.name ?? applicantEmail.split("@")[0] ?? "Applicant";
  if (!applicantEmail) return NextResponse.json({ error: "Missing applicant email on profile" }, { status: 400 });

  // DISC-01 fail-soft Discord resolution
  const discordMember = await resolveDiscordMemberSoft(input.discordHandle);

  // APPLY-04 academic-email classification
  const { verified: academicEmailVerified } = classifyAcademicEmailPath(input);

  // Firestore write
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

  // EMAIL-01 trigger (non-fatal if it fails — we still want the submission to succeed)
  try {
    await sendAmbassadorApplicationSubmittedEmail(applicantEmail, applicantName, cohortCheck.cohortName ?? "the next cohort");
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

// Admin list with cursor pagination.
// ?status=submitted&cohortId=X&cursor=<docId>&pageSize=20
export async function GET(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");            // optional filter
  const cohortId = searchParams.get("cohortId");        // optional filter
  const cursor = searchParams.get("cursor");            // last doc id from previous page
  const pageSizeRaw = Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(Math.max(1, Number.isFinite(pageSizeRaw) ? pageSizeRaw : DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

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
```

Implementation notes:
- All five pitfalls from RESEARCH.md are addressed here: (3) feature-flag check first line of every handler; (4) Firestore rules from Plan 03 already deny-all for client writes, this route is the sole write path via Admin SDK; (6) academicEmail helper is imported lazily via applications.ts.
- EMAIL-01 failure is logged but does NOT fail the submission — the user's application is persisted regardless. Admin sees the email-send failure in logs.
- Cursor pagination uses `startAfter(docSnapshot)` per Firestore Admin SDK — resolves to the doc by id, safer than storing the raw `submittedAt` timestamp in the cursor.
- The POST handler MUST NOT write `declinedAt` or `decidedAt` — those are decision-time fields (Plan 06).
- DO NOT send `auth.admin: true` to the Discord API — this is the APPLICANT's submission; discord-lookup uses the applicant's handle only.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>POST submits applications (validates via ApplicationSubmitSchema, re-checks video URL + academic email + cohort window + duplicate + profile age + Discord handle, writes to Firestore, triggers EMAIL-01, returns 201). GET lists applications for admins with cursor pagination. Both handlers return 404 when feature flag is off.</done>
  <acceptance_criteria>
    - `grep -q "isAmbassadorProgramEnabled" src/app/api/ambassador/applications/route.ts` (Pitfall 3 fix)
    - `grep -q "ApplicationSubmitSchema.safeParse" src/app/api/ambassador/applications/route.ts`
    - `grep -q "ensureDiscordAgeEligible" src/app/api/ambassador/applications/route.ts` (APPLY-01 age gate)
    - `grep -q "checkCohortAcceptingSubmissions" src/app/api/ambassador/applications/route.ts` (cohort window gate)
    - `grep -q "checkDuplicateApplication" src/app/api/ambassador/applications/route.ts` (no double-apply)
    - `grep -q "resolveDiscordMemberSoft" src/app/api/ambassador/applications/route.ts` (DISC-01 fail-soft)
    - `grep -q "sendAmbassadorApplicationSubmittedEmail" src/app/api/ambassador/applications/route.ts` (EMAIL-01 trigger)
    - `grep -q "requireAdmin" src/app/api/ambassador/applications/route.ts` (GET admin list)
    - `grep -q "startAfter" src/app/api/ambassador/applications/route.ts` (cursor pagination)
    - `grep -Eq "status.*201" src/app/api/ambassador/applications/route.ts` (success returns 201)
    - `grep -Eq "status.*404" src/app/api/ambassador/applications/route.ts` (feature flag off → 404)
    - `grep -Eq "status.*403" src/app/api/ambassador/applications/route.ts` (age gate → 403)
    - `grep -Eq "status.*409" src/app/api/ambassador/applications/route.ts` (cohort-closed or duplicate → 409)
    - File does NOT contain `db.batch()` (accept-time concern; wrong plan)
    - File does NOT contain `assignDiscordRole` (accept-time only; Plan 06)
    - `npx tsc --noEmit` passes
  </acceptance_criteria>
</task>

<task type="auto" tdd="false">
  <name>Task 3: GET me + POST student-id-upload-url endpoints</name>
  <files>src/app/api/ambassador/applications/me/route.ts, src/app/api/ambassador/applications/student-id-upload-url/route.ts</files>
  <read_first>
    - @src/lib/firebaseAdmin.ts (storage export, which may be null in local dev — Pitfall 7)
    - @src/types/ambassador.ts (ApplicationDoc)
    - @src/lib/auth.ts (verifyAuth)
    - @src/lib/ambassador/constants.ts (AMBASSADOR_APPLICATIONS_COLLECTION)
    - @src/lib/features.ts (isAmbassadorProgramEnabled)
  </read_first>
  <action>
Create two new route files.

**File 1: `src/app/api/ambassador/applications/me/route.ts`** — APPLY-07 applicant status.

```typescript
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
    const { reviewerNotes, reviewedBy, ...safe } = data;
    return { ...safe, applicationId: d.id };
  });

  return NextResponse.json({ items });
}
```

**File 2: `src/app/api/ambassador/applications/student-id-upload-url/route.ts`** — APPLY-05 signed upload URL.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, storage } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/auth";
import { isAmbassadorProgramEnabled } from "@/lib/features";

// Allowed content types for the student ID photo.
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const UPLOAD_URL_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SIZE_BYTES = 10 * 1024 * 1024;     // 10 MB — mirror storage.rules from Plan 03

const BodySchema = z.object({
  applicationId: z.string().min(1),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  fileSizeBytes: z.number().int().positive().max(MAX_SIZE_BYTES),
});

function extFromContentType(ct: (typeof ALLOWED_CONTENT_TYPES)[number]): string {
  if (ct === "image/jpeg") return "jpg";
  if (ct === "image/png") return "png";
  return "webp";
}

export async function POST(request: NextRequest) {
  if (!isAmbassadorProgramEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Pitfall 7: storage may be null in local dev (bucket env missing). Fail loudly, not silently.
  if (!storage) {
    return NextResponse.json(
      { error: "Storage is not configured in this environment. Set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET." },
      { status: 503 },
    );
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  const { applicationId, contentType } = parsed.data;

  // Path: applications/{applicantUid}/{applicationId}/student_id.{ext}  (D-14)
  const ext = extFromContentType(contentType);
  const storagePath = `applications/${auth.uid}/${applicationId}/student_id.${ext}`;

  const [url] = await storage.file(storagePath).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + UPLOAD_URL_EXPIRY_MS,
    contentType,
  });

  return NextResponse.json({ uploadUrl: url, storagePath, expiresAtMs: Date.now() + UPLOAD_URL_EXPIRY_MS });
}
```

Implementation notes:
- `me` strips `reviewerNotes` and `reviewedBy` so applicant surfaces never see admin-only fields even if we add new ones later.
- `me` relies on Firestore rules (Plan 03) as a secondary gate; the API path is the primary one.
- `student-id-upload-url` path lives OUTSIDE the dynamic applicationId segment so it does not collide with GET /me or (later) GET /[id].
- `contentType` on the signed URL is enforced — the browser MUST send a matching `Content-Type` header on the PUT, otherwise Google Cloud Storage rejects it. This prevents a maliciously-typed upload (e.g. HTML disguised as image).
- The applicationId is bound into the path; Plan 07's wizard flow is: client uploads, then calls POST /applications with `studentIdStoragePath` = returned path. The path is reproducible, not a server-returned opaque token, so applicationId in the path == body.applicationId == applicant draft id (wizard-generated UUID that later becomes the Firestore doc id).

  CAVEAT: POST /applications uses `db.collection(...).doc()` for auto-id in Task 2. If Plan 07 wants the path to match the final doc id it must either (a) allocate the id client-side via `db.collection().doc().id`-equivalent (crypto.randomUUID()) or (b) use a temp applicationId in the path and the server rewrites `studentIdStoragePath` post-allocation. For v1, accept an applicationId from the client that the server uses verbatim in Task 2 (change `db.collection(...).doc()` → `db.collection(...).doc(input.applicationId)` IF input.applicationId present AND unique). ALTERNATIVE: use `crypto.randomUUID()` client-side for upload path and accept the student-ID path need not match final id (admin detail page reads it from studentIdStoragePath anyway).

  DECISION FOR THIS PLAN: Accept client-supplied UUID upload paths; Plan 07 generates `crypto.randomUUID()` and uses it as applicationId in BOTH the upload path and the POST body. Update Task 2's POST to use `db.collection(AMBASSADOR_APPLICATIONS_COLLECTION).doc(applicationId)` when the body includes one. This is reflected in ApplicationSubmitSchema (Plan 01) — if it does not already contain an optional `applicationId`, Plan 07 generates one client-side and adds it. For Task 2 as written above (auto-id), we accept a small inconsistency: the storage path uses the client's UUID and the Firestore doc id is Firestore-allocated. Admin detail page (Plan 08) reads `studentIdStoragePath` from the doc regardless, so this works fine.

FINAL: Leave Task 2 with auto-id. Plan 07 will generate a client UUID for the upload path, store that UUID under `studentIdStoragePath`, and the Firestore doc id is a separate auto-allocated id. The two are not required to match.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>GET /api/ambassador/applications/me returns the authenticated user's applications (APPLY-07). POST /api/ambassador/applications/student-id-upload-url returns a 10-minute signed upload URL for the student-ID path (APPLY-05, D-14).</done>
  <acceptance_criteria>
    - `grep -q "isAmbassadorProgramEnabled" src/app/api/ambassador/applications/me/route.ts`
    - `grep -q "applicantUid.*==.*auth.uid" src/app/api/ambassador/applications/me/route.ts` OR equivalent (uses verifyAuth uid)
    - `grep -q "reviewerNotes" src/app/api/ambassador/applications/me/route.ts` (strips admin-only field)
    - `grep -q "isAmbassadorProgramEnabled" src/app/api/ambassador/applications/student-id-upload-url/route.ts`
    - `grep -q "applications/\${auth.uid}" src/app/api/ambassador/applications/student-id-upload-url/route.ts` (path matches D-14)
    - `grep -q "getSignedUrl" src/app/api/ambassador/applications/student-id-upload-url/route.ts`
    - `grep -q "action.*write" src/app/api/ambassador/applications/student-id-upload-url/route.ts` (upload URL, not read)
    - `grep -q "10 \* 60 \* 1000" src/app/api/ambassador/applications/student-id-upload-url/route.ts` (10-min expiry)
    - `grep -q "!storage" src/app/api/ambassador/applications/student-id-upload-url/route.ts` (Pitfall 7 null guard)
    - `grep -Eq "image/(jpeg|png|webp)" src/app/api/ambassador/applications/student-id-upload-url/route.ts` (content-type constraint)
    - `npx tsc --noEmit` passes
  </acceptance_criteria>
</task>

</tasks>

<verification>
Run after all tasks:

```bash
npx tsc --noEmit
npx vitest run src/__tests__/ambassador/
```

Smoke test (requires local dev server + Firebase emulator or real project):
1. With `FEATURE_AMBASSADOR_PROGRAM=false`, POST to /api/ambassador/applications → expect 404.
2. With flag on, sign in as a user whose `mentorship_profiles.createdAt` is <30 days old → POST → expect 403 with `reason: "too_new"`.
3. Sign in as an eligible user, POST a valid body targeting a cohort with `applicationWindowOpen: true` and `status: "upcoming"` → expect 201, Firestore `applications/{id}` exists, EMAIL-01 sent (or DISABLE_EMAILS logged it).
4. POST same body again → expect 409 (duplicate).
5. POST targeting a cohort with `applicationWindowOpen: false` → expect 409 with `window_closed`.
6. POST body with `videoUrl: "https://vimeo.com/123"` → expect 400.
7. GET /api/ambassador/applications/me (as the applicant) → own application in the list, no `reviewerNotes` field.
8. GET /api/ambassador/applications?status=submitted (admin, x-admin-token) → list with cursor.
</verification>

<success_criteria>
- [ ] POST /api/ambassador/applications creates the Firestore doc and returns 201 with `applicationId` + `status: "submitted"`.
- [ ] Feature-flag off returns 404 on every handler.
- [ ] Discord handle resolution is fail-soft — submission succeeds even if `lookupMemberByUsername` returns null (DISC-01, D-16).
- [ ] Video URL is re-validated server-side by `isValidVideoUrl`; `videoEmbedType` is derived from `classifyVideoUrl`.
- [ ] Academic-email classification is server-side; `academicEmailVerified` is persisted on the doc; D-15 soft-warning semantics (unknown TLD with Path A is persisted with `academicEmailVerified: false` + path B fallback still usable on resubmit via admin manual review).
- [ ] EMAIL-01 fires after the Firestore write; failure is logged but does NOT fail the submission response.
- [ ] GET list supports `?status=`, `?cohortId=`, `?cursor=`, `?pageSize=` (max 100).
- [ ] GET /me returns the applicant's own applications with admin-only fields (`reviewerNotes`, `reviewedBy`) stripped.
- [ ] POST /student-id-upload-url returns a v4 signed `write` URL valid for 10 minutes, bound to a specific `image/jpeg|png|webp` Content-Type.
- [ ] `npx tsc --noEmit` passes with zero errors.
</success_criteria>

<output>
After completion, create `.planning/phases/02-application-subsystem/02-05-SUMMARY.md` with:
- Artifacts created (file list with export summary)
- How Plan 06 (accept endpoint) should import from `src/lib/ambassador/applications.ts`
- How Plan 07 (wizard UI) should call these three routes in order (signed upload → upload → POST submit)
- How Plan 08 (admin list + detail) should call GET /applications with cursor pagination
- Any deviations from the plan with rationale
</output>
</output>
