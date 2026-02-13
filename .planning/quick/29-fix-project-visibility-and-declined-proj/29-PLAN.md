---
phase: quick-29
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/projects/[id]/page.tsx
  - src/app/api/projects/route.ts
  - src/app/api/projects/[id]/route.ts
  - src/lib/permissions.ts
  - src/app/projects/my/page.tsx
autonomous: true

must_haves:
  truths:
    - "Sign in to apply alert hidden when project status is not active (declined/pending/completed)"
    - "Public project discovery only shows approved projects (active/completed status)"
    - "Pending and declined projects do not appear in /projects/discover"
    - "Creators can delete their own declined projects via DELETE API"
    - "Delete button appears in My Projects page for declined projects only"
  artifacts:
    - path: "src/app/projects/[id]/page.tsx"
      provides: "Conditional rendering of sign-in alert based on project status"
      contains: "project.status === 'active'"
    - path: "src/app/api/projects/route.ts"
      provides: "Public listing filter to exclude pending/declined projects"
      contains: "status=active"
    - path: "src/app/api/projects/[id]/route.ts"
      provides: "DELETE endpoint with creator permission check for declined projects"
      exports: ["DELETE"]
    - path: "src/lib/permissions.ts"
      provides: "canDeleteProject permission function"
      exports: ["canDeleteProject"]
    - path: "src/app/projects/my/page.tsx"
      provides: "Delete button UI for declined projects in Created tab"
      contains: "handleDelete"
  key_links:
    - from: "src/app/projects/[id]/page.tsx"
      to: "project.status check"
      via: "conditional rendering at line 1012"
      pattern: "!user &&.*project\\.status"
    - from: "src/app/api/projects/route.ts"
      to: "status filter"
      via: "GET query parameter logic"
      pattern: "status.*==.*active|completed"
    - from: "src/app/api/projects/[id]/route.ts"
      to: "canDeleteProject"
      via: "DELETE endpoint permission check"
      pattern: "canDeleteProject\\(.*\\)"
---

<objective>
Fix project visibility and declined project workflow to ensure proper privacy and lifecycle management.

Purpose: Prevent non-active projects from appearing in public discovery, hide irrelevant UI prompts on inactive projects, and allow creators to clean up declined projects.

Output: Three core improvements to project visibility and deletion workflow.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

## Current State

Project detail page at `src/app/projects/[id]/page.tsx` shows "Sign in to apply" alert for all unauthenticated users (lines 1012-1037), regardless of project status. This creates a poor UX where users see application prompts for declined/pending/completed projects that cannot accept applications.

Public discovery endpoint at `src/app/api/projects/route.ts` currently filters by `status=active` for discovery page (line 39 in discover page), but the API itself has no default filtering - it returns ALL projects when no status filter is provided.

Declined projects are soft-deleted (marked as `status: declined` in Firestore) but creators have no way to permanently delete them. Current permission system (src/lib/permissions.ts) has no `canDeleteProject` function. Admin has delete capability via Phase 11, but creators cannot clean up their own declined projects.

## Related Code

**Project statuses:**
- `pending`: Awaiting admin approval
- `active`: Approved, accepting applications
- `completed`: Finished, no longer accepting applications
- `declined`: Rejected by admin, should not be visible publicly

**Current discovery behavior:**
- Discovery page explicitly requests `status=active` (discover/page.tsx line 39)
- BUT: Direct API calls without status filter return ALL projects including declined/pending

**Current permission patterns:**
- `canEditProject(user, project)`: owner or admin can edit
- `canApproveProject(user, project)`: admin only
- `canManageProjectMembers(user, project)`: owner or admin
</context>

<tasks>

<task type="auto">
  <name>Task 1: Hide "Sign in to apply" alert on non-active projects</name>
  <files>src/app/projects/[id]/page.tsx</files>
  <action>
Modify the unauthenticated user alert section (lines 1012-1037) to only render when `project.status === 'active'`.

Current code renders the alert for all unauthenticated users:
```tsx
{!user && (
  <div className="alert alert-warning">
    ...
    <h3 className="font-bold">Sign in to apply</h3>
    ...
  </div>
)}
```

Change to:
```tsx
{!user && project.status === 'active' && (
  <div className="alert alert-warning">
    ...
    <h3 className="font-bold">Sign in to apply</h3>
    ...
  </div>
)}
```

Rationale: Pending projects are not yet approved, declined projects were rejected, and completed projects are no longer accepting applications. Only active projects should show the sign-in prompt.
  </action>
  <verify>
1. Build the app: `npm run build`
2. Inspect the project detail page component for the conditional rendering update
3. Verify the condition includes both `!user` AND `project.status === 'active'`
  </verify>
  <done>Sign in to apply alert only renders when user is not authenticated AND project status is active</done>
</task>

<task type="auto">
  <name>Task 2: Filter public project listings to exclude pending/declined projects</name>
  <files>src/app/api/projects/route.ts</files>
  <action>
Modify the GET endpoint in `/api/projects/route.ts` to filter public listings by default.

