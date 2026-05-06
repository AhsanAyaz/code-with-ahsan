---
phase: 05-dashboard-leaderboard-offboarding-alumni
plan: "03"
subsystem: ambassador-dashboard-api
tags:
  - dashboard
  - leaderboard
  - api
  - firestore-rules
  - tdd
dependency_graph:
  requires:
    - "05-01"  # LEADERBOARD_SNAPSHOTS_COLLECTION constant, LeaderboardSnapshot types
  provides:
    - GET /api/ambassador/dashboard/me (DASH-01, DASH-02)
    - GET /api/ambassador/dashboard/leaderboard (DASH-07)
    - firestore.rules deny on leaderboard_snapshots
  affects:
    - src/app/ambassadors/dashboard (Phase 5 UI — consumer of /me and /leaderboard)
tech_stack:
  added: []
  patterns:
    - Three-step gate: feature flag → verifyAuth → hasRoleClaim (ambassador-facing routes)
    - Parallel Firestore reads via Promise.all (mirroring members/[uid]/route.ts)
    - Auto-derived onboarding flags at API time (Pitfall 6 — not persisted to Firestore)
    - Server-only Firestore collection protected by firestore.rules deny
    - TDD RED/GREEN for /me route (test-first, then implementation)
key_files:
  created:
    - src/app/api/ambassador/dashboard/me/route.ts
    - src/app/api/ambassador/dashboard/me/route.test.ts
    - src/app/api/ambassador/dashboard/leaderboard/route.ts
  modified:
    - firestore.rules
decisions:
  - "AMBASSADOR_COHORTS_COLLECTION imported from @/lib/ambassador/constants (not @/types/ambassador as plan suggested — actual export location)"
  - "isoOrNull helper duplicated in both routes (not extracted to shared utility) — consistent with existing codebase pattern where route-level helpers are inline"
  - "ownRank extracted via ambassadorRanks?.[ctx.uid] rather than spreading the map — explicit anti-pattern guard per RESEARCH §Anti-Patterns"
metrics:
  duration_minutes: 8
  completed_date: "2026-05-06"
  tasks_completed: 2
  files_changed: 4
---

# Phase 05 Plan 03: Dashboard API Endpoints Summary

**One-liner:** Two ambassador-facing dashboard API routes — personal stats bundle (/me) and cohort leaderboard view (/leaderboard) — with firestore.rules denying client access to the snapshot collection.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | GET /api/ambassador/dashboard/me — personal stats bundle (DASH-01, DASH-02) | 463e169 | route.ts, route.test.ts |
| 2 | GET /api/ambassador/dashboard/leaderboard + firestore.rules deny (DASH-07) | 20f3d5a | leaderboard/route.ts, firestore.rules |

## What Was Built

### Task 1 — Personal Dashboard Stats Endpoint

**`src/app/api/ambassador/dashboard/me/route.ts`**
- Three-step gate: `isAmbassadorProgramEnabled()` → `verifyAuth` → `hasRoleClaim("ambassador")`
- Parallel Firestore reads via `Promise.all`: profile doc, ambassador subdoc, referrals count, events count (hidden==false), reports count, cohort doc
- Response shape: `{ stats, cohort, onboarding }` per DASH-02 contract
- Auto-derived onboarding flags (Pitfall 6): `loggedFirstEvent = eventsCount > 0`, `uploadedVideo = cohortPresentationVideoUrl truthy`, `setBio = profile.bio non-empty` — none persisted to Firestore
- `ambassadorOfTheMonth` pass-through from cohort doc
- ISO-normalized Firestore Timestamp dates via `isoOrNull` helper

**`src/app/api/ambassador/dashboard/me/route.test.ts`**
- 6 test cases: 3 DASH-01 auth gate (feature flag off → 404, no auth → 401, non-ambassador → 403) + 3 DASH-02 stats shape (numeric counts, loggedFirstEvent derivation, uploadedVideo=false for empty URL)
- All mocks self-contained; no real Firestore or Firebase Admin calls

### Task 2 — Leaderboard Endpoint + Firestore Rule

**`src/app/api/ambassador/dashboard/leaderboard/route.ts`**
- Same three-step gate as /me
- Reads single `leaderboard_snapshots/{cohortId}` doc (written hourly by Plan 02 cron)
- Supports `?view=cumulative|this_month` query param (any other value collapses to "cumulative" — T-05-03-03 mitigation)
- Returns only `top3` + `ownRank` (extracted as `ambassadorRanks[ctx.uid]`) — full `ambassadorRanks` map never included in response (T-05-03-01 mitigation)
- Returns `{ snapshot: null }` when cohortId is null or snapshot doc absent

**`firestore.rules`**
- Added `match /leaderboard_snapshots/{cohortId} { allow read, write: if false; }` block (T-05-03-02 mitigation)
- Placed alongside other server-only collection rules (referrals, monthly_reports, etc.)

## Test Results

```
Tests: 6 passed (6)
TypeScript: 0 errors (npx tsc --noEmit)
```

## Deviations from Plan

### Minor Import Correction

**[Rule 1 - Bug] Fixed AMBASSADOR_COHORTS_COLLECTION import path**
- **Found during:** Task 1
- **Issue:** Plan template code imported `AMBASSADOR_COHORTS_COLLECTION` from `@/types/ambassador`, but the export lives in `@/lib/ambassador/constants`
- **Fix:** Changed import to `@/lib/ambassador/constants`
- **Files modified:** `src/app/api/ambassador/dashboard/me/route.ts`
- **Commit:** 463e169

## Known Stubs

None — both routes are fully functional against the Plan 01 type contracts. The leaderboard route depends on the Plan 02 cron populating the snapshot docs; when no snapshot exists the route returns `{ snapshot: null }` (documented graceful degradation, not a stub).

## Threat Surface Scan

All security mitigations from the plan's threat register are implemented:
- T-05-03-01: `ambassadorRanks` map not spread — only `ambassadorRanks[ctx.uid]` extracted
- T-05-03-02: `firestore.rules` deny on `leaderboard_snapshots` collection
- T-05-03-03: `view` param normalized to one of two literal values
- T-05-03-04: `/me` is implicitly self-scoped via `verifyAuth` uid (no uid param accepted)

No new threat surface beyond what the plan's threat model covers.

## Self-Check

### Files Exist
- src/app/api/ambassador/dashboard/me/route.ts — present
- src/app/api/ambassador/dashboard/me/route.test.ts — present
- src/app/api/ambassador/dashboard/leaderboard/route.ts — present
- firestore.rules — modified, leaderboard_snapshots rule present

### Commits Exist
- 463e169 — feat(05-03): add GET /api/ambassador/dashboard/me
- 20f3d5a — feat(05-03): add GET /api/ambassador/dashboard/leaderboard + firestore.rules deny

## Self-Check: PASSED
