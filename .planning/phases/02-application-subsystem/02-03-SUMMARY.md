---
phase: 02-application-subsystem
plan: "03"
subsystem: infra
tags: [firestore, firebase-storage, email, vitest, security-rules]

# Dependency graph
requires:
  - phase: 01-foundation-roles-array-migration
    provides: "roles array migration, Firestore rules helpers (isSignedIn/isAdmin/isOwner/isAcceptedMentor), src/lib/email.ts sendEmail + wrapEmailHtml helpers"
provides:
  - "Firestore security rules for applications/ and cohorts/ collections (APPLY-06, COHORT-01)"
  - "Storage rules for student-ID upload path applications/{applicantUid}/{applicationId}/{fileName} (D-14)"
  - "Three named email exports: sendAmbassadorApplicationSubmittedEmail, sendAmbassadorApplicationAcceptedEmail, sendAmbassadorApplicationDeclinedEmail (EMAIL-01/02/03)"
  - "Wave 0 test stubs: src/__tests__/ambassador/signedUrl.test.ts + emails.test.ts (Nyquist contract for REVIEW-02, EMAIL-01/02/03)"
affects: [02-05-applications-submit-api, 02-06-accept-decline-api, 02-07-apply-wizard-ui, 02-08-admin-review-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Firestore applicant-read-own pattern: resource.data.applicantUid == request.auth.uid"
    - "Storage default-deny with per-path overrides and MIME enforcement"
    - "Ambassador email functions reuse sendEmail + wrapEmailHtml; no new infrastructure"
    - "Wave 0 describe.skip stubs for Nyquist contract; Wave 2 owners flip to describe"

key-files:
  created:
    - storage.rules (updated with applications path)
    - src/__tests__/ambassador/signedUrl.test.ts
    - src/__tests__/ambassador/emails.test.ts
  modified:
    - firestore.rules
    - src/lib/email.ts

key-decisions:
  - "storage.rules already existed with default-deny catch-all; applications path block inserted before catch-all, comments removed"
  - "getSiteUrlForAmbassadorEmails() added as private helper mirroring getSiteUrl() pattern — not exported, avoids naming collision"
  - "Wave 0 stubs use describe.skip (not it.todo at top-level) so vitest reports 2 skipped files, not 2 failing"
  - "No imports from @/lib/email in stub files — deferred to Wave 2 to avoid typecheck failures before Plan 05 commits"

patterns-established:
  - "Applicant-read-own: resource.data.applicantUid == request.auth.uid (Firestore rules pattern for ambassador collections)"
  - "Storage MIME enforcement: contentType.matches('image/.*') + 10MB cap at rules level"
  - "Non-blocking email calls: all sendAmbassador* return Promise<boolean>; failures logged but don't roll back DB writes"
  - "Wave 0 Nyquist stub contract: test files scaffold before Wave 2 so context/import cost is paid once"

requirements-completed: [APPLY-06, EMAIL-01, EMAIL-02, EMAIL-03, REVIEW-02]

# Metrics
duration: 12min
completed: 2026-04-22
---

# Phase 2 Plan 03: Firestore Rules, Storage Rules, and Email Templates Summary

**Firestore applicant-read-own rules + storage MIME-enforced student-ID path + three ambassador email functions + Wave 0 Nyquist test stubs**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-22T13:00:00Z
- **Completed:** 2026-04-22T13:12:00Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments

- Firestore rules extended with `applications/` (APPLY-06: applicant-read-own, admin-write-all, client-deny-update/delete) and `cohorts/` (COHORT-01: signed-in-read, admin-write) blocks — all Phase 1 rules preserved
- Storage rules updated: `applications/{applicantUid}/{applicationId}/{fileName}` path with applicant-only write (uid match + 10MB cap + image MIME guard), admin-only read, default-deny catch-all intact
- Three ambassador email exports added to `src/lib/email.ts` following the existing `sendEmail` + `wrapEmailHtml` pattern (no new email infrastructure)
- Wave 0 Nyquist test stubs created at `src/__tests__/ambassador/signedUrl.test.ts` and `emails.test.ts` — both files execute cleanly (0 assertions, 13 todo, 2 skipped files)

## Task Commits

1. **Task 1: Update firestore.rules** - `a5b00f6` (feat)
2. **Task 2: Update storage.rules** - `aecb284` (feat)
3. **Task 3: Add ambassador email functions** - `04b3b23` (feat)
4. **Task 4: Wave 0 test stubs** - `ea883e2` (test)

## Files Created/Modified

- `firestore.rules` - Added applications/ and cohorts/ match blocks (lines ~188-220)
- `storage.rules` - Added ambassador student-ID path rule before default-deny catch-all
- `src/lib/email.ts` - Appended getSiteUrlForAmbassadorEmails() + three sendAmbassador* exports (lines 585-693)
- `src/__tests__/ambassador/signedUrl.test.ts` - Wave 0 stub for REVIEW-02 (4 it.todo)
- `src/__tests__/ambassador/emails.test.ts` - Wave 0 stubs for EMAIL-01/02/03 (3 describe.skip blocks, 9 it.todo)

## Decisions Made

- `storage.rules` already existed with a default-deny catch-all and boilerplate comments. The applications path block was inserted before the catch-all, and the stale Firestore comment at the top was replaced with the new content per plan instructions.
- `getSiteUrlForAmbassadorEmails()` added as a private function (not exported) mirroring `getSiteUrl()` already at the top of email.ts — avoids naming collision and keeps the ambassador block self-contained.
- Wave 0 stubs do NOT import from `@/lib/email` — those imports are deferred to Wave 2 (Plans 05/06) so typecheck passes before those modules exist.
- `describe.skip` chosen over top-level `it.todo` so vitest reports "2 skipped" (not "2 failing"), which is the intended green state for Wave 0.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors in `src/components/social-icons/index.tsx` (SVG type declarations) — these existed before this plan, are out of scope, and were not fixed. `npx tsc --noEmit` reports zero new errors from this plan's changes.

## User Setup Required

None for this plan. However:

**Deploy note for Phase 2 go-live:** `firestore.rules` and `storage.rules` must be deployed before any ambassador API routes go live:
```bash
firebase deploy --only firestore:rules,storage
```
This can be done after all Wave 1 plans (02-01, 02-02, 02-03) are merged.

## Note for Plan 05/06 Owners (Wave 2)

To activate the test stubs:

1. **`src/__tests__/ambassador/signedUrl.test.ts`**: Replace `describe.skip(` with `describe(` and replace `it.todo(...)` with real assertions. Import `ADMIN_SIGNED_URL_EXPIRY_MS` from `@/lib/ambassador/constants` and the signed-URL generation helper from the GET detail route.

2. **`src/__tests__/ambassador/emails.test.ts`**: Replace `describe.skip(` with `describe(`. Add `vi.mock('@/lib/email')` at top. Fill in the three describe blocks with assertions using the three `sendAmbassador*` exports.

## Next Phase Readiness

- Plans 02-04, 02-05, 02-06 can now import `sendAmbassadorApplicationSubmittedEmail`, `sendAmbassadorApplicationAcceptedEmail`, `sendAmbassadorApplicationDeclinedEmail` from `@/lib/email`
- Plan 02-07 (apply wizard) can rely on `cohorts/` read being open to signed-in users
- Plan 02-05 (submit API) can write to `applications/` via Admin SDK (bypasses client rules) and call EMAIL-01
- Plan 02-06 (accept/decline API) can update `applications/` via Admin SDK and call EMAIL-02/03
- Wave 0 Nyquist contract satisfied — VALIDATION.md rows 4 and 5 are green

---
*Phase: 02-application-subsystem*
*Completed: 2026-04-22*
