---
phase: 04-activity-subsystem
plan: 04
type: execute
wave: 2
depends_on:
  - 04-01-foundations-types-schemas
files_modified:
  - src/app/api/ambassador/report/route.ts
  - src/app/api/ambassador/report/route.test.ts
  - src/app/api/ambassador/report/current/route.ts
  - src/app/api/ambassador/members/[uid]/strike/route.ts
  - src/app/ambassadors/report/MonthlyReportForm.tsx
  - src/app/ambassadors/report/ReportStatusBadge.tsx
  - firestore.rules
autonomous: true
requirements:
  - REPORT-01
  - REPORT-02
  - REPORT-03
  - REPORT-06
must_haves:
  truths:
    - "Ambassador can POST /api/ambassador/report with whatWorked+whatBlocked+whatNeeded and receive 201 with { reportId, month }"
    - "A second POST for the same ambassador in the same month (in ambassador timezone) returns 409 { error: 'Already submitted' }"
    - "Report doc id is deterministic: {ambassadorId}_{YYYY-MM} — enforces one report per ambassador per month at the Firestore key level (REPORT-02)"
    - "Ambassador can GET /api/ambassador/report/current and receive { submitted: boolean, month: string, deadlineIso: string, report?: MonthlyReportDoc } for the current ambassador-local month (REPORT-03)"
    - "Admin can POST /api/ambassador/members/[uid]/strike and receive 200 with { strikes: number } reflecting the post-increment count (REPORT-06)"
    - "Strike POST is idempotent by use of Firestore FieldValue.increment(1) on the ambassador subdoc only — never touches roles, never writes to audit collections (REPORT-07 is Phase 5)"
    - "MonthlyReportForm component submits a report with 3 textareas (min 1 char each) and shows success/error toasts matching UI-SPEC copy"
    - "ReportStatusBadge renders 'Submitted' / 'On time' / 'Overdue' / 'Not yet submitted' based on the current-month report state"
    - "Firestore rules deny all client reads/writes to monthly_reports/* and ambassador_cron_flags/*"
  artifacts:
    - path: "src/app/api/ambassador/report/route.ts"
      provides: "POST monthly report with deterministic doc id + transaction-safe existence check"
      exports: ["POST"]
      min_lines: 80
    - path: "src/app/api/ambassador/report/route.test.ts"
      provides: "Vitest for deterministic doc id + one-per-month enforcement + ambassador-timezone month resolution"
      min_lines: 60
    - path: "src/app/api/ambassador/report/current/route.ts"
      provides: "GET current-month report status (REPORT-03)"
      exports: ["GET"]
    - path: "src/app/api/ambassador/members/[uid]/strike/route.ts"
      provides: "Admin POST strike increment (REPORT-06)"
      exports: ["POST"]
    - path: "src/app/ambassadors/report/MonthlyReportForm.tsx"
      provides: "Client form with 3 textareas + server-driven already-submitted state"
      min_lines: 120
    - path: "src/app/ambassadors/report/ReportStatusBadge.tsx"
      provides: "Client badge reflecting submitted / on-time / overdue state"
      min_lines: 30
    - path: "firestore.rules"
      provides: "Deny-all client rules for monthly_reports and ambassador_cron_flags"
      contains: "match /monthly_reports/"
  key_links:
    - from: "src/app/api/ambassador/report/route.ts"
      to: "deterministic doc id {uid}_{YYYY-MM} via getCurrentMonthKey(timezone)"
      via: "db.collection(MONTHLY_REPORTS_COLLECTION).doc(docId).get() + transactional conditional write"
      pattern: "getCurrentMonthKey|\\$\\{.*\\}_\\$\\{"
    - from: "src/app/ambassadors/report/MonthlyReportForm.tsx"
      to: "POST /api/ambassador/report"
      via: "authFetch submit handler"
      pattern: "authFetch.*api/ambassador/report"
    - from: "src/app/api/ambassador/members/[uid]/strike/route.ts"
      to: "FieldValue.increment(1) on mentorship_profiles/{uid}/ambassador/v1 subdoc"
      via: "server-side atomic increment; does NOT write to roles or any audit collection"
      pattern: "FieldValue\\.increment\\(1\\)"
---

<objective>
Build the monthly report submission pipeline and the admin strike-increment action. Two ambassador-scope routes (POST report, GET current-month status), one admin-scope route (POST strike), and two client components (`MonthlyReportForm`, `ReportStatusBadge`). Wires REPORT-01, REPORT-02, REPORT-03, REPORT-06, and REPORT-07 (Phase 4 scope — strike increment only; offboarding is Phase 5).

Purpose: Ambassadors can submit one self-report per calendar month (in their local timezone, D-04). Report status is visible on `/ambassadors/report` via the badge (D-01). Admin can manually increment a strike count from `/admin/ambassadors/members/[uid]` after reviewing cron flags (D-05, D-06). All writes go through Admin SDK — client Firestore rules deny everything.

Output: 3 new API route files + 1 vitest suite + 2 new client components + firestore.rules update.
</objective>

