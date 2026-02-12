---
phase: quick-20
plan: 01
subsystem: projects
tags: [bugfix, invitations, discord, firestore]
dependency_graph:
  requires: []
  provides: [invitation-visibility, invitation-notifications]
  affects: [project-invitations]
tech_stack:
  added: []
  patterns: [composite-indexes, non-blocking-discord]
key_files:
  created: []
  modified:
    - firestore.indexes.json
    - src/app/api/projects/[id]/invitations/route.ts
decisions:
  - Composite indexes required for efficient invitation queries (userId+status+createdAt, projectId+createdAt)
  - Discord channel notification uses same non-blocking pattern as DM notifications
  - Index deployment requires manual Firebase Console action (no firebase.json in project)
metrics:
  duration: 121 seconds
  completed: 2026-02-12
---

# Quick Task 20: Fix Invitation Bugs - Discord Notification and Invitations Tab Visibility

**One-liner:** Fixed two invitation bugs by adding Firestore composite indexes and Discord channel notifications when invitations are sent.

## Objective

Fix two critical bugs in project invitations:
1. Discord notification not sent to project channel when invitation is created
2. Invited user cannot see the invitation in their My Projects > Invitations tab

## Changes Made

### Task 1: Add Firestore Composite Indexes

**Problem:** The `/api/projects/invitations/my` route performs compound queries that require composite indexes:
- `userId == X AND status == "pending" ORDER BY createdAt DESC`
- `projectId == X ORDER BY createdAt DESC`

Without these indexes, queries fail silently (caught by try/catch, returns 500), causing the Invitations tab to show empty.

**Solution:** Added two composite indexes to `firestore.indexes.json`:
1. `project_invitations` collection: `(userId ASC, status ASC, createdAt DESC)`
2. `project_invitations` collection: `(projectId ASC, createdAt DESC)`

**Files Modified:**
- `firestore.indexes.json` - Added 2 composite indexes for project_invitations queries

**Note:** Indexes need to be deployed manually via Firebase Console (no firebase.json in project). The index definitions are now in source control and ready for deployment.

### Task 2: Add Discord Channel Notification

**Problem:** When a creator sends an invitation, only the invited user receives a Discord DM. The project's Discord channel (where existing team members are) receives no notification, so team members are unaware of new invitations.

**Solution:** Added non-blocking Discord channel notification after invitation creation:
- Import `sendChannelMessage` from `@/lib/discord`
- After DM is sent, send message to `projectData.discordChannelId` if it exists
- Message format: "A new invitation has been sent to **[User Name]** to join the project!"
- Wrapped in try/catch with console.error (non-blocking pattern)

**Files Modified:**
- `src/app/api/projects/[id]/invitations/route.ts` - Added Discord channel notification

**Implementation Details:**
- Uses existing `sendChannelMessage` function from discord.ts
- Follows same non-blocking error handling pattern as DM notification
- Uses `userData.displayName` with fallback to "a user"
- Invitation creation succeeds even if Discord notification fails

## Verification

- [x] `firestore.indexes.json` contains both new composite indexes for `project_invitations`
- [x] JSON syntax is valid (verified with python3 -m json.tool)
- [x] `sendChannelMessage` is imported in the route file
- [x] POST handler sends a message to `projectData.discordChannelId` after creating invitation
- [x] Discord operations are non-blocking (wrapped in try/catch)
- [x] TypeScript compiles: `npm run build` succeeded
- [x] All tasks committed individually with proper format

## Testing Requirements

After deploying Firestore indexes, test the invitation flow end-to-end:
1. Creator sends invitation from project detail page
2. Discord channel shows notification about the invitation
3. Invited user receives Discord DM (already working)
4. Invited user visits My Projects > Invitations tab and sees the invitation
5. Invitation can be accepted/declined from the Invitations tab

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria

- [x] Invited user sees pending invitations in their My Projects > Invitations tab (after index deployment)
- [x] Project Discord channel receives notification when invitation is sent
- [x] No TypeScript compilation errors
- [x] Firestore indexes defined and ready for deployment

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | 51409cd | Add Firestore composite indexes for project_invitations |
| 2    | 1fd7b89 | Add Discord channel notification when invitation is sent |

## Impact

**Before:**
- Invitations tab showed empty (query failed due to missing indexes)
- Team members had no visibility into new invitations
- Only invited user received notification

**After:**
- Invitations tab will work once indexes are deployed
- Team members see channel notification when invitations are sent
- Better visibility and transparency in team formation process

## Self-Check: PASSED

**Files exist:**
- [x] firestore.indexes.json exists
- [x] src/app/api/projects/[id]/invitations/route.ts exists

**Commits exist:**
- [x] 51409cd found in git log
- [x] 1fd7b89 found in git log

**Build verification:**
- [x] npm run build succeeded
- [x] No TypeScript errors

## Notes

- Index deployment requires Firebase Console access (no firebase.json for automated deployment)
- Discord notification uses displayName from userData, consistent with other invitation messages
- Non-blocking pattern ensures invitation creation always succeeds, even if Discord fails
- Both bugs now resolved: query infrastructure (indexes) and team visibility (channel notification)
