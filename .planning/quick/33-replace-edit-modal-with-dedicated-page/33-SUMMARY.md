---
phase: quick-33
plan: 1
subsystem: projects-admin
tags: [ux, refactor, routing, admin]
dependency_graph:
  requires: []
  provides:
    - "Full-page edit route at /projects/[id]/edit"
    - "Public PUT endpoint with dual auth support"
  affects:
    - "Admin project management workflow"
    - "Creator project editing experience"
tech_stack:
  added: []
  patterns:
    - "Full-page form over modal for complex editing"
    - "Dual authentication (admin token + Firebase auth)"
    - "Server-side authorization with canEditProject"
key_files:
  created:
    - "src/app/projects/[id]/edit/page.tsx"
  modified:
    - "src/app/api/projects/[id]/route.ts"
    - "src/app/admin/projects/page.tsx"
  deleted:
    - "src/components/admin/EditProjectDialog.tsx"
decisions:
  - "Full-page edit instead of modal for better UX and consistency with detail page"
  - "Shared public PUT endpoint for both admin and creator editing"
  - "Edit link opens in new tab from admin page (target=_blank)"
  - "Admin can edit any project status, creator restricted to pending/declined"
metrics:
  duration: 5
  completed_date: "2026-02-13"
---

# Quick Task 33: Replace Edit Modal with Dedicated Page

**One-liner:** Full-page edit route at /projects/[id]/edit with dual auth support, replacing EditProjectDialog modal for better UX.

## Summary

Replaced the EditProjectDialog modal component with a dedicated full-page edit route at `/projects/[id]/edit`. This improves the editing experience by providing a focused, full-page interface similar to the project detail page layout. The implementation consolidates admin and creator editing into a single route with proper server-side authorization.

### What Was Built

**1. Full-Page Edit Route (`src/app/projects/[id]/edit/page.tsx`)**
- Client component with form pre-populated from project data
- Authorization check using `canEditProject`:
  - Admin: can edit any project status
  - Creator: can only edit pending/declined projects
- Admin token detection via localStorage (ADMIN_TOKEN_KEY)
- Form validation with character counters (title: 3-100, description: 10-2000)
- Dual submission paths:
  - Admin: includes x-admin-token header
  - Creator: uses authFetch for Firebase auth token
- Success redirects to project detail page
- Unauthorized access shows error and auto-redirects

**2. Public PUT Endpoint (`src/app/api/projects/[id]/route.ts`)**
- Extended existing PUT handler to support field updates
- Dual authentication:
  - Admin token: check admin_sessions collection
  - Firebase auth: verify Bearer token
- Authorization logic:
  - Admin: can edit any project at any status
  - Creator: can only edit own projects if status is pending or declined
- Field validation (same rules as admin PATCH endpoint):
  - Title: 3-100 characters
  - Description: 10-2000 characters
  - GitHub repo: https://github.com/ prefix
  - Tech stack: array of strings
  - Difficulty: beginner/intermediate/advanced
  - Max team size: 1-20
- Maintains backward compatibility with action-based updates (approve, decline, complete)
- Returns updated project with serialized timestamps

**3. Admin Page Update (`src/app/admin/projects/page.tsx`)**
- Removed editTarget state variable
- Removed handleEditConfirm function
- Removed EditProjectDialog modal render
- Removed EditProjectDialog import
- Updated Edit action to navigate to `/projects/[id]/edit` in new tab (target="_blank")
- Admin can keep admin page open while editing in separate tab

**4. Component Cleanup**
- Deleted `src/components/admin/EditProjectDialog.tsx`
- Verified no remaining imports in codebase

## Testing Notes

**Authorization Scenarios:**
1. **Creator editing pending project** → should succeed
2. **Creator editing declined project** → should succeed
3. **Creator editing active project** → should fail with 403 error
4. **Admin editing any project status** → should succeed
5. **Non-creator user accessing edit page** → should redirect with error

**Admin Workflow:**
1. Navigate to admin projects page
2. Click Edit action on any project
3. Edit page opens in new tab
4. Make changes and save
5. Redirects to project detail page
6. Admin page remains open in original tab

**Creator Workflow:**
1. Navigate to own pending/declined project
2. Access /projects/{id}/edit directly
3. Form pre-populated with current values
4. Edit and save
5. Redirects to project detail page

## Deviations from Plan

None - plan executed exactly as written.

## Auth Gates

None encountered.

## Performance

- **Duration:** 5 minutes
- **Tasks completed:** 4/4
- **Files created:** 1
- **Files modified:** 2
- **Files deleted:** 1
- **Commits:** 4

## Self-Check

Verifying implementation:

**Created files:**
```bash
[ -f "src/app/projects/[id]/edit/page.tsx" ] && echo "FOUND" || echo "MISSING"
```
FOUND: src/app/projects/[id]/edit/page.tsx

**Modified files:**
```bash
grep "export async function PUT" src/app/api/projects/[id]/route.ts | head -1
```
FOUND: PUT endpoint exists in route.ts

**Deleted files:**
```bash
[ -f "src/components/admin/EditProjectDialog.tsx" ] && echo "EXISTS" || echo "DELETED"
```
DELETED: EditProjectDialog.tsx

**Commits:**
```bash
git log --oneline --all | grep -E "(4d044ad|81e097c|aa81306|657a2d3)"
```
FOUND: All 4 task commits exist
- 4d044ad: feat(quick-33): create full-page edit route
- 81e097c: feat(quick-33): add public PUT endpoint
- aa81306: refactor(quick-33): update admin page to navigate to edit route
- 657a2d3: refactor(quick-33): delete EditProjectDialog modal component

**TypeScript compilation:**
```bash
npx tsc --noEmit
```
PASSED: No compilation errors

## Self-Check: PASSED

All files created/modified/deleted as expected. All commits exist. TypeScript compiles successfully.

---

**Completed:** 2026-02-13
**Executor:** Claude Sonnet 4.5
