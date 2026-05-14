---
phase: 04-activity-subsystem
reviewed: 2026-04-23T00:00:00Z
depth: standard
files_reviewed: 45
files_reviewed_list:
  - .github/workflows/ambassador-activity-checks.yml
  - firestore.rules
  - scripts/ambassador-discord-reconciliation.ts
  - scripts/ambassador-report-flag.ts
  - src/app/admin/ambassadors/cohorts/[cohortId]/events/EventAdminTable.tsx
  - src/app/admin/ambassadors/cohorts/[cohortId]/events/page.tsx
  - src/app/admin/ambassadors/members/[uid]/ActivitySummaryPanel.tsx
  - src/app/admin/ambassadors/members/[uid]/CronFlagsPanel.tsx
  - src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx
  - src/app/admin/ambassadors/members/[uid]/page.tsx
  - src/app/admin/ambassadors/members/[uid]/StrikeConfirmModal.tsx
  - src/app/admin/ambassadors/members/[uid]/StrikePanel.tsx
  - src/app/admin/ambassadors/members/MembersList.tsx
  - src/app/admin/ambassadors/members/page.tsx
  - src/app/ambassadors/report/EventList.tsx
  - src/app/ambassadors/report/LogEventForm.tsx
  - src/app/ambassadors/report/MonthlyReportForm.tsx
  - src/app/ambassadors/report/page.tsx
  - src/app/ambassadors/report/ReportPageClient.tsx
  - src/app/ambassadors/report/ReportStatusBadge.tsx
  - src/app/api/ambassador/events/[eventId]/route.test.ts
  - src/app/api/ambassador/events/[eventId]/route.ts
  - src/app/api/ambassador/events/admin/route.ts
  - src/app/api/ambassador/events/route.ts
  - src/app/api/ambassador/members/[uid]/route.ts
  - src/app/api/ambassador/members/[uid]/strike/route.ts
  - src/app/api/ambassador/members/route.ts
  - src/app/api/ambassador/report/current/route.ts
  - src/app/api/ambassador/report/route.test.ts
  - src/app/api/ambassador/report/route.ts
  - src/app/api/mentorship/profile/route.ts
  - src/app/profile/AmbassadorPublicCardSection.tsx
  - src/lib/ambassador/acceptance.ts
  - src/lib/ambassador/constants.ts
  - src/lib/ambassador/eventTypes.test.ts
  - src/lib/ambassador/eventTypes.ts
  - src/lib/ambassador/referral.test.ts
  - src/lib/ambassador/referral.ts
  - src/lib/ambassador/referralCode.test.ts
  - src/lib/ambassador/referralCode.ts
  - src/lib/ambassador/reportDeadline.test.ts
  - src/lib/ambassador/reportDeadline.ts
  - src/middleware.test.ts
  - src/middleware.ts
  - src/types/ambassador.ts
findings:
  critical: 1
  warning: 6
  info: 5
  total: 12
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-04-23T00:00:00Z
**Depth:** standard
**Files Reviewed:** 45
**Status:** issues_found

## Summary

This phase implements the Activity Subsystem for the Student Ambassador Program: referral attribution, event logging, monthly self-reports, admin member management, strike recording, and two cron scripts (missing-report flagger, Discord-role reconciliation). The overall architecture is sound — server-side gate ordering is consistent, the D-06 invariant (cron never mutates strikes/roles) is honoured throughout, Firestore transaction semantics are correct, and the Admin SDK is used server-side everywhere with client-side rules locked down to `if false` for new collections. Test coverage is present for all library code and the two most critical API routes.

One critical issue was found: the `ambassador-report-flag.ts` cron script flags an ambassador for a missing previous-month report without first verifying that the previous-month deadline has actually passed. An ambassador in a timezone behind UTC can be falsely flagged on the first day of the new month, before their local deadline has elapsed. Six warnings address missing cancellation tokens on async effects, an optimistic state update that can desync from the server, an unbounded N+1 Firestore query on the admin members list, a missing `updatedAt` field on the `AmbassadorSubdoc` type, the missing `referralConsumed` assignment when `refCode` is absent, and a false-positive risk in the 30-day edit-window client guard. Five info items cover dead-code, duplicate ADMIN_TOKEN_KEY hardcoding, missing `confirm()` replacement guidance, a copy-paste type duplication, and inconsistent double-fetch of the report status endpoint.