Current behavior (lines 168-278):
- Accepts optional `status`, `creatorId`, `member` query params
- No default filtering - returns ALL projects when called without params
- Discovery page explicitly passes `status=active` but direct API access bypasses this

Required change:
When NO `status` OR `creatorId` OR `member` filter is provided (public discovery use case), default to showing only approved projects (active OR completed).

Add logic after reading query params (after line 173):
```typescript
const status = searchParams.get("status");
const creatorId = searchParams.get("creatorId");
const member = searchParams.get("member");

// For public discovery (no creator/member filter), default to approved projects only
const isPublicListing = !creatorId && !member;
```

Then modify the query building (lines 215-226):
```typescript
let query = db.collection("projects");

if (status) {
  query = query.where("status", "==", status) as any;
} else if (isPublicListing) {
  // Public listings: only show approved projects (active or completed)
  query = query.where("status", "in", ["active", "completed"]) as any;
}

if (creatorId) {
  query = query.where("creatorId", "==", creatorId) as any;
}
```

Rationale: Pending projects are not yet approved (should only be visible to creator and admin). Declined projects were rejected (should only be visible to creator for deletion). Only active/completed projects should appear in public discovery.

Note: When `creatorId` filter is present (My Projects page), return ALL statuses so creators can see their pending/declined projects.
  </action>
  <verify>
1. Build the app: `npm run build`
2. Test public listing: `curl http://localhost:3000/api/projects` (should only return active/completed)
3. Test creator listing: `curl http://localhost:3000/api/projects?creatorId=TEST_UID` (should return all statuses)
4. Test status override: `curl http://localhost:3000/api/projects?status=pending` (should return only pending)
  </verify>
  <done>
- Public API calls (no filters) return only active and completed projects
- Creator-filtered calls return all project statuses
- Explicit status filter overrides default behavior
  </done>
</task>

<task type="auto">
  <name>Task 3: Add DELETE permission for creators on declined projects</name>
  <files>
    src/lib/permissions.ts
    src/app/api/projects/[id]/route.ts
  </files>
  <action>
**Part A: Add permission function to src/lib/permissions.ts**

Add new permission function after `canApplyToProject` (after line 150):

```typescript
/**
 * Can delete projects
 * Admin can delete any project, creators can delete their own declined projects
 */
export function canDeleteProject(
  user: PermissionUser | null,
  project: Project
): boolean {
  // Admin can delete any project
  if (isAdminUser(user)) return true;

  // Creator can only delete their own declined projects
  if (isOwner(user, project) && project.status === "declined") return true;

  return false;
}
```

Update the module docstring at top (lines 1-12) to include PERM-09:
```typescript
 * This module implements PERM-01 through PERM-09 requirements:
 * - PERM-01: Any authenticated user can create projects
 * - PERM-02: Only accepted mentors can create roadmaps
 * - PERM-03: Only admins can approve projects and roadmaps
 * - PERM-04: Only project creator or admin can edit/manage projects
 * - PERM-07: Any authenticated user can apply to projects
 * - PERM-08: Users cannot apply to their own projects
 * - PERM-09: Admins can delete any project, creators can delete their own declined projects
```

Export the new function (it will be used by the DELETE route).

**Part B: Add DELETE endpoint to src/app/api/projects/[id]/route.ts**