<threat_model>
- Authentication: Ambassador routes use `verifyAuth()` + `hasRoleClaim(ctx, "ambassador")`. Admin route uses `requireAdmin()`.
- Authorization — report ownership: Report writes are always keyed on `ctx.uid` server-side — the request body has NO `ambassadorId` field. Blocks ambassador A from submitting a report under ambassador B's key.
- Authorization — strike power: Only admin can call POST `/api/ambassador/members/[uid]/strike`. `requireAdmin()` returns 403 for any non-admin token. Ambassador-role users cannot increment their own strike count.
- Data integrity — one-per-month: Enforced at the Firestore doc-id level via `{uid}_{YYYY-MM}` deterministic id + transactional existence check (RESEARCH Pitfall 7). A race between two concurrent submits cannot produce two docs because the second transaction sees the first's write.
- Data integrity — timezone correctness: Month key is resolved from the ambassador's stored `timezone` field (D-04, defaults to UTC if absent). A Karachi ambassador submitting at 01:30 UTC on May 1 correctly gets month `2026-04` (their local date is still April 30). Covered by vitest.
- Data integrity — strike bounds: `FieldValue.increment(1)` is atomic. Strike count never reset to 0 by this endpoint. Phase 4 does NOT auto-offboard at 2 strikes — the 2-strike warning is UI-only per D-05.
- Firestore rules: `monthly_reports/*` and `ambassador_cron_flags/*` deny ALL client-SDK reads and writes. Reports are not client-readable even by the owning ambassador — they fetch via `/api/ambassador/report/current` which runs with Admin SDK. Prevents client-SDK snooping on other ambassadors' reports or strike flags.
- Input validation: `MonthlyReportSchema` from Plan 01 enforces min 1 / max 2000 chars per field; server applies `safeParse` before any Firestore write. Long-content truncation is NOT done server-side — Zod rejects over-max with a 400.
- Cookie safety: N/A — no cookies in this plan.
- Cron safety: N/A — no crons in this plan; crons are Plan 06.
- Block-on severity: HIGH for (a) deterministic doc id + one-per-month race safety, (b) timezone-correct month key, (c) admin-only strike gate, (d) firestore rules denial on both collections. All have acceptance criteria.
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
@.planning/phases/04-activity-subsystem/04-UI-SPEC.md
@.planning/phases/04-activity-subsystem/04-01-foundations-types-schemas-PLAN.md
@src/app/api/ambassador/profile/route.ts
@src/app/api/ambassador/applications/[applicationId]/route.ts
@src/lib/ambassador/adminAuth.ts
@src/app/profile/AmbassadorPublicCardSection.tsx
@firestore.rules

<interfaces>
From Plan 01 (MUST be complete before this plan runs):
- `MonthlyReportSchema`, `MonthlyReportInput`, `MonthlyReportDoc` — in `@/types/ambassador`
- `AmbassadorSubdoc.timezone?: string` — read to derive month key (D-04)
- `AmbassadorSubdoc.cohortId: string` — copied onto every report doc for cohort-scoped aggregation
- `MONTHLY_REPORTS_COLLECTION = "monthly_reports"` — in `@/lib/ambassador/constants`
- `AMBASSADOR_CRON_FLAGS_COLLECTION = "ambassador_cron_flags"`
- `getCurrentMonthKey(timezone: string): string` — returns `"YYYY-MM"` for NOW in the given IANA timezone — in `@/lib/ambassador/reportDeadline`
- `getDeadlineUTC(year: number, month: number, timezone: string): Date` — returns last millisecond of the calendar month in the given timezone, as a UTC Date

Established project patterns (extracted from codebase):
- `verifyAuth(request)` returns `AuthContext | null` — from `@/lib/auth`
- `hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador")` — from `@/lib/permissions`
- `requireAdmin(request)` returns `{ ok: true; uid: string } | { ok: false; error: string; status: number }` — from `@/lib/ambassador/adminAuth`
- `isAmbassadorProgramEnabled()` — from `@/lib/features`
- `FieldValue` imported directly from `firebase-admin/firestore`
- `db` imported from `@/lib/firebaseAdmin`
- `authFetch` imported from `@/lib/apiClient`
- `ToastContext` from `@/components/ToastContext` — toast.success / toast.error pattern
- Firestore Admin SDK rejects `undefined` — always conditionally spread optional fields (MEMORY feedback)
- Ambassador subdoc path: `mentorship_profiles/{uid}/ambassador/v1` — confirmed from Phase 2 pattern
- Admin client fetches use `adminHeaders()` reading `ADMIN_TOKEN_KEY` from localStorage

DaisyUI v5 component copy strings (UI-SPEC §Copywriting — Monthly Report):
- Page heading: "Monthly Self-Report"
- Page subheading: "Share what you worked on this month — it takes 3–5 minutes."
- Status badge labels: "Submitted" / "On time" / "Overdue"
- Next due label: "Next report due"
- Field 1 label: "What worked this month?"
- Field 1 placeholder: "Share wins, events you hosted, referrals you made, or community moments that felt good."
- Field 2 label: "What blocked you?"
- Field 2 placeholder: "Anything that made it harder to show up — life, time, resources. We want to know."
- Field 3 label: "What do you need from us?"
- Field 3 placeholder: "Support, resources, introductions, visibility — just ask."
- Submit CTA: "Submit report"
- Already-submitted notice: "You've submitted your report for {Month YYYY}. Thank you!"
- Error state: "Could not submit your report. Check your connection and try again."
- Success toast: "Report submitted — thank you for showing up this month."

