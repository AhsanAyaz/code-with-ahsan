---
phase: 05-dashboard-leaderboard-offboarding-alumni
plan: "02"
subsystem: ambassador-leaderboard
tags:
  - leaderboard
  - cron
  - github-actions
  - firestore
  - tdd
dependency_graph:
  requires:
    - LEADERBOARD_SNAPSHOTS_COLLECTION constant (Plan 01)
    - LEADERBOARD_GRACE_PERIOD_MS constant (Plan 01)
    - LeaderboardEntry / LeaderboardWindow / LeaderboardSnapshot interfaces (Plan 01)
    - PUBLIC_AMBASSADORS_COLLECTION (src/types/ambassador.ts)
    - getCurrentCohortId (src/lib/ambassador/currentCohort.ts)
  provides:
    - buildLeaderboardSnapshot full implementation
    - rankByCount pure helper (standard competition ranking)
    - currentUtcMonth / utcMonthStart pure helpers
    - computeAmbassadorCounts (per-ambassador parallel count queries)
    - scripts/ambassador-leaderboard-snapshot.ts hourly cron writer
    - leaderboard_snapshots/{cohortId} Firestore doc shape
  affects:
    - src/app/api/ambassador/dashboard/leaderboard/route.ts (Plan 03 consumer — reads leaderboard_snapshots)
    - .github/workflows/ambassador-activity-checks.yml (extended with hourly job)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN/REFACTOR for pure helper functions
    - Standard competition ranking (1224 ranking)
    - Promise.all parallelization for per-ambassador count() queries
    - FieldValue.serverTimestamp() on cron write (overrides ISO string from builder)
    - Pitfall 7: public_ambassadors flat collection (NOT collectionGroup)
    - Pitfall 2: Firestore Timestamp .toDate() before arithmetic
key_files:
  created:
    - src/lib/ambassador/leaderboard.test.ts
    - scripts/ambassador-leaderboard-snapshot.ts
  modified:
    - src/lib/ambassador/leaderboard.ts
    - .github/workflows/ambassador-activity-checks.yml
decisions:
  - "AMBASSADOR_COHORTS_COLLECTION imported from constants.ts (not ambassador.ts) — the type in ambassador.ts was AMBASSADOR_EVENTS_COLLECTION; moved cohorts import to correct source"
  - "leaderboard job uses only Firebase secrets (no Discord) — cron reads Firestore only, no Discord API calls"
  - "buildWindowCategory filters zero-count entries from top3 arrays — no zero-padding per plan behavior spec"
metrics:
  duration_minutes: 8
  completed_date: "2026-05-06"
  tasks_completed: 2
  files_changed: 4
---

# Phase 05 Plan 02: Leaderboard Snapshot Pipeline Summary

**One-liner:** Full buildLeaderboardSnapshot implementation (Pitfall-7-safe, competition-ranked, UTC-month-windowed) + idempotent hourly cron writer + GitHub Actions wiring (DASH-03/04/05/06/07).

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Implement buildLeaderboardSnapshot + unit tests (DASH-03/04/05/06) | adfbda4 | leaderboard.ts, leaderboard.test.ts |
| 2 | Cron writer + GitHub Actions wiring (DASH-07) | 9f99813 | ambassador-leaderboard-snapshot.ts, ambassador-activity-checks.yml |

## What Was Built

### Task 1 — buildLeaderboardSnapshot + Tests (TDD)

**`src/lib/ambassador/leaderboard.ts`** (full implementation replacing stub)

- `rankByCount<T>()`: pure function implementing standard competition ranking ("1224"). Counts [10,8,8,5] → ranks [1,2,2,4]. Testable in isolation.
- `currentUtcMonth(now?)`: returns "YYYY-MM" for current UTC month. Accepts optional `now` param for test injection.
- `utcMonthStart(month)`: returns first millisecond of a "YYYY-MM" month as a UTC Date.
- `computeAmbassadorCounts()`: fires 6 parallel `count()` queries per ambassador (cumulative + thisMonth for referrals, events, reports).
- `buildLeaderboardSnapshot(cohortId)`: orchestrates the full pipeline — reads cohort doc for startDate, applies `LEADERBOARD_GRACE_PERIOD_MS` via `.toDate()` (Pitfall 2), queries `public_ambassadors` flat collection (Pitfall 7 — NOT collectionGroup), fans out per-ambassador counts, builds top-3 arrays (zero-count entries excluded), builds full ambassadorRanks map for all active ambassadors.

