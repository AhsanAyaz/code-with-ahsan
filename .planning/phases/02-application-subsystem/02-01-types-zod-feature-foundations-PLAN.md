---
phase: 02-application-subsystem
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/types/ambassador.ts
  - src/lib/discord.ts
  - src/lib/ambassador/constants.ts
autonomous: true
requirements:
  - COHORT-01
  - APPLY-01
  - APPLY-02
  - DISC-02
  - DISC-03
must_haves:
  truths:
    - "Application doc and Cohort doc TypeScript interfaces are importable by every downstream plan (API routes, UI, cron scripts) without duplication."
    - "The ambassador Discord role ID constant (DISCORD_AMBASSADOR_ROLE_ID) is defined in src/lib/discord.ts with the same pattern as DISCORD_MENTOR_ROLE_ID / DISCORD_MENTEE_ROLE_ID."
    - "AMBASSADOR_DISCORD_MIN_AGE_DAYS is a named, exported constant — changing the Discord-age threshold is a one-line edit (no codebase search-and-replace)."
    - "Every Zod schema used at API boundaries (ApplicationSubmitSchema, CohortCreateSchema, VideoUrlSchema) is exported from one module so duplicated validation is impossible."
  artifacts:
    - path: "src/types/ambassador.ts"
      provides: "ApplicationDoc + CohortDoc TypeScript interfaces; ApplicationStatus, CohortStatus, VideoEmbedType, AcademicVerificationPath unions; ApplicationSubmitSchema + CohortCreateSchema Zod schemas"
      exports:
        - "ApplicationDoc"
        - "CohortDoc"
        - "ApplicationStatus"
        - "CohortStatus"
        - "VideoEmbedType"
        - "AcademicVerificationPath"
        - "ApplicationSubmitSchema"
        - "ApplicationSubmitInput"
        - "CohortCreateSchema"
        - "CohortCreateInput"
    - path: "src/lib/ambassador/constants.ts"
      provides: "AMBASSADOR_DISCORD_MIN_AGE_DAYS; application window / cohort limits; Firestore collection names"
      exports:
        - "AMBASSADOR_DISCORD_MIN_AGE_DAYS"
        - "AMBASSADOR_APPLICATIONS_COLLECTION"
        - "AMBASSADOR_COHORTS_COLLECTION"
        - "APPLICATION_VIDEO_PROMPTS"
    - path: "src/lib/discord.ts"
      provides: "DISCORD_AMBASSADOR_ROLE_ID constant (new export added alongside existing mentor/mentee role constants)"
      contains: "export const DISCORD_AMBASSADOR_ROLE_ID"
  key_links:
    - from: "src/types/ambassador.ts"
      to: "src/lib/ambassador/constants.ts"
      via: "import AMBASSADOR_DISCORD_MIN_AGE_DAYS for eligibility-gate types"
      pattern: "import.*AMBASSADOR_DISCORD_MIN_AGE_DAYS"
    - from: "src/types/ambassador.ts"
      to: "zod"
      via: "ApplicationSubmitSchema / CohortCreateSchema (Zod enums + objects)"
      pattern: "z\\.object"
    - from: "src/lib/discord.ts"
      to: "DISCORD_AMBASSADOR_ROLE_ID"
      via: "exported constant with a placeholder value that MUST be replaced pre-flight (see Plan 09 checkpoint)"
      pattern: "DISCORD_AMBASSADOR_ROLE_ID"
---

<objective>
Establish the shared type foundation + Zod schemas + named constants for Phase 2. This is Wave 1 / Task 0 for the rest of the phase: every downstream plan (API routes in Plans 04-06, UI in Plans 07-08, cron in Plan 09) imports from these files. No business logic — only interfaces, unions, schemas, and constants so the executors of later plans receive contracts rather than having to invent them.

