---
phase: 05-dashboard-leaderboard-offboarding-alumni
plan: "04"
subsystem: offboarding-alumni
tags:
  - ambassador
  - offboarding
  - alumni
  - firestore-batch
  - discord
  - email
dependency_graph:
  requires:
    - "05-01"  # discord.ts removeDiscordRole, email.ts sendAmbassadorOffboardingEmail, adminAuth.ts, acceptance.ts
  provides:
    - "POST /api/ambassador/members/[uid]/offboard"
    - "POST /api/ambassador/members/[uid]/alumni"
  affects:
    - "public_ambassadors collection"
    - "mentorship_profiles/{uid}/ambassador/v1 subdoc"
    - "mentorship_profiles/{uid}.roles array"
tech_stack:
  added: []
  patterns:
    - "Atomic Firestore batch with soft post-commit side effects"
    - "Pitfall 1: two sequential batch.update calls for arrayUnion + arrayRemove on same field"
    - "ALUMNI-02 invariant: offboard path never adds alumni-ambassador role"
    - "ALUMNI-03: alumni path updates public_ambassadors.active:false (does not delete)"
key_files:
  created:
    - src/app/api/ambassador/members/[uid]/offboard/route.ts
    - src/app/api/ambassador/members/[uid]/offboard/route.test.ts
    - src/app/api/ambassador/members/[uid]/alumni/route.ts
    - src/app/api/ambassador/members/[uid]/alumni/route.test.ts
  modified: []
decisions:
  - "ALUMNI-02: offboard and alumni are distinct endpoints with distinct Firestore mutations — offboard deletes public projection, alumni flips it to active:false"
  - "Pitfall 1 mitigation: arrayUnion('alumni-ambassador') and arrayRemove('ambassador') placed in two separate batch.update(profileRef) calls in alumni route"
  - "AMBASSADOR_COHORTS_COLLECTION imported from @/lib/ambassador/constants (not @/types/ambassador) — matches existing codebase pattern"
  - "Soft steps (Discord removal, offboarding email) wrapped in individual try/catch; failure sets flag to false but never throws"
  - "syncAmbassadorClaim is always non-fatal (try/catch) in both routes"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-06"
  tasks_completed: 2
  files_changed: 4
---

# Phase 05 Plan 04: Offboarding and Alumni Transition Routes Summary

Two admin-triggered lifecycle-exit endpoints: atomic 2-strike offboard (DISC-05 + EMAIL-04 + ALUMNI-02 negative invariant) and atomic term-completion alumni transition (ALUMNI-01 + ALUMNI-03), each with TDD coverage.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Offboard route tests | a7bb278 | offboard/route.test.ts |
| 1 (GREEN) | Offboard route implementation | 64d1196 | offboard/route.ts |
| 2 (RED) | Alumni route tests | efd1bb9 | alumni/route.test.ts |
| 2 (GREEN) | Alumni route implementation | f0c1186 | alumni/route.ts |
| Refactor | Comment cleanup for grep accuracy | 0673e9a | offboard/route.ts, alumni/route.ts |

## What Was Built

### POST /api/ambassador/members/[uid]/offboard (DISC-05, EMAIL-04, ALUMNI-02)

- Admin gate (`requireAdmin`) + feature flag guard
- 409 if `subdoc.active === false` (replay protection — T-05-04-02)
- Atomic Firestore batch: `roles arrayRemove("ambassador")` + subdoc `{active:false, endedAt, offboardedAt}` + `public_ambassadors/{uid}` delete
- Soft step 1: `removeDiscordRole(discordMemberId, DISCORD_AMBASSADOR_ROLE_ID)` — failure → `discordRemoved:false`, no throw
- Soft step 2: `sendAmbassadorOffboardingEmail(email, displayName, cohort.name)` — failure → `emailSent:false`, no throw
- Soft step 3: `syncAmbassadorClaim(uid)` — non-fatal
- Response: `{ success: true, discordRemoved: boolean, emailSent: boolean }`
- ALUMNI-02 invariant: no `arrayUnion("alumni-ambassador")` anywhere in this route