**`src/lib/ambassador/leaderboard.test.ts`** (new — 7 tests)

- `rankByCount`: 1224 ordering, all-zero tie, empty input
- DASH-06 grace math: constant = 28 days ms, startDate + grace = correct ISO
- DASH-04 month boundary: currentUtcMonth, utcMonthStart

### Task 2 — Cron Writer + GitHub Actions

**`scripts/ambassador-leaderboard-snapshot.ts`** (new)

- Shebang: `#!/usr/bin/env npx tsx`
- `dotenv` config loads `.env.local`
- `DRY_RUN = process.argv.includes("--dry-run")` — skips Firestore write on dry run, still logs planned writes
- Calls `getCurrentCohortId()` — exits cleanly if no active cohort
- Calls `buildLeaderboardSnapshot(cohortId)` — logs top-3 counts and ambassador count
- Writes `leaderboard_snapshots/{cohortId}` via `.set({...snapshot, updatedAt: FieldValue.serverTimestamp()}, { merge: false })` — idempotent via overwrite

**`.github/workflows/ambassador-activity-checks.yml`** (extended)

- Added third schedule entry: `cron: '0 7 * * *'` (daily 07:00 UTC — see Post-Hoc Correction block below; this SUMMARY originally claimed hourly `'0 * * * *'`, which was later orphaned and then restored at daily cadence per architectural decision 2026-05-22 via quick 260522-b08)
- Added `leaderboard-snapshot` to `workflow_dispatch.inputs.job.options`
- Added `ambassador-leaderboard-snapshot` job: Firebase-only env (no Discord secrets), dry-run flag support, schedule + workflow_dispatch triggers

## Test Results

```
Test Files  1 passed (1)
Tests       7 passed (7)
TypeScript  0 errors (pre-existing social-icons SVG module errors unrelated)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed AMBASSADOR_COHORTS_COLLECTION import source**
- **Found during:** Task 1 TypeScript check
- **Issue:** Plan's action block imported `AMBASSADOR_COHORTS_COLLECTION` from `@/types/ambassador`, but that module exports `AMBASSADOR_EVENTS_COLLECTION` (not cohorts). The cohorts constant lives in `@/lib/ambassador/constants`.
- **Fix:** Changed import to `import { AMBASSADOR_COHORTS_COLLECTION } from "@/lib/ambassador/constants"` — separate import line alongside the existing constants import.
- **Files modified:** `src/lib/ambassador/leaderboard.ts`
- **Commit:** adfbda4

## Known Stubs

None — buildLeaderboardSnapshot is fully implemented. The Plan 01 stub ("not implemented — Plan 02") has been replaced.

## Threat Surface Scan

No new network endpoints introduced. The cron script uses Firebase Admin SDK (server-side only). The leaderboard_snapshots collection is write-only from this plan; read access is gated through the API route in Plan 03.

The T-05-02-01 threat (leaderboard_snapshots must deny client reads via Firestore rules) is noted — this is documented in the plan's threat model as a cross-plan handoff to Plan 03.

## Self-Check

### Files Exist
- src/lib/ambassador/leaderboard.ts — present
- src/lib/ambassador/leaderboard.test.ts — present
- scripts/ambassador-leaderboard-snapshot.ts — present
- .github/workflows/ambassador-activity-checks.yml — present

### Commits Exist
- adfbda4 — feat(05-02): implement buildLeaderboardSnapshot + unit tests
- 9f99813 — feat(05-02): add leaderboard-snapshot cron + GitHub Actions wiring

## Post-Hoc Correction (2026-05-22, quick 260522-b08)

This SUMMARY originally claimed an hourly cron `'0 * * * *'` was wired. That was inaccurate even at the time of writing — commit `76ad6f7` (post-Plan-02) refactored the route to live computation with a 5-min in-memory cache, orphaning `scripts/ambassador-leaderboard-snapshot.ts`. Phase 5 verification (`05-VERIFICATION.md`, INV-3 FAIL) caught this. Quick 260522-b08 closed the gap with a **daily** snapshot at `'0 7 * * *'` (07:00 UTC, before the 08:00 report-flag job) — a deliberate cadence change (hourly → daily) given current ambassador count. The script's logic remains unchanged; only the GitHub Actions wiring + the script's header comment were updated to reflect the daily cadence.

## Self-Check: PASSED
