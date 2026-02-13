---
phase: quick-33
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/projects/[id]/edit/page.tsx
  - src/app/api/projects/[id]/route.ts
  - src/app/admin/projects/page.tsx
autonomous: true

must_haves:
  truths:
    - "Creator can navigate to /projects/{id}/edit for pending/declined projects"
    - "Admin can navigate to /projects/{id}/edit for any project status"
    - "Edit page displays form with all project fields pre-populated"
    - "Save button updates project and redirects to detail page"
    - "Public PUT endpoint validates authorization server-side"
    - "Admin Edit action navigates to edit page (not modal)"
    - "EditProjectDialog component no longer exists in codebase"
  artifacts:
    - path: "src/app/projects/[id]/edit/page.tsx"
      provides: "Full-page edit form with authorization check"
      min_lines: 300
    - path: "src/app/api/projects/[id]/route.ts"
      provides: "Public PUT handler with auth validation"
      exports: ["PUT"]
  key_links:
    - from: "src/app/projects/[id]/edit/page.tsx"
      to: "/api/projects/[id]"
      via: "PUT fetch on form submit"
      pattern: "fetch.*api/projects.*method.*PUT"
    - from: "src/app/admin/projects/page.tsx"
      to: "/projects/[id]/edit"
      via: "router.push on Edit action"
      pattern: "router\\.push.*projects.*edit"
---

<objective>
Replace the EditProjectDialog modal with a dedicated full-page edit route at `/projects/[id]/edit`. This improves UX by providing a focused editing experience similar to the project detail page, and consolidates admin and creator editing into a single route with proper authorization.

**Purpose:** Better UX for project editing, unified edit route for admin and creators, and proper server-side authorization.

**Output:** Full-page edit form, shared public PUT endpoint, removed modal component, updated admin navigation.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

**Current implementation:**
- EditProjectDialog modal component at `src/components/admin/EditProjectDialog.tsx`
- Admin page uses modal via state (editTarget, handleEditConfirm)
- Admin PATCH endpoint at `/api/admin/projects/[id]` with admin-only auth
- No public edit route exists

**Target pattern:**
- Full-page edit route at `/projects/[id]/edit` (similar to detail page layout)
- Shared public PUT endpoint at `/api/projects/[id]` with auth check
- Authorization: creator can edit pending/declined, admin can edit any status
- Admin navigates to edit page instead of opening modal

