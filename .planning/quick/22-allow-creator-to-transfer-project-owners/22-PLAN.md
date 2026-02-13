---
phase: quick-22
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/projects/[id]/transfer/route.ts
  - src/app/projects/[id]/page.tsx
  - src/components/projects/TeamRoster.tsx
autonomous: true

must_haves:
  truths:
    - "Creator can transfer ownership to a project member via the project detail page"
    - "After transfer, old creator who is also a team member retains member role"
    - "After transfer, old creator who is NOT a team member loses all access"
    - "New owner sees creator-only UI (manage members, invitations, complete project)"
    - "creatorProfile on the project document updates to reflect the new owner"
  artifacts:
    - path: "src/app/api/projects/[id]/transfer/route.ts"
      provides: "POST endpoint for ownership transfer"
      exports: ["POST"]
    - path: "src/app/projects/[id]/page.tsx"
      provides: "Transfer ownership UI for creator"
    - path: "src/components/projects/TeamRoster.tsx"
      provides: "Transfer button next to eligible members"
  key_links:
    - from: "src/app/projects/[id]/page.tsx"
      to: "/api/projects/[id]/transfer"
      via: "authFetch POST call"
      pattern: "authFetch.*transfer"
    - from: "src/app/api/projects/[id]/transfer/route.ts"
      to: "projects collection"
      via: "Firestore update of creatorId and creatorProfile"
      pattern: "creatorId.*creatorProfile"
---

<objective>
Allow the project creator to transfer ownership to another project member.

Purpose: Creators may need to hand off project leadership when stepping away. After transfer, the new owner gains all creator privileges. The old creator either remains as a regular member (if they are in the team roster) or loses all access to the project (if they are not a team member).

Output: A new API endpoint for ownership transfer and UI controls on the project detail page.
</objective>

<execution_context>
@.planning/quick/22-allow-creator-to-transfer-project-owners/22-PLAN.md
</execution_context>

<context>
@src/app/api/projects/[id]/route.ts (existing project PUT actions - approve/decline/complete pattern)
@src/app/api/projects/[id]/members/route.ts (members fetching)
@src/app/api/projects/[id]/members/[memberId]/route.ts (member removal with permission checks)
@src/app/projects/[id]/page.tsx (project detail page with creator sections)
@src/components/projects/TeamRoster.tsx (team roster rendering)
@src/lib/permissions.ts (canOwnerOrAdminAccess, isOwner checks using creatorId)
@src/types/mentorship.ts (Project interface with creatorId and creatorProfile)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ownership transfer API endpoint</name>
  <files>src/app/api/projects/[id]/transfer/route.ts</files>
  <action>
Create POST /api/projects/[id]/transfer endpoint:

