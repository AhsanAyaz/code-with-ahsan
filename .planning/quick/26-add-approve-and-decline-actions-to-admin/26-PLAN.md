---
phase: quick-26
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/admin/projects/[id]/route.ts
  - src/app/admin/projects/page.tsx
  - src/components/admin/DeclineProjectDialog.tsx
autonomous: true
must_haves:
  truths:
    - "Pending projects show Approve and Decline actions in the Actions dropdown"
    - "Non-pending projects only show View Project and Delete Project"
    - "Clicking Approve calls admin API and updates project to active with Discord channel"
    - "Clicking Decline opens a dialog requiring a reason (min 10 chars) before declining"
    - "After approve/decline, the project is removed from the list or its status badge updates"
  artifacts:
    - path: "src/app/api/admin/projects/[id]/route.ts"
      provides: "PUT handler for admin approve/decline with x-admin-token auth"
      exports: ["PUT"]
    - path: "src/components/admin/DeclineProjectDialog.tsx"
      provides: "Modal dialog for decline reason input"
      exports: ["default"]
    - path: "src/app/admin/projects/page.tsx"
      provides: "Updated admin projects page with approve/decline actions"
  key_links:
    - from: "src/app/admin/projects/page.tsx"
      to: "/api/admin/projects/[id]"
      via: "fetch PUT with x-admin-token"
      pattern: "fetch.*api/admin/projects.*method.*PUT"
    - from: "src/app/admin/projects/page.tsx"
      to: "src/components/admin/DeclineProjectDialog.tsx"
      via: "import and render on decline action"
      pattern: "DeclineProjectDialog"
---

<objective>
Add approve and decline actions to the admin projects page. Currently the Actions dropdown only shows "View Project" and "Delete Project". Pending projects need "Approve" and "Decline" options that call the admin API with proper x-admin-token authentication.

Purpose: Enable admins to approve/decline project proposals directly from the admin dashboard without needing Firebase Auth.
Output: Working approve/decline flow in admin projects page with API backend.
</objective>

<execution_context>
@.planning/quick/26-add-approve-and-decline-actions-to-admin/26-PLAN.md
</execution_context>

<context>
@src/app/admin/projects/page.tsx (current admin projects page - has View + Delete only)
@src/app/api/admin/projects/[id]/route.ts (existing DELETE handler with x-admin-token auth pattern)
@src/app/api/projects/[id]/route.ts (existing PUT with approve/decline logic via Firebase Auth - reference for business logic)
@src/components/admin/DeleteProjectDialog.tsx (reference for dialog pattern)
@src/app/admin/roadmaps/page.tsx (reference for approve/decline UI pattern in admin)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add PUT handler to admin projects API for approve/decline</name>
  <files>src/app/api/admin/projects/[id]/route.ts</files>
  <action>
Add a PUT handler to the existing admin projects [id] route file (which already has DELETE). The PUT handler should:

1. Authenticate using x-admin-token header (copy the exact admin session verification pattern from the existing DELETE handler in this same file - check x-admin-token, verify session doc in admin_sessions collection, check expiry).

2. Parse request body for `{ action, declineReason }`.

3. For `action === "approve"`:
   - Fetch the project doc, verify it exists and status is "pending"
   - Update project: status="active", approvedAt=serverTimestamp, approvedBy="admin", updatedAt=serverTimestamp, lastActivityAt=serverTimestamp
   - Create Discord channel (non-blocking, same pattern as /api/projects/[id] PUT approve):
     - Fetch creator's mentorship_profiles doc for discordUsername
     - Call createProjectChannel(title, displayName, id, discordUsername)
     - If channel created, update project with discordChannelId and discordChannelUrl
     - Call sendProjectDetailsMessage with project details
   - Return { success: true, message: "Project approved and activated" }

4. For `action === "decline"`:
   - Validate declineReason exists, is string, min 10 chars (return 400 if invalid)
   - Fetch the project doc, verify it exists and status is "pending"
   - Update project: status="declined", declinedAt=serverTimestamp, declinedBy="admin", declineReason, updatedAt=serverTimestamp
   - Send Discord DM to creator (non-blocking, same pattern as /api/projects/[id] PUT decline):
     - Fetch creator's mentorship_profiles doc for discordUsername
     - Send DM with project title, reason, and resubmit link
   - Return { success: true, message: "Project declined" }

5. Return 400 for unknown actions.

Import from existing modules: db from @/lib/firebaseAdmin, FieldValue from firebase-admin/firestore, createProjectChannel/sendProjectDetailsMessage/sendDirectMessage from @/lib/discord.
  </action>
  <verify>TypeScript compilation: `npx tsc --noEmit --pretty 2>&1 | head -30` shows no errors in the modified file.</verify>
  <done>PUT /api/admin/projects/[id] accepts action=approve and action=decline with x-admin-token auth, performing the same business logic as the regular projects API but using admin session auth.</done>
