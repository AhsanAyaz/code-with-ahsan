---
phase: quick-34
plan: 1
type: execute
wave: 1
depends_on: ["quick-33"]
files_modified:
  - src/app/projects/my/page.tsx
autonomous: true

must_haves:
  truths:
    - "Creator sees Edit button/link for pending projects in My Projects Created tab"
    - "Creator sees Edit button/link for declined projects in My Projects Created tab"
    - "Creator does NOT see Edit button for active or completed projects"
    - "Clicking Edit navigates to /projects/{id}/edit route"
  artifacts:
    - path: "src/app/projects/my/page.tsx"
      provides: "Edit action in project card wrapper"
      contains: "projects.*edit"
  key_links:
    - from: "src/app/projects/my/page.tsx"
      to: "/projects/[id]/edit"
      via: "Link or router.push on Edit action"
      pattern: "Link.*projects.*edit|router\\.push.*projects.*edit"
---

<objective>
Add Edit action to project cards in the My Projects page (Created tab) for pending and declined projects. This completes the edit workflow by providing creators easy access to edit their projects before they're approved or after they've been declined.

**Purpose:** Allow creators to edit their pending/declined projects from My Projects page without navigating to project detail first.

**Output:** Edit button/link visible only for pending/declined projects, linking to the edit route created in task 33.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/quick/33-replace-edit-modal-with-dedicated-page/33-PLAN.md

**Current implementation:**
- My Projects page at `src/app/projects/my/page.tsx` has three tabs: Created, Joined, Invitations
- Created tab shows projects where `creatorId === user.uid`
- Projects are rendered using ProjectCard component wrapped in a div
- Only declined projects have a Delete button in the wrapper (lines 411-449)
- ProjectCard itself has no action buttons (just displays project info)

**Task 33 context:**
- Edit page route created at `/projects/[id]/edit`
- Authorization: creators can edit pending/declined projects only
- Admins can edit any project status
- Public PUT endpoint at `/api/projects/[id]` validates authorization server-side

**Current delete button pattern (declined projects only):**
```tsx
{activeTab === "created" && project.status === "declined" && (
  <div className="absolute top-2 right-2">
    {confirmDeleteId === project.id ? (
      // Confirm/Cancel buttons
    ) : (
      <button onClick={...} className="btn btn-error btn-xs">
        Delete
      </button>
    )}
  </div>
)}
```

**Design decision:**
Add Edit button alongside existing Delete button for declined projects, and add standalone Edit button for pending projects. Use absolute positioning (top-2 right-2) to keep consistent with current Delete button placement.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Edit button to pending and declined project cards in Created tab</name>
  <files>src/app/projects/my/page.tsx</files>
  <action>
Update the Created tab project rendering section (lines 407-452) to add Edit buttons for pending and declined projects.

**Implementation strategy:**

1. **Replace the conditional block** (lines 411-449) with a more comprehensive action buttons container that handles both Edit and Delete.

2. **New conditional logic:**
   ```tsx
   {activeTab === "created" && (project.status === "pending" || project.status === "declined") && (
     <div className="absolute top-2 right-2 flex gap-2">
       {/* Edit button - shown for both pending and declined */}
       <Link
         href={`/projects/${project.id}/edit`}
         className="btn btn-primary btn-xs"
         onClick={(e) => e.stopPropagation()}
       >
         Edit
       </Link>

       {/* Delete button - only for declined projects */}
       {project.status === "declined" && (
         // Existing delete button logic here
       )}
     </div>
   )}
   ```

3. **Button styling:**
   - Edit: `btn btn-primary btn-xs` (primary color to indicate main action)
   - Delete: Keep existing `btn btn-error btn-xs`
   - Container: `flex gap-2` to space buttons horizontally

4. **Link import:**
   - Link is already imported at top (line 8)
   - No new imports needed

5. **Click handling:**
   - Add `e.stopPropagation()` to Edit Link to prevent triggering ProjectCard's link navigation
   - Keep existing delete button click handling with `e.preventDefault()` and `e.stopPropagation()`

6. **Layout structure:**
   ```tsx
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
     {projects.map((project) => (
       <div key={project.id} className="relative">
         <ProjectCard project={project} />
         {activeTab === "created" && (project.status === "pending" || project.status === "declined") && (
           <div className="absolute top-2 right-2 flex gap-2">
             <Link href={`/projects/${project.id}/edit`} className="btn btn-primary btn-xs" onClick={(e) => e.stopPropagation()}>
               Edit
             </Link>
             {project.status === "declined" && (
               // Delete button with confirm/cancel logic
             )}
           </div>
         )}
       </div>
     ))}
   </div>
   ```

