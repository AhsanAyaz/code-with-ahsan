---
phase: 02-application-subsystem
plan: "06"
subsystem: api
tags: [firestore-transaction, discord, email, admin-api, ambassador]

# Dependency graph
requires:
  - phase: 02-application-subsystem/02-01
    provides: ApplicationDoc, CohortDoc types + ApplicationReviewSchema
  - phase: 02-application-subsystem/02-03
    provides: sendAmbassadorApplicationAcceptedEmail, sendAmbassadorApplicationDeclinedEmail
  - phase: 02-application-subsystem/02-04
    provides: requireAdmin (discriminated union with uid for APPLY-08)
  - phase: 02-application-subsystem/02-05
    provides: AMBASSADOR_APPLICATIONS_COLLECTION, ADMIN_SIGNED_URL_EXPIRY_MS constants
  - phase: 01-foundation-roles-array-migration/01-06
    provides: syncRoleClaim for Firebase Auth custom claims sync
provides:
  - "runAcceptanceTransaction (src/lib/ambassador/acceptance.ts) — race-safe COHORT-04 Firestore transaction"
  - "assignAmbassadorDiscordRoleSoft — Discord role assignment that never rolls back Firestore (D-17)"
  - "syncAmbassadorClaim — post-transaction custom claims sync"
  - "GET /api/ambassador/applications/[applicationId] — admin detail + signed student-ID URL"
  - "PATCH /api/ambassador/applications/[applicationId] — accept (transaction) or decline (simple update)"
  - "POST /api/ambassador/applications/[applicationId]/discord-resolve — Discord retry with fresh handle resolution"
affects:
  - 02-07-apply-wizard-ui
  - 02-08-admin-review-ui
  - 02-09-cleanup-cron-preflight

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-stage commit: Firestore transaction first (runAcceptanceTransaction), Discord second (assignAmbassadorDiscordRoleSoft) — D-17"
    - "TDD with vi.mock for firebase-admin/firestore FieldValue and db.runTransaction"
    - "Discriminated union returns from route handlers (result.ok guards all usage)"

key-files:
  created:
    - src/lib/ambassador/acceptance.ts
    - src/app/api/ambassador/applications/[applicationId]/route.ts
    - src/app/api/ambassador/applications/[applicationId]/discord-resolve/route.ts
    - src/__tests__/ambassador/acceptance.test.ts
  modified: []

key-decisions:
  - "FieldValue imported from firebase-admin/firestore directly (not re-exported by @/lib/firebaseAdmin) — matches applications.ts precedent"
  - "sendAmbassadorApplicationAcceptedEmail requires 4th param discordInviteUrl — plan interface was simplified; used hardcoded discord.codewithahsan.dev fallback"
  - "syncAmbassadorClaim reads profile post-transaction to get merged roles before syncing claims — avoids passing roles through multiple layers"
  - "discord-resolve returns HTTP 200 even on soft failures (resolved/success payload fields carry outcome) — matches REVIEW-05 retry banner requirements"
  - "declinedAt timestamp written on decline path for Plan 09 cleanup cron clock (REVIEW-04)"

patterns-established:
  - "All ambassador admin routes: isAmbassadorProgramEnabled() → requireAdmin() → business logic (Pitfall 3 order)"
  - "Non-fatal side effects (email, discord, claims sync): try/catch + logger.error, never abort the HTTP response"
  - "Two-stage commit: transaction commits first, discord soft-assign runs after, retry endpoint re-resolves freshly (Pitfall 2)"

requirements-completed:
  - COHORT-04
  - REVIEW-03
  - REVIEW-05
  - DISC-02
  - DISC-03
  - EMAIL-02
  - EMAIL-03
  - APPLY-08

# Metrics
duration: 15min
completed: "2026-04-22"
---

# Phase 02 Plan 06: Accept/Decline API Summary

**Race-safe ambassador acceptance via Firestore transaction with two-stage Discord assignment, idempotent re-accept, and admin retry endpoint for stale Discord handles**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-22T13:24:00Z
- **Completed:** 2026-04-22T13:30:00Z
- **Tasks:** 3 (TDD for Task 1)
- **Files created:** 4

