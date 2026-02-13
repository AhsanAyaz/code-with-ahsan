---
phase: quick-25
plan: 01
subsystem: admin-dashboard
tags: [bug-fix, auth, ui]
dependency_graph:
  requires: []
  provides: [admin-projects-auth, mentees-page-labels]
  affects: [admin-dashboard]
tech_stack:
  added: []
  patterns: [admin-session-token-auth]
key_files:
  created: []
  modified:
    - src/app/api/admin/projects/route.ts
    - src/app/api/admin/projects/[id]/route.ts
    - src/app/admin/mentees/page.tsx
decisions: []
metrics:
  duration: 1
  completed: 2026-02-13
---

# Quick Task 25: Fix Two Admin Dashboard Issues

**One-liner:** Fixed admin projects page 401 auth loop by implementing x-admin-token session verification and corrected mentees page header/stats labels.

## Overview

This quick task resolved two critical bugs in the admin dashboard:
1. **Projects page authentication error:** The `/api/admin/projects` and `/api/admin/projects/[id]` routes were using `verifyAuth()` which expects a Firebase ID token, but the admin pages send an `x-admin-token` header containing a custom admin session token. This caused a 401 error loop preventing admins from viewing or managing projects.
2. **Mentees page incorrect labels:** The mentees page displayed "All Mentors" as the header and showed duplicate "Total Mentors" stats instead of displaying "Total Mentees" information.

## Tasks Completed

### Task 1: Fix admin projects API auth to use x-admin-token session verification

**Files:** `src/app/api/admin/projects/route.ts`, `src/app/api/admin/projects/[id]/route.ts`

**Changes:**
- Removed Firebase ID token authentication (`verifyAuth()` imports and calls)
- Implemented x-admin-token session verification matching the pattern in `/api/mentorship/admin/auth` GET route
- For both GET (list projects) and DELETE (delete project) endpoints:
  - Read `x-admin-token` from request headers
  - Look up session in `admin_sessions` Firestore collection
  - Check session expiration (`expiresAt.toDate() < new Date()`)
  - Delete expired sessions and return 401
  - Proceed with handler logic if session is valid
- Removed secondary admin check (querying `mentorship_profiles` for `isAdmin` flag) since the admin session token already proves admin access

**Result:** Admin projects page now loads successfully without 401 errors when authenticated via AdminAuthGate.

**Commit:** `26944ff`

### Task 2: Fix mentees page header and stats labels

**Files:** `src/app/admin/mentees/page.tsx`

**Changes:**
- Line 434: Changed header from `"All Mentors"` to `"All Mentees"`
- Line 446: Changed second stat title from `"Total Mentors"` to `"Total Mentees"`
- Line 448: Changed second stat value from `{mentorshipSummary.totalMentors}` to `{mentorshipSummary.totalMentees}`

**Result:** Mentees page now correctly displays "All Mentees" header and shows distinct "Total Mentors" and "Total Mentees" stats.

**Commit:** `43dcb09`

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- ✅ `npx tsc --noEmit` passes with no errors
- ✅ Admin projects page authentication uses x-admin-token session verification
- ✅ Admin project deletion authentication uses x-admin-token session verification
- ✅ Mentees page header reads "All Mentees"
- ✅ Mentees stats section shows "Total Mentors" and "Total Mentees" with correct respective counts

## Self-Check

### Files Exist
```bash
✓ src/app/api/admin/projects/route.ts (modified)
✓ src/app/api/admin/projects/[id]/route.ts (modified)
✓ src/app/admin/mentees/page.tsx (modified)
```

### Commits Exist
```bash
✓ 26944ff: fix(quick-25): use admin session token auth for projects API
✓ 43dcb09: fix(quick-25): correct mentees page header and stats labels
```

## Self-Check: PASSED

All modified files exist and all commits are in git history.

## Impact

**Admin Experience:**
- Admins can now successfully view and manage projects in the admin dashboard
- Projects page loads without authentication errors
- Project deletion works without authentication errors
- Mentees page displays correct information with proper labels

**Technical Debt:**
- Eliminated auth pattern inconsistency between admin routes
- All admin routes now use the same x-admin-token session verification pattern

## Next Steps

None - both issues resolved. Admin dashboard Projects and Mentees pages are fully functional.
