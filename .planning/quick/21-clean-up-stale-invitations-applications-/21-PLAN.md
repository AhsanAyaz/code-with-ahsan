---
phase: quick-21
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/projects/[id]/applications/[userId]/route.ts
  - src/app/api/projects/[id]/invitations/route.ts
autonomous: true
must_haves:
  truths:
    - "When creator accepts an application, any declined invitation for the same user+project is deleted"
    - "When creator sends an invitation, any declined application for the same user+project is deleted"
  artifacts:
    - path: "src/app/api/projects/[id]/applications/[userId]/route.ts"
      provides: "Stale invitation cleanup on application approval"
      contains: "project_invitations.*delete"
    - path: "src/app/api/projects/[id]/invitations/route.ts"
      provides: "Stale application cleanup on invitation creation"
      contains: "project_applications.*delete"
  key_links:
    - from: "src/app/api/projects/[id]/applications/[userId]/route.ts"
      to: "project_invitations collection"
      via: "batch.delete in approve block"
      pattern: "project_invitations.*delete"
    - from: "src/app/api/projects/[id]/invitations/route.ts"
      to: "project_applications collection"
      via: "delete before invitation creation"
      pattern: "project_applications.*delete"
---

<objective>
Clean up stale declined invitations/applications when a user joins a project through the alternate path.

Purpose: When a user joins via application after declining an invitation (or vice versa), the declined record lingers in the creator's "Sent invitations" or applications list. These stale records should be deleted automatically.

Output: Two API routes updated with cross-collection cleanup logic.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/api/projects/[id]/applications/[userId]/route.ts
@src/app/api/projects/[id]/invitations/route.ts
@src/app/api/projects/[id]/invitations/[userId]/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Delete stale invitation on application approval</name>
  <files>src/app/api/projects/[id]/applications/[userId]/route.ts</files>
  <action>
In the `action === "approve"` block of the PUT handler, add a batch delete for any existing invitation for the same user+project combo. This must happen INSIDE the existing Firestore batch (before `batch.commit()`) for atomicity.

After the existing batch operations (update application status, create member, update project), add:

```
// 4. Delete any stale invitation for this user+project (e.g., previously declined)
const staleInvitationRef = db.collection("project_invitations").doc(applicationId);
// applicationId is already `${projectId}_${userId}` which is the same composite key format used for invitations
const staleInvitationDoc = await staleInvitationRef.get();
if (staleInvitationDoc.exists) {
  batch.delete(staleInvitationRef);
}
```

Note: `applicationId` is already defined as `${projectId}_${userId}` on line 33, which matches the invitation composite key format. The stale invitation lookup MUST happen before `batch.commit()` but the `get()` call must be outside the batch (Firestore batches only support write operations). Place the `get()` check before the batch is created or right after the batch is created but before commit. The `batch.delete()` goes inside the batch.

Specifically: Place the staleInvitationRef definition and get() call BEFORE the `const batch = db.batch()` line (around line 76), then add `batch.delete(staleInvitationRef)` inside the batch if the doc exists.
  </action>
  <verify>
Run `npx tsc --noEmit` to verify TypeScript compilation passes. Review the code to confirm:
1. The stale invitation doc is fetched BEFORE batch.commit()
2. The batch.delete is conditional (only if doc exists)
3. The composite key used is `${projectId}_${userId}` matching the invitation key format
  </verify>
  <done>When an application is approved, any existing invitation document (declined or otherwise) for the same projectId+userId is deleted atomically as part of the same batch write.</done>
</task>

<task type="auto">
  <name>Task 2: Delete stale application on invitation creation</name>
  <files>src/app/api/projects/[id]/invitations/route.ts</files>
  <action>
In the POST handler, after the "already a team member" check (line 86) and the "invitation already sent" check (line 100), but BEFORE creating the invitation document (line 103), add cleanup for any declined application:

```
// Delete any stale declined application for this user+project
const staleApplicationRef = db.collection("project_applications").doc(invitationId);
// invitationId is already `${projectId}_${userId}` which matches application composite key format
const staleApplicationDoc = await staleApplicationRef.get();
if (staleApplicationDoc.exists && staleApplicationDoc.data()?.status === "declined") {
  await staleApplicationRef.delete();
}
```

IMPORTANT: Only delete applications with status "declined". Do NOT delete pending applications -- if a user has a pending application and the creator sends an invitation, both should coexist (the creator may not know about the pending application). Only declined applications are stale.

Place this code block after line 100 (the invitation already sent check) and before line 103 (the invitation data creation). The `invitationId` variable is already defined as `${projectId}_${userId}` on line 89 which matches the application composite key format.
  </action>
  <verify>
Run `npx tsc --noEmit` to verify TypeScript compilation passes. Review the code to confirm:
1. Only declined applications are deleted (status check)
2. The composite key used is `${projectId}_${userId}` matching the application key format
3. The delete happens before the invitation is created
4. Pending applications are NOT affected
  </verify>
  <done>When a creator sends an invitation, any declined application for the same projectId+userId is automatically deleted, preventing stale records from showing in the applications list.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. Code review confirms both cleanup paths:
   - Application approval -> deletes stale invitation (any status, inside batch)
   - Invitation creation -> deletes stale declined application (only declined status)
3. Both use the same `${projectId}_${userId}` composite key pattern already established in the codebase
</verification>

<success_criteria>
- Scenario 1 (invite->decline->apply->approve): When application is approved, the declined invitation is deleted from project_invitations collection
- Scenario 2 (apply->decline->invite): When invitation is sent, the declined application is deleted from project_applications collection
- No regressions: existing approve/decline/accept flows work unchanged
- TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/21-clean-up-stale-invitations-applications-/21-SUMMARY.md`
</output>
