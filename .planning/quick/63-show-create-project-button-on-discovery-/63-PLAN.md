---
phase: quick-063
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/projects/page.tsx
  - src/app/projects/discover/page.tsx
  - src/data/headerNavLinks.js
  - src/components/mentorship/dashboard/MyProjectsWidget.tsx
  - src/app/projects/my/page.tsx
  - src/app/projects/[id]/page.tsx
  - src/app/api/projects/[id]/applications/[userId]/route.ts
  - src/app/projects/showcase/page.tsx
  - src/app/api/projects/showcase/route.ts
  - src/components/projects/ShowcaseCard.tsx
  - src/components/projects/ShowcaseFilters.tsx
autonomous: true
requirements: [QUICK-063]

must_haves:
  truths:
    - "Visiting /projects shows the project discovery page with filters, search, and project cards"
    - "Create a Project button is visible to ALL users (not just logged-in users with mentorship profile)"
    - "/projects/showcase route no longer exists (returns 404)"
    - "All internal links that previously pointed to /projects/discover now point to /projects"
    - "Navigation dropdown Projects link goes to /projects"
  artifacts:
    - path: "src/app/projects/page.tsx"
      provides: "Project discovery page (moved from discover/page.tsx)"
      contains: "Discover Projects"
    - path: "src/app/projects/discover/page.tsx"
      provides: "Redirect from old /projects/discover to /projects"
      contains: "redirect"
  key_links:
    - from: "src/data/headerNavLinks.js"
      to: "/projects"
      via: "COMMUNITY_LINKS href"
      pattern: 'href: "/projects"'
    - from: "src/app/projects/page.tsx"
      to: "/api/projects"
      via: "fetch in useEffect"
      pattern: "fetch.*api/projects"
---

<objective>
Consolidate project routing: make /projects the discovery page, show Create Project button for everyone, remove showcase route, and update all references.

Purpose: Simplify the project navigation hierarchy. Currently /projects shows an old placeholder page, /projects/discover is the real discovery page, and /projects/showcase is a separate completed-projects page. The user wants /projects to BE the discovery page, the showcase route removed entirely, and the Create Project button shown for all users (not gated behind mentorship profile).

Output: Unified /projects route as discovery page, removed showcase route and components, all links updated.
</objective>

<execution_context>
@/home/ahsan/.claude/get-shit-done/workflows/execute-plan.md
@/home/ahsan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/projects/page.tsx
@src/app/projects/discover/page.tsx
@src/app/projects/showcase/page.tsx
@src/app/projects/layout.tsx
@src/data/headerNavLinks.js
@src/components/mentorship/dashboard/MyProjectsWidget.tsx
@src/app/projects/my/page.tsx
@src/app/projects/[id]/page.tsx
@src/app/api/projects/[id]/applications/[userId]/route.ts
@src/components/projects/ShowcaseCard.tsx
@src/components/projects/ShowcaseFilters.tsx
@src/app/api/projects/showcase/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace /projects page with discovery content and show Create button for everyone</name>
  <files>
    src/app/projects/page.tsx
    src/app/projects/discover/page.tsx
  </files>
  <action>
    1. **Replace `src/app/projects/page.tsx`** with the discovery page content currently in `src/app/projects/discover/page.tsx`. Key changes from the current discover page:
       - Keep the "use client" directive, all imports, Suspense wrapper, filters, project fetching logic
       - Keep the existing metadata approach: since this is a client component, add a `generateMetadata` or just rely on the layout. Actually, since the discover page is "use client" with `export const dynamic = "force-dynamic"`, keep that same pattern.
       - **CRITICAL CHANGE:** The "Create a Project" button is currently gated behind `{profile && (...)}`. Change this to show for ALL visitors (remove the `profile &&` condition). The button should always render as `<Link href="/projects/new" className="btn btn-primary">Create a Project</Link>` without any auth check. The /projects/new page itself already handles auth redirects.
       - Update the debounced URL update to use `/projects` instead of `/projects/discover` (lines 66-67 in current discover page). The `newURL` should be `/projects?${params.toString()}` or just `/projects`.
       - Remove the `useMentorship` import and `const { profile, loading: authLoading } = useMentorship()` usage since we no longer need the profile check for the button. Also remove the `authLoading` from the loading check on line 110 (`if (loading || authLoading)` becomes just `if (loading)`).
       - Remove the `import { useMentorship } from "@/contexts/MentorshipContext"` since it's no longer needed.

    2. **Replace `src/app/projects/discover/page.tsx`** with a server-side redirect to `/projects` using Next.js `redirect()` from `next/navigation`. This ensures any old bookmarks or cached links to `/projects/discover` still work:
       ```tsx
       import { redirect } from "next/navigation";
       export default function DiscoverRedirect() {
         redirect("/projects");
       }
       ```
       This is a simple server component that immediately redirects. No "use client" needed.
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx tsc --noEmit --pretty 2>&1 | head -50</automated>
    <manual>Visit /projects - should show discovery page with Create button visible. Visit /projects/discover - should redirect to /projects.</manual>
  </verify>
  <done>
    - /projects renders the full discovery page with filters, search, project cards
    - "Create a Project" button visible to all users (no auth gate)
    - /projects/discover redirects to /projects
    - URL updates use /projects (not /projects/discover) when filters change
  </done>
