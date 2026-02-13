---
task_number: 28
type: quick
autonomous: true
files_modified:
  - src/app/projects/[id]/page.tsx
---

# Quick Task 28: Hide Invite Input on Declined/Pending Projects

## Objective

Prevent users from applying to or inviting others to projects with 'declined' or 'pending' status. Only projects with 'active' status (and 'completed' if appropriate) should allow team member invitations and applications.

**Purpose:** Improve UX by preventing invalid actions on projects that aren't ready for team formation.

**Output:** Updated project detail page with status-based conditional rendering for invite section and Apply button.

## Context

The project detail page currently shows:
1. **Invite Team Members section** (lines 854-880) - visible to creators
2. **Apply to Join section** (lines 930-941) - visible to non-members who aren't creators

Both sections should only appear when the project status allows team participation.

## Tasks

### Task 1: Add Status Check to Creator Invite Section

**Files:** `src/app/projects/[id]/page.tsx`

**Action:**
Wrap the "Invite Team Members" section (lines 853-880) in a conditional that checks `project.status === 'active'`. This section should only be visible to creators when the project is actively recruiting.

Update the JSX structure:
```tsx
{isCreator && project.status === 'active' && (
  <div>
    <h2 className="text-xl font-semibold mb-4">Invite Team Members</h2>
    {/* existing invite form code */}
  </div>
)}
```

**Verify:**
1. Navigate to a project with status 'pending' or 'declined' as the creator
2. Verify "Invite Team Members" section is NOT visible
3. Navigate to a project with status 'active' as the creator
4. Verify "Invite Team Members" section IS visible

**Done:** Creators cannot see or use the invite input when project status is 'pending' or 'declined'.

### Task 2: Add Status Check to Apply to Join Section

**Files:** `src/app/projects/[id]/page.tsx`

**Action:**
Update the condition for the "Apply to Join" section (line 930) to include a status check. Non-creators should only be able to apply when the project is 'active'.

Change from:
```tsx
{user && !isCreator && !isMember && !userApplication && !userInvitation && (
```

To:
```tsx
{user && !isCreator && !isMember && !userApplication && !userInvitation && project.status === 'active' && (
```

**Rationale:** Users shouldn't be able to apply to projects that are pending admin approval or have been declined.

**Verify:**
1. Navigate to a project with status 'pending' or 'declined' as a non-member
2. Verify "Apply to Join" section with ApplicationForm is NOT visible
3. Navigate to a project with status 'active' as a non-member
4. Verify "Apply to Join" section IS visible

**Done:** Non-members cannot see or submit applications when project status is 'pending' or 'declined'.

## Verification

**Manual Testing:**
1. Test as creator on projects with different statuses (pending, declined, active, completed)
2. Test as non-member on projects with different statuses
3. Verify no invite section on non-active projects for creators
4. Verify no apply button on non-active projects for non-members
5. Verify existing functionality remains intact for active projects

**Expected Behavior:**
- **Pending project:** No invite section, no apply button (project awaiting admin approval)
- **Declined project:** No invite section, no apply button (project rejected by admin)
- **Active project:** Invite section visible (creator only), apply button visible (non-members)
- **Completed project:** No invite section (recruiting closed), no apply button (project finished)

## Success Criteria

- [ ] "Invite Team Members" section only visible when `isCreator && project.status === 'active'`
- [ ] "Apply to Join" section only visible when `user && !isCreator && !isMember && !userApplication && !userInvitation && project.status === 'active'`
- [ ] Manual testing confirms sections are hidden on pending/declined projects
- [ ] Manual testing confirms sections appear correctly on active projects
- [ ] No regression in existing invite/apply functionality

## Notes

**Status Rationale:**
- **pending:** Project awaiting admin approval - shouldn't recruit yet
- **declined:** Project rejected by admin - shouldn't recruit
- **active:** Project approved and active - can recruit team members
- **completed:** Project finished - recruiting closed (no new members needed)

This change prevents confusion and invalid actions while keeping the UX clean for users viewing non-active projects.
