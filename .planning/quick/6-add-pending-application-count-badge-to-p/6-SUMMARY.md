---
phase: quick-006
plan: 01
subsystem: Projects/Team Formation
tags: [ui-enhancement, api-enrichment, creator-experience]
dependency_graph:
  requires:
    - "06-02: Team Formation API Routes"
    - "Project Applications data model"
  provides:
    - "Pending application count badge on ProjectCard"
    - "API enrichment with pendingApplicationCount field"
  affects:
    - "GET /api/projects response (when creatorId filter used)"
    - "ProjectCard component rendering"
tech_stack:
  added: []
  patterns:
    - "Conditional API enrichment (only on creatorId query)"
    - "Parallel Firestore queries with Promise.all"
    - "Optional field rendering with null safety"
key_files:
  created: []
  modified:
    - src/types/mentorship.ts
    - src/app/api/projects/route.ts
    - src/components/projects/ProjectCard.tsx
decisions:
  - "Enrich only when creatorId filter is present to avoid unnecessary Firestore reads on Discover page"
  - "Use Promise.all for parallel pending count queries instead of sequential N+1"
  - "Badge uses badge-primary styling for consistency with DaisyUI theme"
  - "Badge only shows when count > 0 using != null check for null safety"
metrics:
  tasks_completed: 2
  duration_minutes: 1.6
  commits: 2
  files_modified: 3
  completed_at: "2026-02-10T22:00:22Z"
---

# Quick Task 006: Add Pending Application Count Badge to ProjectCard

**One-liner:** Project creators see a pending application count badge on each ProjectCard in My Projects tab, with server-side enrichment and parallel Firestore queries for efficiency.

## Objective

Add a pending application count badge to ProjectCard so project creators can see at a glance how many people are waiting for approval on each of their projects. Previously, creators had to click into each project to see pending applications.

## Tasks Completed

### Task 1: Add pendingApplicationCount to Project type and enrich GET /api/projects response
- **Commit:** 300bcee
- **Files:** src/types/mentorship.ts, src/app/api/projects/route.ts

Added optional `pendingApplicationCount` field to the Project interface. Modified GET /api/projects to enrich projects with pending application counts when the `creatorId` query parameter is present.

**Implementation:**
- Check if `creatorId` filter is used in the request
- Collect all project IDs from the query snapshot
- Use `Promise.all` to query `project_applications` collection in parallel for each project
- Build a Map<projectId, count> from pending application counts
- Spread `pendingApplicationCount` into each project object in the response

**Key decision:** Only enrich when `creatorId` is present to avoid extra Firestore reads on Discover page or member-based queries.

### Task 2: Add pending applications badge to ProjectCard component
- **Commit:** aa5165f
- **Files:** src/components/projects/ProjectCard.tsx

Added a conditional badge that displays pending application count next to the project title.

**Implementation:**
- Wrapped title in a flex container with gap-2
- Added badge with `badge badge-primary badge-sm whitespace-nowrap` classes
- Conditional rendering: only show when `pendingApplicationCount != null && > 0`
- Text format: `{count} pending` (e.g., "3 pending")

**Key decision:** Use `!= null` (not `!== undefined`) for null safety, ensuring badge never shows on Discover page where field is absent or when count is 0.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

✓ `npx tsc --noEmit` passed with no errors
✓ `npm run build` succeeded without errors
✓ Badge only renders when pendingApplicationCount > 0
✓ Badge is inline with title using flex layout
✓ Uses DaisyUI badge-primary styling
✓ API enrichment only occurs when creatorId filter is used

## Self-Check: PASSED

**Created files:** None (all modifications)

**Modified files:**
- ✓ FOUND: /Users/amu1o5/personal/code-with-ahsan/src/types/mentorship.ts
- ✓ FOUND: /Users/amu1o5/personal/code-with-ahsan/src/app/api/projects/route.ts
- ✓ FOUND: /Users/amu1o5/personal/code-with-ahsan/src/components/projects/ProjectCard.tsx

**Commits:**
- ✓ FOUND: 300bcee (feat(quick-006): add pendingApplicationCount to Project type and API enrichment)
- ✓ FOUND: aa5165f (feat(quick-006): add pending applications badge to ProjectCard)

## Impact

**User Experience:**
- Creators can now see pending application counts at a glance in My Projects "Created" tab
- No need to click into each project to check for new applications
- Badge provides visual indicator for action needed

**Performance:**
- Parallel Firestore queries prevent N+1 query problem
- Conditional enrichment avoids unnecessary reads on Discover page
- No additional client-side API calls (count comes server-side)

**Technical:**
- Clean separation: enrichment only when needed (creatorId query)
- Null-safe rendering prevents badge on pages without the field
- Type-safe with optional field on Project interface

## Output Artifacts

- **Project.pendingApplicationCount field:** Optional number field on Project interface
- **Enriched API response:** GET /api/projects returns pendingApplicationCount when creatorId filter is used
- **Badge UI:** ProjectCard displays "N pending" badge when count > 0
