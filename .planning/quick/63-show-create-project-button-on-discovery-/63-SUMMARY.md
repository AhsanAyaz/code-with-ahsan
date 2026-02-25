---
phase: quick-063
plan: 01
subsystem: projects/routing
tags: [routing, navigation, ux, cleanup]
dependency_graph:
  requires: []
  provides: [unified-projects-route]
  affects: [headerNavLinks, MyProjectsWidget, MyProjectsPage, ProjectDetailPage, applications-api]
tech_stack:
  added: []
  patterns: [server-component-redirect, client-discovery-page]
key_files:
  created: []
  modified:
    - src/app/projects/page.tsx
    - src/app/projects/discover/page.tsx
    - src/data/headerNavLinks.js
    - src/components/mentorship/dashboard/MyProjectsWidget.tsx
    - src/app/projects/my/page.tsx
    - src/app/projects/[id]/page.tsx
    - src/app/api/projects/[id]/applications/[userId]/route.ts
  deleted:
    - src/app/projects/showcase/page.tsx
    - src/app/api/projects/showcase/route.ts
    - src/components/projects/ShowcaseCard.tsx
    - src/components/projects/ShowcaseFilters.tsx
decisions:
  - /projects is now the discovery page (moved from /projects/discover)
  - Create a Project button visible to all visitors without auth gate
  - /projects/discover redirects to /projects for backward compatibility
  - /projects/showcase route removed entirely (no redirect needed)
metrics:
  duration: "3 min"
  completed_date: "2026-02-25"
  tasks: 2
  files_changed: 11
---

# Phase quick-063: Project Routing Consolidation Summary

**One-liner:** Consolidated /projects to be the discovery page, removed auth gate from Create button, deleted showcase route and orphaned components.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Replace /projects page with discovery content and show Create button for everyone | 5eddf2a | src/app/projects/page.tsx, src/app/projects/discover/page.tsx |
| 2 | Update all /projects/discover links and remove showcase route and components | 52dafca | headerNavLinks.js, MyProjectsWidget.tsx, my/page.tsx, [id]/page.tsx, applications route.ts, 4 deleted files |

## What Was Done

**Task 1:** Replaced the old placeholder `/projects` page (which showed static project cards from `projectsData.js`) with the full discovery page content previously at `/projects/discover`. Key change: removed the `{profile && (...)}` auth gate around the "Create a Project" button so it renders unconditionally. The `/projects/new` page itself handles auth redirects. Also updated the debounced URL update to use `/projects` instead of `/projects/discover`. Replaced `/projects/discover` with a minimal server component that calls `redirect("/projects")`.

**Task 2:** Updated all internal links pointing to `/projects/discover`:
- `headerNavLinks.js`: Community dropdown Projects link
- `MyProjectsWidget.tsx`: "Explore Projects" empty state button
- `my/page.tsx`: Two "Discover Projects" empty state buttons
- `[id]/page.tsx`: Three "Back to Discovery" back links (in error states and breadcrumb)
- `applications/[userId]/route.ts`: Discord DM text for declined applications

Deleted four files no longer needed: `showcase/page.tsx`, `api/projects/showcase/route.ts`, `ShowcaseCard.tsx`, `ShowcaseFilters.tsx`.

## Verification

- `npx tsc --noEmit` passes (cleared stale .next cache before final check)
- `grep -r "projects/discover" src/` returns no results
- `grep -r "ShowcaseCard|ShowcaseFilters|/api/projects/showcase" src/` returns no results

## Decisions Made

1. **Create button ungated** — Removed `profile &&` condition; the button links to `/projects/new` which already handles auth redirects. No need to duplicate auth logic in the discovery page.
2. **No showcase redirect** — The showcase route is simply deleted. No backward-compatibility redirect needed since it's an internal feature page, not a canonical public URL.
3. **Cleared .next cache** — TypeScript initially reported errors from stale `.next/types/validator.ts` files referencing deleted showcase routes. Clearing `.next/` resolved this; source code was already clean.

## Deviations from Plan

**1. [Rule 1 - Bug] Stale .next cache caused false TypeScript errors**
- **Found during:** Task 2 verification
- **Issue:** After deleting showcase files, `npx tsc --noEmit` reported errors in `.next/dev/types/validator.ts` and `.next/types/validator.ts` referencing the deleted showcase modules. These are auto-generated Next.js type validator files that hadn't been regenerated.
- **Fix:** Deleted the `.next/` directory before re-running `tsc --noEmit`. TypeScript then reported zero errors.
- **Files modified:** `.next/` (cache cleared, not tracked in git)
- **Commit:** N/A (cache cleanup, not committed)

## Self-Check: PASSED

- `src/app/projects/page.tsx` — exists, contains discovery content with ungated Create button
- `src/app/projects/discover/page.tsx` — exists, contains redirect to /projects
- `src/data/headerNavLinks.js` — updated to /projects
- `src/components/mentorship/dashboard/MyProjectsWidget.tsx` — updated to /projects
- `src/app/projects/my/page.tsx` — updated to /projects (2 occurrences)
- `src/app/projects/[id]/page.tsx` — updated to /projects (3 occurrences)
- `src/app/api/projects/[id]/applications/[userId]/route.ts` — updated Discord DM URL
- Deleted files confirmed absent: ShowcaseCard.tsx, ShowcaseFilters.tsx, showcase/page.tsx, api/projects/showcase/route.ts
- Commits: 5eddf2a (Task 1), 52dafca (Task 2) — both confirmed in git log