### POST /api/ambassador/members/[uid]/alumni (ALUMNI-01, ALUMNI-03)

- Admin gate + feature flag guard
- 409 if `subdoc.active === false` (double-transition prevention)
- Atomic Firestore batch with Pitfall 1 mitigation:
  1. `batch.update(profileRef, { roles: FieldValue.arrayUnion("alumni-ambassador") })`
  2. `batch.update(profileRef, { roles: FieldValue.arrayRemove("ambassador") })`
  3. `batch.update(subdocRef, { active: false, endedAt: serverTimestamp(), updatedAt: serverTimestamp() })` — no `offboardedAt`
  4. `batch.update(public_ambassadors/{uid}, { active: false })` — NOT delete (ALUMNI-03)
- `syncAmbassadorClaim(uid)` post-commit, non-fatal
- Response: `{ success: true }`

## Test Coverage

### Offboard (5 cases)
- ALUMNI-02: `arrayUnion("alumni-ambassador")` is never called
- DISC-05: returns `discordRemoved:true` on Discord success
- DISC-05 soft-fail: returns 200 when Discord removal returns false
- EMAIL-04 soft-fail: returns 200 when email send fails
- Pitfall 3: `public_ambassadors` doc is deleted in the batch

### Alumni (5 cases)
- ALUMNI-01: `arrayUnion("alumni-ambassador")` committed
- ALUMNI-01: `arrayRemove("ambassador")` committed
- Pitfall 1: union and remove are in separate `batch.update` calls (total 4 update calls)
- ALUMNI-03: `public_ambassadors` is updated (`active:false`), NOT deleted
- 409 returned when `subdoc.active` is already false

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong import path for AMBASSADOR_COHORTS_COLLECTION**

- **Found during:** Task 1 implementation
- **Issue:** Plan template imported `AMBASSADOR_COHORTS_COLLECTION` from `@/types/ambassador`, but it is not exported from that module. It lives in `@/lib/ambassador/constants`.
- **Fix:** Changed import to `import { AMBASSADOR_COHORTS_COLLECTION } from "@/lib/ambassador/constants"` in offboard/route.ts.
- **Files modified:** src/app/api/ambassador/members/[uid]/offboard/route.ts
- **Commit:** 64d1196

**2. [Rule 1 - Bug] Comment text triggered grep false-positive in acceptance criteria**

- **Found during:** Post-task acceptance checks
- **Issue:** Comment `// ALUMNI-02 invariant: NO arrayUnion("alumni-ambassador") here.` matched the grep pattern checking that no `arrayUnion("alumni-ambassador")` call exists. Similarly, `// Note: NO offboardedAt (ALUMNI-02 boundary)` matched the `offboardedAt` check in alumni route.
- **Fix:** Reworded both comments to avoid the literal strings that trigger the grep patterns.
- **Files modified:** offboard/route.ts, alumni/route.ts
- **Commit:** 0673e9a

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (offboard) | a7bb278 | PASS — tests failed with "Cannot find module" |
| GREEN (offboard) | 64d1196 | PASS — 5 tests pass |
| RED (alumni) | efd1bb9 | PASS — tests failed with "Cannot find module" |
| GREEN (alumni) | f0c1186 | PASS — 5 tests pass |

## Threat Surface Scan

No new network endpoints beyond what the plan defines. Both routes sit behind `requireAdmin` (T-05-04-03 mitigated). All STRIDE threats from the plan's threat model are addressed:
- T-05-04-01: uid path validation (400 on empty, 404 on missing subdoc)
- T-05-04-02: 409 on `subdoc.active === false`
- T-05-04-03: `requireAdmin` gate at handler entry
- T-05-04-05: two sequential `batch.update` calls (Pitfall 1)
- T-05-04-08: both public_ambassadors and subdoc written in same atomic batch
- T-05-04-09: `arrayUnion` alumni FIRST, then `arrayRemove` ambassador

## Self-Check: PASSED

All files exist, all commits found. 10/10 tests pass (5 offboard + 5 alumni).
