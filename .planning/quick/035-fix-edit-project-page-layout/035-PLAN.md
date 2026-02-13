---
phase: quick-035
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/projects/[id]/edit/page.tsx
autonomous: true

must_haves:
  truths:
    - "Edit project page has bg-base-200 background matching /profile page"
    - "Form fields are wrapped in card containers with card-body, card-title, divider"
    - "Labels are stacked above inputs with proper spacing"
    - "Page width and padding matches /profile page conventions"
    - "Both creator and admin users see the same improved layout"
  artifacts:
    - path: "src/app/projects/[id]/edit/page.tsx"
      provides: "Restyled edit project form matching /profile card-based layout"
  key_links:
    - from: "src/app/projects/[id]/edit/page.tsx"
      to: "/profile page layout pattern"
      via: "consistent card-based styling"
      pattern: "card bg-base-100 shadow-xl"
---

<objective>
Fix the edit project page layout to match the /profile page card-based styling.

Purpose: The current edit project page has bare form fields without card containers, no bg-base-200 background, and inconsistent spacing compared to the /profile page. Both pages are user-facing settings forms and should share the same visual language.

Output: A restyled edit project page with card-based layout, proper background, labels stacked above inputs, and consistent spacing -- matching the /profile page patterns.
</objective>

<execution_context>
@/home/ahsan/.claude/get-shit-done/workflows/execute-plan.md
@/home/ahsan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/app/profile/page.tsx (target layout pattern)
@src/app/profile/layout.tsx (target layout wrapper)
@src/app/projects/[id]/edit/page.tsx (file to fix)
@src/app/projects/layout.tsx (projects layout wrapper - does NOT provide bg-base-200)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Restyle edit project page to match /profile card-based layout</name>
  <files>src/app/projects/[id]/edit/page.tsx</files>
  <action>
Restyle the edit project page to match the /profile page layout conventions. The key changes:

**1. Add bg-base-200 background to outer wrapper:**
The projects layout.tsx only provides MentorshipProvider (no bg-base-200). The edit page must provide its own background. Change the outermost div to include the background:
- Loading state: Change `<div className="max-w-4xl mx-auto p-8">` to `<div className="min-h-screen bg-base-200"><div className="max-w-4xl mx-auto px-4 py-8">`
- Error state: Same wrapper pattern
- Main return: Same wrapper pattern

**2. Restructure the header section to match /profile:**
Currently the back button and title are separate blocks. Restructure to match /profile's pattern:
```
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
  <div>
    <h2 className="text-2xl font-bold">Edit Project</h2>
    <p className="text-base-content/70">Update project details and settings</p>
  </div>
  <Link href={`/projects/${projectId}`} className="btn btn-ghost btn-sm">
    <- Back to Project
  </Link>
</div>
```

**3. Wrap the form in a card container:**
Wrap the entire form in a DaisyUI card matching the /profile pattern:
```
<div className="card bg-base-100 shadow-xl">
  <div className="card-body">
    <h3 className="card-title">Project Details</h3>
    <div className="divider"></div>
    <form onSubmit={handleSubmit} className="space-y-6">
      ... all form fields ...
    </form>
  </div>
</div>
```

**4. Keep form-control pattern as-is:**
The existing form fields already use the correct DaisyUI `form-control` + `label` + `label-text` pattern (labels stacked above inputs). DO NOT change the individual field markup -- it is already correct. The issue is only the missing card container and background.

**5. Move error alert inside the card body:**
Place the error alert div between the divider and the form fields, inside the card-body.

**6. Move action buttons inside the card:**
The Cancel/Save buttons should remain at the bottom of the form inside the card, same as current placement but now visually contained within the card.

**What NOT to change:**
- Do NOT modify any form logic (state, handlers, validation, submit)
- Do NOT modify the admin auth check or permission logic
- Do NOT change any useEffect hooks
- Do NOT change the loading skeleton or error redirect behavior
- Keep `max-w-4xl` (narrower than profile is fine for a form -- the card wrapper is the key visual change)
  </action>
  <verify>
Run `npx next build 2>&1 | tail -20` to verify no TypeScript or build errors. Visually inspect by running `npm run dev` and navigating to an edit project page to confirm:
1. Background is bg-base-200 (gray)
2. Form is inside a white card with shadow
3. Card has a "Project Details" title and divider
4. Header has title on left, back button on right
  </verify>
  <done>
Edit project page renders with bg-base-200 background, card-based form container with card-title and divider, header matching /profile layout pattern, and all form functionality preserved unchanged.
  </done>
</task>

</tasks>

<verification>
- `npx next build` completes without errors
- Edit project page at /projects/[id]/edit has bg-base-200 background
- Form is wrapped in card bg-base-100 shadow-xl container
- Header shows title/subtitle on left, back button on right (matching /profile)
- All form fields render correctly with labels above inputs
- Form submission (both creator and admin paths) works unchanged
</verification>

<success_criteria>
- Edit project page visually matches /profile page card-based layout style
- No TypeScript or build errors
- Form functionality (validation, submit, error handling) unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/035-fix-edit-project-page-layout/035-SUMMARY.md`
</output>