**Permission reference:**
```typescript
// From src/lib/permissions.ts
export function canEditProject(
  user: PermissionUser | null,
  project: Project
): boolean {
  // Admin can always edit any project
  if (isAdminUser(user)) return true;

  // Creator can only edit pending or declined projects
  if (isOwner(user, project)) {
    return project.status === "pending" || project.status === "declined";
  }

  return false;
}
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create full-page edit route at /projects/[id]/edit</name>
  <files>src/app/projects/[id]/edit/page.tsx</files>
  <action>
Create full-page edit form component at `src/app/projects/[id]/edit/page.tsx`.

**Layout and structure:**
- Use same layout pattern as project detail page (max-w-4xl, p-8, space-y-8)
- Back button linking to `/projects/{id}`
- Page title: "Edit Project"
- Form fields (all from EditProjectDialog):
  - Title (input, required, 3-100 chars)
  - Description (textarea, required, 10-2000 chars with counter)
  - GitHub Repo (input, optional, URL type)
  - Tech Stack (input, comma-separated)
  - Difficulty (select: beginner/intermediate/advanced)
  - Max Team Size (number input, 1-20)
- Action buttons: Cancel (navigate back), Save Changes (submit)

**Authorization flow:**
1. Fetch project data via GET `/api/projects/{id}`
2. Fetch current user from MentorshipContext
3. Check authorization using canEditProject logic:
   - Admin can edit any project status
   - Creator can edit pending/declined only
4. If unauthorized: show error alert and redirect to project detail page
5. If authorized: render form with pre-populated values

**Admin detection:**
- Check for admin token in localStorage (ADMIN_TOKEN_KEY pattern)
- If token exists, verify it's valid (not expired)
- Pass isAdmin flag to permission check

**Form submission:**
1. Validate fields client-side (same rules as EditProjectDialog)
2. Parse tech stack from comma-separated string to array
3. Send PUT request to `/api/projects/{id}` with:
   - If admin: include x-admin-token header
   - If creator: use authFetch for Firebase Auth token
   - Body: { title, description, githubRepo, techStack, difficulty, maxTeamSize }
4. On success: show toast, navigate to `/projects/{id}`
5. On error: show error message in alert

**Implementation notes:**
- Use "use client" directive
- Import: useMentorship, useParams, useRouter, authFetch, canEditProject, ADMIN_TOKEN_KEY
- Add loading skeleton while fetching project
- Handle project not found error
- Add form validation with error states
- Use DaisyUI form classes (input-bordered, textarea-bordered, select-bordered)
- Display character counter for description (current/2000)
  </action>
  <verify>
1. Check file exists: `ls src/app/projects/[id]/edit/page.tsx`
2. Verify imports include: useMentorship, useParams, useRouter, authFetch, canEditProject
3. Verify authorization check uses canEditProject function
4. Verify form has all 6 fields from EditProjectDialog
5. Verify PUT fetch to `/api/projects/{id}` with conditional headers
  </verify>
  <done>
- Edit page exists at `/projects/[id]/edit` route
- Page loads project data and validates authorization
- Form displays all editable fields pre-populated
- Admin users (with token) can edit any project status
- Creator users can only edit pending/declined projects
- Unauthorized access shows error and redirects
- Form submits to public PUT endpoint with proper headers
  </done>
</task>

<task type="auto">
  <name>Task 2: Add public PUT endpoint to /api/projects/[id]/route.ts</name>
  <files>src/app/api/projects/[id]/route.ts</files>
  <action>
Add PUT handler to existing `/api/projects/[id]/route.ts` file (create if doesn't exist).

**Authentication strategy:**
Check for admin token OR Firebase auth token:
1. Check x-admin-token header first (admin path)
   - If present: verify session in admin_sessions collection
   - If valid: set isAdmin = true, userId = session.adminId
2. Else check Authorization header (creator path)
   - Extract Bearer token from Authorization header
   - Verify with Firebase Admin auth.verifyIdToken()
   - If valid: set userId = decodedToken.uid
3. If neither valid: return 401 Unauthorized

**Authorization logic:**
1. Fetch project document from Firestore
2. If not found: return 404
3. Check permission:
   - Admin (isAdmin = true): can edit any project status
   - Creator (userId = project.creatorId): can only edit if status is "pending" OR "declined"
4. If unauthorized: return 403 Forbidden with message "You can only edit pending or declined projects"

**Validation (same as admin PATCH endpoint):**
- Title: string, 3-100 chars
- Description: string, 10-2000 chars
- GitHub repo: optional, must start with https://github.com/ if provided
- Tech stack: array of strings
- Difficulty: enum ("beginner", "intermediate", "advanced")
- Max team size: number, 1-20

**Update logic:**
- Build updateData object with only provided fields
- Always include: updatedAt, lastActivityAt timestamps
- Handle githubRepo: allow clearing by passing empty string (FieldValue.delete())
- Update project document
- Fetch and return updated project with serialized timestamps

**Response format:**
```json
{
  "success": true,
  "project": {
    "id": "...",
    ...serialized project data
  }
}
```

**Error responses:**
- 401: "Authentication required"
- 403: "You can only edit pending or declined projects" (creator editing active/completed)
- 404: "Project not found"
- 400: Validation errors (with specific field message)
- 500: "Failed to update project"

**Implementation notes:**
- Import: NextRequest, NextResponse, db (firebaseAdmin), FieldValue, auth (firebase-admin)
- Extract projectId from params (await params syntax)
- Use same validation logic as existing admin PATCH endpoint
- Return project with all timestamp fields serialized via toISOString()
  </action>
  <verify>
1. Check PUT export exists: `grep -n "export async function PUT" src/app/api/projects/[id]/route.ts`
2. Verify dual auth check (admin token OR Firebase auth)
3. Verify authorization logic checks status for non-admin
4. Verify validation for all 6 fields
5. Test with curl:
   - Admin edit (any status): should succeed with x-admin-token
   - Creator edit pending: should succeed with Authorization header
   - Creator edit active: should fail with 403
  </verify>
  <done>
- PUT endpoint exists at /api/projects/[id]
- Endpoint accepts both admin token and Firebase auth token
- Admin can update projects at any status
- Creator can only update pending/declined projects
- All fields validated with same rules as admin PATCH
- Returns updated project with serialized timestamps
- Proper error responses for auth, authorization, and validation failures
  </done>
</task>

<task type="auto">
  <name>Task 3: Update admin page to navigate to edit route and remove modal</name>
  <files>src/app/admin/projects/page.tsx</files>
  <action>
Update admin projects page to navigate to edit route instead of opening modal.

**Changes to make:**

1. **Remove modal state and handler:**
   - Delete: `const [editTarget, setEditTarget] = useState<EnrichedProject | null>(null);`
   - Delete: entire `handleEditConfirm` async function (lines 190-223)
   - Delete: EditProjectDialog import at top

2. **Remove modal render:**
   - Delete entire block at bottom (lines 567-574):
   ```tsx
   {editTarget && (
     <EditProjectDialog
       project={editTarget}
       onConfirm={handleEditConfirm}
       onCancel={() => setEditTarget(null)}
     />
   )}
   ```

3. **Update Edit action in dropdown:**
   - Change from: `<button onClick={() => setEditTarget(project)}>Edit Project</button>`
   - Change to:
   ```tsx
   <li>
     <Link href={`/projects/${project.id}/edit`} target="_blank">
       Edit Project
     </Link>
   </li>
   ```
   - Pattern: Same as "View Project" action (Link with target="_blank")

**Why target="_blank":**
Admin may want to keep admin page open while editing in new tab, similar to View Project behavior.

**Import change:**
No new imports needed - Link already imported from next/link.

**Final cleanup verification:**
- No references to `editTarget` state variable remain
- No references to `setEditTarget` remain
- No references to `handleEditConfirm` remain
- No import of EditProjectDialog component
- Edit action now uses Link to `/projects/{id}/edit`
  </action>
  <verify>
1. Verify editTarget state removed: `grep -n "editTarget" src/app/admin/projects/page.tsx` should return 0 results
2. Verify handleEditConfirm removed: `grep -n "handleEditConfirm" src/app/admin/projects/page.tsx` should return 0 results
3. Verify EditProjectDialog import removed: `grep -n "EditProjectDialog" src/app/admin/projects/page.tsx` should return 0 results
4. Verify Edit action uses Link: `grep -A2 "Edit Project" src/app/admin/projects/page.tsx | grep "Link href"`
5. Manual test: Click Edit action in admin page, verify it opens edit page in new tab
  </verify>
  <done>
- editTarget state variable removed
- handleEditConfirm function removed
- EditProjectDialog modal render removed
- EditProjectDialog import removed
- Edit action in dropdown now navigates to /projects/{id}/edit
- Edit link opens in new tab (target="_blank")
- Admin page compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 4: Delete EditProjectDialog modal component</name>
  <files>src/components/admin/EditProjectDialog.tsx</files>
  <action>
Delete the EditProjectDialog.tsx file since it's no longer used.

**Command:**
```bash
rm src/components/admin/EditProjectDialog.tsx
```

**Verification:**
After deletion, verify no other files import EditProjectDialog:
```bash
grep -r "EditProjectDialog" src/ --include="*.tsx" --include="*.ts"
```

Should return 0 results (already removed from admin projects page in Task 3).

**Why safe to delete:**
- Only consumer was admin projects page (removed in Task 3)
- Replaced by full-page edit route (Task 1)
- No shared functionality - edit logic moved to public PUT endpoint (Task 2)
  </action>
  <verify>
1. Verify file deleted: `ls src/components/admin/EditProjectDialog.tsx` should return "No such file"
2. Verify no imports remain: `grep -r "EditProjectDialog" src/ --include="*.tsx" --include="*.ts"` should return 0 results
3. Verify build succeeds: `npm run build` (or at least type-check compiles)
  </verify>
  <done>
- EditProjectDialog.tsx file deleted from filesystem
- No remaining imports of EditProjectDialog in codebase
- TypeScript compilation succeeds without errors
- Codebase no longer contains modal-based project editing
  </done>
</task>

</tasks>

<verification>

**End-to-end flow tests:**

1. **Creator editing pending project:**
   - Navigate to `/projects/{pending-project-id}/edit` as creator
   - Verify form loads with pre-populated values
   - Edit title and description
   - Click Save Changes
   - Verify redirect to project detail page with updated values

2. **Creator attempting to edit active project:**
   - Navigate to `/projects/{active-project-id}/edit` as creator
   - Verify error message displayed
   - Verify redirect to project detail page

3. **Admin editing any project:**
   - Navigate to admin projects page
   - Click Edit action on any project
   - Verify edit page opens in new tab
   - Verify form loads (admin can edit any status)
   - Make changes and save
   - Verify redirect to project detail with updates

4. **Authorization edge cases:**
   - Non-creator user tries to access `/projects/{id}/edit` for someone else's project
   - Verify 403/redirect behavior
   - Unauthenticated user tries to access edit page
   - Verify redirect to login or error

**Code verification:**
```bash
# Verify edit page exists
ls src/app/projects/[id]/edit/page.tsx

