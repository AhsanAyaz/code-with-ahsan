---
phase: 04-activity-subsystem
plan: "04"
subsystem: report-and-strike-api
tags: [monthly-report, strike, api-routes, firestore, tdd, ambassador, admin, client-components, timezone]
dependency_graph:
  requires:
    - 04-01-foundations-types-schemas (MonthlyReportSchema, MonthlyReportDoc, MONTHLY_REPORTS_COLLECTION, getCurrentMonthKey, getDeadlineUTC, AmbassadorSubdoc)
  provides:
    - src/app/api/ambassador/report/route.ts (POST monthly report — deterministic doc id + transaction-safe)
    - src/app/api/ambassador/report/route.test.ts (4 Vitest cases proving one-per-month enforcement)
    - src/app/api/ambassador/report/current/route.ts (GET current-month status REPORT-03)
    - src/app/api/ambassador/members/[uid]/strike/route.ts (admin POST strike increment REPORT-06)
    - src/app/ambassadors/report/MonthlyReportForm.tsx (client 3-field form + server-driven submitted state)
    - src/app/ambassadors/report/ReportStatusBadge.tsx (3-state badge: Submitted/On time/Overdue)
    - firestore.rules (deny-all client rules for monthly_reports + ambassador_cron_flags)
  affects:
    - Plan 05 (report page shell) — will compose MonthlyReportForm + ReportStatusBadge on /ambassadors/report/page.tsx
    - Phase 5 (leaderboard / offboarding) — reads strike count; Phase 5 adds 2-strike offboarding (D-05)
tech_stack:
  added: []
  patterns:
    - Deterministic Firestore doc id ({uid}_{YYYY-MM}) + runTransaction existence check for one-per-month race safety
    - vi.hoisted() + vi.fn<FunctionType>() single-generic for vitest 4.x (no TS2558)
    - FieldValue.increment(1) atomic counter — no read-modify-write races
    - toDate().toISOString() normalization — Firestore Timestamps never leak to client
    - Ambassador-local month key via getCurrentMonthKey(timezone) (date-fns-tz)
key_files:
  created:
    - src/app/api/ambassador/report/route.ts
    - src/app/api/ambassador/report/route.test.ts
    - src/app/api/ambassador/report/current/route.ts
    - src/app/api/ambassador/members/[uid]/strike/route.ts
    - src/app/ambassadors/report/MonthlyReportForm.tsx
    - src/app/ambassadors/report/ReportStatusBadge.tsx
  modified:
    - firestore.rules
decisions:
  - "Threw __ALREADY_SUBMITTED__ marker inside runTransaction and caught it outside — cleanest way to signal a 409 from a Firestore transaction callback without carrying a discriminated union through the txn result"
  - "getDeadlineUTC returns a number (ms epoch); wrapped in new Date(...).toISOString() in the GET route to produce the ISO string the client expects — avoids changing Plan 01's API"
  - "ReportStatusBadge is a pure prop-driven component (no data fetching) — MonthlyReportForm owns the fetch; badge receives the result as a prop in Plan 05 page composition"
  - "Strike endpoint reads current.strikes from the pre-increment snapshot for the response rather than re-reading post-increment — avoids a second read and the txn already guarantees atomicity"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-23"
  tasks_completed: 6
  files_changed: 7
  insertions: ~710
---

# Phase 4 Plan 04: Report and Strike API Summary

**One-liner:** Monthly self-report pipeline (POST with deterministic one-per-month doc id, GET current-month status) + admin-only atomic strike increment, two client components (MonthlyReportForm, ReportStatusBadge), and Firestore deny-all rules for monthly_reports and ambassador_cron_flags.

## What Was Built

### Task 1: POST /api/ambassador/report + 4 Vitest cases (REPORT-01, REPORT-02)

- Canonical gate order: `isAmbassadorProgramEnabled()` → `verifyAuth()` → `hasRoleClaim(ambassador)` → Zod → subdoc read → `db.runTransaction`
- Deterministic doc id: `${ctx.uid}_${getCurrentMonthKey(timezone)}` — ambassador-local month (D-04 timezone requirement)
- Transaction: reads existing doc inside txn; throws `__ALREADY_SUBMITTED__` marker on collision → outer catch returns 409
- Report body: `ambassadorId` is ALWAYS `ctx.uid` (never from request body), plus `cohortId`, `month`, trimmed fields, `FieldValue.serverTimestamp()`
- 4 unit tests: 400 invalid body / 201 first submit + txnSet assertion / 409 already submitted / 409 no cohort
- Commit: `92623ed`

