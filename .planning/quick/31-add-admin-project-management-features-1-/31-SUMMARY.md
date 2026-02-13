---
phase: quick-31
plan: 1
subsystem: admin-dashboard
tags: [admin, projects, ui, permissions, api]
dependency_graph:
  requires: [quick-30, phase-11-03]
  provides: [admin-edit-projects, discord-contact-display]
  affects: [admin-projects-workflow]
tech_stack:
  added: [EditProjectDialog]
  patterns: [admin-edit-modal, permission-based-access]
key_files:
  created:
    - src/components/admin/EditProjectDialog.tsx
  modified:
    - src/app/admin/projects/page.tsx
    - src/app/api/admin/projects/[id]/route.ts
    - src/lib/permissions.ts
decisions:
  - "Discord contact card displays username with click-to-copy, no email (not in EnrichedProject type)"
  - "Edit action available for all project statuses in admin view"
  - "canEditProject enforces admin-always + creator-before-approval logic"
  - "PATCH endpoint is admin-only via x-admin-token (creator editing would use different route)"
  - "Empty string for optional fields triggers FieldValue.delete() to clear Firestore field"
metrics:
  duration: 3
  completed_date: 2026-02-13
  tasks_completed: 3
  files_modified: 4
---

# Quick Task 31: Add Admin Project Management Features (Part 1)

**One-liner:** Admin projects page now displays Discord contact cards, has Edit action with full form modal, and enforces permission logic where admin can edit any status while creators only edit pending/declined.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add Discord contact card display | c41f0b7 | src/app/admin/projects/page.tsx |
| 2 | Add Edit action and dialog | 69faa42 | src/components/admin/EditProjectDialog.tsx, src/app/admin/projects/page.tsx |
| 3 | Create PATCH endpoint and update permissions | 58cb21f | src/app/api/admin/projects/[id]/route.ts, src/lib/permissions.ts |

## What Was Built

### 1. Discord Contact Card Display

**Implementation:**
- Imported and rendered `ContactInfo` component from `@/components/mentorship/ContactInfo`
- Displays creator's Discord username below avatar with click-to-copy functionality
- Shows warning message when Discord username is not set
- Replaced inline Discord username display with full component integration

**Location:** Admin projects page, creator info section (line ~315)

**Behavior:**
- Click Discord username copies to clipboard with success toast
- Hover shows "Click to copy Discord username" tooltip
- Graceful fallback when username missing

### 2. Edit Project Dialog

**Component:** `src/components/admin/EditProjectDialog.tsx` (219 lines)

**Editable Fields:**
- Title (3-100 chars)
- Description (10-2000 chars, with character counter)
- GitHub Repository (optional, HTTPS validation)
- Tech Stack (comma-separated, converted to array)
- Difficulty (select: beginner/intermediate/advanced)
- Max Team Size (1-20, number input)

**Features:**
- Pre-fills with existing project data
- Client-side validation before submit
- Loading state with spinner during save
- Error display in alert
- Modal backdrop click to cancel

**Integration:**
- Edit action added to dropdown menu (after "View Project")
- Available for all project statuses
- `editTarget` state tracks which project is being edited
- `handleEditConfirm` calls PATCH endpoint and updates local project list
- Toast shows success/error feedback

### 3. PATCH API Endpoint

**Route:** `PATCH /api/admin/projects/[id]`

**Authentication:** Admin-only via x-admin-token session verification

**Validation:**
- Title: 3-100 characters
- Description: 10-2000 characters
- GitHub URL: Must start with `https://github.com/`
- Tech stack: Must be array
- Difficulty: Must be beginner/intermediate/advanced
- Max team size: 1-20

**Behavior:**
- Accepts partial updates (only provided fields are updated)
- Empty string for `githubRepo` triggers `FieldValue.delete()` to clear field
- Updates `updatedAt` and `lastActivityAt` timestamps
- Returns full updated project with ISO date strings
- 400 for validation errors, 404 for not found, 401 for auth failure

### 4. Permission Logic Update

**Function:** `canEditProject` in `src/lib/permissions.ts`

**Before:**
```typescript
return canOwnerOrAdminAccess(user, project);
```

**After:**
```typescript
// Admin can always edit any project
if (isAdminUser(user)) return true;

// Creator can only edit pending or declined projects
if (isOwner(user, project)) {
  return project.status === "pending" || project.status === "declined";
}

return false;
```

**Rationale:**
- Admin needs to edit projects after approval for corrections/updates
- Creator should only edit before approval (pending) or after decline (to fix and resubmit)
- Prevents creators from modifying active/completed projects without admin review

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Email not available in EnrichedProject type**
- **Found during:** Task 1
- **Issue:** Plan specified displaying both email and discordUsername, but email is not fetched in admin projects API or included in EnrichedProject type
- **Fix:** Rendered ContactInfo with only discordUsername prop, skipped email display
- **Files modified:** src/app/admin/projects/page.tsx
- **Commit:** c41f0b7 (inline with Task 1)

