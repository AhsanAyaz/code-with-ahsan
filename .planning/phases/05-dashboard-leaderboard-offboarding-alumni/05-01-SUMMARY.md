---
phase: 05-dashboard-leaderboard-offboarding-alumni
plan: "01"
subsystem: ambassador-foundation
tags:
  - constants
  - types
  - discord
  - email
  - leaderboard
dependency_graph:
  requires: []
  provides:
    - LEADERBOARD_SNAPSHOTS_COLLECTION constant
    - LEADERBOARD_GRACE_PERIOD_MS constant
    - AmbassadorSubdoc.onboarding field
    - AmbassadorSubdoc.offboardedAt field
    - AmbassadorOfTheMonth interface
    - CohortDoc.ambassadorOfTheMonth field
    - CohortPatchSchema.ambassadorOfTheMonth field
    - removeDiscordRole (discord.ts)
    - sendAmbassadorOffboardingEmail (email.ts)
    - LeaderboardEntry / LeaderboardSnapshot / LeaderboardWindow / LeaderboardCategoryRanks interfaces
    - buildLeaderboardSnapshot stub (leaderboard.ts)
  affects:
    - src/app/api/ambassador/members/[uid]/offboard/route.ts (Plan 04 consumer)
    - scripts/ambassador-leaderboard-snapshot.ts (Plan 02 consumer)
    - src/app/api/ambassador/dashboard/leaderboard/route.ts (Plan 03 consumer)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN/REFACTOR for constants and schema changes
    - Idempotent Discord role removal (204 + 404 = success, Pitfall 5)
    - Additive-only type extension (all new fields optional — no breaking change)
key_files:
  created:
    - src/lib/ambassador/leaderboard.ts
    - src/lib/discord.test.ts
    - src/lib/ambassador/constants.phase5.test.ts
  modified:
    - src/lib/ambassador/constants.ts
    - src/types/ambassador.ts
    - src/lib/discord.ts
    - src/lib/email.ts
decisions:
  - "buildLeaderboardSnapshot is a stub (throws) — full implementation in Plan 02 Wave 2; locked here so Plans 03/04 can compile against the interface"
  - "AmbassadorOfTheMonth extracted as named interface for reuse across CohortDoc and CohortPatchSchema"
  - "removeDiscordRole treats username-not-found (lookup returns null) as success — member is absent from guild, desired post-condition achieved"
  - "onboarding.loggedFirstEvent and onboarding.uploadedVideo intentionally NOT stored — derived at API time from event count and cohortPresentationVideoUrl per Pitfall 6"
metrics:
  duration_minutes: 4
  completed_date: "2026-05-06"
  tasks_completed: 2
  files_changed: 7
---

# Phase 05 Plan 01: Foundation Types, Constants, and Helpers Summary

**One-liner:** Wave-1 type contracts enabling parallel execution of Plans 02–04 — leaderboard collection constant, extended ambassador/cohort types, idempotent Discord role removal (DISC-05), and offboarding email (EMAIL-04).

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add LEADERBOARD_SNAPSHOTS_COLLECTION + extend types (DASH-07/08/09) | 3e0a473 | constants.ts, ambassador.ts, constants.phase5.test.ts |
| 2 | Add removeDiscordRole + sendAmbassadorOffboardingEmail + leaderboard skeleton | d21d15b | discord.ts, discord.test.ts, email.ts, leaderboard.ts |

## What Was Built

### Task 1 — Constants and Types

**`src/lib/ambassador/constants.ts`**
- Added `LEADERBOARD_SNAPSHOTS_COLLECTION = "leaderboard_snapshots" as const` (DASH-07)
- Added `LEADERBOARD_GRACE_PERIOD_MS = 28 * 24 * 60 * 60 * 1000` (DASH-06)

**`src/types/ambassador.ts`**
- Added `AmbassadorOfTheMonth` interface (`{ uid: string; displayName: string }`)
- Extended `AmbassadorSubdoc` with optional `onboarding?: { joinedDiscord?: boolean; sharedReferralLink?: boolean }` (DASH-08)
- Extended `AmbassadorSubdoc` with optional `offboardedAt?: Date` (ALUMNI-01)
- Extended `CohortDoc` with optional `ambassadorOfTheMonth?: AmbassadorOfTheMonth | null` (DASH-09)
- Extended `CohortPatchSchema` with nullable-optional `ambassadorOfTheMonth` field (DASH-09)

### Task 2 — Discord, Email, and Leaderboard Module

**`src/lib/discord.ts`**
- Added `removeDiscordRole(discordMemberIdOrUsername, roleId): Promise<boolean>` (DISC-05)
  - Resolves username via `lookupMemberByUsername` only when input is not a numeric snowflake
  - Returns `true` on 204 (success) and 404 (member absent — idempotent, Pitfall 5)
  - Returns `false` on any other 4xx/5xx; never throws to caller

**`src/lib/email.ts`**
- Added `sendAmbassadorOffboardingEmail(recipientEmail, displayName, cohortName): Promise<boolean>` (EMAIL-04)
  - Subject: "Your Ambassador Status — Important Update"
  - Verbatim copy from 05-UI-SPEC; uses existing `wrapEmailHtml` and `sendEmail` helpers

**`src/lib/ambassador/leaderboard.ts`** (new file)
- Exports: `LeaderboardEntry`, `LeaderboardCategoryRanks`, `LeaderboardWindow`, `LeaderboardSnapshot` interfaces
- Exports: `buildLeaderboardSnapshot(cohortId)` stub — throws "not implemented (Plan 02)"
- Interface contract is locked; Plans 02/03/04 can import and compile against it

**`src/lib/discord.test.ts`** (new file)
- 4 test cases covering DISC-05: 204 → true, 404 → true, 500 → false, 403 → false

## Test Results

```
Tests: 13 passed (9 constants.phase5 + 4 discord.test)
TypeScript: 0 errors (pre-existing social-icons SVG module errors unrelated)
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

| File | Line | Description | Resolution |
|------|------|-------------|------------|
| src/lib/ambassador/leaderboard.ts | 56 | `buildLeaderboardSnapshot` throws "not implemented" | Plan 02 (Wave 2) implements the full leaderboard computation |

This stub is intentional per plan design: the type contract ships in Wave 1 so Plans 02–04 can compile in parallel in Wave 2.

## Self-Check

### Files Exist
- src/lib/ambassador/constants.ts — present
- src/types/ambassador.ts — present
- src/lib/discord.ts — present
- src/lib/email.ts — present
- src/lib/ambassador/leaderboard.ts — present
- src/lib/discord.test.ts — present
- src/lib/ambassador/constants.phase5.test.ts — present

### Commits Exist
- 3e0a473 — feat(05-01): add Phase 5 constants and extend ambassador/cohort types
- d21d15b — feat(05-01): add removeDiscordRole, offboarding email, and leaderboard skeleton

## Self-Check: PASSED