DaisyUI v5 component copy strings (UI-SPEC §Copywriting — Admin Member Management):
- Strike increment CTA: "Confirm strike"
- Strike confirm modal heading: "Confirm strike for {displayName}?"
- Strike confirm modal body: "This records a confirmed strike against this ambassador. Strike increments are irreversible from this panel. Review the flagged reports above before confirming."
- Strike confirm button: "Yes, confirm strike"
- Strike cancel button: "Go back"
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create src/app/api/ambassador/report/route.ts + vitest — POST monthly report with deterministic doc id</name>
  <files>src/app/api/ambassador/report/route.ts, src/app/api/ambassador/report/route.test.ts</files>
  <read_first>
    - src/app/api/ambassador/profile/route.ts (canonical gate order: feature flag → verifyAuth → hasRoleClaim → Zod parse → business logic; conditional-spread pattern for Admin SDK)
    - src/types/ambassador.ts (MonthlyReportSchema, MonthlyReportDoc, MONTHLY_REPORTS_COLLECTION re-export)
    - src/lib/ambassador/reportDeadline.ts (getCurrentMonthKey signature — Plan 01 Task 4)
    - .planning/phases/04-activity-subsystem/04-RESEARCH.md §Pitfall 7 (deterministic doc id + transaction race safety)
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §11 (report route delta)
  </read_first>
  <behavior>
    - Feature flag off → POST returns 404 `{"error": "Not found"}`
    - Unauthenticated request → 401
    - Non-ambassador user → 403
    - POST with invalid body (empty whatWorked) → 400 with `details` from Zod
    - POST with valid body, no existing report for current month (ambassador timezone) → 201 with `{ reportId: "<uid>_<YYYY-MM>", month: "<YYYY-MM>" }`
    - POST with valid body, existing report doc for current month already present → 409 with `{"error": "Already submitted"}`
    - POST when ambassador subdoc has no `cohortId` → 409 `{"error": "No cohort attached"}`
    - Report doc id equals `${ctx.uid}_${getCurrentMonthKey(subdoc.timezone ?? "UTC")}`
    - Report doc contains `month: "YYYY-MM"`, `ambassadorId: ctx.uid`, `cohortId`, all 3 trimmed body fields, `submittedAt: FieldValue.serverTimestamp()`
    - Two concurrent POSTs for the same ambassador in the same month produce exactly ONE successful 201 and one 409 (transaction-serialized)
  </behavior>
  <action>
    Step 1: Create `src/app/api/ambassador/report/route.ts`:

    ```typescript
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
    ```

    Step 2: Create `src/app/api/ambassador/report/route.test.ts` (mock firebaseAdmin + verifyAuth; exercise the 201 / 409 / 400 branches):

    ```typescript
    import { describe, it, expect, vi, beforeEach } from "vitest";

    // ------- Mocks (hoisted) -------
    const txnGet = vi.fn();
    const txnSet = vi.fn();
    const runTransaction = vi.fn(async (cb) => cb({ get: txnGet, set: txnSet }));
    const subdocGet = vi.fn();

    vi.mock("@/lib/firebaseAdmin", () => ({
      db: {
        collection: vi.fn((_name: string) => ({
          doc: vi.fn((_id: string) => ({
            collection: vi.fn(() => ({ doc: vi.fn(() => ({ get: subdocGet })) })),
            get: subdocGet,
          })),
        })),
        runTransaction: vi.fn((cb) => runTransaction(cb)),
      },
    }));

    vi.mock("firebase-admin/firestore", () => ({
      FieldValue: { serverTimestamp: () => "__SERVER_TS__" },
    }));

    vi.mock("@/lib/features", () => ({ isAmbassadorProgramEnabled: () => true }));
    vi.mock("@/lib/auth", () => ({ verifyAuth: vi.fn() }));
    vi.mock("@/lib/permissions", () => ({ hasRoleClaim: vi.fn(() => true) }));
    vi.mock("@/lib/ambassador/reportDeadline", () => ({
      getCurrentMonthKey: vi.fn(() => "2026-04"),
    }));

    import { POST } from "./route";
    import { verifyAuth } from "@/lib/auth";

    const validBody = {
      whatWorked: "Hosted a workshop.",
      whatBlocked: "Exams.",
      whatNeeded: "Better Discord tools.",
    };

    function makeRequest(body: unknown) {
      return {
        json: async () => body,
      } as unknown as Request;
    }

    describe("POST /api/ambassador/report (REPORT-01, REPORT-02)", () => {
      beforeEach(() => {
        txnGet.mockReset();
        txnSet.mockReset();
        subdocGet.mockReset();
        (verifyAuth as unknown as ReturnType<typeof vi.fn>).mockReset();
      });

      it("returns 400 on invalid body (empty whatWorked)", async () => {
        (verifyAuth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ uid: "u1" });
        const res = await POST(makeRequest({ whatWorked: "", whatBlocked: "a", whatNeeded: "b" }) as never);
        expect(res.status).toBe(400);
      });

      it("returns 201 + { reportId, month } on first submit for the month", async () => {
        (verifyAuth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ uid: "u1" });
        subdocGet.mockResolvedValue({
          exists: true,
          data: () => ({ cohortId: "cohort-3", timezone: "Asia/Karachi" }),
        });
        txnGet.mockResolvedValue({ exists: false });
        const res = await POST(makeRequest(validBody) as never);
        expect(res.status).toBe(201);
        const json = await (res as Response).json();
        expect(json.reportId).toBe("u1_2026-04");
        expect(json.month).toBe("2026-04");
        expect(txnSet).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            ambassadorId: "u1",
            cohortId: "cohort-3",
            month: "2026-04",
            whatWorked: "Hosted a workshop.",
            whatBlocked: "Exams.",
            whatNeeded: "Better Discord tools.",
          }),
        );
      });

      it("returns 409 Already submitted when doc already exists for this month", async () => {
        (verifyAuth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ uid: "u1" });
        subdocGet.mockResolvedValue({
          exists: true,
          data: () => ({ cohortId: "cohort-3", timezone: "UTC" }),
        });
        txnGet.mockResolvedValue({ exists: true });
        const res = await POST(makeRequest(validBody) as never);
        expect(res.status).toBe(409);
        expect(txnSet).not.toHaveBeenCalled();
      });
    });
    ```
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx vitest run src/app/api/ambassador/report/route.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/api/ambassador/report/route.ts` exists and exports `POST`
    - `grep -E "isAmbassadorProgramEnabled|verifyAuth|hasRoleClaim" src/app/api/ambassador/report/route.ts` returns at least 3 matches
    - `grep -E "MONTHLY_REPORTS_COLLECTION|getCurrentMonthKey" src/app/api/ambassador/report/route.ts` returns at least 2 matches
    - `grep -E "runTransaction|__ALREADY_SUBMITTED__|Already submitted" src/app/api/ambassador/report/route.ts` confirms transaction-guarded write
    - `grep -E "\\$\\{ctx\\.uid\\}_\\$\\{month\\}|\\$\\{.*\\.uid\\}_\\$\\{" src/app/api/ambassador/report/route.ts` confirms deterministic doc id template
    - Request body is NEVER trusted for `ambassadorId` — `grep "body.*ambassadorId\\|data\\.ambassadorId" src/app/api/ambassador/report/route.ts` returns 0 matches
    - `src/app/api/ambassador/report/route.test.ts` exists with at least 3 `it(` cases
    - `npx vitest run src/app/api/ambassador/report/route.test.ts` exits 0
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    POST /api/ambassador/report is live. Submits are keyed on deterministic `{uid}_{YYYY-MM}` where the month is resolved in the ambassador's local timezone. Second submit in the same month returns 409. Vitest proves all three branches (400 invalid / 201 first-submit / 409 already-submitted).
  </done>
</task>

<task type="auto">
  <name>Task 2: Create src/app/api/ambassador/report/current/route.ts — GET current-month status (REPORT-03)</name>
  <files>src/app/api/ambassador/report/current/route.ts</files>
  <read_first>
    - src/app/api/ambassador/report/route.ts (Task 1 — same auth gates, same month-key derivation)
    - src/lib/ambassador/reportDeadline.ts (getCurrentMonthKey + getDeadlineUTC — Plan 01 Task 4)
    - src/types/ambassador.ts (MonthlyReportDoc shape, MONTHLY_REPORTS_COLLECTION)
    - .planning/phases/04-activity-subsystem/04-RESEARCH.md §Open Question 3 (badge renders on /ambassadors/report in Phase 4)
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Copywriting — Monthly Report (status badge labels)
  </read_first>
  <behavior>
    - Feature flag off → 404
    - Unauthenticated request → 401
    - Non-ambassador user → 403
    - Ambassador with no submission for current month → 200 with `{ submitted: false, month: "YYYY-MM", deadlineIso: "<ISO>" }`
    - Ambassador with a submission for current month → 200 with `{ submitted: true, month: "YYYY-MM", deadlineIso: "<ISO>", report: MonthlyReportDoc }`
    - Timestamps in returned `report` are normalized to ISO strings (no raw Firestore Timestamp objects leak to client)
    - Month key is resolved in ambassador's `timezone` (defaults to "UTC")
    - Ambassador can only read their OWN month status — `ambassadorId` in the returned report equals `ctx.uid`
  </behavior>
  <action>
    Create `src/app/api/ambassador/report/current/route.ts`:

    ```typescript
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
      const deadlineIso = getDeadlineUTC(Number(yearStr), Number(monthStr), timezone).toISOString();

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
    ```
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -cE "MONTHLY_REPORTS_COLLECTION|getCurrentMonthKey|getDeadlineUTC" src/app/api/ambassador/report/current/route.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/api/ambassador/report/current/route.ts` exists and exports `GET`
    - File contains the canonical 3-gate pattern (`isAmbassadorProgramEnabled`, `verifyAuth`, `hasRoleClaim`)
    - File resolves month key via `getCurrentMonthKey(timezone)` with UTC fallback
    - File uses deterministic doc id `${ctx.uid}_${month}`
    - File normalizes `submittedAt` via `toDate().toISOString()` — client never receives raw Firestore Timestamp
    - File includes the defensive `data.ambassadorId !== ctx.uid` guard
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    GET /api/ambassador/report/current returns the ambassador's current-month submission state and deadline. Consumed by ReportStatusBadge in Task 5.
  </done>
</task>

<task type="auto">
  <name>Task 3: Create src/app/api/ambassador/members/[uid]/strike/route.ts — admin strike increment (REPORT-06)</name>
  <files>src/app/api/ambassador/members/[uid]/strike/route.ts</files>
  <read_first>
    - src/lib/ambassador/adminAuth.ts (requireAdmin shape)
    - src/app/api/ambassador/applications/[applicationId]/route.ts (admin PATCH pattern — gate order, FieldValue import)
    - src/types/ambassador.ts (AmbassadorSubdoc with strikes: number)
    - .planning/phases/04-activity-subsystem/04-CONTEXT.md §Decisions D-05, D-06 (strike panel + human-in-the-loop)
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Copywriting — Admin Member Management (Strike increment CTA labels)
  </read_first>
  <behavior>
    - Feature flag off → 404
    - Admin token missing / invalid → 403 via `requireAdmin()`
    - Target uid has no ambassador subdoc → 404 `{"error": "Ambassador not found"}`
    - Target uid is a valid ambassador → 200 with `{ strikes: number, uid: string }` reflecting the post-increment count
    - Subdoc write uses `FieldValue.increment(1)` on `strikes` field and `updatedAt: FieldValue.serverTimestamp()` — NO other fields touched, roles untouched
    - Endpoint does NOT create any `ambassador_cron_flags` or audit doc (Phase 4 scope; Phase 5 will add audit)
    - Endpoint does NOT auto-offboard at 2 strikes (Phase 5 responsibility per CONTEXT D-05)
  </behavior>
  <action>
    Create `src/app/api/ambassador/members/[uid]/strike/route.ts`:

    ```typescript
    /**
     * Phase 4 (REPORT-06): Admin-only strike increment for an ambassador.
     *   POST /api/ambassador/members/[uid]/strike
     *
     * Atomic: uses FieldValue.increment(1). Returns the post-increment count.
     * Does NOT touch roles, Discord state, or any audit collection — Phase 5 will
     * add offboarding + audit trail per CONTEXT D-05.
     *
     * Gate order:
     *   1. isAmbassadorProgramEnabled()
     *   2. requireAdmin(request)
     *   3. Verify target subdoc exists
     *   4. Atomic increment on `strikes`
     */
    import { NextRequest, NextResponse } from "next/server";
    import { FieldValue } from "firebase-admin/firestore";
    import { db } from "@/lib/firebaseAdmin";
    import { isAmbassadorProgramEnabled } from "@/lib/features";
    import { requireAdmin } from "@/lib/ambassador/adminAuth";

    export async function POST(
      request: NextRequest,
      { params }: { params: { uid: string } | Promise<{ uid: string }> },
    ) {
      if (!isAmbassadorProgramEnabled()) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const admin = await requireAdmin(request);
      if (!admin.ok) {
        return NextResponse.json({ error: admin.error }, { status: admin.status });
      }

      // Next 15+: params may be a Promise — await defensively
      const { uid } = await Promise.resolve(params);
      if (!uid || typeof uid !== "string") {
        return NextResponse.json({ error: "Invalid uid" }, { status: 400 });
      }

      const subdocRef = db
        .collection("mentorship_profiles")
        .doc(uid)
        .collection("ambassador")
        .doc("v1");

      // Transaction: read, verify exists, increment. Re-reads the fresh count to return.
      const result = await db.runTransaction(async (txn) => {
        const snap = await txn.get(subdocRef);
        if (!snap.exists) {
          return { ok: false as const, error: "Ambassador not found", status: 404 };
        }
        const current = snap.data() ?? {};
        const next = typeof current.strikes === "number" ? current.strikes + 1 : 1;
        txn.update(subdocRef, {
          strikes: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { ok: true as const, strikes: next };
      });

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }

      return NextResponse.json(
        { uid, strikes: result.strikes },
        { status: 200 },
      );
    }
    ```
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -E "requireAdmin|FieldValue\\.increment\\(1\\)|runTransaction" src/app/api/ambassador/members/[uid]/strike/route.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/api/ambassador/members/[uid]/strike/route.ts` exists and exports `POST`
    - `grep requireAdmin src/app/api/ambassador/members/\\[uid\\]/strike/route.ts` returns a match (admin-gated)
    - `grep "FieldValue.increment(1)" src/app/api/ambassador/members/\\[uid\\]/strike/route.ts` returns a match
    - File does NOT mention `roles` or `discord` or `assignDiscordRole` (no side effects beyond strike count)
    - File does NOT write to `ambassador_cron_flags` or any audit collection
    - File does NOT contain `offboard` or `setActive(false)` or `endedAt` mutations
    - File returns `{ uid, strikes }` with the post-increment count
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    Admin can atomically increment an ambassador's strike count from the admin panel. Endpoint is side-effect-free beyond the counter increment — Phase 5 will add offboarding at 2 strikes.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Create src/app/ambassadors/report/MonthlyReportForm.tsx — client form (REPORT-01, REPORT-03)</name>
  <files>src/app/ambassadors/report/MonthlyReportForm.tsx</files>
  <read_first>
    - src/app/profile/AmbassadorPublicCardSection.tsx (canonical DaisyUI form card: label + textarea + disabled-during-submit button)
    - src/lib/apiClient.ts (authFetch signature)
    - src/components/ToastContext (useToast hook — .success / .error)
    - src/types/ambassador.ts (MonthlyReportSchema for client-side pre-validation hint)
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Copywriting — Monthly Report (exact copy strings — MUST match verbatim)
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Visual Hierarchy Notes §/ambassadors/report (form is focal point)
  </read_first>
  <behavior>
    - Renders page heading "Monthly Self-Report" as `<h1 className="text-2xl font-bold">`
    - Renders subheading "Share what you worked on this month — it takes 3–5 minutes." as `<p className="text-base-content/70">`
    - On mount, calls `GET /api/ambassador/report/current` to determine initial state
    - If `submitted: true`, shows the already-submitted notice "You've submitted your report for {Month YYYY}. Thank you!" with `{Month YYYY}` formatted from `month` string (e.g. "April 2026")
    - If `submitted: false`, shows 3 textareas (labels + placeholders from UI-SPEC verbatim), character counter per field (X/2000), and a "Submit report" primary button
    - On submit, calls `POST /api/ambassador/report` via authFetch with `{ whatWorked, whatBlocked, whatNeeded }`
    - On 201: shows success toast "Report submitted — thank you for showing up this month." and transitions to the already-submitted view
    - On 409: shows error toast "You've already submitted your report for this month."
    - On other errors: shows inline `alert alert-error` with "Could not submit your report. Check your connection and try again."
    - Submit button shows `loading loading-spinner loading-sm` and is `disabled` while the request is in flight
    - Each textarea uses `<label htmlFor={id}>` + matching `<textarea id={id}>` for accessibility
  </behavior>
  <action>
    Create `src/app/ambassadors/report/MonthlyReportForm.tsx`:

    ```tsx
    "use client";

    /**
     * Phase 4 (REPORT-01): MonthlyReportForm — 3-field self-report + server-driven already-submitted state.
     *
     * UI copy strings are sourced verbatim from .planning/phases/04-activity-subsystem/04-UI-SPEC.md
     * §Copywriting — Monthly Report. DO NOT edit copy without updating the UI-SPEC.
     *
     * Visual hierarchy (UI-SPEC §Visual Hierarchy Notes):
     *   - Focal point on /ambassadors/report
     *   - Status badge renders alongside page heading (separate component, Task 5)
     *   - EventList is subordinate — renders below
     */
    import { useEffect, useState } from "react";
    import { authFetch } from "@/lib/apiClient";
    import { useToast } from "@/components/ToastContext";

    type CurrentResponse =
      | { submitted: false; month: string; deadlineIso: string }
      | {
          submitted: true;
          month: string;
          deadlineIso: string;
          report: {
            whatWorked: string;
            whatBlocked: string;
            whatNeeded: string;
            submittedAt: string;
          };
        };

    const MAX_CHARS = 2000;

    function formatMonthHuman(monthKey: string): string {
      // "2026-04" -> "April 2026"
      const [yearStr, monthStr] = monthKey.split("-");
      const y = Number(yearStr);
      const m = Number(monthStr);
      if (!Number.isFinite(y) || !Number.isFinite(m)) return monthKey;
      const date = new Date(Date.UTC(y, m - 1, 1));
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    }

    export function MonthlyReportForm() {
      const toast = useToast();
      const [loading, setLoading] = useState(true);
      const [current, setCurrent] = useState<CurrentResponse | null>(null);
      const [whatWorked, setWhatWorked] = useState("");
      const [whatBlocked, setWhatBlocked] = useState("");
      const [whatNeeded, setWhatNeeded] = useState("");
      const [submitting, setSubmitting] = useState(false);
      const [error, setError] = useState<string | null>(null);

      useEffect(() => {
        let cancelled = false;
        (async () => {
          setLoading(true);
          try {
            const res = await authFetch("/api/ambassador/report/current");
            if (!res.ok) throw new Error("Failed to load current status");
            const json = (await res.json()) as CurrentResponse;
            if (!cancelled) setCurrent(json);
          } catch (err) {
            if (!cancelled) setError("Could not load your report status. Refresh to retry.");
          } finally {
            if (!cancelled) setLoading(false);
          }
        })();
        return () => {
          cancelled = true;
        };
      }, []);

      async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (submitting) return;
        setError(null);
        setSubmitting(true);
        try {
          const res = await authFetch("/api/ambassador/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              whatWorked: whatWorked.trim(),
              whatBlocked: whatBlocked.trim(),
              whatNeeded: whatNeeded.trim(),
            }),
          });
          if (res.status === 201) {
            const json = (await res.json()) as { reportId: string; month: string };
            toast.success("Report submitted — thank you for showing up this month.");
            setCurrent({
              submitted: true,
              month: json.month,
              deadlineIso: current?.deadlineIso ?? "",
              report: {
                whatWorked: whatWorked.trim(),
                whatBlocked: whatBlocked.trim(),
                whatNeeded: whatNeeded.trim(),
                submittedAt: new Date().toISOString(),
              },
            });
            return;
          }
          if (res.status === 409) {
            toast.error("You've already submitted your report for this month.");
            return;
          }
          setError("Could not submit your report. Check your connection and try again.");
        } catch (err) {
          setError("Could not submit your report. Check your connection and try again.");
        } finally {
          setSubmitting(false);
        }
      }

      if (loading) {
        return (
          <section className="py-12 text-center">
            <span className="loading loading-spinner loading-md" aria-label="Loading report status" />
          </section>
        );
      }

      return (
        <section className="card bg-base-100 shadow-xl">
          <div className="card-body gap-6">
            <header className="space-y-1">
              <h1 className="text-2xl font-bold">Monthly Self-Report</h1>
              <p className="text-base-content/70">
                Share what you worked on this month — it takes 3–5 minutes.
              </p>
            </header>

            {current?.submitted ? (
              <div className="alert alert-success">
                <span>
                  You&apos;ve submitted your report for {formatMonthHuman(current.month)}. Thank you!
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div role="alert" className="alert alert-error">
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-control">
                  <label htmlFor="whatWorked" className="label">
                    <span className="label-text font-bold">What worked this month?</span>
                    <span className="label-text-alt">
                      {whatWorked.length}/{MAX_CHARS}
                    </span>
                  </label>
                  <textarea
                    id="whatWorked"
                    className="textarea textarea-bordered min-h-[96px]"
                    maxLength={MAX_CHARS}
                    placeholder="Share wins, events you hosted, referrals you made, or community moments that felt good."
                    value={whatWorked}
                    onChange={(e) => setWhatWorked(e.target.value)}
                    required
                  />
                </div>

                <div className="form-control">
                  <label htmlFor="whatBlocked" className="label">
                    <span className="label-text font-bold">What blocked you?</span>
                    <span className="label-text-alt">
                      {whatBlocked.length}/{MAX_CHARS}
                    </span>
                  </label>
                  <textarea
                    id="whatBlocked"
                    className="textarea textarea-bordered min-h-[96px]"
                    maxLength={MAX_CHARS}
                    placeholder="Anything that made it harder to show up — life, time, resources. We want to know."
                    value={whatBlocked}
                    onChange={(e) => setWhatBlocked(e.target.value)}
                    required
                  />
                </div>

                <div className="form-control">
                  <label htmlFor="whatNeeded" className="label">
                    <span className="label-text font-bold">What do you need from us?</span>
                    <span className="label-text-alt">
                      {whatNeeded.length}/{MAX_CHARS}
                    </span>
                  </label>
                  <textarea
                    id="whatNeeded"
                    className="textarea textarea-bordered min-h-[96px]"
                    maxLength={MAX_CHARS}
                    placeholder="Support, resources, introductions, visibility — just ask."
                    value={whatNeeded}
                    onChange={(e) => setWhatNeeded(e.target.value)}
                    required
                  />
                </div>

                <div className="card-actions justify-end">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting || whatWorked.trim().length === 0 || whatBlocked.trim().length === 0 || whatNeeded.trim().length === 0}
                  >
                    {submitting && <span className="loading loading-spinner loading-sm" />}
                    Submit report
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      );
    }
    ```
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -E "Monthly Self-Report|Submit report|Report submitted — thank you|What worked this month|What blocked you|What do you need from us" src/app/ambassadors/report/MonthlyReportForm.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/ambassadors/report/MonthlyReportForm.tsx` exists and starts with `"use client";`
    - File exports `MonthlyReportForm` function component
    - Page heading copy "Monthly Self-Report" present verbatim
    - Subheading copy "Share what you worked on this month — it takes 3–5 minutes." present verbatim (em-dash `—` not hyphen `-`)
    - All 3 field labels ("What worked this month?", "What blocked you?", "What do you need from us?") present verbatim
    - All 3 placeholders present verbatim (from UI-SPEC)
    - Success toast copy "Report submitted — thank you for showing up this month." present verbatim
    - Already-submitted notice template "You&apos;ve submitted your report for" present (the `{Month YYYY}` token is interpolated)
    - Error state copy "Could not submit your report. Check your connection and try again." present verbatim
    - Submit button contains `loading loading-spinner loading-sm` and `disabled` attribute during submit
    - Each textarea has matching `<label htmlFor>` / `<textarea id>` pairing
    - Uses `authFetch` for both the GET current call and the POST submit call
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    MonthlyReportForm renders server-driven state: either "already submitted" or the 3-field form. Consumes REPORT-01 / REPORT-03 APIs. Copy matches UI-SPEC verbatim for gsd-ui-checker.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 5: Create src/app/ambassadors/report/ReportStatusBadge.tsx — status badge (REPORT-03)</name>
  <files>src/app/ambassadors/report/ReportStatusBadge.tsx</files>
  <read_first>
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Copywriting — Monthly Report (badge labels "Submitted" / "On time" / "Overdue")
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Color (badge-success / badge-warning / badge-info reserved roles)
    - .planning/phases/04-activity-subsystem/04-RESEARCH.md §Open Question 3 (badge renders on /ambassadors/report in Phase 4)
    - src/app/api/ambassador/report/current/route.ts (Task 2 — response shape)
  </read_first>
  <behavior>
    - Given `submitted: true`, renders `badge badge-success` with text "Submitted"
    - Given `submitted: false` AND `Date.now() <= deadlineIso`, renders `badge badge-info` with text "On time"
    - Given `submitted: false` AND `Date.now() > deadlineIso`, renders `badge badge-warning` with text "Overdue"
    - Component is a pure client component — receives `current: CurrentResponse | null` prop, renders a `<span>` with appropriate DaisyUI badge classes
    - When `current === null` (loading), renders nothing (`null`) — the parent shows a loading spinner
    - No raw hex colors — only DaisyUI semantic tokens
  </behavior>
  <action>
    Create `src/app/ambassadors/report/ReportStatusBadge.tsx`:

    ```tsx
    "use client";

    /**
     * Phase 4 (REPORT-03): Report status badge.
     * Copy strings from UI-SPEC §Copywriting — Monthly Report.
     * Color usage from UI-SPEC §Color (semantic tokens only).
     */

    export type ReportCurrent =
      | { submitted: false; month: string; deadlineIso: string }
      | {
          submitted: true;
          month: string;
          deadlineIso: string;
          report: { submittedAt: string; whatWorked: string; whatBlocked: string; whatNeeded: string };
        };

    export function ReportStatusBadge({ current }: { current: ReportCurrent | null }) {
      if (!current) return null;

      if (current.submitted) {
        return (
          <span
            className="badge badge-success font-bold"
            role="status"
            aria-label="Report submitted for this month"
          >
            Submitted
          </span>
        );
      }

      const deadlineMs = Date.parse(current.deadlineIso);
      const isOverdue = Number.isFinite(deadlineMs) && Date.now() > deadlineMs;

      if (isOverdue) {
        return (
          <span
            className="badge badge-warning font-bold"
            role="status"
            aria-label="Report overdue"
          >
            Overdue
          </span>
        );
      }

      return (
        <span
          className="badge badge-info font-bold"
          role="status"
          aria-label="Report on time"
        >
          On time
        </span>
      );
    }
    ```
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -E "badge badge-success|badge badge-info|badge badge-warning|Submitted|On time|Overdue" src/app/ambassadors/report/ReportStatusBadge.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/ambassadors/report/ReportStatusBadge.tsx` exists and starts with `"use client";`
    - File exports `ReportStatusBadge` named export
    - All three states have a `role="status"` ARIA attribute
    - `badge-success` appears for the "Submitted" state
    - `badge-info` appears for the "On time" state
    - `badge-warning` appears for the "Overdue" state
    - No raw hex values (`#`) appear in className strings
    - `grep -E "#[0-9a-fA-F]{3,6}" src/app/ambassadors/report/ReportStatusBadge.tsx` returns 0 matches
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    ReportStatusBadge is ready to be rendered inline beside the Monthly Self-Report page heading in Plan 05 page-shell assembly. Handles all 3 UI-SPEC states with DaisyUI semantic tokens only.
  </done>
