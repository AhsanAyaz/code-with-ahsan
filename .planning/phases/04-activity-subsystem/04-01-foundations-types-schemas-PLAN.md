---
phase: 04-activity-subsystem
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/types/ambassador.ts
  - src/lib/ambassador/eventTypes.ts
  - src/lib/ambassador/reportDeadline.ts
  - src/lib/ambassador/referralCode.ts
  - src/lib/ambassador/constants.ts
  - src/lib/ambassador/reportDeadline.test.ts
  - src/lib/ambassador/referralCode.test.ts
autonomous: true
requirements:
  - REF-01
  - EVENT-01
  - REPORT-01
  - REPORT-02
  - REPORT-04
must_haves:
  truths:
    - "Ambassador subdoc type supports referralCode and timezone fields"
    - "Zod enum EventTypeSchema exists with 6 locked values from D-02"
    - "Referral code generator produces {PREFIX}-{4HEX} strings unique via referral_codes/{code} lookup"
    - "Report deadline helpers compute timezone-aware month boundaries correctly"
    - "AmbassadorEventDoc, MonthlyReportDoc, ReferralDoc, AmbassadorCronFlagDoc interfaces exported"
    - "Unit tests for referralCode and reportDeadline pass"
  artifacts:
    - path: "src/types/ambassador.ts"
      provides: "Extended AmbassadorSubdoc + 4 new Firestore doc interfaces + LogEventSchema + MonthlyReportSchema"
      contains: "referralCode?: string"
    - path: "src/lib/ambassador/eventTypes.ts"
      provides: "EventTypeSchema Zod enum + EVENT_TYPE_LABELS map"
      exports: ["EventTypeSchema", "EventType", "EVENT_TYPE_LABELS"]
    - path: "src/lib/ambassador/reportDeadline.ts"
      provides: "getDeadlineUTC + getAmbassadorMonthKey helpers"
      exports: ["getDeadlineUTC", "getAmbassadorMonthKey", "getCurrentMonthKey"]
    - path: "src/lib/ambassador/referralCode.ts"
      provides: "buildCode + generateUniqueReferralCode"
      exports: ["buildCode", "generateUniqueReferralCode"]
    - path: "src/lib/ambassador/constants.ts"
      provides: "REFERRAL_CODES_COLLECTION, REFERRALS_COLLECTION, AMBASSADOR_EVENTS_COLLECTION, MONTHLY_REPORTS_COLLECTION, AMBASSADOR_CRON_FLAGS_COLLECTION, REFERRAL_COOKIE_NAME"
    - path: "src/lib/ambassador/referralCode.test.ts"
      provides: "Vitest unit tests for code format + uniqueness retry"
      min_lines: 40
    - path: "src/lib/ambassador/reportDeadline.test.ts"
      provides: "Vitest unit tests for timezone deadline math"
      min_lines: 40
  key_links:
    - from: "src/lib/ambassador/referralCode.ts"
      to: "src/lib/firebaseAdmin db.collection('referral_codes')"
      via: "top-level lookup doc read"
      pattern: "collection\\(\"referral_codes\"\\)|REFERRAL_CODES_COLLECTION"
    - from: "src/types/ambassador.ts"
      to: "src/lib/ambassador/eventTypes EventTypeSchema"
      via: "import for AmbassadorEventDoc.type + LogEventSchema"
      pattern: "import.*EventTypeSchema"
---

<objective>
Lay the foundational types, schemas, constants, and utility libraries for the entire Activity Subsystem. Every other plan in Phase 4 imports from these files, so they must exist and be correct before Wave 2 can begin.

Purpose: Interface-first ordering — define contracts (TypeScript interfaces, Zod schemas, collection names, utility function signatures) so the 5 downstream plans can implement against them without scavenger-hunting through the codebase.

Output: Extended `src/types/ambassador.ts` (4 new doc interfaces + AmbassadorSubdoc field extensions + 2 new Zod input schemas); 3 new utility modules (`eventTypes.ts`, `reportDeadline.ts`, `referralCode.ts`); new constant names added to `src/lib/ambassador/constants.ts`; 2 vitest files for the two non-trivial utilities.
</objective>

<threat_model>
- Authorization: N/A — this plan creates types and pure utilities; no routes added.
- Data integrity: Referral code format must not accept non-alphanumeric output. Non-letters/digits in the username prefix are replaced with `X` (Pitfall: `user.name` username would produce `USER.` prefix — unsafe for URL query param). Covered by unit test.
- Collision safety: `generateUniqueReferralCode` must perform a collision check against `referral_codes/{code}` and retry up to 5 times; throwing on exhaustion is acceptable given the 2^16 suffix entropy.
- Timezone correctness: `getAmbassadorMonthKey` must return the PREVIOUS calendar month key (what the cron flags against) — off-by-one here silently breaks REPORT-04. Covered by unit test with IANA `Asia/Karachi` and `America/Los_Angeles`.
- Block-on severity: HIGH for code format and timezone correctness — both are verified by unit tests.
- No cookies / no cron / no mutation in this plan.
</threat_model>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/REQUIREMENTS.md
@.planning/phases/04-activity-subsystem/04-CONTEXT.md
@.planning/phases/04-activity-subsystem/04-RESEARCH.md
@.planning/phases/04-activity-subsystem/04-PATTERNS.md
@src/types/ambassador.ts
@src/lib/ambassador/constants.ts
@src/lib/ambassador/username.ts