## Accomplishments

- `runAcceptanceTransaction` uses `db.runTransaction()` (not batches) for atomic COHORT-04 maxSize enforcement — race-safe acceptance with no over-enrollment risk
- Acceptance is idempotent: re-accepting returns 200 with `alreadyAccepted: true`, skips count increment, ambassador subdoc, and EMAIL-02 resend (DISC-03)
- Discord failure never rolls back Firestore (D-17): `assignAmbassadorDiscordRoleSoft` persists `discordRetryNeeded: true` and swallows all errors including network throws
- `/discord-resolve` always re-resolves the handle freshly via `lookupMemberByUsername` (Pitfall 2: stored memberId may be stale from a username change)
- `reviewedBy = admin.uid` on every accept/decline decision (APPLY-08 admin attribution via Plan 04's discriminated-union requireAdmin)

## Two-Stage Commit Shape (for Plan 08 admin UI reference)

```
PATCH /api/ambassador/applications/[id] { action: "accept" }
  1. runAcceptanceTransaction(applicationId, adminUid, notes)
     → Firestore transaction: application.status="accepted", profile.roles arrayUnion "ambassador",
       ambassador subdoc created, cohort.acceptedCount incremented
     → Returns: { ok, applicantUid, applicantEmail, applicantName, cohortId, cohortName, discordHandle, discordMemberId }
  2. syncAmbassadorClaim(applicantUid) — non-fatal
  3. assignAmbassadorDiscordRoleSoft(applicationId, memberId) — non-fatal, persists discordRoleAssigned/discordRetryNeeded
  4. sendAmbassadorApplicationAcceptedEmail(...) — non-fatal
  → Response: { success, status:"accepted", alreadyAccepted, discordAssigned, discordReason }

POST /api/ambassador/applications/[id]/discord-resolve
  1. lookupMemberByUsername(app.discordHandle) — fresh resolution (NOT cached)
  2. ref.update({ discordMemberId: fresh.id, discordHandleResolved: true/false })
  3. assignAmbassadorDiscordRoleSoft(applicationId, fresh.id) — updates discordRoleAssigned/discordRetryNeeded
  → Response: { success, resolved, discordMemberId?, reason? }
```

**Exports from `src/lib/ambassador/acceptance.ts` for Plan 08:**
- `runAcceptanceTransaction(applicationId, adminUid, notes)` → `AcceptanceResult`
- `assignAmbassadorDiscordRoleSoft(applicationId, discordIdOrHandle)` → `DiscordAssignmentResult`
- `syncAmbassadorClaim(uid)` → `void` (non-fatal, reads profile then syncs Auth claims)
- `type AcceptanceResult` — discriminated union `{ ok: true; alreadyAccepted?; applicantUid; ... } | { ok: false; error: "..." }`
- `type DiscordAssignmentResult` — `{ ok: true } | { ok: false; reason: "missing_member_id" | "discord_api_failure" }`

## COHORT-04 Race-Safety Confirmation

`runAcceptanceTransaction` uses `db.runTransaction()`. Inside the callback:
1. Reads `applications/{id}` — returns `application_not_found` or `already_declined` early
2. Reads `cohorts/{targetCohortId}` — returns `cohort_not_found` early
3. Reads `mentorship_profiles/{applicantUid}` for roles
4. Checks `cohort.acceptedCount >= cohort.maxSize` → returns `cohort_full` (409) with NO writes
5. Writes: application status, profile roles (arrayUnion), ambassador subdoc, cohort increment

If two concurrent accept requests race, Firestore's optimistic locking retries the losing transaction — the count check in step 4 sees the updated count and returns `cohort_full`. No over-enrollment possible.

## APPLY-08 Admin Attribution Confirmation

`admin.uid` from Plan 04's `requireAdmin()` (synthesised as `admin:{token.slice(0,12)}`) is written as `reviewedBy` on the application doc in both the accept transaction update and the decline path update. Every decision carries admin identity.

## Task Commits

1. **Task 1 RED: Failing tests** — `16f33eb` (test)
2. **Task 1 GREEN: acceptance.ts implementation** — `c911b53` (feat)
3. **Task 2: GET detail + PATCH accept/decline route** — `310f7ec` (feat)
4. **Task 3: POST discord-resolve retry endpoint** — `bf565fc` (feat)

## Files Created

- `src/lib/ambassador/acceptance.ts` — shared transaction helper + Discord soft-assign + claims sync
- `src/app/api/ambassador/applications/[applicationId]/route.ts` — GET detail + PATCH accept/decline
- `src/app/api/ambassador/applications/[applicationId]/discord-resolve/route.ts` — POST Discord retry
- `src/__tests__/ambassador/acceptance.test.ts` — 10 unit tests (all passing)

## Decisions Made

- **FieldValue source:** Imported from `firebase-admin/firestore` directly (not `@/lib/firebaseAdmin` which does not re-export it). Matches `applications.ts` precedent.
- **Email accepted signature:** The actual `sendAmbassadorApplicationAcceptedEmail` requires a 4th `discordInviteUrl` param (plan interface was simplified). Used `https://codewithahsan.dev/discord` as the fallback.
- **Email declined signature:** `sendAmbassadorApplicationDeclinedEmail` requires `cohortName` as 3rd param. Added a Firestore read in the decline path to fetch cohort name for the email.
- **discord-resolve HTTP 200:** Returns 200 even on soft failures (resolved:false) so the admin UI can render specific messages without treating resolution failure as an HTTP error.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FieldValue not exported from @/lib/firebaseAdmin**
- **Found during:** Task 1 (GREEN phase, TypeScript check)
- **Issue:** `@/lib/firebaseAdmin` only exports `db`, `auth`, and `storage`. Plan's interface spec showed `FieldValue` as an export — it doesn't exist there.
- **Fix:** Changed `acceptance.ts` to `import { FieldValue } from "firebase-admin/firestore"` (same pattern as `applications.ts`). Updated test mock to mock `firebase-admin/firestore` instead.
- **Files modified:** `src/lib/ambassador/acceptance.ts`, `src/__tests__/ambassador/acceptance.test.ts`
- **Verification:** `tsc --noEmit` clean on all source files; 10 tests still pass
- **Committed in:** `310f7ec` (Task 2 commit)

**2. [Rule 2 - Missing] Email functions required more params than plan interface showed**
- **Found during:** Task 2 (reading actual email.ts signatures)
- **Issue:** `sendAmbassadorApplicationAcceptedEmail` requires `discordInviteUrl` (4th param); `sendAmbassadorApplicationDeclinedEmail` requires `cohortName` (3rd param). Plan's interface omitted these.
- **Fix:** Added `DISCORD_AMBASSADORS_INVITE` constant for accepted email. Added Firestore cohort fetch in decline path to get cohort name.
- **Files modified:** `src/app/api/ambassador/applications/[applicationId]/route.ts`
- **Committed in:** `310f7ec`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both auto-fixes required for TypeScript correctness and email correctness. No scope creep.

## Issues Encountered

None — all issues auto-fixed per deviation rules.

## Next Phase Readiness

- Plan 07 (apply-wizard-ui) can call `POST /api/ambassador/applications` (Plan 05) and `GET /api/ambassador/applications/me`
- Plan 08 (admin-review-ui) can call all three endpoints from this plan; the `discordRetryNeeded` flag drives the retry banner (REVIEW-05)
- Plan 09 (cleanup-cron-preflight) can read `declinedAt` timestamp from decline path for 30-day cleanup cron
- `DISCORD_AMBASSADOR_ROLE_ID` remains `"PENDING_DISCORD_ROLE_CREATION"` — Plan 09 checkpoint replaces it before first acceptance in production

---
*Phase: 02-application-subsystem*
*Completed: 2026-04-22*