Add after the PUT function (after line 273):

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Fetch project document
    const projectRef = db.collection("projects").doc(id);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();

    // Check permission using canDeleteProject
    const permissionUser = {
      uid: authResult.uid,
      role: null, // Not needed for delete permission
      isAdmin: authResult.customClaims?.admin === true,
    };

    const canDelete = canDeleteProject(permissionUser, {
      ...projectData,
      id,
    } as Project);

    if (!canDelete) {
      return NextResponse.json(
        {
          error: "Permission denied",
          message: projectData?.status === "declined"
            ? "Only the project creator can delete declined projects"
            : "Only declined projects can be deleted by creators (admins can delete any project)",
        },
        { status: 403 }
      );
    }

    // Permanently delete the project document
    await projectRef.delete();

    return NextResponse.json(
      { success: true, message: "Project deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
```

Import the new permission function at the top:
```typescript
import { canDeleteProject } from "@/lib/permissions";
```

Rationale: Creators should be able to clean up their declined projects since they cannot edit/resubmit them. Admin retains full delete capability (per Phase 11). Active/completed projects should NOT be deletable by creators to prevent accidental data loss.
  </action>
  <verify>
1. Build the app: `npm run build`
2. Run TypeScript check: `npm run type-check`
3. Verify canDeleteProject is exported from permissions.ts
4. Verify DELETE endpoint exists in route.ts
5. Check that DELETE imports canDeleteProject
  </verify>
  <done>
- canDeleteProject function exists and returns true for admin OR (creator AND declined status)
- DELETE endpoint implemented with permission check
- TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 4: Add delete button UI for declined projects in My Projects</name>
  <files>src/app/projects/my/page.tsx</files>
  <action>
Add delete functionality to the My Projects page for declined projects in the "Created" tab.

**Step 1: Add state for delete confirmation**

Add state after existing state declarations (after line 44):
```typescript
const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
```

**Step 2: Add delete handler function**

Add function after `handleDeclineInvitation` (after line 185):
```typescript
const handleDeleteProject = async (projectId: string) => {
  setDeletingProjectId(projectId);
  try {
    const response = await authFetch(`/api/projects/${projectId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to delete project");
    }

    // Remove project from local state
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setConfirmDeleteId(null);
    showToast("Project deleted successfully", "success");
  } catch (err) {
    console.error("Error deleting project:", err);
    showToast(
      err instanceof Error ? err.message : "Failed to delete project",
      "error"
    );
  } finally {
    setDeletingProjectId(null);
  }
};
```

**Step 3: Modify ProjectCard rendering to add delete button**

Find the ProjectCard mapping in the "Created" tab content (line 379):
```typescript
<ProjectCard key={project.id} project={project} />
```

Replace with:
```tsx
<div key={project.id} className="relative">
  <ProjectCard project={project} />
  {project.status === "declined" && (
    <div className="absolute top-2 right-2">
      {confirmDeleteId === project.id ? (
        <div className="flex gap-2 bg-base-100 rounded-lg p-2 shadow-lg">
          <button
            onClick={() => handleDeleteProject(project.id)}
            className="btn btn-error btn-xs"
            disabled={deletingProjectId === project.id}
          >
            {deletingProjectId === project.id ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              "Confirm Delete"
            )}
          </button>
          <button
            onClick={() => setConfirmDeleteId(null)}
            className="btn btn-ghost btn-xs"
            disabled={deletingProjectId === project.id}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirmDeleteId(project.id);
          }}
          className="btn btn-error btn-xs"
          title="Delete declined project"
        >
          Delete
        </button>
      )}
    </div>
  )}
</div>
```

Rationale: Only show delete button for declined projects (not active/pending/completed). Two-step confirmation prevents accidental deletion. Positioned absolutely in top-right corner to avoid disrupting card layout.

Note: The delete button only appears in the "Created" tab because creators can only delete their own projects. The "Joined" tab shows projects where the user is a member but not the creator.
  </action>
  <verify>
1. Build the app: `npm run build`
2. Check TypeScript compilation: `npm run type-check`
3. Verify handleDeleteProject function is defined
4. Verify delete button renders conditionally for declined projects
5. Verify two-step confirmation UI (initial delete button -> confirm/cancel)
  </verify>
  <done>
- Delete button appears on declined projects in Created tab
- Two-step confirmation prevents accidental deletion
- Successful deletion removes project from UI and shows toast
- Loading state shown during deletion
  </done>
</task>

</tasks>

<verification>
## Manual Testing

1. **Test sign-in alert visibility:**
   - Visit a project detail page while logged out
   - For active projects: "Sign in to apply" alert should appear
   - For declined/pending/completed projects: NO alert should appear

2. **Test public listing filtering:**
   - Visit `/projects/discover`
   - Should only see active/completed projects
   - Should NOT see any pending or declined projects
   - Check browser network tab: API call should return only active/completed

3. **Test creator delete workflow:**
   - Log in as a project creator with a declined project
   - Visit `/projects/my` and select "Created" tab
   - Declined project should show a "Delete" button in top-right
   - Click "Delete" -> should show "Confirm Delete" and "Cancel" buttons
   - Click "Confirm Delete" -> project should be removed from list
   - Active/pending/completed projects should NOT show delete button

4. **Test delete permissions:**
   - As non-creator: Should get 403 when trying to DELETE another user's project
   - As creator of active project: Should get 403 when trying to DELETE (only declined allowed)
   - As admin: Should be able to DELETE any project (per Phase 11 cascade delete)

## Expected Behavior

| User Type | Project Status | Can See in Discovery | Can See Sign-in Alert | Can Delete |
|-----------|----------------|---------------------|----------------------|------------|
| Public | Active | Yes | Yes (if logged out) | No |
| Public | Completed | Yes | No | No |
| Public | Pending | No | No | No |
| Public | Declined | No | No | No |
| Creator | Active | No (not in public, yes in My Projects) | N/A (creator) | No |
| Creator | Declined | No | N/A (creator) | Yes |
| Admin | Any | No (not in public, yes in admin panel) | N/A (admin) | Yes |
</verification>

<success_criteria>
1. Unauthenticated users only see "Sign in to apply" alert on active projects
2. `/projects/discover` page shows only active and completed projects
3. Direct API calls to `/api/projects` (no filters) return only active and completed projects
4. API calls with `creatorId` filter return all project statuses (for My Projects page)
5. canDeleteProject function allows admin to delete any project, creator to delete own declined projects only
6. DELETE endpoint at `/api/projects/[id]` enforces canDeleteProject permission
7. My Projects page shows delete button only on declined projects in Created tab
8. Delete button has two-step confirmation (Delete -> Confirm Delete / Cancel)
9. All TypeScript builds successfully with no type errors
</success_criteria>

<output>
After completion, create `.planning/quick/29-fix-project-visibility-and-declined-proj/29-SUMMARY.md`
</output>
