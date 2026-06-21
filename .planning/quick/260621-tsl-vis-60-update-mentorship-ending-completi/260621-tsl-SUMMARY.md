---
phase: quick-260621-tsl
plan: 01
subsystem: api
tags: [mentorship, discord, notifications, dm]

requires: []
provides:
  - "Discord DM notifications for mentorship endings now explicitly name the actor (mentor/mentee/admin)"
affects: [mentorship, discord-notifications]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/app/api/mentorship/dashboard/[matchId]/route.ts

key-decisions:
  - "Standardized mentor-end DM to parallel the remove-DM format: 'Your mentorship with X has been ended by your Y'"
  - "Completion/graduation DM at line 189 left intentionally celebratory and unchanged"
  - "Channel messages (~298, ~396) and admin route already compliant — left unchanged"

patterns-established:
  - "Ending DMs must explicitly name the actor: 'ended by your mentor / mentee / administrator'"

requirements-completed: [VIS-60]

duration: 5min
completed: 2026-06-21
---

# Quick Task 260621-tsl: VIS-60 Update Mentorship Ending/Completion Notifications Summary

**Mentee removal DM and mentor end DM now both explicitly attribute who ended the mentorship ("ended by your mentor" / "ended by your mentee"), completing VIS-60 actor-attribution across all three ending paths.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-21T19:29:00Z
- **Completed:** 2026-06-21T19:34:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Mentee removal DM (action `remove`, line 319) now reads "ended by your mentor" instead of the ambiguous "has been ended"
- Mentor end DM (action `end`, line 417) now reads "ended by your mentee" with consistent phrasing matching the channel messages
- TypeScript typecheck confirms no new errors in the dashboard route
- Admin route, completion DM, and channel messages verified unchanged

## Task Commits

1. **Task 1: Clarify ending-actor in mentee removal DM** - `a63022f` (fix)
2. **Task 2: Standardize mentor end DM to explicitly name the actor** - `e386365` (fix)
3. **Task 3: Build/typecheck verification** - (no commit needed; verification only)

## Files Created/Modified

- `src/app/api/mentorship/dashboard/[matchId]/route.ts` - Two DM string literals updated to explicitly name the ending actor

## Decisions Made

- Reformatted the mentor end DM from "X has ended the mentorship" to "Your mentorship with X has been ended by your mentee" for grammatical consistency and actor clarity with the remove DM pattern.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- VIS-60 is complete; all three actor paths (mentor / mentee / admin) now explicitly name who ended the mentorship in DMs.
- No follow-up required.

---
*Phase: quick-260621-tsl*
*Completed: 2026-06-21*