# Verify PUT endpoint exists
grep "export async function PUT" src/app/api/projects/[id]/route.ts

# Verify modal removed
! grep -r "EditProjectDialog" src/ --include="*.tsx" --include="*.ts"

# Verify admin page updated
grep "Link href=.*projects.*edit" src/app/admin/projects/page.tsx

# TypeScript compilation
npm run build
```

</verification>

<success_criteria>

**Functional requirements:**
- [ ] `/projects/[id]/edit` route exists and renders full-page form
- [ ] Edit page validates authorization (creator: pending/declined only, admin: any status)
- [ ] Edit page pre-populates all 6 form fields from project data
- [ ] Save button sends PUT request to `/api/projects/[id]` with proper headers
- [ ] Public PUT endpoint validates both admin token and Firebase auth
- [ ] PUT endpoint enforces status-based authorization for non-admin users
- [ ] Admin Edit action navigates to edit page (not modal)
- [ ] EditProjectDialog component deleted from codebase

**UX improvements:**
- [ ] Edit page has same layout feel as project detail page (max-w-4xl, proper spacing)
- [ ] Back button allows easy navigation to project detail
- [ ] Character counter shows description length
- [ ] Error states display validation messages
- [ ] Success redirects to project detail page with toast

**Security:**
- [ ] Server-side authorization check in PUT endpoint (not just client-side)
- [ ] Creator cannot edit active/completed projects via API
- [ ] Admin token validated against session collection
- [ ] Firebase auth token verified with Firebase Admin SDK

**Cleanup:**
- [ ] No references to EditProjectDialog in codebase
- [ ] No references to editTarget state in admin page
- [ ] No references to handleEditConfirm function
- [ ] TypeScript compiles without errors
- [ ] No unused imports remain

</success_criteria>

<output>
After completion, create `.planning/quick/33-replace-edit-modal-with-dedicated-page/33-SUMMARY.md` documenting:
- Edit page route and authorization logic
- Public PUT endpoint implementation
- Admin page navigation update
- Removed modal component
- Testing notes for creator vs admin editing
</output>