<interfaces>
Existing AmbassadorSubdoc (confirmed lines 122-140 of src/types/ambassador.ts):
```typescript
export interface AmbassadorSubdoc {
  // Phase 2 fields
  cohortId: string;
  joinedAt: Date;
  active: boolean;
  strikes: number;
  discordMemberId: string | null;
  endedAt?: Date;

  // Phase 3 fields (D-03)
  university?: string;
  city?: string;
  publicTagline?: string;
  twitterUrl?: string;
  githubUrl?: string;
  personalSiteUrl?: string;
  cohortPresentationVideoUrl?: string;
  cohortPresentationVideoEmbedType?: CohortPresentationVideoEmbedType;
}
```

Existing collection constants in src/lib/ambassador/constants.ts follow the uppercase-suffix `_COLLECTION` naming convention (AMBASSADOR_APPLICATIONS_COLLECTION, AMBASSADOR_COHORTS_COLLECTION, PUBLIC_AMBASSADORS_COLLECTION). Phase 4 adds 5 more.

ensureUniqueUsername pattern (src/lib/ambassador/username.ts):
```typescript
export async function ensureUniqueUsername(base: string): Promise<string> {
  let candidate = base;
  let counter = 1;
  while (counter < 100) {
    const existing = await db.collection("mentorship_profiles").where("username", "==", candidate).limit(1).get();
    if (existing.empty) return candidate;
    candidate = `${base}${counter}`;
    counter++;
  }
  return `${base}${Date.now()}`;
}
```

Phase 4 mirrors this pattern but uses a top-level `referral_codes/{code}` doc existence check (O(1), no Firestore index required per RESEARCH.md Pitfall 3).

