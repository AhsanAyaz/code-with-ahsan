---
phase: 04-activity-subsystem
fixed_at: 2026-04-24T07:52:10Z
review_path: .planning/phases/04-activity-subsystem/04-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-04-24T07:52:10Z
**Source review:** .planning/phases/04-activity-subsystem/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (1 Critical, 6 Warning)
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: Cron flags ambassador for missing report before their deadline has passed

**Files modified:** `scripts/ambassador-report-flag.ts`
**Commit:** 3565072
**Applied fix:** Added a deadline guard inside the `if (!hasReport)` block. Before writing the flag, the script now calls `getDeadlineUTC(year, month, amb.timezone)` and compares against `nowMs`. Flags are only written when `nowMs > deadlineMs`, preventing false-positive flags for ambassadors in UTC-behind timezones on the first UTC day of a new month.

---

### WR-01: Missing cleanup cancellation on async effect / duplicate fetch in MonthlyReportForm

**Files modified:** `src/app/ambassadors/report/MonthlyReportForm.tsx`, `src/app/ambassadors/report/ReportPageClient.tsx`
**Commit:** e34b928
**Applied fix:** Lifted the `/api/ambassador/report/current` fetch entirely into `ReportPageClient`. `MonthlyReportForm` now accepts `current: ReportCurrent | null` and `onCurrentChange: (next: ReportCurrent) => void` as props, and its internal `useEffect` + duplicate fetch were removed. The page-level fetch runs once; the form renders a spinner when `current` is `null`. The local `CurrentResponse` type alias now points to the shared `ReportCurrent` from `ReportStatusBadge` (addressing IN-02 as a side-effect).

---

### WR-02: Optimistic state update in MonthlyReportForm can desync from server

**Files modified:** `src/app/ambassadors/report/MonthlyReportForm.tsx`
**Commit:** e34b928
**Applied fix:** After a 201 response the form now re-fetches `/api/ambassador/report/current` and calls `onCurrentChange(refreshed)` with the server's authoritative representation. The old optimistic `setCurrent({ submitted: true, ... })` block that used client-clock timestamps and potentially stale `deadlineIso` was removed.

---

### WR-03: N+1 Firestore query on GET /api/ambassador/members (unbounded)

**Files modified:** `src/app/api/ambassador/members/route.ts`
**Commit:** 19971e2
**Applied fix:** Added `.limit(200)` to the `collectionGroup("ambassador").where("active", "==", true)` query with an explanatory comment noting the 1+2N RPC fan-out and directing future pagination work.

---

### WR-04: `AmbassadorSubdoc` type missing `updatedAt` field written by strike route

**Files modified:** `src/types/ambassador.ts`
**Commit:** 258024f
**Applied fix:** Added `updatedAt?: Date` to the `AmbassadorSubdoc` interface with a JSDoc comment noting it is written by the strike route via `FieldValue.serverTimestamp()` and is absent at acceptance time.

---

### WR-05: `referralConsumed` remains true on transient Firestore error, losing cookie prematurely

**Files modified:** `src/app/api/mentorship/profile/route.ts`
**Commit:** 3b24d64
**Applied fix:** Replaced the unconditional `referralConsumed = true` with a conditional `if (result.ok || result.reason !== "error")`. Transient errors (`reason === "error"`) no longer clear the cookie, preserving the referral for retry on the user's next signup attempt. Definitive non-retriable outcomes (`unknown_code`, `self_attribution`, `already_attributed`, and `ok`) still clear the cookie as before.

---

### WR-06: Client-side 30-day edit-window check uses client clock

**Files modified:** `src/app/ambassadors/report/EventList.tsx`
**Commit:** c590160
**Applied fix:** Added an explanatory comment on `canEdit` documenting that the client-clock usage is intentional — the server enforces the window independently and rejects out-of-window requests with 409 — and noting the server-computed `editableUntil` field as a low-effort future improvement if clock skew becomes a support issue.

---

_Fixed: 2026-04-24T07:52:10Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