</task>

<task type="auto">
  <name>Task 6: Update firestore.rules — deny client access to monthly_reports + ambassador_cron_flags</name>
  <files>firestore.rules</files>
  <read_first>
    - firestore.rules (see existing deny-by-default patterns for Phase 2/3 collections)
    - .planning/phases/04-activity-subsystem/04-CONTEXT.md §Decisions D-06 (cron-flag collection is admin-review only)
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §26 (firestore.rules delta)
  </read_first>
  <behavior>
    - Client-SDK reads of `monthly_reports/{reportId}` return Permission Denied
    - Client-SDK writes of `monthly_reports/{reportId}` return Permission Denied
    - Client-SDK reads of `ambassador_cron_flags/{flagId}` return Permission Denied
    - Client-SDK writes of `ambassador_cron_flags/{flagId}` return Permission Denied
    - Admin SDK access is unaffected (rules are ignored for the Admin SDK)
  </behavior>
  <action>
    In `firestore.rules`, add (before the final `allow read, write: if false;` catch-all if present; otherwise append inside the `service cloud.firestore` → `match /databases/{database}/documents` block). The rules mirror the referrals/referral_codes denial pattern added in Plan 02.

    ```javascript
    // Phase 4 (REPORT-02, REPORT-06): Monthly self-reports are written ONLY via the
    // Admin SDK from /api/ambassador/report. Deny all client-SDK access.
    match /monthly_reports/{reportId} {
      allow read, write: if false;
    }

    // Phase 4 (REPORT-04, DISC-04, D-06): Cron-generated review flags. Written ONLY by
    // server-side cron scripts. Admin reads/updates via Admin SDK endpoints. Deny client.
    match /ambassador_cron_flags/{flagId} {
      allow read, write: if false;
    }
    ```

    If Plan 02 has already added the `referrals` / `referral_codes` rules, these blocks sit alongside them. Order within the `documents` block is irrelevant for match rules.
  </action>
  <verify>
    <automated>grep -E "match /monthly_reports/\\{reportId\\}|match /ambassador_cron_flags/\\{flagId\\}" firestore.rules</automated>
  </verify>
  <acceptance_criteria>
    - `firestore.rules` contains `match /monthly_reports/{reportId}` block
    - `firestore.rules` contains `match /ambassador_cron_flags/{flagId}` block
    - Both blocks contain `allow read, write: if false;`
    - `grep -c "allow read, write: if false" firestore.rules` increased by at least 2 vs pre-Plan-04 state
    - No syntax regression: `firestore.rules` parses (manual smoke: `firebase emulators:exec --only firestore "echo ok"` succeeds)
  </acceptance_criteria>
  <done>
    Client-SDK reads/writes to both monthly_reports and ambassador_cron_flags are denied. Only the Admin SDK (via API routes + cron scripts) can read/write. Combined with Plan 02's referrals/referral_codes rules, all 4 new Phase 4 collections are fully locked down at the client boundary.
  </done>