---

## Critical Issues

### CR-01: Cron flags ambassador for missing report before their deadline has passed

**File:** `scripts/ambassador-report-flag.ts:164-169`

**Issue:** `getAmbassadorMonthKey(timezone)` returns the *previous* calendar month in the ambassador's local timezone. The script then writes a `missing_report` flag whenever no report doc exists for that month — unconditionally, without checking whether the deadline for that month has already elapsed. For ambassadors in timezones that are behind UTC (e.g., `America/Los_Angeles`, `America/New_York`), when the cron runs at 08:00 UTC on the first day of a new month, those ambassadors are still inside their previous month's deadline window locally (e.g., it is still Apr 30 in LA). The script will write a `missing_report` flag for a period the ambassador still has time to submit for.

```ts
// Current (buggy): flags without checking deadline
const prevMonthKey = getAmbassadorMonthKey(amb.timezone);
const hasReport = await hasReportForMonth(amb.uid, prevMonthKey);
if (!hasReport) {
  await writeFlag(amb.uid, prevMonthKey);
```

**Fix:** Guard the flag-write by checking that the deadline for the previous month has already passed:

```ts
const prevMonthKey = getAmbassadorMonthKey(amb.timezone);
const hasReport = await hasReportForMonth(amb.uid, prevMonthKey);
if (!hasReport) {
  // Only flag once the deadline has passed in the ambassador's timezone
  const [yearStr, monthStr] = prevMonthKey.split("-");
  const deadlineMs = getDeadlineUTC(Number(yearStr), Number(monthStr), amb.timezone);
  if (Date.now() > deadlineMs) {
    await writeFlag(amb.uid, prevMonthKey);
    flagsWritten++;
    // ...
  }
}
```

---

## Warnings

### WR-01: Missing cleanup cancellation on async effect in ReportPageClient (and MonthlyReportForm fetches the same endpoint)

**File:** `src/app/ambassadors/report/ReportPageClient.tsx:14-29` and `src/app/ambassadors/report/MonthlyReportForm.tsx:54-73`

**Issue:** `ReportPageClient` fetches `/api/ambassador/report/current` and correctly guards with `cancelled`. However, `MonthlyReportForm` fetches the same endpoint independently in its own `useEffect`, also with a `cancelled` guard — so the endpoint is called twice on every page load. If the component unmounts mid-flight in `MonthlyReportForm`, the `setLoading(false)` branch in `finally` runs *after* `cancelled = true`, but `setLoading` is called unconditionally in the finally block:

```ts
finally {
  if (!cancelled) setLoading(false);  // ← correct guard
}
```

This specific guard is actually correct on line 70. The real issue is that the page redundantly fetches the same endpoint twice — once in `ReportPageClient` (stored in `current`) and once in `MonthlyReportForm` (stored in its own local state). The `current` prop fetched by `ReportPageClient` is passed to `ReportStatusBadge` but *not* forwarded to `MonthlyReportForm`, so `MonthlyReportForm` re-fetches independently.

**Fix:** Lift the fetch to `ReportPageClient` only, pass the result as a prop to `MonthlyReportForm`, and remove the duplicate `useEffect` from `MonthlyReportForm`. This halves the number of round-trips and keeps state in one place.

---

### WR-02: Optimistic state update in MonthlyReportForm can desync from server

**File:** `src/app/ambassadors/report/MonthlyReportForm.tsx:92-103`

**Issue:** On a successful 201 response, the form updates local state with the client-side form values rather than re-fetching the server's stored representation:

```ts
setCurrent({
  submitted: true,
  month: json.month,
  deadlineIso: current?.deadlineIso ?? "",  // ← may be stale if current is null
  report: {
    whatWorked: whatWorked.trim(),   // client copy, not server echo
    whatBlocked: whatBlocked.trim(),
    whatNeeded: whatNeeded.trim(),
    submittedAt: new Date().toISOString(), // client clock, not server timestamp
  },
});
```

