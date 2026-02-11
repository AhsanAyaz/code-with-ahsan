---
phase: quick-9
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/projects/invitations/my/route.ts
  - src/app/projects/my/page.tsx
autonomous: true
must_haves:
  truths:
    - "User sees an Invitations tab in the My Projects page"
    - "Invitations tab shows all pending invitations for the current user with project details"
    - "User can accept an invitation and get added to the project team"
    - "User can decline an invitation"
    - "Invitation count badge appears on the Invitations tab when there are pending invitations"
  artifacts:
    - path: "src/app/api/projects/invitations/my/route.ts"
      provides: "GET endpoint returning all pending invitations for authenticated user with enriched project data"
      exports: ["GET"]
    - path: "src/app/projects/my/page.tsx"
      provides: "Updated My Projects page with Invitations tab"
  key_links:
    - from: "src/app/projects/my/page.tsx"
      to: "/api/projects/invitations/my"
      via: "authFetch in useEffect"
      pattern: "authFetch.*api/projects/invitations/my"
    - from: "src/app/projects/my/page.tsx"
      to: "/api/projects/[id]/invitations/[userId]"
      via: "authFetch PUT for accept/decline"
      pattern: "authFetch.*invitations.*action"
---

<objective>
Add an "Invitations" tab to the My Projects page showing pending project invitations the user has received, with accept/decline actions.

Purpose: Users currently can only see invitations when they visit a specific project detail page. This makes invitations easily missed. Surfacing them in My Projects gives a central location to manage all pending invitations.

Output: New API endpoint + updated My Projects page with 3 tabs (Created, Joined, Invitations).
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/projects/my/page.tsx (existing My Projects page with Created/Joined tabs)
@src/app/api/projects/[id]/invitations/route.ts (existing per-project invitations API)
@src/app/api/projects/[id]/invitations/[userId]/route.ts (existing accept/decline API)
@src/app/projects/[id]/page.tsx (existing accept/decline UI pattern to follow)
@src/types/mentorship.ts (ProjectInvitation type)
@src/lib/apiClient.ts (authFetch utility)
@src/lib/auth.ts (verifyAuth utility)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create GET /api/projects/invitations/my endpoint</name>
  <files>src/app/api/projects/invitations/my/route.ts</files>
  <action>
Create a new API route that returns all pending invitations for the authenticated user, enriched with project data.

Implementation:
1. Use `verifyAuth(request)` to get the current user's UID. Return 401 if not authenticated.
2. Query Firestore `project_invitations` collection where `userId == authResult.uid` and `status == "pending"`, ordered by `createdAt` desc.
3. Extract unique `projectId` values from results.
4. Batch-fetch the corresponding project documents using `db.getAll(...projectRefs)` (same pattern as GET /api/projects with member filter).
5. Build a map of projectId -> project data (title, status, difficulty, techStack, creatorProfile, maxTeamSize, memberCount).
6. Return invitations array where each invitation is enriched with a `project` field containing the project summary.
7. Convert all Firestore Timestamps to ISO strings (createdAt, etc.).

Response shape:
```json
{
  "invitations": [
    {
      "id": "projId_userId",
      "projectId": "...",
      "userId": "...",
      "invitedBy": "...",
      "status": "pending",
      "createdAt": "2026-...",
      "project": {
        "id": "...",
        "title": "...",
        "status": "active",
        "difficulty": "intermediate",
        "techStack": ["React", "Node"],
        "creatorProfile": { "displayName": "...", "photoURL": "..." },
        "maxTeamSize": 4,
        "memberCount": 2
      }
    }
  ]
}
```

Follow the same error handling pattern as other project API routes (try/catch, console.error, 500 response).
  </action>
  <verify>
The file compiles without TypeScript errors: `npx tsc --noEmit src/app/api/projects/invitations/my/route.ts` or check via `npm run build` (may be too heavy — at minimum verify the file has valid syntax).
  </verify>
  <done>GET /api/projects/invitations/my returns pending invitations for the authenticated user with enriched project data, or 401 for unauthenticated requests.</done>
</task>

<task type="auto">
  <name>Task 2: Add Invitations tab to My Projects page with accept/decline</name>
  <files>src/app/projects/my/page.tsx</files>
  <action>
Update the My Projects page to add a third "Invitations" tab.