No other deviations - plan executed as written.

## Verification Results

✅ **TypeScript Compilation:** `npx tsc --noEmit` passes with no errors

✅ **Component Structure:**
- EditProjectDialog exports default component with correct props interface
- Admin projects page imports and renders all three dialogs (Delete, Decline, Edit)
- Edit action appears in dropdown menu for all projects
- ContactInfo displays below creator name

✅ **API Endpoint:**
- PATCH handler exported from route.ts
- Validates all fields with appropriate error messages
- Updates Firestore with partial object
- Returns updated project with ISO timestamps

✅ **Permission Logic:**
- canEditProject function updated with admin-always + creator-conditional logic
- Admin can edit any project status
- Creator can only edit pending/declined (not active/completed)

✅ **Integration Flow:**
1. Click "Edit Project" in dropdown → opens pre-filled modal
2. Modify fields → form validates locally
3. Click "Save Changes" → sends PATCH request with token
4. Success → updates project in list, closes modal, shows toast
5. Error → displays in alert, keeps modal open

## Key Design Patterns

### 1. Controlled Form State
EditProjectDialog uses useState for each field, initialized with project values. Enables character counter and real-time validation.

### 2. Permission Separation
Admin editing uses `/api/admin/projects/[id]` PATCH (token-based). Creator editing would use `/api/projects/[id]` PATCH (user-based, future implementation).

### 3. Partial Updates
PATCH endpoint accepts any subset of editable fields. Only provided fields are included in Firestore update object.

### 4. Field Deletion
Empty string for optional fields (`githubRepo`) triggers `FieldValue.delete()` to properly clear Firestore field instead of storing empty string.

### 5. Optimistic UI Update
After successful edit, local projects array is updated with new fields without refetching entire list.

## Files Modified

### Created (1 file, 219 lines)
- `src/components/admin/EditProjectDialog.tsx` - Modal form for editing project fields

### Modified (3 files)
- `src/app/admin/projects/page.tsx` - Added ContactInfo display, Edit action, EditProjectDialog rendering, handleEditConfirm handler, editTarget state
- `src/app/api/admin/projects/[id]/route.ts` - Added PATCH handler with validation and Firestore update
- `src/lib/permissions.ts` - Updated canEditProject with admin-always + creator-conditional logic

## Technical Debt

None introduced. All functionality follows existing patterns:
- Modal dialog follows DeleteProjectDialog/DeclineProjectDialog structure
- API authentication matches PUT/DELETE handlers
- Permission function follows canOwnerOrAdminAccess pattern with status check

## Next Steps

**Recommended follow-ups:**
1. Add creator editing endpoint at `/api/projects/[id]` PATCH with canEditProject permission check
2. Add edit action to project detail page for creators (pending/declined only)
3. Add audit log for admin edits (track who changed what)
4. Add field-level change history (optional, for transparency)
5. Consider adding "Last edited by: Admin" badge on edited projects

**Related quick tasks:**
- Add more admin actions (complete, archive, feature, unfeature)
- Add bulk edit for multiple projects
- Add project analytics to admin dashboard

## Self-Check

### Files exist:
```bash
[ -f "src/components/admin/EditProjectDialog.tsx" ] && echo "FOUND" || echo "MISSING"
# FOUND

[ -f "src/app/admin/projects/page.tsx" ] && echo "FOUND" || echo "MISSING"
# FOUND

[ -f "src/app/api/admin/projects/[id]/route.ts" ] && echo "FOUND" || echo "MISSING"
# FOUND

[ -f "src/lib/permissions.ts" ] && echo "FOUND" || echo "MISSING"
# FOUND
```

### Commits exist:
```bash
git log --oneline --all | grep -q "c41f0b7" && echo "FOUND: c41f0b7" || echo "MISSING"
# FOUND: c41f0b7

git log --oneline --all | grep -q "69faa42" && echo "FOUND: 69faa42" || echo "MISSING"
# FOUND: 69faa42

git log --oneline --all | grep -q "58cb21f" && echo "FOUND: 58cb21f" || echo "MISSING"
# FOUND: 58cb21f
```

### Exports exist:
```bash
grep -q "export default function EditProjectDialog" src/components/admin/EditProjectDialog.tsx && echo "FOUND" || echo "MISSING"
# FOUND

grep -q "export async function PATCH" "src/app/api/admin/projects/[id]/route.ts" && echo "FOUND" || echo "MISSING"
# FOUND

grep -q "export function canEditProject" src/lib/permissions.ts && echo "FOUND" || echo "MISSING"
# FOUND
```

## Self-Check: PASSED

All files created, all commits exist, all exports verified, TypeScript compilation succeeds.

---

**Duration:** 3 minutes
**Completed:** 2026-02-13
**Commits:** c41f0b7, 69faa42, 58cb21f