### Task 2: GET /api/ambassador/report/current (REPORT-03)

- Same 3-gate pattern as POST; reads ambassador subdoc for timezone
- Returns `{ submitted: false, month, deadlineIso }` or `{ submitted: true, month, deadlineIso, report }` 
- `deadlineIso`: `getDeadlineUTC(year, month, timezone)` → `new Date(ms).toISOString()`
- `report.submittedAt` normalized via `toDate?.()?.toISOString()` — raw Firestore Timestamp never reaches client
- Defensive `data.ambassadorId !== ctx.uid` guard before returning report data
- Commit: `71b6bd0`

### Task 3: POST /api/ambassador/members/[uid]/strike (REPORT-06)

- Gate: `isAmbassadorProgramEnabled()` + `requireAdmin()` — admin-only, no ambassador bypass
- Transaction reads subdoc, verifies existence (404 if absent), computes `next = current.strikes + 1`, updates with `FieldValue.increment(1)` + `FieldValue.serverTimestamp()` on `updatedAt`
- Returns `{ uid, strikes }` with post-increment count
- Zero side effects beyond the counter: no roles writes, no discord, no `ambassador_cron_flags`, no `endedAt`, no offboarding (Phase 5 scope per D-05)
- Commit: `c38679d`

### Task 4: MonthlyReportForm client component (REPORT-01, REPORT-03)

- `"use client"` — loads current state from `GET /api/ambassador/report/current` on mount
- Server-driven: if `submitted: true`, shows already-submitted notice with human-formatted month ("April 2026")
- If `submitted: false`: 3 textareas (labels + placeholders verbatim from UI-SPEC) with per-field char counter (X/2000)
- Submit: `authFetch` POST → 201 success toast + optimistic state transition → 409 duplicate toast → other errors inline `alert-error`
- Button disabled during inflight and when any field is empty; shows `loading loading-spinner loading-sm` during submit
- Commit: `a731409`

### Task 5: ReportStatusBadge client component (REPORT-03)

- Pure prop component: `{ current: ReportCurrent | null }` — renders null on loading
- `submitted: true` → `badge badge-success` "Submitted"
- `submitted: false` + `Date.now() <= deadlineMs` → `badge badge-info` "On time"
- `submitted: false` + `Date.now() > deadlineMs` → `badge badge-warning` "Overdue"
- All states use `role="status"` ARIA attribute; DaisyUI semantic tokens only (no raw hex)
- Commit: `e21c208`

### Task 6: Firestore rules — deny client access (REPORT-02, D-06)

- Added `match /monthly_reports/{reportId} { allow read, write: if false; }`
- Added `match /ambassador_cron_flags/{flagId} { allow read, write: if false; }`
- Mirrors `referral_codes`, `referrals`, `ambassador_events` deny-all pattern from Plans 02–03
- Admin SDK in API routes bypasses rules; security enforced by server-side auth/role checks
- Commit: `ab5cc7f`

## API Endpoints Implemented

| Method | Path | Gate | Status Codes |
|--------|------|------|--------------|
| POST | /api/ambassador/report | feature flag + verifyAuth + hasRoleClaim(ambassador) + Zod | 201 / 400 / 401 / 403 / 404 / 409 |
| GET | /api/ambassador/report/current | feature flag + verifyAuth + hasRoleClaim(ambassador) | 200 / 401 / 403 / 404 |
| POST | /api/ambassador/members/[uid]/strike | feature flag + requireAdmin | 200 / 400 / 401 / 403 / 404 |

## Deterministic Doc ID Pattern

```
docId = `${ctx.uid}_${getCurrentMonthKey(timezone)}`
```

- `getCurrentMonthKey("Asia/Karachi")` at 01:30 UTC on 2026-05-01 → `"2026-04"` (still April in Karachi)
- A Karachi ambassador's April report: `"uid_2026-04"`
- Two concurrent POSTs: first txn writes doc; second txn reads existing doc, throws `__ALREADY_SUBMITTED__`, returns 409
- Vitest proves: `txnSet` called exactly once for the 201 case; `txnSet` NOT called for the 409 case

## UI-SPEC Copy Strings Verified Verbatim

| String | Location |
|--------|----------|
| "Monthly Self-Report" | MonthlyReportForm.tsx h1 |
| "Share what you worked on this month — it takes 3–5 minutes." | MonthlyReportForm.tsx p |
| "What worked this month?" | MonthlyReportForm.tsx label |
| "What blocked you?" | MonthlyReportForm.tsx label |
| "What do you need from us?" | MonthlyReportForm.tsx label |
| "Submit report" | MonthlyReportForm.tsx button |
| "Report submitted — thank you for showing up this month." | MonthlyReportForm.tsx toast |
| "Submitted" / "On time" / "Overdue" | ReportStatusBadge.tsx |