**Visual result:**
- Pending projects: Show Edit button only (top-right)
- Declined projects: Show Edit and Delete buttons side-by-side (top-right)
- Active/completed projects: No action buttons (unchanged)

**Why this approach:**
- Consistent with existing Delete button positioning (absolute top-2 right-2)
- Minimal changes - adds Edit button without restructuring entire component
- Uses existing Link component pattern (like Back button at top of page)
- Prevents navigation conflicts with stopPropagation
- Clear visual hierarchy: Edit (primary action) before Delete (destructive action)
  </action>
  <verify>
1. Check Edit button added for pending projects: `grep -A5 "status === \"pending\"" src/app/projects/my/page.tsx`
2. Check Edit button added for declined projects: `grep -A10 "status === \"declined\"" src/app/projects/my/page.tsx | grep "Edit"`
3. Verify Link to edit route: `grep "Link href.*projects.*edit" src/app/projects/my/page.tsx`
4. Verify stopPropagation on Edit link: `grep -A1 "projects.*edit" src/app/projects/my/page.tsx | grep "stopPropagation"`
5. Manual test:
   - Visit /projects/my (Created tab)
   - Verify pending projects show Edit button
   - Verify declined projects show Edit and Delete buttons
   - Verify active/completed projects show no buttons
   - Click Edit on pending project → navigate to /projects/{id}/edit
  </verify>
  <done>
- Edit button visible for pending projects in Created tab
- Edit button visible for declined projects in Created tab (alongside Delete)
- No Edit button shown for active or completed projects
- Edit button links to `/projects/{id}/edit` route
- Click handling prevents navigation conflicts with ProjectCard link
- Button styling follows DaisyUI patterns (btn-primary btn-xs)
- Buttons positioned consistently with existing Delete button (absolute top-2 right-2)
- TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>

**Manual testing checklist:**

1. **Pending project:**
   - Navigate to /projects/my (Created tab)
   - Find a pending project
   - Verify Edit button appears in top-right corner
   - Click Edit → should navigate to /projects/{id}/edit
   - Verify edit page loads correctly

2. **Declined project:**
   - Find a declined project in Created tab
   - Verify both Edit and Delete buttons appear side-by-side
   - Click Edit → should navigate to /projects/{id}/edit
   - Verify Delete button still works (confirm/cancel flow)

3. **Active/completed projects:**
   - Find active or completed projects
   - Verify NO Edit button appears (only Delete was not shown before either)
   - Verify clicking on card still navigates to project detail

4. **Click behavior:**
   - Verify clicking Edit button doesn't trigger ProjectCard link navigation
   - Verify clicking elsewhere on card still navigates to project detail

**Code verification:**
```bash
# Check Edit button for pending/declined
grep -A10 "project.status === \"pending\" || project.status === \"declined\"" src/app/projects/my/page.tsx

# Verify Link usage
grep "Link href.*projects.*edit" src/app/projects/my/page.tsx

# Verify no TypeScript errors
npm run build
```

</verification>

<success_criteria>

**Functional requirements:**
- [ ] Edit button visible for pending projects in Created tab
- [ ] Edit button visible for declined projects in Created tab
- [ ] No Edit button shown for active or completed projects
- [ ] Clicking Edit navigates to `/projects/[id]/edit` route
- [ ] Edit link prevents event propagation to ProjectCard link

**UI/UX:**
- [ ] Edit button uses primary styling (btn-primary btn-xs)
- [ ] Edit and Delete buttons aligned horizontally with gap-2
- [ ] Buttons positioned consistently (absolute top-2 right-2)
- [ ] Clicking card (not buttons) still navigates to project detail

**Integration with task 33:**
- [ ] Edit route from task 33 exists and is accessible
- [ ] Edit page validates authorization (allows pending/declined for creators)
- [ ] Edit workflow completes: My Projects → Edit → Save → Project Detail

**Code quality:**
- [ ] No new dependencies added
- [ ] Link component already imported (no new imports needed)
- [ ] TypeScript compiles without errors
- [ ] Consistent with existing codebase patterns

</success_criteria>

<output>
After completion, create `.planning/quick/34-add-edit-action-to-my-projects/34-SUMMARY.md` documenting:
- Edit button implementation in My Projects page
- Conditional rendering logic (pending/declined only)
- Button positioning and styling
- Click handling to prevent navigation conflicts
- Integration with edit route from task 33
</output>
