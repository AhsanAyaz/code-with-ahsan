---
phase: quick-31
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/admin/projects/page.tsx
  - src/app/api/admin/projects/[id]/route.ts
  - src/lib/permissions.ts
  - src/components/admin/EditProjectDialog.tsx
autonomous: true

must_haves:
  truths:
    - "Admin can see creator's Discord contact in projects page"
    - "Admin can click Edit action on pending projects to modify fields before approval"
    - "Admin can click Edit action on active/completed projects to modify fields"
    - "Creator cannot edit active/completed projects (only pending/declined)"
    - "Edited project fields are validated and saved"
  artifacts:
    - path: "src/app/admin/projects/page.tsx"
      provides: "Discord contact card display and Edit action in dropdown"
      min_lines: 550
    - path: "src/app/api/admin/projects/[id]/route.ts"
      provides: "PATCH endpoint for editing project fields"
      exports: ["PUT", "DELETE", "PATCH"]
    - path: "src/lib/permissions.ts"
      provides: "canEditProject function with admin/status logic"
      exports: ["canEditProject"]
    - path: "src/components/admin/EditProjectDialog.tsx"
      provides: "Modal form for editing project fields"
      min_lines: 200
  key_links:
    - from: "src/app/admin/projects/page.tsx"
      to: "src/components/mentorship/ContactInfo.tsx"
      via: "import and render with creatorProfile data"
      pattern: "import.*ContactInfo|<ContactInfo"
    - from: "src/app/admin/projects/page.tsx"
      to: "src/components/admin/EditProjectDialog.tsx"
      via: "import and render with edit target state"
      pattern: "import.*EditProjectDialog|<EditProjectDialog"
    - from: "src/components/admin/EditProjectDialog.tsx"
      to: "/api/admin/projects/[id]"
      via: "PATCH request with updated fields"
      pattern: "method:\\s*['\"]PATCH['\"]"
    - from: "src/lib/permissions.ts"
      to: "Project.status"
      via: "canEditProject checks status for creator permissions"
      pattern: "project\\.status.*===.*['\"]pending"
---

<objective>
Add three admin project management features: (1) Display creator Discord contact card on admin projects page, (2) Add Edit action to dropdown menu allowing admin to edit projects before approval, and (3) Implement permission logic where admin can edit any project status while creators can only edit pending/declined projects.

Purpose: Improve admin workflow by showing contact info and enabling field corrections before approval, while maintaining proper permission boundaries for creators.

Output: Admin projects page with Discord contact display, Edit action in dropdown, edit dialog modal, PATCH API endpoint, and updated permission function.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

# Existing components and patterns
@src/components/mentorship/ContactInfo.tsx
@src/app/admin/projects/page.tsx
@src/lib/permissions.ts
@src/types/mentorship.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Discord contact card display to admin projects page</name>
  <files>src/app/admin/projects/page.tsx</files>
  <action>
Import ContactInfo component from @/components/mentorship/ContactInfo and add it to the project card display in the admin projects page.

Location: Add ContactInfo component after the creator info section (around line 318, after the avatar and display name div).

Implementation:
1. Add import: `import ContactInfo from "@/components/mentorship/ContactInfo";`
2. Insert ContactInfo component after the creator displayName/avatar section:
   ```tsx
   {/* Discord contact info */}
   <ContactInfo
     email={project.creatorProfile?.email}
     discordUsername={project.creatorProfile?.discordUsername}
     className="mt-1"
   />
   ```

Note: The creatorProfile already includes discordUsername (line 312-316), but email is NOT currently in the EnrichedProject type or fetched data. We need to fetch it from the creator's mentorship profile in the API endpoint OR skip email display for now. For this task, skip email and only show Discord username since it's already available in creatorProfile.

Corrected implementation (Discord only):
```tsx
{/* Discord contact info */}
{project.creatorProfile?.discordUsername && (
  <ContactInfo
    discordUsername={project.creatorProfile.discordUsername}
    className="mt-1"
  />
)}
```
  </action>
  <verify>
1. `npm run build` - TypeScript compilation succeeds
2. Check admin projects page visually renders Discord username below creator name
3. Hover over Discord username shows "Click to copy Discord username" tooltip
4. Click copies username to clipboard and shows success toast
  </verify>
  <done>