</task>

<task type="auto">
  <name>Task 2: Create DeclineProjectDialog and update admin projects page with approve/decline actions</name>
  <files>src/components/admin/DeclineProjectDialog.tsx, src/app/admin/projects/page.tsx</files>
  <action>
**DeclineProjectDialog.tsx** - Create a new dialog component following the pattern of DeleteProjectDialog:

- Props: `{ project: EnrichedProject, onConfirm: (reason: string) => Promise<void>, onCancel: () => void }`
- Define local EnrichedProject interface (same as in DeleteProjectDialog: extends Project with memberCount, applicationCount, invitationCount)
- Single-step modal with:
  - Title: "Decline Project"
  - Show project title and creator name
  - Textarea for decline reason with placeholder "Enter reason for declining (e.g., incomplete proposal, out of scope, needs more detail)..."
  - Character counter showing X/10 minimum characters
  - "Ready" / "Minimum 10 characters required" indicator (same pattern as DeleteProjectDialog)
  - Error alert if submission fails
  - Cancel button and "Confirm Decline" button (btn-error, disabled when reason < 10 chars or submitting)
  - Loading spinner on submit (same pattern as DeleteProjectDialog)
- Use DaisyUI modal classes: `modal modal-open`, `modal-box`, `modal-action`, `modal-backdrop`

**page.tsx** - Update the admin projects page:

1. Import DeclineProjectDialog from "@/components/admin/DeclineProjectDialog"

2. Add state:
   - `const [actionLoading, setActionLoading] = useState<string | null>(null)` for tracking which project has an in-flight action
   - `const [declineTarget, setDeclineTarget] = useState<EnrichedProject | null>(null)` for showing decline dialog

3. Add handleApprove function:
   - Set actionLoading to project.id
   - GET admin token from localStorage
   - fetch PUT `/api/admin/projects/${project.id}` with headers: Content-Type + x-admin-token, body: { action: "approve" }
   - On success: toast.success("Project approved successfully"), remove project from list OR update its status to "active" in state
   - On error: toast.error with error message from response
   - Finally: clear actionLoading

4. Add handleDeclineConfirm function (called from DeclineProjectDialog onConfirm):
   - GET admin token from localStorage
   - fetch PUT `/api/admin/projects/${declineTarget.id}` with headers + body: { action: "decline", declineReason: reason }
   - On success: toast.success("Project declined"), remove from list or update status, setDeclineTarget(null)
   - On error: throw error (so dialog shows error state)

5. Update the Actions dropdown in the project card JSX. The dropdown `<ul>` should contain:
   - "View Project" link (existing, keep for all projects)
   - Conditionally for status==="pending": divider, then "Approve" button (text-success class, onClick calls handleApprove(project), disabled when actionLoading===project.id, show loading spinner when loading) and "Decline" button (text-warning class, onClick sets declineTarget to project)
   - Divider
   - "Delete Project" button (existing, keep for all projects)

6. Render DeclineProjectDialog at the bottom of the page (same pattern as DeleteProjectDialog):
   ```
   {declineTarget && (
     <DeclineProjectDialog
       project={declineTarget}
       onConfirm={handleDeclineConfirm}
       onCancel={() => setDeclineTarget(null)}
     />
   )}
   ```

For the approve action in the dropdown, when actionLoading === project.id, show a small loading spinner next to the text. Use the same pattern from the roadmaps admin page: `<span className="loading loading-spinner loading-xs"></span>`.
  </action>
  <verify>
1. `npx tsc --noEmit --pretty 2>&1 | head -30` shows no errors.
2. `npm run build 2>&1 | tail -20` completes successfully.
  </verify>
  <done>
- Pending projects show "Approve" and "Decline" in the Actions dropdown (between View and Delete)
- Non-pending projects only show "View Project" and "Delete Project"
- Approve action calls API and shows success toast
- Decline action opens dialog, requires reason >= 10 chars, calls API on confirm
- After approve/decline, project is removed from list or status updates in UI
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors
2. Build succeeds
3. On admin projects page, pending project card shows: View Project, Approve, Decline, Delete Project in dropdown
4. Active/completed project card shows: View Project, Delete Project in dropdown
5. Clicking Approve on pending project calls PUT /api/admin/projects/[id] with action=approve
6. Clicking Decline opens dialog, submitting calls PUT with action=decline and declineReason
</verification>

<success_criteria>
- Admin can approve pending projects from admin dashboard (creates Discord channel)
- Admin can decline pending projects with required reason (min 10 chars)
- Approve/decline actions only shown for pending projects
- View and Delete actions remain for all projects
- All actions use x-admin-token authentication (not Firebase Auth)
</success_criteria>

<output>
After completion, create `.planning/quick/26-add-approve-and-decline-actions-to-admin/26-SUMMARY.md`
</output>