1. Verify auth via `verifyAuth(request)`. Return 401 if not authenticated.
2. Parse `{ newOwnerId }` from request body. Return 400 if missing.
3. Fetch the project document. Return 404 if not found.
4. Verify the requesting user IS the current creator (`projectData.creatorId === authResult.uid`). Return 403 otherwise. Do NOT use `canOwnerOrAdminAccess` because admins should not be able to transfer ownership on behalf of creators.
5. Verify the project status is "active" (no transfers on pending/completed/declined projects). Return 400 with message "Can only transfer active projects".
6. Verify newOwnerId !== current creatorId (can't transfer to self). Return 400.
7. Verify newOwnerId is a project member by checking `project_members` collection for doc `{projectId}_{newOwnerId}`. Return 400 with "New owner must be a project member" if not found.
8. Fetch the new owner's `mentorship_profiles` document to get their profile data for the denormalized `creatorProfile` field. Return 404 if profile not found.
9. Check if the OLD creator is also a project member by checking `project_members` collection for doc `{projectId}_{oldCreatorId}`.
10. Use a Firestore batch write:
    a. Update the project document: set `creatorId` to `newOwnerId`, set `creatorProfile` to `{ displayName, photoURL, username, discordUsername }` from new owner's profile, set `updatedAt` and `lastActivityAt` to `FieldValue.serverTimestamp()`.
    b. If old creator is NOT a project member: no additional cleanup needed (they simply lose access since they are no longer `creatorId` and have no `project_members` entry).
    c. If old creator IS a project member: no changes to their membership (they stay as a member).
11. Commit the batch.
12. Return `{ success: true, message: "Ownership transferred successfully" }` with status 200.

Import pattern: Follow the same import pattern as other project API routes (`verifyAuth` from `@/lib/auth`, `db` from `@/lib/firebaseAdmin`, `FieldValue` from `firebase-admin/firestore`).

Do NOT send Discord notifications for transfers (keep it simple; can be added later).
  </action>
  <verify>
Run `npx tsc --noEmit` to verify TypeScript compilation succeeds. Verify the file exists and exports a POST function.
  </verify>
  <done>
POST /api/projects/[id]/transfer accepts `{ newOwnerId }`, validates creator identity, validates new owner is a member, atomically updates `creatorId` and `creatorProfile` on the project document. Returns 200 on success, appropriate error codes otherwise.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add transfer ownership UI to project detail page</name>
  <files>src/app/projects/[id]/page.tsx, src/components/projects/TeamRoster.tsx</files>
  <action>
**TeamRoster.tsx changes:**

1. Add a new optional prop `onTransferOwnership?: (memberId: string, memberName: string) => void` to `TeamRosterProps`.
2. For each member row where `member.userId !== project.creatorId` (non-creator members), if `isCreator` is true AND `onTransferOwnership` is provided, add a "Transfer Ownership" button (small, outline style). Place it before the remove button. Use a crown/shield icon or just text "Transfer" with `btn-ghost btn-sm` styling.
3. When clicked, call `onTransferOwnership(member.userId, member.userProfile?.displayName || "this member")`.

**ProjectDetailPage (page.tsx) changes:**

1. Add state: `const [transferLoading, setTransferLoading] = useState(false);`
2. Create handler `handleTransferOwnership(newOwnerId: string, memberName: string)`:
   - Use `showConfirm` with:
     - title: "Transfer Ownership"
     - message: `Are you sure you want to transfer project ownership to ${memberName}? ${isMember ? "You will remain as a team member." : "You will lose all access to this project."}`
     - confirmLabel: "Transfer"
     - confirmClass: "btn-warning"
   - onConfirm: call `authFetch(\`/api/projects/${projectId}/transfer\`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newOwnerId }) })`.
   - On success: show toast "Ownership transferred successfully" and call `fetchProjectData()` to refresh.
   - On error: show toast with error message.
3. Pass `onTransferOwnership={isCreator && project.status === "active" ? handleTransferOwnership : undefined}` to the TeamRoster component.

Only show the transfer option when:
- Current user is the creator (`isCreator` is true)
- Project status is "active"
- There are team members other than the creator
  </action>
  <verify>
Run `npx tsc --noEmit` to verify TypeScript compilation succeeds. Run `npm run build` to verify the build completes without errors.
  </verify>
  <done>
Creator sees a "Transfer" button next to each non-creator team member in the roster. Clicking it shows a confirmation modal explaining the consequences (remain as member or lose access). On confirm, the API is called and the page refreshes to show the new ownership. The old creator's UI updates accordingly (no longer sees creator-only sections if they lost access, or sees member-only UI if they remain as member).
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes without errors
2. `npm run build` completes successfully
3. Manual verification: On an active project, creator sees "Transfer" buttons in team roster next to non-creator members
4. Manual verification: Clicking Transfer shows a confirmation modal with appropriate messaging
5. Manual verification: After transfer, the project detail page shows the new creator in the Creator section
6. The permission system (`canOwnerOrAdminAccess`, `canEditProject`, `canManageProjectMembers`) automatically works for the new owner because they check `creatorId` on the project document, which is now updated
</verification>

<success_criteria>
- Creator can transfer ownership to any project member via the UI
- After transfer, project.creatorId and project.creatorProfile reflect the new owner
- Permission checks (edit, manage members, complete) automatically apply to new owner
- Old creator who is a member retains member access
- Old creator who is not a member loses all access (no project_members entry, no creatorId match)
- TypeScript compiles and build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/22-allow-creator-to-transfer-project-owners/22-SUMMARY.md`
</output>
