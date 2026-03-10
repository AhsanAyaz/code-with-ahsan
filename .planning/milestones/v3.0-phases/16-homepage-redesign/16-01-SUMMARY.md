---
phase: 16-homepage-redesign
plan: 01
subsystem: ui
tags: [react, nextjs, daisyui, homepage, community, components, lucide-react]

# Dependency graph
requires:
  - phase: 15-stats-api-navigation
    provides: /api/stats endpoint returning community and social data

provides:
  - CommunityHero component — community-first hero with no personal branding
  - PillarsGrid component — five-pillar navigation grid with links
  - CommunityStats component — live stats fetched from /api/stats with loading and error states
  - Discord entry in socialReach.ts config

affects:
  - 16-02 (Plan 02 will wire these components into page.tsx)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "fetch + useEffect pattern for client-side data fetching from /api/stats"
    - "DaisyUI skeleton classes for loading states"
    - "Error-state as graceful hide (return null) rather than error message"

key-files:
  created:
    - src/components/home/CommunityHero.tsx
    - src/components/home/PillarsGrid.tsx
    - src/components/home/CommunityStats.tsx
  modified:
    - src/data/socialReach.ts

key-decisions:
  - "CommunityHero uses a centered single-column layout (no 2-col grid) to emphasize community scale messaging over any personal branding"
  - "PillarsGrid bottom row (Courses + Books) uses nested grid with lg:w-2/3 mx-auto to achieve centered 2-up layout within the 3-col outer grid"
  - "CommunityStats hides entirely on error (return null) to avoid showing a broken stats section; error is logged server-side by the API"
  - "Discord placeholder count set to 500 — owner can update src/data/socialReach.ts without code changes"

patterns-established:
  - "home/ component subdirectory under src/components/ for homepage-specific components"
  - "fetch with useEffect and cancelled flag pattern for safe async data fetching in client components"

requirements-completed: [HOME-01, HOME-02, HOME-03]

# Metrics
duration: 2min
completed: 2026-03-10
---

# Phase 16 Plan 01: Homepage Redesign — Core Components Summary

**Three community-first homepage components: CommunityHero with join CTAs, PillarsGrid with five community pillars (Mentorship/Projects/Roadmaps/Courses/Books), and CommunityStats fetching live data from /api/stats including Discord member count**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-10T14:40:17Z
- **Completed:** 2026-03-10T14:42:07Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- CommunityHero replaces personal-branding hero with community-identity landing experience — "Join 4,500+ Developers" heading, tagline about Code With Ahsan community, Discord join CTA and Explore Mentorship CTA
- PillarsGrid shows all five community pillars (Mentorship, Projects, Roadmaps, Courses, Books) with icons (lucide-react), descriptions, and working Next.js Link hrefs
- CommunityStats fetches /api/stats on mount, displays 6 stats (mentors, mentees, active/completed mentorships, avg rating, Discord members) with DaisyUI skeleton loading state and silent error handling
- socialReach.ts updated with Discord entry so /api/stats serves discord.count in social response

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CommunityHero and PillarsGrid components** - `f0b78fc` (feat)
2. **Task 2: Add Discord to socialReach and create CommunityStats** - `9974e58` (feat)

## Files Created/Modified
- `src/components/home/CommunityHero.tsx` - Community-first hero section with no personal branding
- `src/components/home/PillarsGrid.tsx` - Five-pillar navigation grid with DaisyUI cards and lucide icons
- `src/components/home/CommunityStats.tsx` - Live stats display with fetch+useEffect, loading skeleton, error hide
- `src/data/socialReach.ts` - Added discord entry (count: 500, url: discord.gg/codewithahsan)

## Decisions Made
- CommunityHero uses single-column centered layout rather than 2-col grid to keep the messaging focused on community identity
- PillarsGrid bottom 2 cards (Courses/Books) are centered using a nested grid wrapper with lg:w-2/3 mx-auto, achieving the specified "3 on top, 2 centered" layout
- CommunityStats returns null on error to gracefully hide the section rather than showing a broken or empty state
- Discord placeholder count is 500 — defined in socialReach.ts for easy manual update by the owner

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three components ready to be imported and wired into src/app/page.tsx by Plan 02
- socialReach.ts discord count should be updated to accurate member count before launch
- No blockers

---
*Phase: 16-homepage-redesign*
*Completed: 2026-03-10*
