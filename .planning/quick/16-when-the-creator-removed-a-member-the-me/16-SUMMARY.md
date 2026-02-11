---
phase: quick-016
plan: 01
subsystem: Projects
tags: [discord, permissions, team-management]
dependency-graph:
  requires: []
  provides:
    - Reliable Discord access revocation for project members
    - Creator Discord access protection
  affects:
    - src/app/api/projects/[id]/members/[memberId]/route.ts
    - src/app/api/projects/[id]/leave/route.ts
tech-stack:
  added: []
  patterns:
    - Robust fallback resolution for Discord usernames
    - Permission owner protection in removal flows
key-files:
  created: []
  modified:
    - src/app/api/projects/[id]/members/[memberId]/route.ts
    - src/app/api/projects/[id]/leave/route.ts
decisions: []
metrics:
  duration: 71
  completed: 2026-02-11
---

# Quick Task 016: Fix Discord Access Revocation for Project Members

**One-liner:** Fixed Discord channel access revocation to use robust username resolution and protect creator's permanent access.

## Summary

Fixed two critical issues with Discord channel access management when project members are removed or leave:

1. **Robust Discord username resolution**: Both endpoints now use a fallback pattern that checks `mentorship_profiles.discordUsername` first, then falls back to `project_members.userProfile.discordUsername`. This ensures Discord operations succeed even if the mentorship profile doesn't have the Discord username populated.

2. **Creator access protection**: Added guards to prevent the project creator's Discord channel access from being revoked when they are removed or leave as a team member. The creator owns the channel and their access was granted at channel creation time, so it should be permanent. The departure message is still sent (so the team sees they left), but their permission overwrite is not deleted.

## Tasks Completed

| # | Task | Files Modified | Commit |
|---|------|----------------|--------|
| 1 | Fix Discord access revocation in member removal and leave endpoints | `src/app/api/projects/[id]/members/[memberId]/route.ts`<br>`src/app/api/projects/[id]/leave/route.ts` | a96c872 |

## Technical Details

### Changes to Member Removal Endpoint

**File**: `src/app/api/projects/[id]/members/[memberId]/route.ts`

1. Added robust Discord username resolution:
   ```typescript
   const discordUsername = memberProfileData?.discordUsername || memberData?.userProfile?.discordUsername;
   ```

2. Added creator protection guard before `removeMemberFromChannel`:
   ```typescript
   if (discordUsername && memberUserId !== projectData?.creatorId) {
     await removeMemberFromChannel(channelId, discordUsername);
   }
   ```

3. Departure message is still sent for all members (including creator).

### Changes to Leave Endpoint

**File**: `src/app/api/projects/[id]/leave/route.ts`

1. Added `const memberData = memberDoc.data();` to access member document data.

2. Added robust Discord username resolution:
   ```typescript
   const discordUsername = memberProfileData?.discordUsername || memberData?.userProfile?.discordUsername;
   ```

3. Added creator protection guard before `removeMemberFromChannel`:
   ```typescript
   if (discordUsername && userId !== projectData?.creatorId) {
     await removeMemberFromChannel(channelId, discordUsername);
   }
   ```

4. Departure message is still sent for all members (including creator).

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes with no type errors
- Code review confirmed:
  - Both endpoints resolve `discordUsername` with fallback from member document
  - Both endpoints skip `removeMemberFromChannel` when member is project creator
  - Both endpoints still send departure/removal channel message for all members including creator
  - All Discord operations remain wrapped in try/catch (non-blocking)

## Success Criteria Met

- ✅ When a non-creator member is removed: their Discord channel permission overwrite is deleted (access revoked)
- ✅ When a non-creator member leaves: their Discord channel permission overwrite is deleted (access revoked)
- ✅ When the project creator is removed or leaves as a member: their Discord channel permission overwrite is NOT deleted (access preserved)
- ✅ Discord username resolution works even if mentorship_profiles doesn't have discordUsername (falls back to member document)

## Self-Check

### File Existence Check
```bash
# Both files were modified (not created)
[ -f "src/app/api/projects/[id]/members/[memberId]/route.ts" ] && echo "FOUND"
[ -f "src/app/api/projects/[id]/leave/route.ts" ] && echo "FOUND"
```

### Commit Existence Check
```bash
git log --oneline --all | grep -q "a96c872" && echo "FOUND: a96c872"
```

## Self-Check: PASSED

All files exist and commit is in git history.
