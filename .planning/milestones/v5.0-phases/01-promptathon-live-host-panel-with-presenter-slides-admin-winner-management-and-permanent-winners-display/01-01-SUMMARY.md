---
phase: 01-promptathon-live-host-panel-with-presenter-slides-admin-winner-management-and-permanent-winners-display
plan: 01
subsystem: api
tags: [typescript, firestore, firebase-admin, next-js, api-route]

# Dependency graph
requires: []
provides:
  - WinnerPlacement, WinnersData, HackathonTwist TypeScript interfaces in src/types/events.ts
  - HACKATHON_TEAMS (10 team names), HACKATHON_TWIST (typed), MENTORS ([]) constants
  - Updated sponsor UTM links in CONFIRMED_SPONSORS
  - GET /api/admin/events/[eventId]/winners — public read from Firestore events/{eventId}/winners/data
  - PUT /api/admin/events/[eventId]/winners — admin-protected write with x-admin-token validation
affects:
  - 01-02 (host presenter panel — imports HackathonTwist, HACKATHON_TEAMS, HACKATHON_TWIST)
  - 01-03 (admin winner form + public display — imports WinnersData, uses GET/PUT API)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "checkAdminAuth helper: reads x-admin-token header, validates against admin_sessions Firestore collection, checks expiry"
    - "Dynamic params awaited: { params }: { params: Promise<{ eventId: string }> } per Next.js 16"
    - "Firestore sub-document pattern: events/{eventId}/winners/data"

key-files:
  created:
    - src/types/events.ts
    - src/app/api/admin/events/[eventId]/winners/route.ts
  modified:
    - src/app/events/cwa-promptathon/2026/constants.ts

key-decisions:
  - "Used top-level import for HackathonTwist in constants.ts for cleaner type annotation"
  - "GET /winners is publicly accessible (no auth) to allow public winners display panel to read data"
  - "PUT /winners stores announcedAt as new Date() (server timestamp) — serialized to ISO string on GET response"

patterns-established:
  - "Winners API pattern: GET public read / PUT admin-protected write under /api/admin/events/[eventId]/"
  - "Firestore winners sub-collection: events/{eventId}/winners/data"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-03-27
---

# Phase 01 Plan 01: Data Foundation (Types, Constants, Winners API) Summary

**Firestore winners GET/PUT API with TypeScript contracts, 10 hackathon team names, and HackathonTwist constant for the CWA Promptathon 2026 event**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-27T08:28:52Z
- **Completed:** 2026-03-27T08:30:59Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Defined shared TypeScript interfaces (WinnerPlacement, WinnersData, HackathonTwist, HackathonTwistThemeExample) that Plans 02 and 03 import directly
- Added HACKATHON_TEAMS (10 strings), HACKATHON_TWIST (typed with 3 per-theme examples), MENTORS ([]) to constants.ts; updated sponsor UTM links for CommandCode and Google
- Created winners API route with publicly readable GET (returns null when no doc exists) and admin-protected PUT (validates x-admin-token, writes to Firestore)

## Task Commits

Each task was committed atomically:

1. **Task 1: Define shared TypeScript types for winners data** - `06d989d` (feat)
2. **Task 2: Update constants.ts — add HACKATHON_TEAMS, HACKATHON_TWIST, MENTORS; fix UTM links** - `eb5d4ab` (feat)
3. **Task 3: Create winners API route (GET public + PUT admin-protected)** - `0989e60` (feat)

## Files Created/Modified

- `src/types/events.ts` - WinnerPlacement, WinnersData, HackathonTwist, HackathonTwistThemeExample interfaces
- `src/app/events/cwa-promptathon/2026/constants.ts` - Added HACKATHON_TEAMS, HACKATHON_TWIST, MENTORS; updated UTM links
- `src/app/api/admin/events/[eventId]/winners/route.ts` - GET (public) and PUT (admin-protected) handlers for Firestore winners data

## Decisions Made

- Used top-level `import type { HackathonTwist }` in constants.ts for cleaner code over inline import syntax
- GET handler is publicly accessible (no auth guard) so the public winners display panel can read without credentials
- PUT handler stores `announcedAt: new Date()` as a JS Date (Firestore converts to Timestamp); GET response converts it back to ISO string via `toDate().toISOString()`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All TypeScript contracts are in place for Plans 02 and 03 to import
- Winners API route deployed on next build/push
- No blockers for Plan 02 (host presenter panel) or Plan 03 (admin winner form + public display)

---
*Phase: 01-promptathon-live-host-panel-with-presenter-slides-admin-winner-management-and-permanent-winners-display*
*Completed: 2026-03-27*

## Self-Check: PASSED

- FOUND: src/types/events.ts
- FOUND: src/app/events/cwa-promptathon/2026/constants.ts
- FOUND: src/app/api/admin/events/[eventId]/winners/route.ts
- FOUND commit 06d989d: feat(01-01): define shared TypeScript types for winners data
- FOUND commit eb5d4ab: feat(01-01): add HACKATHON_TEAMS, HACKATHON_TWIST, MENTORS; fix UTM links
- FOUND commit 0989e60: feat(01-01): create winners API route (GET public + PUT admin-protected)
