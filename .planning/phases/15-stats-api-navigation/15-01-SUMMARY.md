---
phase: 15-stats-api-navigation
plan: 01
subsystem: api
tags: [firestore, firebase-admin, caching, next-api-routes, typescript]

# Dependency graph
requires: []
provides:
  - "Public /api/stats endpoint returning live community stats and social reach config"
  - "src/data/socialReach.ts config file for 6 social platforms with counts and URLs"
  - "In-memory 5-minute cache to prevent excessive Firestore reads on homepage load"
affects: [16-homepage-redesign]

# Tech tracking
tech-stack:
  added: []
  patterns: [module-level cache with timestamp guard, parallel Firestore queries via Promise.all, Cache-Control header on public API responses]

key-files:
  created:
    - src/data/socialReach.ts
    - src/app/api/stats/route.ts
  modified: []

key-decisions:
  - "Mentor count filters by status=='accepted' to only count active mentors (not just role=='mentor')"
  - "averageRating rounded to 1 decimal place for clean display"
  - "Social reach counts are placeholder values — owner updates only src/data/socialReach.ts"
  - "Cache-Control set at both HTTP header and module-level in-memory cache (5 min TTL)"

patterns-established:
  - "Module-level cache pattern: declare typed cache variable + cacheTimestamp at module scope, check age before Firestore queries"
  - "Parallel Firestore reads: use Promise.all for independent collection queries to minimise latency"

requirements-completed: [STATS-01, STATS-02, STATS-03]

# Metrics
duration: 3min
completed: 2026-03-10
---

# Phase 15 Plan 01: Stats API & Social Reach Config Summary

**Public `/api/stats` endpoint with in-memory 5-min cache, querying Firestore for community metrics and serving social platform counts from a typed config file**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-10T04:40:53Z
- **Completed:** 2026-03-10T04:44:00Z
- **Tasks:** 1
- **Files modified:** 2 created

## Accomplishments
- Created `src/data/socialReach.ts` with `SocialPlatform` type and configurable counts for YouTube, Instagram, Facebook, LinkedIn, GitHub, and X
- Created `src/app/api/stats/route.ts` querying 4 Firestore collections in parallel (mentorship_profiles, mentorship_sessions, mentor_ratings) with accepted-mentor filter
- Implemented module-level in-memory cache with 5-minute TTL to prevent repeated Firestore reads on homepage loads
- Set `Cache-Control: public, s-maxage=300, stale-while-revalidate=60` on all responses

## Task Commits

Each task was committed atomically:

1. **Task 1: Create social reach config and public stats API endpoint** - `21278ed` (feat)

## Files Created/Modified
- `src/data/socialReach.ts` - SocialPlatform type + socialReach config for 6 platforms with placeholder counts and real URLs from siteMetadata
- `src/app/api/stats/route.ts` - Public GET endpoint with in-memory cache, Firestore queries, and JSON response with community + social + cachedAt

## Decisions Made
- Mentor count uses `where('status', '==', 'accepted')` filter (not just role==mentor) to only count active mentors as specified in plan
- averageRating rounded to 1 decimal for clean display in UI
- Social reach uses placeholder counts — updating requires editing only `src/data/socialReach.ts`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in LayoutWrapper.tsx and MobileNav.tsx (COMMUNITY_LINKS import) were visible during initial tsc run but are pre-existing issues unrelated to this plan; they resolved in subsequent checks and our new files had zero TypeScript errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `/api/stats` endpoint is ready for Phase 16 (Homepage Redesign) to consume
- Social reach counts are placeholder values — owner should update `src/data/socialReach.ts` with real follower/subscriber counts before launch

---
*Phase: 15-stats-api-navigation*
*Completed: 2026-03-10*