</task>

</tasks>

<verification>
Phase-level checks after all 6 tasks complete:

1. **Type check passes:** `npx tsc --noEmit` exits 0.
2. **Unit tests pass:** `npx vitest run src/app/api/ambassador/report/route.test.ts --reporter=verbose` exits 0 with all 3+ cases green.
3. **Deterministic doc id enforced:** The monthly_reports write path uses `${uid}_${month}` template literal (grep confirms). No `db.collection(MONTHLY_REPORTS_COLLECTION).add(` call — `.doc(id).set(` only.
4. **No client ambassadorId trust:** `grep -E "body\\.ambassadorId|data\\.ambassadorId" src/app/api/ambassador/report/route.ts` returns 0 matches. Report ownership is derived ONLY from `ctx.uid`.
5. **Admin-only strike:** `grep requireAdmin src/app/api/ambassador/members/\\[uid\\]/strike/route.ts` returns a match. No alternative gate (no `verifyAuth` fallback) exists in this file.
6. **Strike side-effect scope:** The strike route file contains `FieldValue.increment(1)` and `updatedAt` ONLY as mutations — no `roles`, no `discord`, no `endedAt`, no `active: false`, no writes to other collections.
7. **UI copy verbatim:** Grep in MonthlyReportForm.tsx for all 7 UI-SPEC-mandated strings (page heading, subheading, 3 field labels, submit CTA, success toast) — all 7 must match.
8. **Firestore rules denial:** Both `match /monthly_reports/` and `match /ambassador_cron_flags/` blocks contain `allow read, write: if false`.
9. **No new runtime dependencies:** `git diff package.json` shows no new dependencies added.
10. **Feature-flag compliance:** Every route file calls `isAmbassadorProgramEnabled()` as its first gate — `grep -L "isAmbassadorProgramEnabled" src/app/api/ambassador/report/route.ts src/app/api/ambassador/report/current/route.ts src/app/api/ambassador/members/[uid]/strike/route.ts` returns zero files (all three include it).
</verification>

