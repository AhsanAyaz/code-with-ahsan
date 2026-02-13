---
phase: quick-26
plan: 01
subsystem: admin
tags: [admin-ui, project-management, workflow, discord-integration]
dependency_graph:
  requires: [quick-24, quick-25, phase-11]
  provides: [admin-project-approval-workflow, admin-project-decline-workflow]
  affects: [admin-dashboard, project-lifecycle]
tech_stack:
  added: []
  patterns: [admin-session-auth, optimistic-ui-updates, non-blocking-discord]
key_files:
  created:
    - src/components/admin/DeclineProjectDialog.tsx
  modified:
    - src/app/api/admin/projects/[id]/route.ts
    - src/app/admin/projects/page.tsx
decisions: []
metrics:
  duration: 2.6
  completed: 2026-02-13
---

# Quick Task 26: Add Approve and Decline Actions to Admin

**One-liner:** Admin can now approve/decline pending projects directly from admin dashboard with Discord channel creation and DM notifications.

## Objective

Enable admins to approve/decline project proposals directly from the admin projects page without needing Firebase Auth. Pending projects show "Approve" and "Decline" actions in the Actions dropdown.

## Implementation

### Task 1: Add PUT handler to admin projects API for approve/decline

**Files modified:**
- `src/app/api/admin/projects/[id]/route.ts`

**Changes:**
1. **Added PUT handler** with x-admin-token authentication (same pattern as existing DELETE)
2. **Approve action (`action === "approve"`)**:
   - Verifies project is pending
   - Updates project: `status=active`, `approvedAt=serverTimestamp`, `approvedBy="admin"`
   - Creates Discord channel (non-blocking):
     - Fetches creator's discordUsername from mentorship_profiles
     - Calls createProjectChannel with project details
     - Updates project with discordChannelId and discordChannelUrl
     - Sends and pins project details message
   - Returns success with Discord channel info
3. **Decline action (`action === "decline"`)**:
   - Validates declineReason exists and is >= 10 chars (returns 400 if invalid)
   - Verifies project is pending
   - Updates project: `status=declined`, `declinedAt=serverTimestamp`, `declinedBy="admin"`, `declineReason`
   - Sends Discord DM to creator (non-blocking):
     - Fetches creator's discordUsername
     - Sends DM with project title, reason, and resubmit link
   - Returns success
4. **Admin session verification**: Checks x-admin-token header, verifies session doc in admin_sessions collection, checks expiry
5. **Error handling**: Returns appropriate status codes (401 for auth, 400 for validation, 404 for not found, 500 for server errors)

**Commit:** `5ef8930`

### Task 2: Create DeclineProjectDialog and update admin projects page with approve/decline actions

**Files created:**
- `src/components/admin/DeclineProjectDialog.tsx`

**Files modified:**
- `src/app/admin/projects/page.tsx`

**Changes:**

**DeclineProjectDialog component:**
1. **Props interface**: `{ project: EnrichedProject, onConfirm: (reason: string) => Promise<void>, onCancel: () => void }`
2. **Single-step modal**:
   - Title: "Decline Project" with warning styling
   - Project info card showing title, status badge, and creator name
   - Textarea for decline reason with placeholder
   - Character counter: "X/10 minimum characters"
   - Ready indicator: "Ready" (green) when >= 10 chars, "Minimum 10 characters required" (red) otherwise
   - Error alert if submission fails
   - Buttons: "Cancel" and "Confirm Decline" (btn-error, disabled when reason < 10 chars or submitting)
   - Loading spinner on submit
3. **State management**: reason, isSubmitting, error
4. **Follows DeleteProjectDialog pattern** for consistency

**Admin projects page:**
1. **New imports**: DeclineProjectDialog
2. **New state**:
   - `actionLoading: string | null` - tracks which project has in-flight approve action
   - `declineTarget: EnrichedProject | null` - controls decline dialog visibility
3. **handleApprove function**:
   - Sets actionLoading to project.id
   - Fetches admin token from localStorage
   - Calls PUT `/api/admin/projects/${project.id}` with `{ action: "approve" }`
   - On success: shows toast, updates project status to "active" in state (optimistic UI)
   - On error: shows error toast
   - Finally: clears actionLoading
4. **handleDeclineConfirm function**:
   - Fetches admin token from localStorage
   - Calls PUT `/api/admin/projects/${declineTarget.id}` with `{ action: "decline", declineReason: reason }`
   - On success: shows toast, updates project status to "declined" in state, closes dialog
   - On error: throws error (dialog shows error state)
5. **Updated Actions dropdown**:
   - "View Project" link (all projects)
   - Conditional section for `status === "pending"`:
     - Divider
     - "Approve" button (text-success, onClick calls handleApprove, disabled when loading, shows spinner)
     - "Decline" button (text-warning, onClick opens decline dialog)
   - Divider
   - "Delete Project" button (all projects)
6. **Render DeclineProjectDialog**: Conditionally rendered when declineTarget is set

**Commit:** `02e3e58`

## Verification

1. **TypeScript compilation**: No errors
2. **Build**: Completed successfully
3. **Pending project Actions dropdown**: Shows "View Project", "Approve", "Decline", "Delete Project"
4. **Active/completed project Actions dropdown**: Shows "View Project", "Delete Project" only
5. **Approve action**: Calls PUT `/api/admin/projects/[id]` with `action=approve`, updates UI optimistically
6. **Decline action**: Opens dialog, requires 10+ char reason, calls PUT with `action=decline` and `declineReason`

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria

- [x] Admin can approve pending projects from admin dashboard (creates Discord channel)
- [x] Admin can decline pending projects with required reason (min 10 chars)
- [x] Approve/decline actions only shown for pending projects
- [x] View and Delete actions remain for all projects
- [x] All actions use x-admin-token authentication (not Firebase Auth)

## Impact

### Before
- Admin projects page only showed "View Project" and "Delete Project" actions
- Approving/declining projects required Firebase Console or separate workflow

### After
- Pending projects show "Approve" and "Decline" in Actions dropdown
- Admin can approve projects with one click (creates Discord channel, sends details message)
- Admin can decline with reason input (sends DM to creator with feedback)
- Optimistic UI updates provide instant feedback
- All operations use admin session authentication (consistent with other admin pages)

### Related Files
- `src/app/api/admin/projects/[id]/route.ts` - Admin API for project management (DELETE, PUT)
- `src/app/admin/projects/page.tsx` - Admin projects dashboard
- `src/components/admin/DeclineProjectDialog.tsx` - Decline reason input modal
- `src/components/admin/DeleteProjectDialog.tsx` - Delete confirmation modal (existing pattern)

## Self-Check

**Files created:**
```bash
[ -f "/Users/amu1o5/personal/code-with-ahsan/src/components/admin/DeclineProjectDialog.tsx" ] && echo "FOUND" || echo "MISSING"
# FOUND
```

**Commits exist:**
```bash
git log --oneline --all | grep -q "5ef8930" && echo "FOUND: 5ef8930" || echo "MISSING: 5ef8930"
# FOUND: 5ef8930
git log --oneline --all | grep -q "02e3e58" && echo "FOUND: 02e3e58" || echo "MISSING: 02e3e58"
# FOUND: 02e3e58
```

**Self-Check: PASSED**

All claimed files exist and all commits are present in git history.