If `current` is `null` at submission time (e.g., the initial GET failed silently), `deadlineIso` becomes `""`, causing `ReportStatusBadge` to render an incorrect "On time" badge indefinitely. The `submittedAt` timestamp also reflects client clock rather than `FieldValue.serverTimestamp()`.

**Fix:** After a 201 response, re-fetch `/api/ambassador/report/current` to hydrate from the server, or echo `submittedAt` from the server response. If `current` is null, either block submission or set a sensible fallback deadline.

---

### WR-03: N+1 Firestore query on GET /api/ambassador/members (unbounded)

**File:** `src/app/api/ambassador/members/route.ts:29-58`

**Issue:** For every active ambassador in the collection-group result, the handler makes two sequential Firestore reads (`mentorship_profiles/{uid}` + a count query on `ambassador_cron_flags`). With N active ambassadors this is 1 + 2N reads, all run inside `Promise.all` but still individually crossing the network. For a small cohort this is acceptable, but there is no limit on the collection-group query — a large program with hundreds of ambassadors will produce hundreds of parallel read RPCs and may hit Firestore concurrent-read limits or exceed the 10-second Edge/serverless function timeout.

**Fix:** Add a reasonable limit (e.g., `.limit(200)`) to the collection-group query, and document it:

```ts
const subdocsSnap = await db
  .collectionGroup("ambassador")
  .where("active", "==", true)
  .limit(200)   // guard against unbounded fan-out; paginate if needed
  .get();
```

For Phase 5, consider denormalizing `unresolvedFlagCount` onto a top-level admin summary doc to eliminate per-ambassador queries.

---

### WR-04: `AmbassadorSubdoc` type missing `updatedAt` field written by strike route

**File:** `src/types/ambassador.ts:152-176` and `src/app/api/ambassador/members/[uid]/strike/route.ts:53-57`

**Issue:** The strike route writes `updatedAt: FieldValue.serverTimestamp()` to the ambassador subdoc:

```ts
txn.update(subdocRef, {
  strikes: FieldValue.increment(1),
  updatedAt: FieldValue.serverTimestamp(),
});
```

But `AmbassadorSubdoc` (the typed interface for this document) does not declare an `updatedAt` field. Any downstream code that reads the subdoc and casts it to `AmbassadorSubdoc` will silently lose this field from the TypeScript type. This also means `normalizeTimestamps` in `GET /api/ambassador/members/[uid]/route.ts` won't convert `updatedAt` to an ISO string for the admin bundle.

**Fix:** Add `updatedAt?: Date` to `AmbassadorSubdoc`:

```ts
export interface AmbassadorSubdoc {
  // ... existing fields
  updatedAt?: Date;  // Written by strike route; not set at acceptance time
}
```

---

### WR-05: `referralConsumed` remains false when `refCode` is absent, but cookie delete only runs on true

**File:** `src/app/api/mentorship/profile/route.ts:158-191`

**Issue:** The code sets `referralConsumed = true` only inside the `if (refCode)` block. When `refCode` is absent, `referralConsumed` stays `false` and the `response.cookies.delete()` branch is skipped — this is correct intended behaviour. However, the variable `referralConsumed` is declared outside the block and initialised to `false`, making it look like it might be used as a general signal. The actual problem is subtler: if the cookie exists but `consumeReferral` returns `{ ok: false }` for any reason, `referralConsumed` is still set to `true`, causing the cookie to be cleared even for an `"error"` reason (e.g., Firestore is down). This means a transient Firestore failure permanently loses the referral cookie before attribution can succeed.

**Fix:** Only clear the cookie when attribution either succeeded or produced a definitive non-retriable outcome (i.e., `unknown_code`, `self_attribution`, `already_attributed`). Do not clear on `"error"`:

```ts
const result = await consumeReferral(uid, refCode);
// Only consume (clear) the cookie on non-retriable outcomes
const shouldClearCookie = result.ok || result.reason !== "error";
if (shouldClearCookie) {
  referralConsumed = true;
}
```

---

### WR-06: Client-side 30-day edit-window check uses event date from server response, not server clock

**File:** `src/app/ambassadors/report/EventList.tsx:52-54`

