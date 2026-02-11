---
phase: quick-006
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/projects/route.ts
  - src/types/mentorship.ts
  - src/components/projects/ProjectCard.tsx
autonomous: true
must_haves:
  truths:
    - "Creator sees pending application count badge on each ProjectCard in My Projects 'Created' tab"
    - "Badge only appears when pendingApplicationCount > 0"
    - "Badge does not appear for non-creator views (Discover page, Joined tab)"
    - "Count is accurate and matches actual pending applications in Firestore"
  artifacts:
    - path: "src/app/api/projects/route.ts"
      provides: "Enriched project response with pendingApplicationCount when creatorId filter is used"
      contains: "pendingApplicationCount"
    - path: "src/types/mentorship.ts"
      provides: "Optional pendingApplicationCount field on Project interface"
      contains: "pendingApplicationCount"
    - path: "src/components/projects/ProjectCard.tsx"
      provides: "Badge UI for pending application count"
      contains: "pendingApplicationCount"
  key_links:
    - from: "src/app/api/projects/route.ts"
      to: "project_applications collection"
      via: "Firestore query counting pending applications per project"
      pattern: "project_applications.*pending"
    - from: "src/components/projects/ProjectCard.tsx"
      to: "Project.pendingApplicationCount"
      via: "Conditional badge rendering"
      pattern: "pendingApplicationCount.*badge"
---

<objective>
Add a pending application count badge to ProjectCard so project creators can see at a glance how many people are waiting for approval on each of their projects.

Purpose: Creators currently have to click into each project to see pending applications. This adds a visual indicator directly on the card in the My Projects "Created" tab.
Output: Enriched API response with pending counts, updated type, badge on ProjectCard.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/api/projects/route.ts
@src/types/mentorship.ts
@src/components/projects/ProjectCard.tsx
@src/app/projects/my/page.tsx
@src/app/api/projects/[id]/applications/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add pendingApplicationCount to Project type and enrich GET /api/projects response</name>
  <files>src/types/mentorship.ts, src/app/api/projects/route.ts</files>
  <action>
1. In `src/types/mentorship.ts`, add an optional field to the Project interface:
   ```
   pendingApplicationCount?: number;
   ```
   Add it after `memberCount?: number;` (line 134).

2. In `src/app/api/projects/route.ts`, modify the GET handler's `creatorId` branch (the non-member query path, lines 187-214) to enrich projects with pending application counts. After fetching projects from Firestore:

   a. Collect all project IDs from the snapshot.
   b. For each project ID, query `project_applications` collection where `projectId == id` AND `status == "pending"`. Use Promise.all to run these queries in parallel (not N+1 sequential).
   c. Build a Map<projectId, count> from the results.
   d. When mapping snapshot.docs to the response array, spread `pendingApplicationCount: countMap.get(doc.id) || 0` into each project object.

   IMPORTANT: Only enrich with pendingApplicationCount when `creatorId` query param is present. This keeps the Discover page and member-based queries unaffected (no extra Firestore reads for public listings). The `member` query path (lines 149-184) should NOT be modified.

   The enrichment code should look roughly like:
   ```typescript
   // After snapshot is retrieved and only when creatorId is present
   if (creatorId) {
     const projectIds = snapshot.docs.map(doc => doc.id);
     const pendingCounts = await Promise.all(
       projectIds.map(async (pid) => {
         const countSnap = await db
           .collection("project_applications")
           .where("projectId", "==", pid)
           .where("status", "==", "pending")
           .get();
         return { id: pid, count: countSnap.size };
       })
     );
     const countMap = new Map(pendingCounts.map(p => [p.id, p.count]));
     // Use countMap when building response
   }
   ```

   Integrate this into the existing response mapping so each project object includes `pendingApplicationCount` when creatorId filter is used.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors. Manually verify by reading the modified files that:
- Project interface has pendingApplicationCount optional field
- GET /api/projects with creatorId param returns pendingApplicationCount on each project
- GET /api/projects without creatorId does NOT include pendingApplicationCount
- The member query path is untouched
  </verify>
  <done>Project type has optional pendingApplicationCount field. API returns accurate pending counts when creatorId filter is used, with parallel Firestore queries for efficiency.</done>
</task>

<task type="auto">
  <name>Task 2: Add pending applications badge to ProjectCard component</name>
  <files>src/components/projects/ProjectCard.tsx</files>
  <action>
In `src/components/projects/ProjectCard.tsx`, add a conditional badge that shows pending application count:

1. The component already receives `project: Project` which will now optionally include `pendingApplicationCount`.

2. Add a badge positioned in the card header area (after the title `h2`). The badge should:
   - Only render when `project.pendingApplicationCount` is defined AND greater than 0
   - Use DaisyUI badge styling: `badge badge-primary badge-sm`
   - Display text like: `{count} pending` (e.g., "3 pending")
   - Be placed next to the card title on the same line, so modify the title area to be a flex container

3. Specifically, change the title rendering from:
   ```tsx
   <h2 className="card-title text-lg">{project.title}</h2>
   ```
   To:
   ```tsx
   <div className="flex items-center gap-2">
     <h2 className="card-title text-lg">{project.title}</h2>
     {project.pendingApplicationCount != null && project.pendingApplicationCount > 0 && (
       <span className="badge badge-primary badge-sm whitespace-nowrap">
         {project.pendingApplicationCount} pending
       </span>
     )}
   </div>
   ```

   Use `!= null` (not `!== undefined`) to safely handle both undefined and null. This ensures the badge never shows on the Discover page (where the field is absent) or when count is 0.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors. Run `npm run build` to verify the page builds without errors. Visually inspect by reading the component that:
- Badge only renders conditionally when pendingApplicationCount > 0
- Badge is inline with the title
- Uses DaisyUI badge-primary styling
  </verify>
  <done>ProjectCard shows a "N pending" badge next to the title when the project has pending applications. Badge is invisible when count is 0 or field is absent (Discover page, Joined tab).</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. `npm run build` succeeds
3. On My Projects "Created" tab: cards for projects with pending applications show "N pending" badge
4. On My Projects "Joined" tab: no badges appear (member query does not enrich)
5. On Discover page: no badges appear (no creatorId param)
6. Projects with 0 pending applications show no badge
</verification>

<success_criteria>
- Project creators see pending application count badges on their project cards in My Projects
- Badge accurately reflects the number of pending (not approved/declined) applications
- No visual or functional regression on Discover page or Joined tab
- No additional API calls from client side (counts come server-side in the existing project list response)
</success_criteria>

<output>
After completion, create `.planning/quick/6-add-pending-application-count-badge-to-p/6-SUMMARY.md`
</output>
