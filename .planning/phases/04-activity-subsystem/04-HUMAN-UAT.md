---
status: partial
phase: 04-activity-subsystem
source: [04-VERIFICATION.md]
started: 2026-04-23T19:36:52Z
updated: 2026-04-23T19:36:52Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Browser cookie behavior
expected: Navigating to `/?ref=TESTCODE` sets an HttpOnly `cwa_ref` cookie with 30-day expiry and SameSite=Lax; revisiting with a different `?ref=` parameter does NOT overwrite the existing cookie
result: [pending]

### 2. End-to-end referral conversion
expected: After cookie is set, signing up (profile POST) writes a `referrals/{uid}` doc with the correct `referralCode` and `referrerId`, and the `cwa_ref` cookie is cleared from the response
result: [pending]

### 3. Discord DM reminder delivery
expected: Running `ambassador-report-flag.ts` against a real guild with a missing-report ambassador sends a Discord DM via `sendDM()` without erroring; DM contains the expected message text
result: [pending]

### 4. Discord role reconciliation at runtime
expected: Running `ambassador-discord-reconciliation.ts` against live guild data writes `ambassador_cron_flags` docs only — no role mutations, no Firestore writes outside the flags collection (D-06 invariant)
result: [pending]

### 5. /ambassadors/report page visual composition and refreshKey propagation
expected: Page renders with MonthlyReportForm at top, ReportStatusBadge below it, followed by LogEventForm and EventList; submitting a report updates the badge state without a full page reload (refreshKey propagation)
result: [pending]

### 6. Admin member detail layout and StrikeConfirmModal flow
expected: `/admin/ambassadors/members/[uid]` shows ActivitySummaryPanel → StrikePanel → CronFlagsPanel in order; clicking "Add Strike" opens StrikeConfirmModal and submitting successfully calls the strike endpoint and increments the displayed count
result: [pending]

### 7. TimezoneSelect PATCH payload and Zod rejection
expected: Selecting a timezone in AmbassadorPublicCardSection and saving sends a PATCH request with `{ timezone: "Asia/Karachi" }` (valid IANA); submitting an invalid string (e.g. "Fake/Zone") is rejected by the server-side Zod refine with a 400 response
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
