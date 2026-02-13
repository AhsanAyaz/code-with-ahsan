---
phase: quick-23
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/projects/[id]/invitations/[userId]/route.ts
  - src/app/api/projects/[id]/applications/[userId]/route.ts
autonomous: true
must_haves:
  truths:
    - "When an invitation is accepted, any application records for that user+project are deleted"
    - "When an application is approved, the application record itself is deleted (not left as approved)"
    - "When an application is approved, any invitation records for that user+project are deleted"
    - "No stale invitation or application records remain after a user becomes a member"
  artifacts:
    - path: "src/app/api/projects/[id]/invitations/[userId]/route.ts"
      provides: "Invitation accept handler with application cleanup"
      contains: "project_applications"
    - path: "src/app/api/projects/[id]/applications/[userId]/route.ts"
      provides: "Application approve handler that deletes both records"
      contains: "batch.delete"
  key_links:
    - from: "invitations/[userId]/route.ts accept action"
      to: "project_applications collection"
      via: "batch.delete in accept block"
      pattern: "project_applications.*delete"
    - from: "applications/[userId]/route.ts approve action"
      to: "project_applications and project_invitations collections"
      via: "batch.delete for both records"
      pattern: "batch\\.delete"
---

<objective>
Fix stale data cleanup on both invitation acceptance and application approval paths.

Purpose: When a user joins a project (via either path), ALL invitation and application records for that user+project must be deleted to prevent stale data lingering in the database.

Output: Updated route handlers that clean up both collections atomically.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/api/projects/[id]/invitations/[userId]/route.ts
@src/app/api/projects/[id]/applications/[userId]/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add application cleanup to invitation acceptance</name>
  <files>src/app/api/projects/[id]/invitations/[userId]/route.ts</files>
  <action>
In the `accept` action block (around line 48), BEFORE the batch.commit():

1. Check for any existing application for this user+project:
   - Use the same composite key pattern: `const applicationRef = db.collection("project_applications").doc(invitationId);`
   - `const applicationDoc = await applicationRef.get();`

2. If the application exists (regardless of status - pending, declined, approved), add it to the batch for deletion:
   - `if (applicationDoc.exists) { batch.delete(applicationRef); }`

This must be added BEFORE `await batch.commit()` (currently line 105) so the deletion is atomic with the invitation deletion and member creation.

Place the application check right after fetching the user profile (after line 73) and add the batch.delete right after the existing `batch.delete(invitationRef)` on line 79, keeping the batch operations grouped together.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no TypeScript errors. Read the file and confirm:
1. The accept block queries project_applications collection
2. The batch.delete for applications is inside the batch before commit
3. The existing invitation deletion and member creation logic is unchanged
  </verify>
  <done>Invitation acceptance atomically deletes any application record for the same user+project</done>
</task>

<task type="auto">
  <name>Task 2: Fix application approval to delete both records instead of updating</name>
  <files>src/app/api/projects/[id]/applications/[userId]/route.ts</files>
  <action>
In the `approve` action block (around line 48):

1. Change the application status update (lines 82-86) from `batch.update(applicationRef, { status: "approved", ... })` to `batch.delete(applicationRef)`. The application record should be DELETED on approval, not left with "approved" status. The user is now a member - the application has served its purpose.

2. The existing stale invitation deletion logic (lines 76-77, 112-114) is already correct - it checks for and deletes the invitation. Keep this as-is.

Summary of changes in the approve batch:
- `batch.delete(applicationRef)` (was: batch.update with approved status)
- `batch.delete(staleInvitationRef)` if exists (already present, keep as-is)
- `batch.set(memberRef, ...)` (keep as-is)
- `batch.update(projectRef, ...)` (keep as-is)

Do NOT change the decline action block - declined applications should stay for audit/feedback purposes (they get cleaned up by the invitation POST handler from quick task 21).
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no TypeScript errors. Read the file and confirm:
1. The approve block uses batch.delete(applicationRef) not batch.update
2. The stale invitation deletion is still present
3. The decline block is unchanged (still uses applicationRef.update with status: "declined")
4. Member creation and project update are unchanged
  </verify>
  <done>Application approval atomically deletes the application record and any invitation record, leaving only the project_members record</done>
</task>

</tasks>

<verification>
After both tasks:
1. `npx tsc --noEmit` passes with no errors
2. `npm run build` succeeds (or at minimum `next lint` passes)
3. Code review confirms:
   - Invitation accept path: deletes invitation + deletes application (if exists) + creates member
   - Application approve path: deletes application + deletes invitation (if exists) + creates member
   - Both use atomic Firestore batch writes
   - Decline paths are unchanged (decline keeps the record for audit)
</verification>

<success_criteria>
- No stale application or invitation records remain after a user joins a project via either path
- Both cleanup operations are atomic (within Firestore batch)
- Decline behavior is preserved (records kept for audit/feedback)
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/23-on-invitation-acceptance-or-application-/23-SUMMARY.md`
</output>