Purpose:
- Prevent drift: every API route and UI component imports ApplicationDoc / CohortDoc from one place (D-01, D-06, D-17).
- Name the decision: AMBASSADOR_DISCORD_MIN_AGE_DAYS surfaces as a single constant per D-03; the 7-vs-30-day intentional-decision is surfaced again in Plan 09's pre-flight checkpoint.
- Match existing pattern: add DISCORD_AMBASSADOR_ROLE_ID next to DISCORD_MENTOR_ROLE_ID and DISCORD_MENTEE_ROLE_ID at the same position in src/lib/discord.ts (line ~807).

Output:
- src/types/ambassador.ts (new) — full type + schema module for Phase 2.
- src/lib/ambassador/constants.ts (new) — named constants used by API + UI + cron.
- src/lib/discord.ts (modify) — add DISCORD_AMBASSADOR_ROLE_ID constant.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/02-application-subsystem/02-CONTEXT.md
@.planning/phases/02-application-subsystem/02-RESEARCH.md

<interfaces>
<!-- Key types and exports executors reference. Extracted from codebase so no exploration needed. -->

From src/types/mentorship.ts (Phase 1 outputs — DO NOT modify; import only):
```typescript
export const RoleSchema = z.enum(["mentor", "mentee", "ambassador", "alumni-ambassador"]);
export type Role = z.infer<typeof RoleSchema>;

export interface MentorshipProfile {
  uid: string;
  roles: Role[];
  role?: MentorshipRole;
  createdAt: Date;
  // ... (see file)
}
```

From src/lib/discord.ts (line 807-808) — existing pattern for role ID constants:
```typescript
// Discord role IDs for automatic assignment
export const DISCORD_MENTOR_ROLE_ID = "1422193153397493893";
export const DISCORD_MENTEE_ROLE_ID = "1445734846730338386";
```

From src/lib/ambassador/roleMutation.ts (Phase 1 output — DO NOT modify):
```typescript
export interface SyncRoleClaimInput { roles: string[]; admin: boolean; }
export async function syncRoleClaim(uid: string, input: SyncRoleClaimInput): Promise<SyncRoleClaimResult>;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create src/lib/ambassador/constants.ts</name>
  <files>src/lib/ambassador/constants.ts</files>
  <read_first>
    - src/lib/ambassador/roleMutation.ts (existing pattern for files in this folder)
    - .planning/phases/02-application-subsystem/02-CONTEXT.md (D-03, D-04, D-19)
  </read_first>
  <action>
Create the file `src/lib/ambassador/constants.ts` with exactly these named exports. Use 2-space indentation, double quotes, semicolons, and TSDoc comments (matching existing `src/lib/ambassador/roleMutation.ts` style).

```typescript
/**
 * src/lib/ambassador/constants.ts
 *
 * Named constants for the Student Ambassador Program (v6.0 Phase 2).
 * Single source of truth — no other file should hardcode these values.
 */

/**
 * Minimum days between a user's CWA profile creation and their ambassador application submission.
 *
 * DECISION D-03 (CONTEXT.md): Surfaced as a named constant so the threshold can be
 * changed without code search. Default 30 days per spec §4 eligibility; 7-day alternative
 * explicitly reviewed in Plan 09 pre-flight checkpoint.
 *
 * Changing this value to 7 is a supported one-line edit — all callers import this constant.
 */
export const AMBASSADOR_DISCORD_MIN_AGE_DAYS = 30;

/** Firestore top-level collection name for ambassador applications (APPLY-06). */
export const AMBASSADOR_APPLICATIONS_COLLECTION = "applications";

/** Firestore top-level collection name for cohort docs (COHORT-01). */
export const AMBASSADOR_COHORTS_COLLECTION = "cohorts";

/**
 * Motivation-prompt labels (D-04). Exactly three, in this order.
 * UI wizard Step 3 renders these; the API schema enforces all three are present.
 */
