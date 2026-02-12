---
phase: quick-21
plan: 01
subsystem: projects-team-management
tags: [cleanup, invitations, applications, data-integrity]
dependency_graph:
  requires: []
  provides:
    - "Stale invitation cleanup on application approval"
    - "Stale declined application cleanup on invitation creation"
  affects:
    - "src/app/api/projects/[id]/applications/[userId]/route.ts"
    - "src/app/api/projects/[id]/invitations/route.ts"
tech_stack:
  added: []
  patterns:
    - "Firestore batch operations for atomicity"
    - "Conditional deletion based on document existence"
    - "Status-based cleanup (declined only for applications)"
key_files:
  created: []
  modified:
    - path: "src/app/api/projects/[id]/applications/[userId]/route.ts"
      purpose: "Delete stale invitations on application approval"
      lines_changed: 9
    - path: "src/app/api/projects/[id]/invitations/route.ts"
      purpose: "Delete stale declined applications on invitation creation"
      lines_changed: 7
decisions:
  - decision: "Delete all invitation statuses on approval"
    rationale: "Once a user joins via application, any invitation (pending/declined) becomes obsolete"
    alternatives: ["Only delete declined invitations"]
  - decision: "Only delete declined applications on invitation"
    rationale: "Pending applications should coexist with invitations - creator may not know about pending application"
    alternatives: ["Delete all applications", "Don't delete applications"]
  - decision: "Use Firestore batch for invitation deletion"
    rationale: "Ensures atomic operations when approving application (application+member+project+invitation all succeed or fail together)"
    alternatives: ["Separate delete operation"]
metrics:
  duration: 106
  tasks_completed: 2
  files_modified: 2
  commits: 2
  completed_date: "2026-02-12"
---

# Quick Task 21: Clean Up Stale Invitations/Applications Summary

**One-liner:** Automatic cross-collection cleanup of declined invitations/applications when user joins project through alternate path

## Overview

Implemented bidirectional cleanup logic to remove stale records when a user joins a project through the opposite flow (application vs invitation). This prevents declined invitations from lingering in the "Sent invitations" list and declined applications from cluttering the applications view.

## What Was Built

### Task 1: Delete Stale Invitation on Application Approval
**Commit:** 4480d4f
**Files:** src/app/api/projects/[id]/applications/[userId]/route.ts

Added cleanup logic in the application approval flow:
1. Fetch stale invitation document BEFORE creating Firestore batch (read operations can't be batched)
2. Conditionally add delete to batch if invitation exists (any status)
3. Delete executes atomically with application approval, member creation, and project update

**Key implementation details:**
- Uses composite key `${projectId}_${userId}` (applicationId variable) matching invitation format
- Delete is inside batch for atomicity - all operations succeed or fail together
- Handles any invitation status (pending/declined) since user is now a member

### Task 2: Delete Stale Declined Application on Invitation Creation
**Commit:** c724927
**Files:** src/app/api/projects/[id]/invitations/route.ts

Added cleanup logic in the invitation creation flow:
1. Fetch stale application document after validation checks
2. Check if application exists AND status is "declined"
3. Delete declined application before creating invitation

**Key implementation details:**
- Uses composite key `${projectId}_${userId}` (invitationId variable) matching application format
- Only deletes declined applications - pending applications coexist with invitations
- Executes before invitation creation but after all validation checks

## Technical Decisions

### Why delete all invitation statuses but only declined applications?

**Application approval scenario:**
- When a user is approved as a member, they're joining the team
- Any invitation (pending or declined) is now obsolete - they're already in
- Clean slate: delete all invitation statuses

**Invitation creation scenario:**
- When creator sends invitation, they may not know about pending application
- Both flows should coexist - user can accept whichever comes first
- Only declined applications are truly stale (user explicitly rejected project)
- Pending applications still represent user interest

### Why use batch for invitation delete but not application delete?

**Invitation delete (Task 1):**
- Part of approval flow that already uses batch
- Must be atomic with application status, member creation, project update
- If member creation fails, invitation shouldn't be deleted

**Application delete (Task 2):**
- Happens during invitation creation (simpler flow)
- No other atomic operations required
- Cleaner to do direct delete before invitation creation

## Verification

- TypeScript compilation passes (only pre-existing errors in functions/ directory)
- Both cleanup paths confirmed via grep:
  - Application approval: lines 75-76, 111-114 in applications/[userId]/route.ts
  - Invitation creation: lines 102-107 in invitations/route.ts
- Composite keys verified: both use `${projectId}_${userId}` format
- Status checks confirmed: invitation delete (any status), application delete (declined only)

## Success Criteria Met

- [x] Scenario 1 (invite->decline->apply->approve): When application is approved, any invitation is deleted atomically
- [x] Scenario 2 (apply->decline->invite): When invitation is sent, declined application is deleted
- [x] No regressions: existing approve/decline/accept flows unchanged
- [x] TypeScript compiles without errors (in modified files)

## Deviations from Plan

None - plan executed exactly as written.

## Impact

**User Experience:**
- Creators no longer see stale declined invitations after users join via application
- Creators no longer see stale declined applications after sending invitations
- Cleaner admin UI for managing team formation

**Data Integrity:**
- Prevents duplicate/contradictory records (user both invited and member)
- Maintains clean state in project_invitations and project_applications collections
- Atomic operations ensure consistency

**Edge Cases Handled:**
- User declines invitation, then applies and gets approved: invitation cleaned up
- User declines application (via creator decline), creator later invites: application cleaned up
- Pending applications preserved when invitation sent (both can coexist)

## Self-Check: PASSED

### Created Files
None (modification-only task)

### Modified Files
- FOUND: src/app/api/projects/[id]/applications/[userId]/route.ts
- FOUND: src/app/api/projects/[id]/invitations/route.ts

### Commits
- FOUND: 4480d4f (Task 1: Delete stale invitation on application approval)
- FOUND: c724927 (Task 2: Delete stale declined application on invitation creation)

All files exist and all commits are in repository. Self-check passed.