ContactInfo component is imported and rendered in admin projects page. Discord username displays with click-to-copy functionality when available. Warning message shows when Discord username is not set.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add Edit action to dropdown menu and implement edit dialog</name>
  <files>
    src/app/admin/projects/page.tsx
    src/components/admin/EditProjectDialog.tsx
  </files>
  <action>
**Part A: Create EditProjectDialog component**

Create new file `src/components/admin/EditProjectDialog.tsx` with a modal form for editing project fields.

Editable fields (match creation form fields):
- title (string, 3-100 chars)
- description (string, 10-2000 chars)
- githubRepo (string, optional, must be valid GitHub HTTPS URL)
- techStack (string[], displayed as comma-separated)
- difficulty (select: beginner/intermediate/advanced)
- maxTeamSize (number, 1-20)

Component structure:
```tsx
"use client";

import { useState, FormEvent } from "react";
import { useToast } from "@/contexts/ToastContext";
import { Project } from "@/types/mentorship";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";

interface EditProjectDialogProps {
  project: Project;
  onConfirm: (updatedFields: Partial<Project>) => Promise<void>;
  onCancel: () => void;
}

export default function EditProjectDialog({
  project,
  onConfirm,
  onCancel,
}: EditProjectDialogProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Controlled form state initialized with project values
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [githubRepo, setGithubRepo] = useState(project.githubRepo || "");
  const [techStack, setTechStack] = useState(project.techStack.join(", "));
  const [difficulty, setDifficulty] = useState(project.difficulty);
  const [maxTeamSize, setMaxTeamSize] = useState(project.maxTeamSize);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Client-side validation
    if (title.trim().length < 3 || title.trim().length > 100) {
      setError("Title must be between 3 and 100 characters");
      setLoading(false);
      return;
    }

    if (description.trim().length < 10 || description.trim().length > 2000) {
      setError("Description must be between 10 and 2000 characters");
      setLoading(false);
      return;
    }

    const techStackArray = techStack
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      const updatedFields = {
        title: title.trim(),
        description: description.trim(),
        githubRepo: githubRepo.trim() || undefined,
        techStack: techStackArray,
        difficulty,
        maxTeamSize,
      };

      await onConfirm(updatedFields);
    } catch (err: any) {
      setError(err.message || "Failed to update project");
      setLoading(false);
    }
  };

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">Edit Project</h3>
        <p className="text-sm text-base-content/60 mt-1">
          Update project details. Changes will be saved immediately.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Title */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Title</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input input-bordered"
              required
              minLength={3}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered h-32"
              required
              minLength={10}
              maxLength={2000}
            />
            <label className="label">
              <span className="label-text-alt">{description.length}/2000</span>
            </label>
          </div>

          {/* GitHub Repo */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">GitHub Repository (optional)</span>
            </label>
            <input
              type="url"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              className="input input-bordered"
              placeholder="https://github.com/username/repo"
            />
          </div>

          {/* Tech Stack */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Tech Stack (comma-separated)</span>
            </label>
            <input
              type="text"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              className="input input-bordered"
              placeholder="React, TypeScript, Node.js"
            />
          </div>

          {/* Difficulty */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Difficulty</span>
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="select select-bordered"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Max Team Size */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Max Team Size</span>
            </label>
            <input
              type="number"
              value={maxTeamSize}
              onChange={(e) => setMaxTeamSize(parseInt(e.target.value))}
              className="input input-bordered"
              min={1}
              max={20}
              required
            />
          </div>

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onCancel}></div>
    </dialog>
  );
}
```

**Part B: Add Edit action to dropdown menu**

In `src/app/admin/projects/page.tsx`:

1. Add state for edit target:
   ```tsx
   const [editTarget, setEditTarget] = useState<EnrichedProject | null>(null);
   ```

