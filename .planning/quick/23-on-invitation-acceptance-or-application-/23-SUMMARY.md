---
phase: quick-23
plan: 01
subsystem: projects/team-management
tags: [quick, cleanup, atomicity, firestore]
dependency_graph:
  requires: [quick-21, quick-22]
  provides: [complete-team-join-cleanup]
  affects: [project-applications, project-invitations, project-members]
tech_stack:
  added: []
  patterns: [atomic-batch-deletes, stale-data-cleanup]
key_files:
  created: []
  modified:
    - src/app/api/projects/[id]/invitations/[userId]/route.ts
    - src/app/api/projects/[id]/applications/[userId]/route.ts
decisions:
  - "Application records deleted on approval (not left with approved status) - user is now a member"
  - "Invitation acceptance deletes any stale application records atomically"
  - "Application approval deletes both application and invitation records atomically"
  - "Decline actions unchanged - records kept for audit and feedback purposes"
metrics:
  duration: 2
  completed: 2026-02-12
  tasks: 2
  files: 2
  commits: 2
---

# Quick Task 23: Clean up stale invitations/applications on team join

**One-liner:** Atomic deletion of both invitation and application records when a user joins a project via either path, preventing stale data from lingering in the database.

## Overview

When a user joins a project, they can do so via two paths:
1. **Invitation acceptance** - Creator invites user, user accepts
2. **Application approval** - User applies, creator approves

Previously, these paths only cleaned up their own records, leaving stale data from the alternate path. This quick task fixes both paths to ensure complete cleanup.

## Implementation Summary

### Task 1: Add application cleanup to invitation acceptance
**File:** `src/app/api/projects/[id]/invitations/[userId]/route.ts`
**Changes:**
- Added query for existing application record using the same composite key pattern
- Added `batch.delete(applicationRef)` if application exists
- Deletion happens atomically in the same batch as invitation deletion and member creation
- Positioned after user profile fetch and before batch commit for proper sequencing

**Key code:**
```typescript
// Check for any existing application for this user+project
const applicationRef = db.collection("project_applications").doc(invitationId);
const applicationDoc = await applicationRef.get();

// Use Firestore batch for atomicity
const batch = db.batch();

// 1. Delete invitation (accepted invitations are removed)
batch.delete(invitationRef);

// 2. Delete any existing application for this user+project (regardless of status)
if (applicationDoc.exists) {
  batch.delete(applicationRef);
}

// 3. Create project_members document
// 4. Update project stats
// Commit batch
```

### Task 2: Fix application approval to delete both records
**File:** `src/app/api/projects/[id]/applications/[userId]/route.ts`
**Changes:**
- Changed `batch.update(applicationRef, { status: "approved", ... })` to `batch.delete(applicationRef)`
- Application record now deleted on approval instead of being left with "approved" status
- Existing stale invitation deletion logic preserved (already present from quick-21)
- Decline action unchanged - still uses update to keep record for audit/feedback

**Key code:**
```typescript
// Use Firestore batch for atomicity
const batch = db.batch();

// 1. Delete application (approved applications are removed - user is now a member)
batch.delete(applicationRef);

// 2. Delete any stale invitation for this user+project (e.g., previously declined)
if (staleInvitationDoc.exists) {
  batch.delete(staleInvitationRef);
}

// 3. Create project_members document
// 4. Update project stats
// Commit batch
```

## Deviations from Plan

None - plan executed exactly as written.

## Impact

**Database cleanup:**
- No stale invitation or application records remain after a user joins a project
- Both join paths now provide complete cleanup
- All deletions are atomic (within Firestore batch)

**Audit trail preservation:**
- Decline actions still keep records for feedback and audit purposes
- Only successful join paths delete the records

## Verification

**TypeScript compilation:** ✓ Passed with no errors
**Next.js build:** ✓ Succeeded without issues

**Code review confirmed:**
- Invitation accept path: deletes invitation + deletes application (if exists) + creates member
- Application approve path: deletes application + deletes invitation (if exists) + creates member
- Both use atomic Firestore batch writes
- Decline paths unchanged (records kept for audit)

## Key Decisions

1. **Delete vs Update on approval:** Changed from updating application status to deleting the record. Once a user is a member, the application record has served its purpose and should be removed to prevent stale data.

2. **Atomic batch operations:** All deletions happen in the same Firestore batch as member creation and project updates, ensuring consistency.

3. **Preserve decline records:** Decline actions continue to update records (not delete) because they contain valuable feedback and audit information.

## Self-Check: PASSED

**Created files:** None (modified existing files only)

**Modified files:**
- ✓ FOUND: src/app/api/projects/[id]/invitations/[userId]/route.ts
- ✓ FOUND: src/app/api/projects/[id]/applications/[userId]/route.ts

**Commits:**
- ✓ FOUND: 30d0f2d (Task 1: add application cleanup to invitation acceptance)
- ✓ FOUND: 5a9ac4c (Task 2: delete application record on approval instead of updating)

## Related Work

**Builds on:**
- Quick task 21: Introduced stale invitation deletion on application approval
- Quick task 22: Project ownership transfer functionality

**Completes the cleanup pattern** started in quick-21 by ensuring both join paths clean up both record types atomically.