State changes:
1. Extend `activeTab` type from `"created" | "joined"` to `"created" | "joined" | "invitations"`.
2. Add new state: `invitations` array (for the invitations data), `invitationsLoading` boolean, `invitationCount` number (for badge), `actionLoadingId` string | null (tracks which invitation is being acted on).
3. Import `authFetch` from `@/lib/apiClient` (needed for authenticated requests).
4. Import `ToastContainer` and `ToastMessage`/`ToastType` from `@/components/ui/Toast` for success/error feedback. Add `toasts` state and `showToast`/`removeToast` helpers (follow the pattern from project detail page).

Fetching logic:
1. Always fetch invitation count on mount (regardless of active tab) so the badge shows on the tab. Use `authFetch("/api/projects/invitations/my")` and set `invitationCount` from `data.invitations.length`.
2. When `activeTab === "invitations"`, use the already-fetched invitations data (or re-fetch). Set `invitations` state.
3. Keep existing fetch logic for "created" and "joined" tabs unchanged.

Tab UI:
1. Add a third tab button "Invitations" with a count badge next to the label when `invitationCount > 0`:
```tsx
<button className={`tab ${activeTab === "invitations" ? "tab-active" : ""}`}
  onClick={() => setActiveTab("invitations")}>
  Invitations
  {invitationCount > 0 && (
    <span className="badge badge-primary badge-sm ml-2">{invitationCount}</span>
  )}
</button>
```

Invitations tab content:
1. When `invitationsLoading`, show spinner (same pattern as existing loading state).
2. When no invitations, show empty state: "No pending invitations" with a link to Discover Projects.
3. For each invitation, render a card showing:
   - Project title (linked to `/projects/${inv.projectId}`)
   - Project difficulty badge (use same `difficultyColors` map as ProjectCard)
   - Tech stack badges (first 4, with +N overflow)
   - Creator name and avatar
   - Team capacity: `${inv.project.memberCount || 0} / ${inv.project.maxTeamSize} members`
   - Two action buttons: "Accept" (btn-success) and "Decline" (btn-ghost)
   - Loading state on buttons when `actionLoadingId === inv.id`

Accept/Decline handlers:
1. `handleAcceptInvitation(projectId, userId)`: Call `authFetch(`/api/projects/${projectId}/invitations/${userId}`, { method: "PUT", body: JSON.stringify({ action: "accept" }) })`. On success, remove the invitation from local state, decrement `invitationCount`, and show success toast. On error, show error toast.
2. `handleDeclineInvitation(projectId, userId)`: Same pattern with `action: "decline"`. On success, remove from local state, decrement count, show toast.

Keep the "Create Project" button visible only on "created" tab (already the case).
Add `<ToastContainer toasts={toasts} removeToast={removeToast} />` at the bottom of the component JSX.
  </action>
  <verify>
1. Visit `/projects/my` while logged in — should see three tabs: Created, Joined, Invitations.
2. If the user has pending invitations, the Invitations tab shows a count badge.
3. Clicking the Invitations tab shows invitation cards with project info and accept/decline buttons.
4. Accepting an invitation removes it from the list and shows a success toast.
5. Declining an invitation removes it from the list and shows a success toast.
  </verify>
  <done>My Projects page has three tabs. Invitations tab shows all pending invitations with project context and working accept/decline buttons. Invitation count badge updates dynamically.</done>
</task>

</tasks>

<verification>
1. Navigate to `/projects/my` as an authenticated user
2. Verify three tabs appear: Created, Joined, Invitations
3. If the user has pending invitations, verify the badge count on the Invitations tab
4. Click Invitations tab — verify invitation cards show project title, difficulty, tech stack, creator, team capacity
5. Accept an invitation — verify success toast, card removed, count decremented, project appears in Joined tab
6. Decline an invitation — verify success toast, card removed, count decremented
7. With no invitations — verify empty state message appears
</verification>

<success_criteria>
- GET /api/projects/invitations/my returns enriched pending invitations for authenticated user
- My Projects page shows Invitations tab with count badge
- Accept/decline actions work and update the UI immediately
- Empty state handled gracefully
- No TypeScript errors, follows existing codebase patterns
</success_criteria>

<output>
After completion, create `.planning/quick/9-show-project-invitations-in-my-projects-/9-SUMMARY.md`
</output>
