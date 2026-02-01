---
phase: quick
plan: 004
subsystem: admin
tags: [admin-auth, mentor-profiles, firestore, nextjs]

# Dependency graph
requires:
  - phase: quick-003
    provides: Profile preview button on admin All Mentors tab
  - phase: 01-01
    provides: Admin authentication system with admin_sessions collection
provides:
  - Admin-authenticated viewing of declined mentor profiles via ?admin=1 query param
  - x-admin-token header validation in mentor profile API route
  - Visual admin preview banner for non-public profiles
affects: [admin-tools, mentor-moderation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin token validation pattern: check x-admin-token header against admin_sessions collection"
    - "Query param gating: ?admin=1 triggers admin preview mode in client component"

key-files:
  created: []
  modified:
    - "src/app/api/mentorship/mentors/[username]/route.ts"
    - "src/app/mentorship/mentors/[username]/page.tsx"
    - "src/app/mentorship/mentors/[username]/MentorProfileClient.tsx"
    - "src/app/mentorship/admin/page.tsx"
    - "src/types/mentorship.ts"

key-decisions:
  - "Use x-admin-token header for API authentication instead of cookies"
  - "Pass isAdminPreview via query param (?admin=1) to enable admin mode"
  - "Show admin preview banner only when status !== 'accepted'"
  - "Keep getMentorData() server function public-only, client-side fetch handles admin case"

patterns-established:
  - "Admin bypass pattern: if (condition && !isAdminRequest) return error"
  - "Admin token from localStorage passed as header for authenticated API calls"

# Metrics
duration: 4min
completed: 2026-02-01
---

# Quick Task 004: Fix Admin Profile Preview for Declined Mentors

**Admin-authenticated mentor profile viewing with x-admin-token header validation and visual preview banner**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-01T20:08:40Z
- **Completed:** 2026-02-01T20:12:43Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Admins can view declined mentor profiles via profile preview button
- Non-admin users still cannot access declined mentor profiles
- Visual warning banner indicates admin preview mode for non-public profiles
- Admin token validation reuses existing admin_sessions infrastructure

## Task Commits

1. **Tasks 1-2: Enable admin preview** - `6e6ffec` (feat)

**Note:** Both tasks were committed together as they form a single cohesive feature (API bypass + client integration).

## Files Created/Modified
- `src/app/api/mentorship/mentors/[username]/route.ts` - Added admin token validation, bypass status/public checks when isAdminRequest=true, include status in response
- `src/app/mentorship/mentors/[username]/page.tsx` - Accept searchParams, pass isAdminPreview prop when admin=1
- `src/app/mentorship/mentors/[username]/MentorProfileClient.tsx` - Accept isAdminPreview prop, fetch with x-admin-token header from localStorage, show admin preview banner
- `src/app/mentorship/admin/page.tsx` - Update profile link href to include ?admin=1 query param, change title to "View profile (admin)"
- `src/types/mentorship.ts` - Add status field to MentorProfileDetails interface

## Decisions Made
1. **Use x-admin-token header instead of cookies** - Reuses existing admin_sessions validation pattern, consistent with admin/auth route GET handler
2. **Query param (?admin=1) for admin preview mode** - Simple boolean flag, easy to understand and debug
3. **Server-side getMentorData() stays public-only** - Avoids adding auth context to server function, client-side fetch handles admin bypass
4. **Show banner only when status !== "accepted"** - Prevents confusing banner on accepted mentors, only shows for actually non-public profiles

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing dependencies**
- **Found during:** Build verification after Task 2
- **Issue:** use-debounce and @ngneat/falso packages missing from package.json, causing build failure
- **Fix:** Ran npm install use-debounce @ngneat/falso
- **Files modified:** package.json, package-lock.json (already committed in prior session)
- **Verification:** Build passes successfully
- **Committed in:** Pre-existing commit (dependencies were added but build wasn't run previously)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Dependency installation unblocked build. These were pre-existing missing dependencies, not introduced by this task.

## Issues Encountered
None - plan executed smoothly.

## Next Phase Readiness
- Admin profile preview fully functional for declined mentors
- Ready for production deployment
- No blockers

---
*Phase: quick-004*
*Completed: 2026-02-01*
