---
phase: quick-003
plan: 01
subsystem: ui
tags: [nextjs, react, link, mentor-profile]

# Dependency graph
requires:
  - phase: 01-01
    provides: Admin dashboard with All Mentors tab
  - phase: existing
    provides: Public mentor profile pages at /mentorship/mentors/[username]
provides:
  - Profile preview buttons for admins and mentors
  - Quick access to public mentor profiles from admin dashboard and mentor dashboard
affects: [admin-workflow, mentor-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns: [external-link icon for new-tab navigation, username-or-uid fallback pattern]

key-files:
  created: []
  modified:
    - src/app/mentorship/admin/page.tsx
    - src/app/mentorship/dashboard/page.tsx

key-decisions:
  - "Use external-link icon (arrow-out-of-box) for new-tab navigation clarity"
  - "Profile button only on All Mentors tab, not All Mentees tab"
  - "Use btn-ghost btn-sm btn-circle for compact inline button styling"
  - "Fallback to uid when username not available for URL construction"

patterns-established:
  - "Profile preview pattern: target=_blank with rel=noopener noreferrer for external navigation"
  - "Username-or-uid fallback: {profile.username || user.uid} for robust URL routing"

# Metrics
duration: 2min
completed: 2026-02-01
---

# Quick Task 003: Add Profile Preview Buttons Summary

**Admin and mentor profile preview buttons using external-link icon pattern, enabling quick access to public mentor profiles without leaving current context**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-01T19:50:49Z
- **Completed:** 2026-02-01T19:52:33Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Admin can preview any mentor's public profile from All Mentors tab via icon button
- Mentors can preview their own public profile from dashboard navigation cards
- Links open in new tabs, preserving current dashboard context

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Profile button to admin All Mentors tab cards** - `4a11edb` (feat)
2. **Task 2: Add View My Profile card to mentor dashboard** - `365c4fd` (feat)

## Files Created/Modified
- `src/app/mentorship/admin/page.tsx` - Added external-link icon button to mentor cards in All Mentors tab
- `src/app/mentorship/dashboard/page.tsx` - Added "View My Profile" navigation card for mentors

## Decisions Made

**1. External-link icon for profile button**
- Used SVG external-link icon (arrow out of box) instead of text label
- Compact btn-circle styling fits inline with badges
- Standard pattern for "opens in new tab" actions

**2. Profile button placement in admin dashboard**
- Positioned after relationship count badge, before Restore button
- Only appears on All Mentors tab (not All Mentees)
- Mentees don't have public profile pages, so button would be incorrect

**3. Username-or-uid fallback pattern**
- Profile URLs use `${profile.username || user.uid}`
- Handles cases where username not yet set or unavailable
- Ensures links always work even without custom username

**4. New tab navigation with rel=noopener noreferrer**
- Opens profiles in new tab to preserve dashboard context
- Follows security best practice with rel attribute
- Users can review profiles without losing their place

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Pre-existing TypeScript errors**
- Found missing dependency errors for `use-debounce` and `@ngneat/falso`
- These errors existed before changes, not caused by this task
- Did not block functionality or commit

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Profile preview functionality complete and ready for use. No blockers.

**Potential follow-up:**
- Similar preview buttons could be added to other admin views (pending requests, matches, etc.)
- Mentee profile pages could be created if needed in future

---
*Phase: quick-003*
*Completed: 2026-02-01*
