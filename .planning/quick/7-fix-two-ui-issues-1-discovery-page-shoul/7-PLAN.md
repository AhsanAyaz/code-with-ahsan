---
phase: quick-7
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/projects/discover/page.tsx
  - src/app/projects/[id]/page.tsx
autonomous: true
must_haves:
  truths:
    - "Create Project button is visible on the discovery page header when user is authenticated, regardless of whether projects exist"
    - "Application cards on project detail page show discordUsername instead of username"
  artifacts:
    - path: "src/app/projects/discover/page.tsx"
      provides: "Always-visible Create Project button in header"
    - path: "src/app/projects/[id]/page.tsx"
      provides: "Discord username display in application cards"
  key_links: []
---

<objective>
Fix two UI issues: (1) Move "Create Project" button from empty state to discovery page header so it's always visible to authenticated users. (2) Fix application cards on project detail page to show discordUsername instead of username.

Purpose: Improve discoverability of project creation and show correct Discord identity for applicants.
Output: Two updated page files with the fixes applied.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/projects/discover/page.tsx
@src/app/projects/[id]/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Move Create Project button to discovery page header</name>
  <files>src/app/projects/discover/page.tsx</files>
  <action>
In the DiscoverProjectsContent component, move the "Create Project" button from the empty state block to the header section so it's always visible when the user is authenticated.

Specifically:
1. In the header `<div className="mb-8">` block (around line 143), change it to a flex container with items-center and justify-between so the title/subtitle sit on the left and the button on the right.
2. Add the "Create Project" Link button (using existing `Link` import from next/link) to the header, conditionally rendered when `profile` is truthy: `<Link href="/projects/new" className="btn btn-primary">Create a Project</Link>`
3. Remove the `{profile && (...)}` Link block from the empty state section (lines 165-169), keeping only the "No active projects found" paragraph in the empty state.

The header should look like:
```
<div className="flex items-center justify-between mb-8">
  <div>
    <h1 ...>Discover Projects</h1>
    <p ...>Find active projects...</p>
  </div>
  {profile && (
    <Link href="/projects/new" className="btn btn-primary">
      Create a Project
    </Link>
  )}
</div>
```
  </action>
  <verify>Run `npx next build 2>&1 | tail -20` to confirm no build errors in the discovery page.</verify>
  <done>Create Project button appears in the page header for authenticated users, not just in the empty state.</done>
</task>

<task type="auto">
  <name>Task 2: Fix application cards to show discordUsername</name>
  <files>src/app/projects/[id]/page.tsx</files>
  <action>
In the project detail page, fix the application card section to display discordUsername instead of username.

On lines 625-628, change:
```tsx
{app.userProfile?.username && (
  <div className="text-sm text-base-content/70">
    @{app.userProfile.username}
  </div>
)}
```

To:
```tsx
{app.userProfile?.discordUsername && (
  <div className="text-sm text-base-content/70">
    @{app.userProfile.discordUsername}
  </div>
)}
```

This matches the pattern already used in TeamRoster.tsx for member display.
  </action>
  <verify>Run `npx next build 2>&1 | tail -20` to confirm no build errors in the project detail page.</verify>
  <done>Application cards on the project detail page show the applicant's Discord username instead of their generic username.</done>
</task>

</tasks>

<verification>
- Build succeeds with no errors: `npx next build`
- Discovery page header contains Create Project button (visible to authenticated users)
- Empty state no longer contains Create Project button
- Application cards on project detail page reference discordUsername
</verification>

<success_criteria>
1. Authenticated users see "Create a Project" button in the discovery page header at all times (not just when no projects exist)
2. Application cards on the project detail page display `@discordUsername` instead of `@username`
3. Build passes with no errors
</success_criteria>

<output>
After completion, create `.planning/quick/7-fix-two-ui-issues-1-discovery-page-shoul/7-SUMMARY.md`
</output>