2. Add handleEditConfirm function (after handleDeleteConfirm):
   ```tsx
   const handleEditConfirm = async (updatedFields: Partial<Project>) => {
     if (!editTarget) return;

     try {
       const token = localStorage.getItem(ADMIN_TOKEN_KEY);
       const response = await fetch(`/api/admin/projects/${editTarget.id}`, {
         method: "PATCH",
         headers: {
           "Content-Type": "application/json",
           ...(token ? { "x-admin-token": token } : {}),
         },
         body: JSON.stringify(updatedFields),
       });

       if (response.ok) {
         const data = await response.json();
         toast.success("Project updated successfully");
         // Update project in list with new fields
         setProjects((prev) =>
           prev.map((p) =>
             p.id === editTarget.id ? { ...p, ...data.project } : p
           )
         );
         // Close dialog
         setEditTarget(null);
       } else {
         const data = await response.json();
         throw new Error(data.error || "Failed to update project");
       }
     } catch (error) {
       console.error("Error updating project:", error);
       throw error; // Re-throw so dialog can show error
     }
   };
   ```

3. Import EditProjectDialog at top:
   ```tsx
   import EditProjectDialog from "@/components/admin/EditProjectDialog";
   ```

4. Add Edit menu item to Actions dropdown (after "View Project" item, around line 460):
   ```tsx
   <li>
     <button onClick={() => setEditTarget(project)}>
       Edit Project
     </button>
   </li>
   ```

5. Add EditProjectDialog rendering at bottom (after DeclineProjectDialog, around line 522):
   ```tsx
   {/* Edit project dialog */}
   {editTarget && (
     <EditProjectDialog
       project={editTarget}
       onConfirm={handleEditConfirm}
       onCancel={() => setEditTarget(null)}
     />
   )}
   ```
  </action>
  <verify>
1. `npm run build` - TypeScript compilation succeeds
2. Admin projects page shows "Edit Project" action in dropdown
3. Click Edit opens modal with pre-filled fields
4. Change title and click Save - shows loading state
5. Verify updated title appears in project card after save
  </verify>
  <done>
EditProjectDialog component created with form for all editable fields. Admin projects page has Edit action in dropdown menu. Edit dialog pre-fills with existing project data, validates input, and calls PATCH endpoint on submit. Project list updates after successful edit.
  </done>
</task>

<task type="auto">
  <name>Task 3: Create PATCH endpoint and update permission logic</name>
  <files>
    src/app/api/admin/projects/[id]/route.ts
    src/lib/permissions.ts
  </files>
  <action>
**Part A: Update canEditProject permission function**

In `src/lib/permissions.ts`, modify the `canEditProject` function (around line 122) to implement admin-always + creator-before-approval logic:

Replace existing function:
```typescript
/**
 * PERM-04: Can edit projects
 * Admin can edit any project status, creators can only edit pending/declined projects
 */
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

Rationale: Admin needs to edit projects after approval for corrections/updates. Creator should only edit before approval (pending) or after decline (to fix issues and resubmit).

**Part B: Add PATCH endpoint to admin API route**

In `src/app/api/admin/projects/[id]/route.ts`, add a new PATCH handler after the DELETE function (around end of file):

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Phase 1: Authentication
    const token = request.headers.get("x-admin-token");

    if (!token) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    // Verify admin session
    const sessionDoc = await db.collection("admin_sessions").doc(token).get();

    if (!sessionDoc.exists) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    const session = sessionDoc.data();
    const expiresAt = session?.expiresAt?.toDate?.() || new Date(0);

    if (expiresAt < new Date()) {
      // Session expired, delete it
      await db.collection("admin_sessions").doc(token).delete();
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    // Phase 2: Parse and validate request
    const { id } = await params;
    const body = await request.json();

    // Allowed editable fields
    const { title, description, githubRepo, techStack, difficulty, maxTeamSize } = body;

    // Validation
    if (title !== undefined) {
      if (typeof title !== "string" || title.length < 3 || title.length > 100) {
        return NextResponse.json(
          { error: "Title must be between 3 and 100 characters" },
          { status: 400 }
        );
      }
    }

    if (description !== undefined) {
      if (typeof description !== "string" || description.length < 10 || description.length > 2000) {
        return NextResponse.json(
          { error: "Description must be between 10 and 2000 characters" },
          { status: 400 }
        );
      }
    }

    if (githubRepo !== undefined && githubRepo !== null && githubRepo !== "") {
      // Basic GitHub URL validation (https://github.com/...)
      if (!githubRepo.startsWith("https://github.com/")) {
        return NextResponse.json(
          { error: "GitHub URL must start with https://github.com/" },
          { status: 400 }
        );
      }
    }

    if (techStack !== undefined && !Array.isArray(techStack)) {
      return NextResponse.json(
        { error: "techStack must be an array" },
        { status: 400 }
      );
    }

    if (difficulty !== undefined) {
      if (!["beginner", "intermediate", "advanced"].includes(difficulty)) {
        return NextResponse.json(
          { error: "Invalid difficulty level" },
          { status: 400 }
        );
      }
    }

    if (maxTeamSize !== undefined) {
      if (typeof maxTeamSize !== "number" || maxTeamSize < 1 || maxTeamSize > 20) {
        return NextResponse.json(
          { error: "maxTeamSize must be between 1 and 20" },
          { status: 400 }
        );
      }
    }

    // Phase 3: Fetch project
    const projectRef = db.collection("projects").doc(id);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Phase 4: Build update object with only provided fields
    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
      lastActivityAt: FieldValue.serverTimestamp(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (githubRepo !== undefined) {
      // Allow clearing GitHub repo by passing empty string
      updateData.githubRepo = githubRepo || FieldValue.delete();
    }
    if (techStack !== undefined) updateData.techStack = techStack;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (maxTeamSize !== undefined) updateData.maxTeamSize = maxTeamSize;

    // Phase 5: Update project
    await projectRef.update(updateData);

    // Phase 6: Fetch updated project
    const updatedDoc = await projectRef.get();
    const updatedData = updatedDoc.data();

    const project = {
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: updatedData?.updatedAt?.toDate?.()?.toISOString() || null,
      approvedAt: updatedData?.approvedAt?.toDate?.()?.toISOString() || null,
      lastActivityAt: updatedData?.lastActivityAt?.toDate?.()?.toISOString() || null,
      completedAt: updatedData?.completedAt?.toDate?.()?.toISOString() || null,
    };

    return NextResponse.json(
      { success: true, project },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}
```

