---
phase: quick-29
plan: 1
subsystem: projects
tags: [visibility, permissions, delete, project-lifecycle]

# Dependency graph
requires:
  - phase: quick-28
    provides: Project status management and conditional UI rendering
provides:
  - Public project discovery filters to exclude non-approved projects
  - Creator delete permission for declined projects
  - DELETE API endpoint with permission checks
  - Delete button UI with two-step confirmation
affects: [project-discovery, project-management, admin-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns: [status-based-filtering, creator-deletion-permissions, two-step-confirmation-ui]

key-files:
  created: []
  modified:
    - src/app/projects/[id]/page.tsx
    - src/app/api/projects/route.ts
    - src/app/api/projects/[id]/route.ts
    - src/lib/permissions.ts
    - src/app/projects/my/page.tsx

key-decisions:
  - "Sign-in alert only shown for active projects (pending/declined/completed excluded)"
  - "Public discovery defaults to active OR completed projects when no filters provided"
  - "Creator-filtered calls return all project statuses (so creators can see their pending/declined)"
  - "PERM-09: Admin can delete any project, creators can only delete own declined projects"
  - "Delete button only appears in Created tab for declined projects with two-step confirmation"

patterns-established:
  - "Public listing defaults: Use isPublicListing flag to apply default filters only when no creator/member filter"
  - "Permission-based deletion: canDeleteProject enforces role-based deletion rules"
  - "Two-step confirmation: Delete button -> Confirm Delete / Cancel prevents accidental deletion"

# Metrics
duration: 5min
completed: 2026-02-13
---

# Quick Task 29: Fix Project Visibility and Declined Project Workflow Summary

**Public discovery filters non-approved projects, creators can delete declined projects via DELETE API with two-step confirmation UI**

## Performance

- **Duration:** 5 minutes
- **Started:** 2026-02-13T08:21:31Z
- **Completed:** 2026-02-13T08:27:14Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments
- Public project discovery now only shows active and completed projects (excludes pending/declined)
- Sign-in alert hidden on non-active projects to prevent misleading prompts
- Creators can permanently delete their declined projects via new DELETE endpoint
- Delete button with two-step confirmation added to My Projects page for declined projects

## Task Commits

Each task was committed atomically:

1. **Task 1: Hide sign-in alert on non-active projects** - `784ed3f` (feat)
2. **Task 2: Filter public listings to show only approved projects** - `ecf558f` (feat)
3. **Task 3: Add DELETE permission for creators on declined projects** - `5c5c502` (feat)
4. **Task 4: Add delete button UI for declined projects in My Projects** - `a1a1946` (feat)

## Files Created/Modified
- `src/app/projects/[id]/page.tsx` - Conditionally render sign-in alert only when project.status === 'active'
- `src/app/api/projects/route.ts` - Add isPublicListing flag and default filter to status IN ['active', 'completed']
- `src/app/api/projects/[id]/route.ts` - Add DELETE endpoint with canDeleteProject permission check
- `src/lib/permissions.ts` - Add canDeleteProject function implementing PERM-09
- `src/app/projects/my/page.tsx` - Add delete button UI with two-step confirmation for declined projects

## Decisions Made

**1. Sign-in alert visibility based on project status**
- Only show "Sign in to apply" alert when project.status === 'active'
- Rationale: Pending/declined/completed projects cannot accept applications, so prompting sign-in is misleading

**2. Public discovery defaults to approved projects only**
- When no creatorId or member filter is provided (public discovery use case), default to status IN ['active', 'completed']
- Rationale: Pending projects are not yet approved (should only be visible to creator and admin), declined projects were rejected (should only be visible to creator for deletion)

**3. Creator-filtered calls return all statuses**
- When creatorId filter is present (My Projects page), return ALL statuses
- Rationale: Creators need to see their pending/declined projects for management purposes

**4. PERM-09: Creator deletion limited to declined projects**
- Admin can delete any project (per Phase 11)
- Creator can only delete their own declined projects
- Rationale: Creators should be able to clean up declined projects since they cannot edit/resubmit them. Active/completed projects should NOT be deletable by creators to prevent accidental data loss.

**5. Two-step confirmation for delete button**
- Delete button -> Confirm Delete / Cancel UI flow
- Rationale: Prevents accidental deletion of projects

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed AuthResult type incompatibility**
- **Found during:** Task 3 (DELETE endpoint implementation)
- **Issue:** AuthResult interface doesn't have customClaims property, causing TypeScript error
- **Fix:** Fetched user profile from Firestore to check isAdmin status instead of accessing non-existent customClaims
- **Files modified:** src/app/api/projects/[id]/route.ts
- **Verification:** TypeScript compilation successful
- **Committed in:** 5c5c502 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix was necessary for TypeScript compilation. No scope creep - used existing pattern from codebase (fetch user profile for admin check).

## Issues Encountered

**TypeScript compilation error on customClaims**
- Problem: Initial implementation tried to access authResult.customClaims which doesn't exist on AuthResult interface
- Resolution: Followed existing codebase pattern of fetching user profile from Firestore to check isAdmin status
- Reference: Similar pattern used throughout the codebase for permission checks

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Project lifecycle management now complete:**
- ✅ Projects properly filtered in public discovery
- ✅ Creators can delete declined projects
- ✅ Admin retains full delete capability (Phase 11)
- ✅ Sign-in prompts only shown for applicable projects

**Ready for:**
- Any future project discovery/management features
- Phase dependencies on project visibility rules
- Creator project cleanup workflows

## Self-Check: PASSED

**Files verified:**
- ✅ 29-SUMMARY.md created at .planning/quick/29-fix-project-visibility-and-declined-proj/
- ✅ All 5 modified files exist

**Commits verified:**
- ✅ 784ed3f: feat(quick-29): hide sign-in alert on non-active projects
- ✅ ecf558f: feat(quick-29): filter public listings to show only approved projects
- ✅ 5c5c502: feat(quick-29): add DELETE permission for creators on declined projects
- ✅ a1a1946: feat(quick-29): add delete button UI for declined projects in My Projects

---
*Phase: quick-29*
*Completed: 2026-02-13*
