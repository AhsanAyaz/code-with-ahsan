---
phase: quick-67
plan: 01
subsystem: ui, discord
tags: [mentorship, discord, github-actions, cron, cleanup]

requires:
  - phase: none
    provides: none
provides:
  - "Renamed mentor Remove Mentee action to End Mentorship across UI and API"
  - "Automated cleanup of archived Discord channels via weekly GitHub Action"
affects: [mentorship-dashboard, discord-channels]

tech-stack:
  added: []
  patterns: [weekly-cron-cleanup, archived-channel-lifecycle]

key-files:
  created:
    - scripts/cleanup-archived-discord-channels.ts
    - .github/workflows/cleanup-archived-discord-channels.yml
  modified:
    - src/app/mentorship/dashboard/[matchId]/layout.tsx
    - src/app/api/mentorship/dashboard/[matchId]/route.ts

key-decisions:
  - "Keep API action value 'remove' as internal contract unchanged"
  - "Keep cancellationReason 'removed_by_mentor' as database enum unchanged"
  - "No Firebase needed for cleanup script - only Discord API access required"

patterns-established:
  - "Discord channel lifecycle: archive on end -> delete after 30 days inactivity via cron"

requirements-completed: [QUICK-67]

duration: 3min
completed: 2026-03-06
---

# Quick Task 67: Distinguish Mentorship Completed vs Ended Summary

**Renamed mentor's "Remove Mentee" to "End Mentorship" across UI/API, and added weekly GitHub Action to delete archived Discord channels older than 30 days**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T10:03:05Z
- **Completed:** 2026-03-06T10:06:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Renamed all mentor-facing "Remove Mentee" labels to "End Mentorship" (button, modal, toast, API message)
- Created cleanup script that fetches guild channels, filters archived-* prefix, checks last message age, deletes stale ones
- Added weekly cron workflow (Sundays 06:00 UTC) with manual dispatch support

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename "Remove Mentee" to "End Mentorship" in UI and API** - `744d6de` (feat)
2. **Task 2: Create GitHub Action for archived Discord channel cleanup** - `7aaf9de` (feat)

## Files Created/Modified
- `src/app/mentorship/dashboard/[matchId]/layout.tsx` - Renamed button, modal, toast, state variables for mentor end action
- `src/app/api/mentorship/dashboard/[matchId]/route.ts` - Updated API response message to "Mentorship ended successfully"
- `scripts/cleanup-archived-discord-channels.ts` - Script to find and delete archived Discord channels older than 30 days
- `.github/workflows/cleanup-archived-discord-channels.yml` - Weekly cron trigger for cleanup script

## Decisions Made
- Kept API action value "remove" unchanged (internal contract, not user-facing)
- Kept cancellationReason "removed_by_mentor" unchanged (database enum for analytics)
- Cleanup script uses direct Discord API calls with rate limit retry (fetchWithRateLimit not exported from discord.ts)
- No Firebase initialization needed for cleanup script - only Discord API access required

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. The GitHub Action uses existing DISCORD_BOT_TOKEN and DISCORD_GUILD_ID secrets.

## Next Phase Readiness
- Mentorship UI terminology is now consistent (End Mentorship everywhere)
- Archived Discord channels will be automatically cleaned up weekly

---
*Phase: quick-67*
*Completed: 2026-03-06*