<success_criteria>
- POST `/api/ambassador/report` accepts valid MonthlyReportSchema bodies from ambassadors, writes exactly one doc at deterministic id `{uid}_{YYYY-MM}` (timezone-aware), and returns 409 for same-month re-submission (REPORT-01, REPORT-02).
- GET `/api/ambassador/report/current` returns `{ submitted, month, deadlineIso, report? }` for the authed ambassador's current month (REPORT-03).
- POST `/api/ambassador/members/[uid]/strike` is admin-only, atomically increments the target ambassador's `strikes` field, and touches nothing else (REPORT-06; Phase-4-scope of REPORT-07).
- MonthlyReportForm and ReportStatusBadge render UI-SPEC copy verbatim and drive the server endpoints via `authFetch`.
- Firestore rules deny all client-SDK access to `monthly_reports` and `ambassador_cron_flags`.
- Vitest suite for the report endpoint passes, proving deterministic doc id + race-safe one-per-month enforcement.
- No new runtime dependencies introduced; `npx tsc --noEmit` exits 0.
</success_criteria>

<output>
After completion, create `.planning/phases/04-activity-subsystem/04-04-SUMMARY.md` documenting:
- The 3 API routes (report POST, report/current GET, members/[uid]/strike POST) with their gate order and status codes
- The 2 client components (MonthlyReportForm, ReportStatusBadge) and where they'll be rendered (Plan 05)
- Deterministic-doc-id pattern for report uniqueness + vitest evidence
- Firestore rules updates
- The strike endpoint's intentional side-effect scope (REPORT-07 offboarding deferred to Phase 5)
</output>
