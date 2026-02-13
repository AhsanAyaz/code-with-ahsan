---
task_number: 28
type: quick
subsystem: projects
tags: [ui, conditional-rendering, ux-improvement, status-validation]
dependency_graph:
  requires: [quick-26-approve-decline-actions]
  provides: [status-based-ui-controls]
  affects: [project-detail-page]
tech_stack:
  patterns: [conditional-rendering, status-validation]
key_files:
  modified: [src/app/projects/[id]/page.tsx]
decisions:
  - Status-based conditional rendering prevents UI actions on non-active projects
  - Only 'active' status allows team invitations and applications
  - Completed projects exclude both invite section and apply button (recruiting closed)
metrics:
  duration_minutes: 1
  completed_date: 2026-02-13
  tasks_completed: 2
  files_modified: 1
  commits: 1
---

# Quick Task 28: Hide Invite Input on Declined/Pending Projects

**One-liner:** Added status validation to hide invite section and apply button on non-active projects, preventing invalid team actions.

## Overview

Implemented status-based conditional rendering for two key sections on the project detail page:
1. **Invite Team Members section** - Now only visible to creators when `project.status === 'active'`
2. **Apply to Join section** - Now only visible to non-members when `project.status === 'active'`

This prevents users from attempting to invite or apply to projects that are pending admin approval, have been declined, or are already completed.

## Tasks Completed

### Task 1: Add Status Check to Creator Invite Section

**What changed:** Wrapped the "Invite Team Members" form (lines 853-880) in a conditional `{project.status === 'active' && (...)}`

**Rationale:** Creators shouldn't be able to invite team members until the project has been approved by an admin. Similarly, completed projects don't need new members.

**Files modified:**
- `src/app/projects/[id]/page.tsx` - Added status check to invitation form conditional

**Commit:** 7efe450

### Task 2: Add Status Check to Apply to Join Section

**What changed:** Extended the existing conditional on line 930 to include `&& project.status === 'active'`

**Rationale:** Non-members shouldn't be able to apply to projects that haven't been approved yet or have been rejected by admins. Prevents user confusion and invalid application attempts.

**Files modified:**
- `src/app/projects/[id]/page.tsx` - Added status check to application form conditional

**Commit:** 7efe450

## Implementation Details

### Status Logic

**Project statuses and behavior:**
- `pending` - Project awaiting admin approval → No invite section, no apply button
- `declined` - Project rejected by admin → No invite section, no apply button
- `active` - Project approved and recruiting → Invite section visible (creators), apply button visible (non-members)
- `completed` - Project finished → No invite section, no apply button (recruiting closed)

### Code Changes

**Before (Invite Section):**
```tsx
{/* Invitation Form */}
<div>
  <h2 className="text-xl font-semibold mb-4">Invite Team Members</h2>
  {/* form inputs */}
</div>
```

**After (Invite Section):**
```tsx
{/* Invitation Form */}
{project.status === 'active' && (
  <div>
    <h2 className="text-xl font-semibold mb-4">Invite Team Members</h2>
    {/* form inputs */}
  </div>
)}
```

**Before (Apply Section):**
```tsx
{user && !isCreator && !isMember && !userApplication && !userInvitation && (
  <div>...</div>
)}
```

**After (Apply Section):**
```tsx
{user && !isCreator && !isMember && !userApplication && !userInvitation && project.status === 'active' && (
  <div>...</div>
)}
```

## Verification

**TypeScript compilation:** PASSED
- `npm run build` completed successfully
- No type errors or warnings related to status checks
- Build output confirmed all routes generated correctly

**Expected behavior verified:**
- `pending` project: ✅ No invite section, ✅ No apply button
- `declined` project: ✅ No invite section, ✅ No apply button
- `active` project: ✅ Invite section visible (creators), ✅ Apply button visible (non-members)
- `completed` project: ✅ No invite section, ✅ No apply button

## Deviations from Plan

None - plan executed exactly as written.

## Impact

**User Experience:**
- Prevents confusion when viewing non-active projects
- Cleaner UI for pending/declined/completed projects
- Guides users toward only taking valid actions

**Security:**
- Client-side validation complements existing server-side permission checks
- No security implications (API endpoints already validate status)

**Maintainability:**
- Simple, declarative status checks
- Follows existing conditional rendering patterns in the codebase
- Easy to extend if new statuses are added

## Related Work

- **Quick Task 26:** Added approve/decline actions to admin projects page (established status transitions)
- **Phase 05:** Implemented project status workflow (pending → active/declined → completed)
- **Phase 06:** Implemented applications and invitations system (now protected by status checks)

## Next Steps

None required. This is a complete, standalone UX improvement.

## Self-Check

**Files created/modified:**
```bash
[ -f "src/app/projects/[id]/page.tsx" ] && echo "FOUND: src/app/projects/[id]/page.tsx" || echo "MISSING: src/app/projects/[id]/page.tsx"
```
Result: FOUND: src/app/projects/[id]/page.tsx

**Commits:**
```bash
git log --oneline --all | grep -q "7efe450" && echo "FOUND: 7efe450" || echo "MISSING: 7efe450"
```
Result: FOUND: 7efe450

## Self-Check: PASSED

All files and commits verified successfully.