Note: This endpoint is admin-only (via x-admin-token). For creator editing, they would use the existing `/api/projects/[id]` route (not implemented yet, but permission function is ready).
  </action>
  <verify>
1. `npm run build` - TypeScript compilation succeeds
2. `npm test` - Permission tests pass with updated canEditProject logic
3. Manual test: Admin edits pending project - success
4. Manual test: Admin edits active project - success
5. Manual test: Creator edits active project via permission check - returns false
6. API test: PATCH /api/admin/projects/[id] with valid fields returns 200
7. API test: PATCH with invalid title returns 400
  </verify>
  <done>
canEditProject function updated with admin-always + creator-before-approval logic. PATCH endpoint created in admin API route with field validation, authentication check, and Firestore update. Endpoint returns updated project data after successful edit.
  </done>
</task>

</tasks>

<verification>
After all tasks complete:

1. Build succeeds: `npm run build`
2. Admin projects page displays:
   - Discord contact info below creator name with click-to-copy
   - "Edit Project" action in dropdown menu
3. Edit workflow works:
   - Click Edit opens pre-filled modal
   - Change title, description, tech stack
   - Click Save updates project in list
   - Toast shows success message
4. Permission logic enforces boundaries:
   - Admin can edit any project status
   - Creator can only edit pending/declined (not active/completed)
5. API validation works:
   - Invalid title length returns 400
   - Invalid GitHub URL returns 400
   - Valid updates return 200 with updated project
</verification>

<success_criteria>
Quick Task 31 is complete when:

- [ ] ContactInfo component imported and rendered in admin projects page
- [ ] Discord username displays with click-to-copy functionality
- [ ] EditProjectDialog component created with all editable fields
- [ ] Edit action added to dropdown menu in admin projects page
- [ ] Edit dialog pre-fills with existing project data
- [ ] PATCH endpoint created at /api/admin/projects/[id]
- [ ] PATCH endpoint validates all fields and returns updated project
- [ ] canEditProject function updated with admin-always + creator-before-approval logic
- [ ] Admin can edit projects in any status (pending/active/completed)
- [ ] Project list updates with edited fields after save
- [ ] All TypeScript compilation succeeds
- [ ] Toast notifications show success/error feedback
</success_criteria>

<output>
After completion, create `.planning/quick/31-add-admin-project-management-features-1-/31-SUMMARY.md`
</output>