## Strike Endpoint — Phase 4 Scope Boundary

Per CONTEXT D-05, the strike increment (REPORT-06) is the ONLY Phase 4 responsibility:
- Phase 4: Atomically increment `strikes` field; return post-increment count
- Phase 5 (deferred): 2-strike check → offboarding flow (revoke role, archive Discord, set `active: false`)

The endpoint explicitly does NOT write to `roles`, `discord`, `ambassador_cron_flags`, or any audit collection.

## Test Results

| File | Tests | Pass |
|------|-------|------|
| `src/app/api/ambassador/report/route.test.ts` | 4 | 4 |
| Pre-existing regression (wave 1 + plans 02–03) | 253 | 253 |
| **Total** | **257** | **257** |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ToastContext import path correction**
- **Found during:** Task 4
- **Issue:** Plan referenced `@/components/ToastContext` but the codebase consistently uses `@/contexts/ToastContext` (confirmed in LogEventForm.tsx, EventList.tsx, ApplyWizard.tsx from Plans 03 and 02)
- **Fix:** Used `@/contexts/ToastContext` — the correct path
- **Files modified:** `src/app/ambassadors/report/MonthlyReportForm.tsx`
- **Commit:** `a731409`

**2. [Rule 1 - Bug] vi.fn() generic type syntax for vitest 4.x**
- **Found during:** Task 1 — TypeScript compile check
- **Issue:** Initial test scaffold used complex nested generic types (`typeof txnGet`) as callback parameter types in `vi.mock()` factory, causing TS2322 type assignment errors
- **Fix:** Simplified to `vi.fn<() => Promise<any>>()` single-function-type generics; used `_req`/`_ctx` parameter names to satisfy TypeScript in mock wrappers. Same pattern established in Plan 03.
- **Files modified:** `src/app/api/ambassador/report/route.test.ts`
- **Commit:** `92623ed`

## Known Stubs

None — all components are fully wired to their respective API routes. `MonthlyReportForm` and `ReportStatusBadge` are ready to be composed on `/ambassadors/report/page.tsx` in Plan 05 (page shell assembly). The badge receives its `current` prop from the form's state in Plan 05 composition.

## Threat Flags

No new network endpoints beyond the 3 planned. All endpoints are within planned scope. Threat model compliance verified:

- [x] **Authentication** — Both ambassador routes use `verifyAuth()` + `hasRoleClaim(ambassador)`. Strike route uses `requireAdmin()`.
- [x] **Authorization — report ownership** — `ambassadorId` in report doc is ALWAYS `ctx.uid`; request body has no `ambassadorId` field (grep verified 0 matches).
- [x] **Authorization — strike power** — `requireAdmin()` is the sole gate; no `verifyAuth` fallback.
- [x] **Data integrity — one-per-month** — deterministic doc id + `runTransaction` existence check; vitest proves second submit gets 409.
- [x] **Data integrity — timezone correctness** — `getCurrentMonthKey(timezone)` with UTC fallback; Plan 01 has 11 unit tests covering DST edge cases.
- [x] **Data integrity — strike bounds** — `FieldValue.increment(1)` is atomic; no reset or offboarding in Phase 4 scope.
- [x] **Firestore rules** — `monthly_reports/*` and `ambassador_cron_flags/*` both deny all client reads/writes.

## Self-Check: PASSED

- `src/app/api/ambassador/report/route.ts` — FOUND
- `src/app/api/ambassador/report/route.test.ts` — FOUND
- `src/app/api/ambassador/report/current/route.ts` — FOUND
- `src/app/api/ambassador/members/[uid]/strike/route.ts` — FOUND
- `src/app/ambassadors/report/MonthlyReportForm.tsx` — FOUND
- `src/app/ambassadors/report/ReportStatusBadge.tsx` — FOUND
- `firestore.rules` contains `match /monthly_reports/{reportId}` — FOUND
- `firestore.rules` contains `match /ambassador_cron_flags/{flagId}` — FOUND
- Task 1 commit `92623ed` — FOUND
- Task 2 commit `71b6bd0` — FOUND
- Task 3 commit `c38679d` — FOUND
- Task 4 commit `a731409` — FOUND
- Task 5 commit `e21c208` — FOUND
- Task 6 commit `ab5cc7f` — FOUND
- All 4 new tests pass (257 total passing)
- TypeScript compiles clean (only pre-existing SVG module errors in social-icons unrelated to this plan)