**Issue:** The `canEdit` function computes whether the edit button should be shown using `Date.now()` (client clock) minus the event date ISO string received from the server. If the client's clock is significantly wrong (skewed forward), events that the server would still allow editing appear as read-only. Conversely, a client clock skewed backward shows the button for events the server will reject with 409. This is a UX issue (button state disagrees with server) not a security issue (server enforces the window independently), but a user with a skewed clock would see confusing behaviour.

**Fix:** This is acceptable given the server-side enforcement, but documenting it as intentional is recommended. Alternatively, include a server-computed `editableUntil` ISO timestamp on each event in the GET response, and use that for the client check instead of `Date.now() - eventDate`.

---

## Info

### IN-01: Duplicate ADMIN_TOKEN_KEY hardcoded in EventAdminTable instead of importing from shared constant

**File:** `src/app/admin/ambassadors/cohorts/[cohortId]/events/EventAdminTable.tsx:10`

**Issue:** `const ADMIN_TOKEN_KEY = "cwa_admin_token"` is declared locally. All other admin components import `ADMIN_TOKEN_KEY` from `@/components/admin/AdminAuthGate`. If the key name changes, this file will be missed.

**Fix:** Remove the local declaration and import from the shared location:

```ts
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
```

---

### IN-02: `CurrentResponse` type is duplicated between MonthlyReportForm and ReportStatusBadge

**File:** `src/app/ambassadors/report/MonthlyReportForm.tsx:19-30` and `src/app/ambassadors/report/ReportStatusBadge.tsx:9-16`

**Issue:** `ReportStatusBadge` exports `ReportCurrent` and `MonthlyReportForm` defines a nearly-identical local `CurrentResponse` type. Both describe the same API response shape from `/api/ambassador/report/current`. If the API shape changes, both types must be updated in sync.

**Fix:** Remove `CurrentResponse` from `MonthlyReportForm.tsx` and import `ReportCurrent` from `ReportStatusBadge` (or extract both to a shared types location).

---

### IN-03: `form method="dialog"` on backdrop close button is invalid in a non-`<dialog>` element context

**File:** `src/app/admin/ambassadors/members/[uid]/StrikeConfirmModal.tsx:85-87`

**Issue:** The modal uses a DaisyUI `modal-backdrop` pattern with `<form method="dialog">`, but the outer `<dialog>` element uses `className="modal modal-open"` (a CSS-div approach, not a native HTML `<dialog>`). The `method="dialog"` attribute only has effect inside a native `<dialog>` element. The backdrop close works because an `onClick={onClose}` handler is present, but the form method is dead code that could confuse maintainers.

**Fix:** Replace with a plain `<div>` and rely solely on the `onClick` handler, or switch to a native `<dialog>` element.

---

### IN-04: `window.location.origin` access is not guarded against SSR in referral link input

**File:** `src/app/profile/AmbassadorPublicCardSection.tsx:395`

**Issue:** The referral share link is constructed as:
```ts
value={`${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${referralCode}`}
```
This guard is correct, but the component is `"use client"` so it will not be server-rendered. The guard is harmless but unnecessary; a `useEffect`-based `useState` initializing `origin` would be cleaner. This is minor but adds dead conditional logic.

**Fix:** Since this is a client component, simplify to:
```ts
value={`${window.location.origin}/?ref=${referralCode}`}
```

---

### IN-05: `ambassador-report-flag.ts` skips the DM reminder when the current-month report already exists, but doesn't distinguish "submitted early" from "submitted just now"

**File:** `scripts/ambassador-report-flag.ts:176-177`

**Issue:** The script checks `hasCurrReport` and skips the DM reminder if a report already exists for the current month. This is correct, but the check uses the same deterministic `hasReportForMonth` helper that reads by doc ID. If an ambassador submitted their report for the current month but the cron runs within the same UTC day they submitted, this is handled correctly. This is purely an informational note that the "submitted early → no reminder" behaviour is intentional and working as designed, but it is not captured in a code comment.

**Fix:** Add an inline comment explaining the skip-if-already-submitted logic to prevent future readers from thinking the check is accidental.

---

_Reviewed: 2026-04-23T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
