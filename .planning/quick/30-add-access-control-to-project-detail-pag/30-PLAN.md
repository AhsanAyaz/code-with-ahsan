---
phase: quick-30
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/projects/[id]/page.tsx
autonomous: true

must_haves:
  truths:
    - "Pending/declined projects return 'Not Found' message when accessed by non-authorized users"
    - "Project creator can view their own pending/declined projects"
    - "Admin users can view any pending/declined projects"
    - "Active/completed/archived projects remain publicly viewable"
  artifacts:
    - path: "src/app/projects/[id]/page.tsx"
      provides: "Authorization check for pending/declined project access"
      min_lines: 1120
  key_links:
    - from: "src/app/projects/[id]/page.tsx"
      to: "useMentorship context"
      via: "profile.isAdmin check"
      pattern: "profile\\??\\.isAdmin"
    - from: "src/app/projects/[id]/page.tsx"
      to: "project.creatorId"
      via: "creator ownership check"
      pattern: "project\\.creatorId.*user\\.uid"
---

<objective>
Add access control to the project detail page to prevent unauthorized viewing of pending/declined projects.

Purpose: Currently, anyone can view a pending or declined project by accessing its direct URL (e.g., /projects/FP4rBk9TnO0q7pwOkiSv in incognito mode). This exposes projects that are not yet approved or have been declined. Only the project creator and admins should be able to view these non-public projects.

Output: Authorization check that returns 404 for unauthorized users attempting to view pending/declined projects.
</objective>

<execution_context>
@.planning/quick/30-add-access-control-to-project-detail-pag/30-PLAN.md
</execution_context>

<context>
@src/app/projects/[id]/page.tsx (project detail client component)
@src/app/roadmaps/[id]/page.tsx (reference pattern for access control on unpublished content - lines 112-144)
@src/contexts/MentorshipContext.tsx (provides user, profile with isAdmin flag)
@src/types/mentorship.ts (Project interface, ProjectStatus type, MentorshipProfile with isAdmin)
@src/lib/permissions.ts (permission helper functions and isAdmin pattern)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add authorization check for pending/declined projects</name>
  <files>src/app/projects/[id]/page.tsx</files>
  <action>
Add access control after the project data is fetched and before rendering the project details.

**Implementation:**

1. After the existing error/loading checks (around line 514), add a new authorization check BEFORE the main render starts (line 540).

2. Check if the project status is "pending" or "declined":
   ```typescript
   const isNonPublicProject = project.status === "pending" || project.status === "declined";
   ```

3. Determine if user is authorized to view non-public projects:
   - User is the project creator: `user?.uid === project.creatorId`
   - User is an admin: `profile?.isAdmin === true`

4. If `isNonPublicProject` is true AND user is NOT authorized (neither creator nor admin), return an error UI similar to the existing error block (lines 514-537):

   ```typescript
   if (isNonPublicProject && !isCreator && !profile?.isAdmin) {
     return (
       <div className="max-w-4xl mx-auto p-8">
         <div className="alert alert-error">
           <svg
             xmlns="http://www.w3.org/2000/svg"
             className="stroke-current shrink-0 h-6 w-6"
             fill="none"
             viewBox="0 0 24 24"
           >
             <path
               strokeLinecap="round"
               strokeLinejoin="round"
               strokeWidth="2"
               d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
             />
           </svg>
           <span>Project not found</span>
         </div>
         <Link href="/projects/discover" className="btn btn-ghost mt-4">
           Back to Discovery
         </Link>
       </div>
     );
   }
   ```

5. Place this check AFTER the `if (error || !project)` block and BEFORE the main `return (` statement.

**Why this approach:**
- Returns generic "Project not found" message instead of "Unauthorized" to avoid information disclosure (don't reveal that a project exists at this ID)
- Uses existing `isCreator` variable (line 64) for creator check
- Uses `profile?.isAdmin` from MentorshipContext for admin check
- Follows the same pattern as roadmaps page (src/app/roadmaps/[id]/page.tsx lines 112-144)

**What NOT to do:**
- Do NOT modify the API route (src/app/api/projects/[id]/route.ts) - client-side check is sufficient for privacy
- Do NOT add new state variables - use existing `isCreator` and `profile.isAdmin`
- Do NOT show different messages for pending vs declined - treat both as "not found"
  </action>
  <verify>
Run `npx tsc --noEmit` to verify TypeScript compilation succeeds. The check should reference `project.status`, `isCreator`, and `profile?.isAdmin` without TypeScript errors.
  </verify>
  <done>
When a non-authorized user (not creator, not admin) attempts to access a pending or declined project via direct URL, they see a "Project not found" error page with a back button. Project creator and admins can still view pending/declined projects normally. Active/completed/archived projects remain publicly accessible.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes without errors
2. Manual verification: In incognito mode (no auth), accessing a pending project URL shows "Project not found"
3. Manual verification: In incognito mode, accessing a declined project URL shows "Project not found"
4. Manual verification: Project creator can still view their own pending/declined projects
5. Manual verification: Admin user can view any pending/declined project
6. Manual verification: Active/completed/archived projects are still publicly viewable by anyone
</verification>

<success_criteria>
- Pending and declined projects are hidden from unauthorized users
- Creator can view their own pending/declined projects
- Admin users can view all pending/declined projects
- Public projects (active, completed, archived) remain accessible to everyone
- Authorization check happens client-side after data fetch
- Error message is generic ("Project not found") to avoid information disclosure
- TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/30-add-access-control-to-project-detail-pag/30-SUMMARY.md`
</output>