</task>

<task type="auto">
  <name>Task 2: Update all /projects/discover links to /projects and remove showcase route and components</name>
  <files>
    src/data/headerNavLinks.js
    src/components/mentorship/dashboard/MyProjectsWidget.tsx
    src/app/projects/my/page.tsx
    src/app/projects/[id]/page.tsx
    src/app/api/projects/[id]/applications/[userId]/route.ts
    src/app/projects/showcase/page.tsx
    src/app/api/projects/showcase/route.ts
    src/components/projects/ShowcaseCard.tsx
    src/components/projects/ShowcaseFilters.tsx
  </files>
  <action>
    **Update all `/projects/discover` references to `/projects`:**

    1. `src/data/headerNavLinks.js` line 9: Change `href: "/projects/discover"` to `href: "/projects"` in the COMMUNITY_LINKS array.

    2. `src/components/mentorship/dashboard/MyProjectsWidget.tsx` line 57: Change `href="/projects/discover"` to `href="/projects"`.

    3. `src/app/projects/my/page.tsx` lines 277 and 396: Change both `href="/projects/discover"` to `href="/projects"`.

    4. `src/app/projects/[id]/page.tsx` lines 564, 593, and 603: Change all three `href="/projects/discover"` to `href="/projects"`.

    5. `src/app/api/projects/[id]/applications/[userId]/route.ts` line 193: Change the URL string from `/projects/discover` to `/projects` in the Discord message text.

    **Remove showcase route and components (delete these files entirely):**

    6. Delete `src/app/projects/showcase/page.tsx` — the showcase route is being removed entirely.

    7. Delete `src/app/api/projects/showcase/route.ts` — the showcase API endpoint is no longer needed.

    8. Delete `src/components/projects/ShowcaseCard.tsx` — orphaned component only used by showcase page.

    9. Delete `src/components/projects/ShowcaseFilters.tsx` — orphaned component only used by showcase page.
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx tsc --noEmit --pretty 2>&1 | head -50 && grep -r "projects/discover" src/ --include="*.tsx" --include="*.ts" --include="*.js" | grep -v "node_modules" | grep -v ".next" || echo "No remaining /projects/discover references"</automated>
    <manual>Verify no remaining references to /projects/discover (except the redirect page itself) and no references to showcase components.</manual>
  </verify>
  <done>
    - All internal links point to /projects (not /projects/discover)
    - Navigation Community dropdown "Projects" links to /projects
    - /projects/showcase route removed (no page.tsx)
    - /api/projects/showcase route removed (no route.ts)
    - ShowcaseCard and ShowcaseFilters components deleted
    - TypeScript compilation passes with no errors
    - grep confirms no stale /projects/discover references remain (only the redirect file itself)
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes — no TypeScript errors from removed imports or deleted files
2. `grep -r "projects/discover" src/ --include="*.tsx" --include="*.ts" --include="*.js"` returns only the redirect in `src/app/projects/discover/page.tsx`
3. `grep -r "ShowcaseCard\|ShowcaseFilters\|/api/projects/showcase" src/ --include="*.tsx" --include="*.ts"` returns no results
4. `npm run build` succeeds (if time permits)
</verification>

<success_criteria>
- /projects shows the discovery page with search, filters, and project grid
- "Create a Project" button is visible to ALL visitors (not gated behind auth/profile)
- /projects/discover redirects to /projects (backward compatibility)
- /projects/showcase is gone (404)
- All navigation links (Community dropdown, widgets, My Projects, project detail back links) point to /projects
- No orphaned ShowcaseCard, ShowcaseFilters, or showcase API route remains
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/63-show-create-project-button-on-discovery-/63-SUMMARY.md`
</output>