date-fns v4.1.0 + date-fns-tz v3.2.0 already in package.json — use `date-fns-tz` for timezone-aware computations rather than hand-rolling Intl math.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add Phase 4 constants + EventTypeSchema Zod enum</name>
  <files>src/lib/ambassador/constants.ts, src/lib/ambassador/eventTypes.ts</files>
  <read_first>
    - src/lib/ambassador/constants.ts (see existing uppercase-suffix naming for AMBASSADOR_APPLICATIONS_COLLECTION, AMBASSADOR_COHORTS_COLLECTION, PUBLIC_AMBASSADORS_COLLECTION)
    - src/types/ambassador.ts lines 13-23 (ApplicationStatusSchema/CohortStatusSchema — the established Zod enum + type-union pattern)
    - .planning/phases/04-activity-subsystem/04-CONTEXT.md §Decisions D-02 (event type enum)
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §3 (eventTypes.ts delta)
  </read_first>
  <behavior>
    - Given the event type "workshop", EVENT_TYPE_LABELS returns "Workshop"
    - Given the event type "blog_post", EVENT_TYPE_LABELS returns "Blog post"
    - Given the event type "talk_webinar", EVENT_TYPE_LABELS returns "Talk / Webinar"
    - Given the event type "community_stream", EVENT_TYPE_LABELS returns "Community stream"
    - Given the event type "study_group", EVENT_TYPE_LABELS returns "Study group"
    - Given the event type "other", EVENT_TYPE_LABELS returns "Other"
    - EventTypeSchema.safeParse("workshop").success === true
    - EventTypeSchema.safeParse("webinar").success === false (not in enum)
  </behavior>
  <action>
    Step 1: Append to `src/lib/ambassador/constants.ts` (keep existing exports; append after last one):

    ```typescript
    /** Phase 4: Top-level Firestore collection holding referral code lookup docs.
     *  Doc id is the referral code itself; value shape is `{ ambassadorId, uid }`.
     *  Used to avoid a collection-group index on `ambassador.referralCode` (Pitfall 3). */
    export const REFERRAL_CODES_COLLECTION = "referral_codes" as const;

    /** Phase 4: Top-level Firestore collection for referral attribution docs (REF-03). */
    export const REFERRALS_COLLECTION = "referrals" as const;

    /** Phase 4: Top-level Firestore collection for ambassador-logged events (EVENT-01). */
    export const AMBASSADOR_EVENTS_COLLECTION = "ambassador_events" as const;

    /** Phase 4: Top-level Firestore collection for monthly self-reports (REPORT-02).
     *  Doc id is deterministic: `${ambassadorId}_${YYYY-MM}` — one per ambassador per month. */
    export const MONTHLY_REPORTS_COLLECTION = "monthly_reports" as const;

    /** Phase 4: Top-level Firestore collection for cron-generated admin-review flags (REPORT-04 / DISC-04).
     *  Cron scripts only write; admin updates `resolved: true`. */
    export const AMBASSADOR_CRON_FLAGS_COLLECTION = "ambassador_cron_flags" as const;

    /** Phase 4: Name of the first-party referral attribution cookie (REF-02).
     *  HttpOnly, SameSite=Lax, 30-day expiry, set by src/middleware.ts. */
    export const REFERRAL_COOKIE_NAME = "cwa_ref" as const;

    /** Phase 4: Referral cookie max-age in seconds (REF-02). 30 days. */
    export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

    /** Phase 4: Event edit window in milliseconds (EVENT-02). 30 days after event date. */
    export const EVENT_EDIT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
    ```

    Step 2: Create `src/lib/ambassador/eventTypes.ts`:

    ```typescript
    /**
     * Phase 4 (D-02): Fixed Zod enum for ambassador-logged event types.
     * Locked per CONTEXT.md so Phase 5 leaderboard per-category counts stay clean.
     */
    import { z } from "zod";

    export const EventTypeSchema = z.enum([
      "workshop",
      "blog_post",
      "talk_webinar",
      "community_stream",
      "study_group",
      "other",
    ]);
    export type EventType = z.infer<typeof EventTypeSchema>;

    /** UI display labels for D-02 event types. Used by LogEventForm select and EventAdminTable rows. */
    export const EVENT_TYPE_LABELS: Record<EventType, string> = {
      workshop: "Workshop",
      blog_post: "Blog post",
      talk_webinar: "Talk / Webinar",
      community_stream: "Community stream",
      study_group: "Study group",
      other: "Other",
    };
    ```
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -c "EVENT_TYPE_LABELS" src/lib/ambassador/eventTypes.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/ambassador/constants.ts` contains `export const REFERRAL_CODES_COLLECTION = "referral_codes"`
    - `src/lib/ambassador/constants.ts` contains `export const REFERRALS_COLLECTION = "referrals"`
    - `src/lib/ambassador/constants.ts` contains `export const AMBASSADOR_EVENTS_COLLECTION = "ambassador_events"`
    - `src/lib/ambassador/constants.ts` contains `export const MONTHLY_REPORTS_COLLECTION = "monthly_reports"`
    - `src/lib/ambassador/constants.ts` contains `export const AMBASSADOR_CRON_FLAGS_COLLECTION = "ambassador_cron_flags"`
    - `src/lib/ambassador/constants.ts` contains `export const REFERRAL_COOKIE_NAME = "cwa_ref"`
    - `src/lib/ambassador/eventTypes.ts` exists and contains `export const EventTypeSchema = z.enum([`
    - `src/lib/ambassador/eventTypes.ts` contains all six enum values: `"workshop"`, `"blog_post"`, `"talk_webinar"`, `"community_stream"`, `"study_group"`, `"other"`
    - `src/lib/ambassador/eventTypes.ts` contains `EVENT_TYPE_LABELS` with all 6 keys
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    All Phase 4 Firestore collection names and event type vocabulary are exported as typed constants/enums. Downstream plans can import without guessing strings.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add new Firestore doc interfaces + Zod input schemas + AmbassadorSubdoc field extensions to src/types/ambassador.ts</name>
  <files>src/types/ambassador.ts</files>
  <read_first>
    - src/types/ambassador.ts (entire file — see existing AmbassadorSubdoc at ~line 122, ApplicationStatusSchema at ~line 13 as the Zod+type pattern)
    - src/lib/ambassador/eventTypes.ts (created in Task 1 — EventTypeSchema is imported here)
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §5 (exact interface shapes to add)
    - .planning/phases/04-activity-subsystem/04-RESEARCH.md §Architecture Patterns (Firestore schema for all 4 new collections)
  </read_first>
  <behavior>
    - TypeScript compiles clean with `AmbassadorSubdoc.referralCode` accessed as `string | undefined`
    - TypeScript compiles clean with `AmbassadorSubdoc.timezone` accessed as `string | undefined`
    - `ReferralDoc`, `AmbassadorEventDoc`, `MonthlyReportDoc`, `AmbassadorCronFlagDoc` are all exported from `@/types/ambassador`
    - `LogEventSchema.safeParse(validEventInput)` returns `success: true`
    - `LogEventSchema.safeParse({ type: "workshop", date: "not-a-date", attendanceEstimate: 5 })` returns `success: false`
    - `MonthlyReportSchema.safeParse({ whatWorked: "", whatBlocked: "x", whatNeeded: "y" })` returns `success: false` (empty whatWorked fails min(1))
    - `MonthlyReportSchema.safeParse(validReport)` returns `success: true`
  </behavior>
  <action>
    Step 1: At the top of `src/types/ambassador.ts`, add import:
    ```typescript
    import { EventTypeSchema, type EventType } from "@/lib/ambassador/eventTypes";
    ```

    Step 2: Extend the `AmbassadorSubdoc` interface (find the existing interface, append the Phase 4 fields block AFTER the last Phase 3 field):

    ```typescript
      // ─── Phase 4 fields ────────────────────────────────────────────────
      /** REF-01: Human-readable referral code assigned at acceptance. Format `{PREFIX}-{4HEX}`. Guaranteed unique via `referral_codes/{code}` lookup doc. */
      referralCode?: string;
      /** D-04: IANA timezone string (e.g. "Asia/Karachi"). Default to "UTC" when absent. Read by REPORT-04 cron to compute per-ambassador deadlines. */
      timezone?: string;
    ```

    Step 3: Below the existing interfaces, append new Firestore doc interfaces (place after PublicAmbassadorDoc or whatever the last Phase 3 interface is; comment each with its requirement ID):

    ```typescript
    // ─── Phase 4: Referral attribution (REF-01..REF-05) ──────────────────────

    /**
     * Top-level collection `referral_codes/{code}` — O(1) lookup doc written at
     * acceptance time (REF-01) and read during referral consumption (REF-03).
     * Avoids a collection-group index on `ambassador.referralCode` (RESEARCH Pitfall 3).
     */
    export interface ReferralCodeLookup {
      ambassadorId: string;
      uid: string;
    }

    /**
     * Top-level collection `referrals/{referralId}` — one doc per successful
     * attribution (REF-03). `referredUserId` is unique within this collection
     * (enforced by the consume helper, REF-04).
     */
    export interface ReferralDoc {
      ambassadorId: string;
      referredUserId: string;
      convertedAt: Date;
      sourceCode: string;
    }

    // ─── Phase 4: Event logging (EVENT-01..EVENT-04) ─────────────────────────

    /**
     * Top-level collection `ambassador_events/{eventId}` — one doc per logged event.
     * `hidden: true` removes an event from leaderboard counts (EVENT-03/04).
     */
    export interface AmbassadorEventDoc {
      ambassadorId: string;
      cohortId: string;
      date: Date;
      type: EventType;
      attendanceEstimate: number;
      link?: string;
      notes?: string;
      hidden: boolean;
      createdAt: Date;
      updatedAt: Date;
    }

    /** Zod schema for POST /api/ambassador/events body (EVENT-01). */
    export const LogEventSchema = z.object({
      date: z.string().datetime({ offset: true }),
      type: EventTypeSchema,
      attendanceEstimate: z.number().int().min(0).max(100000),
      link: z
        .string()
        .trim()
        .max(2048)
        .url()
        .optional()
        .or(z.literal("")),
      notes: z.string().trim().max(1000).optional().or(z.literal("")),
    });
    export type LogEventInput = z.infer<typeof LogEventSchema>;

    /** Zod schema for PATCH /api/ambassador/events/[eventId] body (EVENT-02). All fields optional. */
    export const UpdateEventSchema = LogEventSchema.partial();
    export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;

    // ─── Phase 4: Monthly report (REPORT-01..REPORT-07) ──────────────────────

    /**
     * Top-level collection `monthly_reports/{ambassadorId}_{YYYY-MM}` — deterministic
     * doc id enforces "one report per ambassador per month" at write time (REPORT-02).
     */
    export interface MonthlyReportDoc {
      ambassadorId: string;
      cohortId: string;
      month: string; // "YYYY-MM" in ambassador timezone
      whatWorked: string;
      whatBlocked: string;
      whatNeeded: string;
      submittedAt: Date;
    }

    /** Zod schema for POST /api/ambassador/report body (REPORT-01). */
    export const MonthlyReportSchema = z.object({
      whatWorked: z.string().trim().min(1).max(2000),
      whatBlocked: z.string().trim().min(1).max(2000),
      whatNeeded: z.string().trim().min(1).max(2000),
    });
    export type MonthlyReportInput = z.infer<typeof MonthlyReportSchema>;

    // ─── Phase 4: Cron admin-review flags (REPORT-04, DISC-04) ───────────────

    export const CronFlagTypeSchema = z.enum(["missing_report", "missing_discord_role"]);
    export type CronFlagType = z.infer<typeof CronFlagTypeSchema>;

    /**
     * Top-level collection `ambassador_cron_flags/{flagId}` — written by the daily /
     * weekly crons; admin marks `resolved: true`. Cron NEVER mutates strikes/roles
     * (D-06, REPORT-04, DISC-04).
     */
    export interface AmbassadorCronFlagDoc {
      ambassadorId: string;
      type: CronFlagType;
      /** "YYYY-MM" for `missing_report`; undefined for `missing_discord_role`. */
      period?: string;
      flaggedAt: Date;
      resolved: boolean;
    }
    ```

    Step 4: Re-export the collection-name constants from this file for callers who prefer the types barrel (mirrors how PUBLIC_AMBASSADORS_COLLECTION is re-exported):

    ```typescript
    export {
      REFERRAL_CODES_COLLECTION,
      REFERRALS_COLLECTION,
      AMBASSADOR_EVENTS_COLLECTION,
      MONTHLY_REPORTS_COLLECTION,
      AMBASSADOR_CRON_FLAGS_COLLECTION,
      REFERRAL_COOKIE_NAME,
      REFERRAL_COOKIE_MAX_AGE_SECONDS,
      EVENT_EDIT_WINDOW_MS,
    } from "@/lib/ambassador/constants";
    ```
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -c "MonthlyReportSchema\|ReferralDoc\|AmbassadorEventDoc\|AmbassadorCronFlagDoc" src/types/ambassador.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/types/ambassador.ts` contains `referralCode?: string;` inside the `AmbassadorSubdoc` interface
    - `src/types/ambassador.ts` contains `timezone?: string;` inside the `AmbassadorSubdoc` interface
    - `src/types/ambassador.ts` contains `export interface ReferralDoc {`
    - `src/types/ambassador.ts` contains `export interface AmbassadorEventDoc {`
    - `src/types/ambassador.ts` contains `export interface MonthlyReportDoc {`
    - `src/types/ambassador.ts` contains `export interface AmbassadorCronFlagDoc {`
    - `src/types/ambassador.ts` contains `export interface ReferralCodeLookup {`
    - `src/types/ambassador.ts` contains `export const LogEventSchema = z.object({`
    - `src/types/ambassador.ts` contains `export const MonthlyReportSchema = z.object({`
    - `src/types/ambassador.ts` contains `export const CronFlagTypeSchema = z.enum([`
    - `grep -c "EventTypeSchema" src/types/ambassador.ts` returns at least 1 (imported from eventTypes.ts)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    All Phase 4 Firestore doc shapes are typed. AmbassadorSubdoc has `referralCode` and `timezone`. Downstream plans can import `LogEventSchema`, `MonthlyReportSchema`, `AmbassadorEventDoc`, `MonthlyReportDoc`, `ReferralDoc`, `AmbassadorCronFlagDoc` from `@/types/ambassador`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Create referralCode.ts utility + its vitest suite</name>
  <files>src/lib/ambassador/referralCode.ts, src/lib/ambassador/referralCode.test.ts</files>
  <read_first>
    - src/lib/ambassador/username.ts (canonical pre-transaction uniqueness loop — `ensureUniqueUsername`)
    - src/lib/firebaseAdmin.ts (always import `db` from here, never call `admin.firestore()`)
    - src/lib/ambassador/constants.ts (REFERRAL_CODES_COLLECTION — Task 1)
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §2 (referralCode.ts delta — top-level lookup doc approach to avoid collection-group index)
    - .planning/phases/04-activity-subsystem/04-RESEARCH.md §Pitfall 3 (collection-group index avoidance — use referral_codes/{code})
  </read_first>
  <behavior>
    - `buildCode("ahsan")` returns a string matching `/^AHSAN-[0-9A-F]{4}$/`
    - `buildCode("ah")` returns a string matching `/^AH-[0-9A-F]{4}$/` (short username — no padding)
    - `buildCode("user.name")` returns a string matching `/^USERX-[0-9A-F]{4}$/` or `/^USER.-[0-9A-F]{4}$/` — non-alphanumerics replaced with X (dot becomes X)
    - `buildCode("")` returns a string matching `/^X-[0-9A-F]{4}$/` (empty-safe — at least 1 char prefix of X)
    - `generateUniqueReferralCode("ahsan")` returns a unique code when all collision-lookup calls to `referral_codes/{code}` return `exists: false`
    - `generateUniqueReferralCode("ahsan")` throws after 5 collision retries when every lookup returns `exists: true`
    - `generateUniqueReferralCode` reads from `referral_codes/{code}` (NOT a collection-group query on `ambassador.referralCode`)
  </behavior>
  <action>
    Step 1: Create `src/lib/ambassador/referralCode.ts`:

    ```typescript
    /**
     * Phase 4 (REF-01): Referral code generator for accepted ambassadors.
     *
     * Format: `{PREFIX}-{4HEX}` where PREFIX = first 5 alphanumeric chars of the
     * ambassador's username, uppercased. Non-alphanumerics are replaced with "X".
     *
     * Uniqueness: checked via `referral_codes/{code}` top-level lookup doc
     * (RESEARCH Pitfall 3 — avoids a collection-group index). The lookup doc is
     * written inside `runAcceptanceTransaction` (Plan 02) alongside the subdoc.
     */
    import { db } from "@/lib/firebaseAdmin";
    import { REFERRAL_CODES_COLLECTION } from "@/lib/ambassador/constants";

    const MAX_PREFIX_LEN = 5;
    const HEX_LEN = 4;
    const MAX_RETRIES = 5;

    /** Public for unit tests. Do NOT call directly from app code — always go through generateUniqueReferralCode. */
    export function buildCode(username: string): string {
      // Strip non-alphanumeric, then take first 5 chars uppercased.
      // If username is empty (shouldn't happen for accepted ambassadors, but defensive), fall back to "X".
      const safe = (username ?? "").replace(/[^a-zA-Z0-9]/g, "X").toUpperCase();
      const prefix = safe.length > 0 ? safe.slice(0, MAX_PREFIX_LEN) : "X";
      const hexNum = Math.floor(Math.random() * 0xffff);
      const hex = hexNum.toString(16).toUpperCase().padStart(HEX_LEN, "0");
      return `${prefix}-${hex}`;
    }

    /**
     * Generate a unique referral code with up to 5 collision retries.
     * Reads `referral_codes/{code}` — O(1), no Firestore index required.
     * The caller (acceptance transaction) is responsible for writing the lookup doc.
     *
     * @throws Error if no unique code can be generated after MAX_RETRIES attempts.
     */
    export async function generateUniqueReferralCode(username: string): Promise<string> {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const candidate = buildCode(username);
        const snap = await db.collection(REFERRAL_CODES_COLLECTION).doc(candidate).get();
        if (!snap.exists) return candidate;
      }
      throw new Error(
        `Could not generate unique referral code for username="${username}" after ${MAX_RETRIES} attempts`,
      );
    }
    ```

    Step 2: Create `src/lib/ambassador/referralCode.test.ts` (Vitest unit test — mock `db.collection(...).doc(...).get()`):

    ```typescript
    import { describe, it, expect, vi, beforeEach } from "vitest";

    // Mock firebaseAdmin BEFORE importing referralCode
    const getMock = vi.fn();
    vi.mock("@/lib/firebaseAdmin", () => ({
      db: {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({ get: getMock })),
        })),
      },
    }));

    import { buildCode, generateUniqueReferralCode } from "./referralCode";

    describe("buildCode", () => {
      it("produces {PREFIX}-{4HEX} from a simple username", () => {
        const code = buildCode("ahsan");
        expect(code).toMatch(/^AHSAN-[0-9A-F]{4}$/);
      });

      it("uppercases the prefix", () => {
        const code = buildCode("mario");
        expect(code.startsWith("MARIO-")).toBe(true);
      });

      it("replaces non-alphanumeric characters with X", () => {
        const code = buildCode("a.b-c");
        // "a.b-c" → "aXbXc" → "AXBXC"
        expect(code).toMatch(/^AXBXC-[0-9A-F]{4}$/);
      });

      it("handles short usernames without padding", () => {
        const code = buildCode("ab");
        expect(code).toMatch(/^AB-[0-9A-F]{4}$/);
      });

      it("falls back to X for empty username", () => {
        const code = buildCode("");
        expect(code).toMatch(/^X-[0-9A-F]{4}$/);
      });

      it("truncates to first 5 chars", () => {
        const code = buildCode("verylongusername");
        expect(code).toMatch(/^VERYL-[0-9A-F]{4}$/);
      });
    });

    describe("generateUniqueReferralCode", () => {
      beforeEach(() => {
        getMock.mockReset();
      });

      it("returns a unique code when no collision", async () => {
        getMock.mockResolvedValue({ exists: false });
        const code = await generateUniqueReferralCode("ahsan");
        expect(code).toMatch(/^AHSAN-[0-9A-F]{4}$/);
        expect(getMock).toHaveBeenCalledTimes(1);
      });

      it("retries on collision and returns second attempt", async () => {
        getMock
          .mockResolvedValueOnce({ exists: true })
          .mockResolvedValueOnce({ exists: false });
        const code = await generateUniqueReferralCode("ahsan");
        expect(code).toMatch(/^AHSAN-[0-9A-F]{4}$/);
        expect(getMock).toHaveBeenCalledTimes(2);
      });

      it("throws after 5 consecutive collisions", async () => {
        getMock.mockResolvedValue({ exists: true });
        await expect(generateUniqueReferralCode("ahsan")).rejects.toThrow(
          /Could not generate unique referral code/,
        );
        expect(getMock).toHaveBeenCalledTimes(5);
      });
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run src/lib/ambassador/referralCode.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/ambassador/referralCode.ts` exists and exports `buildCode` and `generateUniqueReferralCode`
    - `src/lib/ambassador/referralCode.ts` imports `db` from `@/lib/firebaseAdmin` (never `admin.firestore()`)
    - `src/lib/ambassador/referralCode.ts` imports `REFERRAL_CODES_COLLECTION` from `@/lib/ambassador/constants`
    - `src/lib/ambassador/referralCode.ts` does NOT use `collectionGroup` (Pitfall 3 avoidance)
    - `src/lib/ambassador/referralCode.test.ts` exists
    - `npx vitest run src/lib/ambassador/referralCode.test.ts` exits 0 with at least 8 passing tests
    - Test "retries on collision and returns second attempt" passes
    - Test "throws after 5 consecutive collisions" passes
  </acceptance_criteria>
  <done>
    Referral code generator works and is unit-tested. Unique-code generation does not require a Firestore collection-group index. Ready for Plan 02 to hook it into `runAcceptanceTransaction`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Create reportDeadline.ts timezone helpers + vitest suite</name>
  <files>src/lib/ambassador/reportDeadline.ts, src/lib/ambassador/reportDeadline.test.ts</files>
  <read_first>
    - src/lib/ambassador/reportDeadline.ts (new file; check package.json first to confirm date-fns-tz v3.2.0 is present)
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §4 (reportDeadline.ts delta + unit test gap)
    - .planning/phases/04-activity-subsystem/04-RESEARCH.md §Pitfall 5 (timezone cron awareness)
    - .planning/phases/04-activity-subsystem/04-CONTEXT.md §Claude's Discretion (deadline = last day of calendar month 23:59 local)
  </read_first>
  <behavior>
    - `getDeadlineUTC(2026, 4, "UTC")` returns the milliseconds for 2026-04-30 23:59:59.999 UTC
    - `getDeadlineUTC(2026, 4, "Asia/Karachi")` returns a UTC ms value corresponding to 2026-04-30 23:59:59.999 Karachi time (which is 2026-04-30 18:59:59.999 UTC, i.e. 5 hours earlier than the UTC deadline)
    - `getDeadlineUTC(2026, 2, "UTC")` returns the ms for 2026-02-28 23:59:59.999 UTC (non-leap-year February)
    - `getDeadlineUTC(2024, 2, "UTC")` returns the ms for 2024-02-29 23:59:59.999 UTC (leap year February)
    - `getAmbassadorMonthKey("UTC", new Date("2026-05-03T10:00:00Z"))` returns `"2026-04"` (the PREVIOUS month — what the cron flags against)
    - `getAmbassadorMonthKey("Asia/Karachi", new Date("2026-05-01T06:00:00Z"))` returns `"2026-04"` (May 1 06:00 UTC is still April 30 in Karachi-5)... actually Karachi is UTC+5 so May 1 06:00 UTC = May 1 11:00 Karachi, so previous month = April → "2026-04"
    - `getCurrentMonthKey("UTC", new Date("2026-04-15T10:00:00Z"))` returns `"2026-04"` (current month)
    - `getCurrentMonthKey("Asia/Karachi", new Date("2026-04-30T20:00:00Z"))` returns `"2026-05"` (April 30 20:00 UTC is May 1 01:00 Karachi)
  </behavior>
  <action>
    Step 1: Verify `date-fns-tz` is in package.json (it was confirmed present at v3.2.0). Create `src/lib/ambassador/reportDeadline.ts`:

    ```typescript
    /**
     * Phase 4: Timezone-aware month deadline math for the monthly-report cron (REPORT-04)
     * and DM reminders (REPORT-05).
     *
     * Uses date-fns-tz v3.2.0 (already in package.json) rather than hand-rolling Intl math —
     * RESEARCH §Don't Hand-Roll flags "last day of month + IANA timezone" as a zone that is
     * simple in theory but easy to mis-DST in practice.
     */
    import { toZonedTime, fromZonedTime } from "date-fns-tz";

    /**
     * Returns the UTC milliseconds of the final millisecond of the given calendar month
     * in the given IANA timezone. i.e. "last day of month, 23:59:59.999 local time".
     *
     * @param year Full year (e.g. 2026)
     * @param month 1-indexed month (1 = January, 12 = December)
     * @param timezone IANA timezone (e.g. "Asia/Karachi"). Defaults to "UTC" at the call site.
     */
    export function getDeadlineUTC(year: number, month: number, timezone: string): number {
      // "day 0 of next month" == "last day of this month". JS Date handles month overflow.
      // We want 23:59:59.999 LOCAL TIME in the target zone, then convert to UTC.
      const lastDayZero = new Date(Date.UTC(year, month, 0)); // UTC date equal to last day of `month`
      const lastDayNumber = lastDayZero.getUTCDate(); // e.g. 30 for April, 29 for Feb 2024

      // Build a Date that REPRESENTS the local wall-clock time in the target zone,
      // then fromZonedTime converts that wall-clock to the equivalent UTC instant.
      const yyyy = year.toString().padStart(4, "0");
      const mm = month.toString().padStart(2, "0");
      const dd = lastDayNumber.toString().padStart(2, "0");
      const wallClockIso = `${yyyy}-${mm}-${dd}T23:59:59.999`;
      const utcInstant = fromZonedTime(wallClockIso, timezone);
      return utcInstant.getTime();
    }

    /**
     * Returns the "YYYY-MM" string for the PREVIOUS calendar month in the ambassador's
     * timezone — this is what the daily cron flags against (REPORT-04).
     *
     * Example: now=2026-05-03 in timezone "UTC" → "2026-04" (April, the month whose
     * deadline has just passed).
     *
     * @param timezone IANA timezone
     * @param now Clock injection point (defaults to current time)
     */
    export function getAmbassadorMonthKey(timezone: string, now: Date = new Date()): string {
      const zoned = toZonedTime(now, timezone);
      const year = zoned.getFullYear();
      const month = zoned.getMonth() + 1; // 1-indexed
      // Previous month, wrapping to December of previous year if needed.
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      return `${prevYear.toString().padStart(4, "0")}-${prevMonth.toString().padStart(2, "0")}`;
    }

    /**
     * Returns the "YYYY-MM" string for the CURRENT calendar month in the ambassador's
     * timezone — used by the report-submit handler to compute the doc id
     * `${uid}_${YYYY-MM}` (REPORT-02).
     */
    export function getCurrentMonthKey(timezone: string, now: Date = new Date()): string {
      const zoned = toZonedTime(now, timezone);
      const year = zoned.getFullYear();
      const month = zoned.getMonth() + 1;
      return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}`;
    }
    ```

    Step 2: Create `src/lib/ambassador/reportDeadline.test.ts`:

    ```typescript
    import { describe, it, expect } from "vitest";
    import { getDeadlineUTC, getAmbassadorMonthKey, getCurrentMonthKey } from "./reportDeadline";

    describe("getDeadlineUTC", () => {
      it("returns 2026-04-30 23:59:59.999 UTC for April 2026 in UTC", () => {
        const ms = getDeadlineUTC(2026, 4, "UTC");
        const d = new Date(ms);
        expect(d.toISOString()).toBe("2026-04-30T23:59:59.999Z");
      });

      it("returns earlier UTC instant for Asia/Karachi (UTC+5) than UTC", () => {
        const utc = getDeadlineUTC(2026, 4, "UTC");
        const karachi = getDeadlineUTC(2026, 4, "Asia/Karachi");
        // Karachi "end of April" arrives 5 hours earlier in UTC terms
        expect(karachi).toBeLessThan(utc);
        expect(utc - karachi).toBe(5 * 60 * 60 * 1000);
      });

      it("handles non-leap February correctly (2026)", () => {
        const ms = getDeadlineUTC(2026, 2, "UTC");
        const d = new Date(ms);
        expect(d.toISOString()).toBe("2026-02-28T23:59:59.999Z");
      });

      it("handles leap February correctly (2024)", () => {
        const ms = getDeadlineUTC(2024, 2, "UTC");
        const d = new Date(ms);
        expect(d.toISOString()).toBe("2024-02-29T23:59:59.999Z");
      });

      it("handles 31-day December", () => {
        const ms = getDeadlineUTC(2026, 12, "UTC");
        const d = new Date(ms);
        expect(d.toISOString()).toBe("2026-12-31T23:59:59.999Z");
      });
    });

    describe("getAmbassadorMonthKey", () => {
      it("returns previous month for mid-month UTC clock", () => {
        const now = new Date("2026-05-03T10:00:00Z");
        expect(getAmbassadorMonthKey("UTC", now)).toBe("2026-04");
      });

      it("wraps January to previous December", () => {
        const now = new Date("2026-01-05T10:00:00Z");
        expect(getAmbassadorMonthKey("UTC", now)).toBe("2025-12");
      });

      it("respects timezone shift — Karachi user on May 1 06:00 UTC sees previous month as April", () => {
        const now = new Date("2026-05-01T06:00:00Z"); // May 1 11:00 Karachi
        expect(getAmbassadorMonthKey("Asia/Karachi", now)).toBe("2026-04");
      });
    });

    describe("getCurrentMonthKey", () => {
      it("returns current month in UTC", () => {
        const now = new Date("2026-04-15T10:00:00Z");
        expect(getCurrentMonthKey("UTC", now)).toBe("2026-04");
      });

      it("respects timezone crossing midnight into next month", () => {
        // April 30 20:00 UTC == May 1 01:00 Karachi
        const now = new Date("2026-04-30T20:00:00Z");
        expect(getCurrentMonthKey("Asia/Karachi", now)).toBe("2026-05");
      });

      it("respects timezone crossing backward into previous month", () => {
        // May 1 02:00 UTC == April 30 19:00 Los Angeles (UTC-7 in April, DST)
        const now = new Date("2026-05-01T02:00:00Z");
        expect(getCurrentMonthKey("America/Los_Angeles", now)).toBe("2026-04");
      });
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run src/lib/ambassador/reportDeadline.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/ambassador/reportDeadline.ts` exists and exports `getDeadlineUTC`, `getAmbassadorMonthKey`, `getCurrentMonthKey`
    - `src/lib/ambassador/reportDeadline.ts` imports `toZonedTime` and `fromZonedTime` from `date-fns-tz`
    - `src/lib/ambassador/reportDeadline.test.ts` exists
    - `npx vitest run src/lib/ambassador/reportDeadline.test.ts` exits 0
    - Test "returns earlier UTC instant for Asia/Karachi (UTC+5) than UTC" passes (timezone-awareness proof)
    - Test "handles leap February correctly (2024)" passes
    - Test "wraps January to previous December" passes
    - Test "respects timezone shift — Karachi user on May 1 06:00 UTC sees previous month as April" passes
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    Timezone-aware deadline helpers are implemented, documented, and unit-tested across UTC, Asia/Karachi, and America/Los_Angeles. Ready for the report submit API (Plan 04) and the daily cron (Plan 06) to import and use.
  </done>
</task>

</tasks>

<verification>
After all 4 tasks complete:
1. `npx tsc --noEmit` exits 0 (full typecheck clean)
2. `npx vitest run src/lib/ambassador/referralCode.test.ts src/lib/ambassador/reportDeadline.test.ts --reporter=verbose` exits 0
3. `grep -c "Phase 4" src/types/ambassador.ts` returns at least 3 (comment markers for the three Phase 4 sections)
4. No consumers of these new modules exist yet — this is a foundation plan; consumers are in Waves 2–3.
</verification>

<success_criteria>
- All 4 tasks complete with acceptance criteria met
- `src/types/ambassador.ts` exports 4 new doc interfaces + 2 new Zod input schemas + 2 new AmbassadorSubdoc fields
- `src/lib/ambassador/eventTypes.ts`, `reportDeadline.ts`, `referralCode.ts` exist and are importable
- Both unit test files pass
- TypeScript compiles clean across the project
</success_criteria>

<output>
After completion, create `.planning/phases/04-activity-subsystem/04-01-foundations-types-schemas-SUMMARY.md` capturing:
- Files created vs modified
- Exported symbols from each new module (for downstream plans to import by name)
- Test coverage percentages from vitest
- Any deviations from PATTERNS.md (with rationale)
</output>