export const APPLICATION_VIDEO_PROMPTS = [
  "Why do you want to be a Student Ambassador?",
  "What relevant experience or community work do you have?",
  "What would you do as an ambassador in your first 3 months?",
] as const;

/** Age (in days) after which declined application student-ID uploads are deleted (REVIEW-04). */
export const DECLINED_APPLICATION_RETENTION_DAYS = 30;

/** Signed-URL expiry for admin Storage reads (REVIEW-02). */
export const ADMIN_SIGNED_URL_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
```
  </action>
  <verify>
    <automated>test -f src/lib/ambassador/constants.ts && grep -q "export const AMBASSADOR_DISCORD_MIN_AGE_DAYS = 30" src/lib/ambassador/constants.ts && grep -q "AMBASSADOR_APPLICATIONS_COLLECTION" src/lib/ambassador/constants.ts && grep -q "APPLICATION_VIDEO_PROMPTS" src/lib/ambassador/constants.ts && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - File `src/lib/ambassador/constants.ts` exists
    - Contains `export const AMBASSADOR_DISCORD_MIN_AGE_DAYS = 30`
    - Contains `export const AMBASSADOR_APPLICATIONS_COLLECTION = "applications"`
    - Contains `export const AMBASSADOR_COHORTS_COLLECTION = "cohorts"`
    - Contains `export const APPLICATION_VIDEO_PROMPTS = [` with exactly 3 string literals
    - Contains `export const DECLINED_APPLICATION_RETENTION_DAYS = 30`
    - Contains `export const ADMIN_SIGNED_URL_EXPIRY_MS = 60 * 60 * 1000`
    - `npx tsc --noEmit` exits 0 (no TypeScript errors introduced)
  </acceptance_criteria>
  <done>
    File imports compile cleanly and every downstream plan can `import { AMBASSADOR_DISCORD_MIN_AGE_DAYS, APPLICATION_VIDEO_PROMPTS } from "@/lib/ambassador/constants"` without error.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create src/types/ambassador.ts with types + Zod schemas</name>
  <files>src/types/ambassador.ts, src/__tests__/ambassador/schemas.test.ts</files>
  <read_first>
    - src/types/mentorship.ts (existing pattern for typed domain + Zod enum exports — mirror exactly: same import-style for zod, same JSDoc convention)
    - src/lib/ambassador/constants.ts (just created in Task 1 — import AMBASSADOR_DISCORD_MIN_AGE_DAYS, APPLICATION_VIDEO_PROMPTS)
    - .planning/phases/02-application-subsystem/02-RESEARCH.md (see "Firestore Data Model" section for ApplicationDoc and CohortDoc shapes)
  </read_first>
  <behavior>
    - ApplicationSubmitSchema (Zod) accepts a valid submission object with: applicantName (min 2 chars), university (non-empty), yearOfStudy (non-empty), country (non-empty), city (non-empty), discordHandle (non-empty), motivation (min 50 chars), experience (min 50 chars), pitch (min 50 chars), videoUrl (min 1 char — format check lives in Plan 02 validator), targetCohortId (non-empty), academicVerificationPath "email" requires academicEmail, path "student_id" requires studentIdStoragePath.
    - ApplicationSubmitSchema REJECTS submissions missing any required field OR with path="email" and no academicEmail.
    - CohortCreateSchema accepts {name (≥3 chars), startDate (ISO string), endDate (ISO string AFTER startDate), maxSize (int 1-500), status enum}.
    - CohortCreateSchema REJECTS endDate <= startDate, non-integer maxSize, maxSize < 1.
  </behavior>
  <action>
Create TWO files.

FILE 1: `src/types/ambassador.ts` — paste this content exactly:

```typescript
/**
 * Centralized types for the Student Ambassador Program (v6.0 Phase 2).
 * Import from '@/types/ambassador' instead of defining locally.
 *
 * Mirrors the export pattern of src/types/mentorship.ts — Zod enums + TypeScript
 * unions locked together so typos fail at both compile time and API boundary.
 */

import { z } from "zod";
import { APPLICATION_VIDEO_PROMPTS } from "@/lib/ambassador/constants";

/** Application lifecycle status (APPLY-07). */
export const ApplicationStatusSchema = z.enum([
  "submitted",
  "under_review",
  "accepted",
  "declined",
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

/** Cohort lifecycle status (COHORT-01). */
export const CohortStatusSchema = z.enum(["upcoming", "active", "closed"]);
export type CohortStatus = z.infer<typeof CohortStatusSchema>;

/** Detected embed type for external video links (D-08). Set server-side at submission. */
export const VideoEmbedTypeSchema = z.enum(["youtube", "loom", "drive", "unknown"]);
export type VideoEmbedType = z.infer<typeof VideoEmbedTypeSchema>;

/** Two-path academic verification (D-13). */
export const AcademicVerificationPathSchema = z.enum(["email", "student_id"]);
export type AcademicVerificationPath = z.infer<typeof AcademicVerificationPathSchema>;

// ─── Firestore document shapes ─────────────────────────────────────

/**
 * Firestore doc: applications/{applicationId}
 *
 * NOTE: Firestore Timestamp fields are represented as `Date` here for the
 * application-layer type. API routes convert Timestamp → Date on read.
 */
export interface ApplicationDoc {
  applicationId: string;
  applicantUid: string;
  applicantEmail: string;
  applicantName: string;
  university: string;
  yearOfStudy: string;
  country: string;
  city: string;
  discordHandle: string;
  /** Resolved at submission time (DISC-01). null = not found; admin retries on detail page. */
  discordMemberId: string | null;
  /** Present when academicVerificationPath === "email". */
  academicEmail?: string;
  /** Output of src/lib/ambassador/academicEmail.ts validator (APPLY-04). */
  academicEmailVerified: boolean;
  /** Present when academicVerificationPath === "student_id". Firebase Storage path. */
  studentIdStoragePath?: string;
  academicVerificationPath: AcademicVerificationPath;
  motivation: string;
  experience: string;
  pitch: string;
  /** External link (Loom/YouTube/Drive). D-06 forbids Firebase Storage video upload. */
  videoUrl: string;
  videoEmbedType: VideoEmbedType;
  targetCohortId: string;
  status: ApplicationStatus;
  reviewerNotes?: string;
  reviewedBy?: string;
  submittedAt: Date;
  decidedAt?: Date;
  /** Set only on decline. Used by cleanup cron (REVIEW-04). */
  declinedAt?: Date;
  discordRoleAssigned: boolean;
  discordRetryNeeded: boolean;
}

/**
 * Firestore doc: cohorts/{cohortId}
 */
export interface CohortDoc {
  cohortId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  maxSize: number;
  /** Maintained via FieldValue.increment in the accept transaction (COHORT-04). */
  acceptedCount: number;
  status: CohortStatus;
  /** Toggled independently of `status` (COHORT-02). Applications only accepted when true AND status === "upcoming". */
  applicationWindowOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── API boundary Zod schemas ──────────────────────────────────────

/** Motivation prompt labels as a fixed-length tuple for schema reuse. */
const _PROMPT_LABELS = APPLICATION_VIDEO_PROMPTS;
void _PROMPT_LABELS; // referenced for docs

/**
 * POST /api/ambassador/applications body (APPLY-02).
 *
 * Video URL format validation lives in src/lib/ambassador/videoUrl.ts (Plan 02);
 * this schema only enforces presence — format validation is applied by the route
 * handler via `isValidVideoUrl()`.
 */
export const ApplicationSubmitSchema = z
  .object({
    applicantName: z.string().trim().min(2, "Name must be at least 2 characters"),
    university: z.string().trim().min(1, "University is required"),
    yearOfStudy: z.string().trim().min(1, "Year of study is required"),
    country: z.string().trim().min(1, "Country is required"),
    city: z.string().trim().min(1, "City is required"),
    discordHandle: z.string().trim().min(1, "Discord handle is required"),
    motivation: z.string().trim().min(50, "Please write at least 50 characters"),
    experience: z.string().trim().min(50, "Please write at least 50 characters"),
    pitch: z.string().trim().min(50, "Please write at least 50 characters"),
    videoUrl: z.string().trim().min(1, "Video URL is required"),
    targetCohortId: z.string().trim().min(1, "Cohort is required"),
    academicVerificationPath: AcademicVerificationPathSchema,
    academicEmail: z.string().trim().email().optional(),
    studentIdStoragePath: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      data.academicVerificationPath === "email"
        ? typeof data.academicEmail === "string" && data.academicEmail.length > 0
        : typeof data.studentIdStoragePath === "string" && data.studentIdStoragePath.length > 0,
    {
      message:
        "academicEmail required when path=email; studentIdStoragePath required when path=student_id",
      path: ["academicVerificationPath"],
    }
  );

export type ApplicationSubmitInput = z.infer<typeof ApplicationSubmitSchema>;

/** POST /api/ambassador/cohorts body (COHORT-01). */
export const CohortCreateSchema = z
  .object({
    name: z.string().trim().min(3, "Cohort name must be at least 3 characters"),
    startDate: z.string().datetime({ offset: true }),
    endDate: z.string().datetime({ offset: true }),
    maxSize: z.number().int().min(1).max(500),
    status: CohortStatusSchema,
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });

export type CohortCreateInput = z.infer<typeof CohortCreateSchema>;

/** PATCH /api/ambassador/cohorts/[id] body (COHORT-02). */
export const CohortPatchSchema = z
  .object({
    name: z.string().trim().min(3).optional(),
    maxSize: z.number().int().min(1).max(500).optional(),
    status: CohortStatusSchema.optional(),
    applicationWindowOpen: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field required" });

export type CohortPatchInput = z.infer<typeof CohortPatchSchema>;

/** PATCH /api/ambassador/applications/[id] body (REVIEW-03). */
export const ApplicationReviewSchema = z.object({
  action: z.enum(["accept", "decline"]),
  notes: z.string().trim().max(2000).optional(),
});
export type ApplicationReviewInput = z.infer<typeof ApplicationReviewSchema>;
```

FILE 2: `src/__tests__/ambassador/schemas.test.ts` — create directory `src/__tests__/ambassador/` first if missing, then paste:

```typescript
import { describe, it, expect } from "vitest";
import {
  ApplicationSubmitSchema,
  CohortCreateSchema,
  ApplicationReviewSchema,
} from "@/types/ambassador";

const validApplication = {
  applicantName: "Jane Doe",
  university: "Test University",
  yearOfStudy: "3",
  country: "PK",
  city: "Karachi",
  discordHandle: "jane#1234",
  motivation: "x".repeat(60),
  experience: "x".repeat(60),
  pitch: "x".repeat(60),
  videoUrl: "https://loom.com/share/abc",
  targetCohortId: "cohort-1",
  academicVerificationPath: "email" as const,
  academicEmail: "jane@test.edu",
};

describe("ApplicationSubmitSchema", () => {
  it("accepts a valid email-path submission", () => {
    expect(ApplicationSubmitSchema.safeParse(validApplication).success).toBe(true);
  });

  it("rejects missing motivation", () => {
    const { motivation, ...rest } = validApplication;
    void motivation;
    expect(ApplicationSubmitSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects motivation shorter than 50 chars", () => {
    expect(
      ApplicationSubmitSchema.safeParse({ ...validApplication, motivation: "short" }).success
    ).toBe(false);
  });

  it("rejects path=email with no academicEmail", () => {
    const { academicEmail, ...rest } = validApplication;
    void academicEmail;
    expect(ApplicationSubmitSchema.safeParse(rest).success).toBe(false);
  });

  it("accepts path=student_id with studentIdStoragePath", () => {
    const { academicEmail, ...rest } = validApplication;
    void academicEmail;
    const input = {
      ...rest,
      academicVerificationPath: "student_id" as const,
      studentIdStoragePath: "applications/uid/app/student_id.jpg",
    };
    expect(ApplicationSubmitSchema.safeParse(input).success).toBe(true);
  });

  it("rejects path=student_id with no studentIdStoragePath", () => {
    const { academicEmail, ...rest } = validApplication;
    void academicEmail;
    expect(
      ApplicationSubmitSchema.safeParse({ ...rest, academicVerificationPath: "student_id" as const })
        .success
    ).toBe(false);
  });
});

describe("CohortCreateSchema", () => {
  const valid = {
    name: "Spring 2026",
    startDate: "2026-05-01T00:00:00+00:00",
    endDate: "2026-08-01T00:00:00+00:00",
    maxSize: 25,
    status: "upcoming" as const,
  };

  it("accepts a valid cohort", () => {
    expect(CohortCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects endDate equal to startDate", () => {
    expect(
      CohortCreateSchema.safeParse({ ...valid, endDate: valid.startDate }).success
    ).toBe(false);
  });

  it("rejects endDate before startDate", () => {
    expect(
      CohortCreateSchema.safeParse({
        ...valid,
        startDate: "2026-08-01T00:00:00+00:00",
        endDate: "2026-05-01T00:00:00+00:00",
      }).success
    ).toBe(false);
  });

  it("rejects maxSize = 0", () => {
    expect(CohortCreateSchema.safeParse({ ...valid, maxSize: 0 }).success).toBe(false);
  });

  it("rejects non-integer maxSize", () => {
    expect(CohortCreateSchema.safeParse({ ...valid, maxSize: 5.5 }).success).toBe(false);
  });
});

describe("ApplicationReviewSchema", () => {
  it("accepts accept with no notes", () => {
    expect(ApplicationReviewSchema.safeParse({ action: "accept" }).success).toBe(true);
  });

  it("accepts decline with notes", () => {
    expect(
      ApplicationReviewSchema.safeParse({ action: "decline", notes: "Not this round." })
        .success
    ).toBe(true);
  });

  it("rejects unknown action", () => {
    expect(ApplicationReviewSchema.safeParse({ action: "maybe" }).success).toBe(false);
  });
});
```
  </action>
  <verify>
    <automated>npx vitest run src/__tests__/ambassador/schemas.test.ts && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - File `src/types/ambassador.ts` exists and exports ALL of: `ApplicationDoc`, `CohortDoc`, `ApplicationStatus`, `CohortStatus`, `VideoEmbedType`, `AcademicVerificationPath`, `ApplicationSubmitSchema`, `ApplicationSubmitInput`, `CohortCreateSchema`, `CohortCreateInput`, `CohortPatchSchema`, `ApplicationPatchInput`, `ApplicationReviewSchema`
    - `grep -c "^export " src/types/ambassador.ts` returns at least 14
    - File `src/__tests__/ambassador/schemas.test.ts` exists
    - `npx vitest run src/__tests__/ambassador/schemas.test.ts` exits 0, reports >= 13 passing tests
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    Schemas reject invalid inputs and accept valid ones; every downstream plan can `import { ApplicationDoc, ApplicationSubmitSchema } from "@/types/ambassador"`.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add DISCORD_AMBASSADOR_ROLE_ID to src/lib/discord.ts</name>
  <files>src/lib/discord.ts</files>
  <read_first>
    - src/lib/discord.ts (lines 805-820 — existing constants DISCORD_MENTOR_ROLE_ID and DISCORD_MENTEE_ROLE_ID must be left in place; append the new one directly after)
    - .planning/phases/02-application-subsystem/02-RESEARCH.md (Open Question 2 — confirms "match existing pattern")
  </read_first>
  <action>
Edit `src/lib/discord.ts`. Find the existing two lines:

```typescript
export const DISCORD_MENTOR_ROLE_ID = "1422193153397493893";
export const DISCORD_MENTEE_ROLE_ID = "1445734846730338386";
```

Immediately after those two lines, add the new constant and comment (do NOT remove or modify the existing two lines):

```typescript
/**
 * Student Ambassador role ID. Assigned by two-stage acceptance flow (DISC-02).
 *
 * PLACEHOLDER: The string "PENDING_DISCORD_ROLE_CREATION" MUST be replaced with
 * the real Discord role ID before Phase 2 goes live. Plan 09 checkpoint gates on
 * this replacement — acceptance API returns discordRoleAssigned=false while the
 * placeholder is set, so no ambassador accepts will silently fail against a fake ID.
 */
export const DISCORD_AMBASSADOR_ROLE_ID = "PENDING_DISCORD_ROLE_CREATION";
```

Do NOT remove the existing mentor/mentee role IDs. Do NOT re-order imports. The rest of the file (assignDiscordRole, lookupMemberByUsername, etc.) must remain byte-identical.
  </action>
  <verify>
    <automated>grep -q "export const DISCORD_MENTOR_ROLE_ID = \"1422193153397493893\"" src/lib/discord.ts && grep -q "export const DISCORD_MENTEE_ROLE_ID = \"1445734846730338386\"" src/lib/discord.ts && grep -q "export const DISCORD_AMBASSADOR_ROLE_ID = \"PENDING_DISCORD_ROLE_CREATION\"" src/lib/discord.ts && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "export const DISCORD_MENTOR_ROLE_ID = \"1422193153397493893\"" src/lib/discord.ts` exits 0 (original preserved)
    - `grep -q "export const DISCORD_MENTEE_ROLE_ID = \"1445734846730338386\"" src/lib/discord.ts` exits 0 (original preserved)
    - `grep -q "export const DISCORD_AMBASSADOR_ROLE_ID = \"PENDING_DISCORD_ROLE_CREATION\"" src/lib/discord.ts` exits 0 (new constant added with placeholder)
    - `grep -q "PLACEHOLDER: The string \"PENDING_DISCORD_ROLE_CREATION\" MUST be replaced" src/lib/discord.ts` exits 0 (comment present)
    - `npx tsc --noEmit` exits 0
    - `grep -c "^export" src/lib/discord.ts` increases by exactly 1 compared to pre-edit
  </acceptance_criteria>
  <done>
    `import { DISCORD_AMBASSADOR_ROLE_ID } from "@/lib/discord"` works in downstream plans. Plan 09 pre-flight replaces the placeholder with the real role ID.
  </done>
</task>

</tasks>

<verification>
Run once after all three tasks:
```
npx tsc --noEmit
npx vitest run src/__tests__/ambassador/schemas.test.ts
```
Both must exit 0.
</verification>

<success_criteria>
- `src/types/ambassador.ts`, `src/lib/ambassador/constants.ts` exist and compile
- `DISCORD_AMBASSADOR_ROLE_ID` exported from `src/lib/discord.ts`
- Schema tests pass (>=13 tests)
- No changes to `src/types/mentorship.ts`, `src/lib/ambassador/roleMutation.ts`, or any other Phase 1 file
</success_criteria>

<output>
After completion, create `.planning/phases/02-application-subsystem/02-01-SUMMARY.md` documenting:
- Exported types, schemas, and constants (with file:line references)
- Pre-flight items flagged for Plan 09 (DISCORD_AMBASSADOR_ROLE_ID placeholder; AMBASSADOR_DISCORD_MIN_AGE_DAYS 7-vs-30 decision)
- Phase 2 downstream plans may now import from `@/types/ambassador`, `@/lib/ambassador/constants`, and `DISCORD_AMBASSADOR_ROLE_ID` from `@/lib/discord`
</output>
