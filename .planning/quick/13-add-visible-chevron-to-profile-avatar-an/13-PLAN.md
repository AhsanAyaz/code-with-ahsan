---
phase: quick-13
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ProfileMenu.tsx
  - src/components/LayoutWrapper.tsx
autonomous: true
must_haves:
  truths:
    - "Chevron arrow is visibly rendered next to the profile avatar in the navbar"
    - "All dropdown menus have a darker background that is visually distinct from the page background"
  artifacts:
    - path: "src/components/ProfileMenu.tsx"
      provides: "Profile menu with visible chevron and darker dropdown"
      contains: "bg-base-300"
    - path: "src/components/LayoutWrapper.tsx"
      provides: "Community dropdown with darker background"
      contains: "bg-base-300"
  key_links:
    - from: "ProfileMenu button"
      to: "chevron SVG"
      via: "flex layout without btn-circle clipping"
      pattern: "flex items-center"
---

<objective>
Fix two UI issues: (1) make the chevron arrow visible next to the profile avatar, and (2) darken all dropdown backgrounds for better contrast against the page background.

Purpose: The chevron is in the code but clipped by `btn-circle`, and dropdowns use `bg-base-100` which blends into the page.
Output: Visible chevron next to avatar, all dropdowns using `bg-base-300` for contrast.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/ProfileMenu.tsx
@src/components/LayoutWrapper.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix chevron visibility and darken all dropdown backgrounds</name>
  <files>src/components/ProfileMenu.tsx, src/components/LayoutWrapper.tsx</files>
  <action>
**ProfileMenu.tsx - Fix chevron clipping (line 88-89):**

The trigger button currently has class `flex items-center gap-1 btn btn-ghost btn-circle`. The `btn-circle` class forces a fixed circular dimension (w-12 h-12) which clips everything outside the avatar circle, hiding the chevron SVG.

Replace the button className on line 89:
- FROM: `"flex items-center gap-1 btn btn-ghost btn-circle"`
- TO: `"flex items-center gap-1.5 btn btn-ghost rounded-full px-2"`

This removes `btn-circle` (which clips content to a circle) and uses `rounded-full` (which rounds corners but allows content to grow) with `px-2` for horizontal padding so the chevron has space.

Also increase chevron visibility — on the SVG chevron (line 101), change:
- FROM: `className="w-4 h-4 opacity-60"`
- TO: `className="w-3.5 h-3.5 opacity-70"`

This makes the chevron slightly smaller (proportional to avatar) but more visible with higher opacity.

**ProfileMenu.tsx - Darken dropdown background (line 115):**

Change the dropdown `<ul>` className:
- FROM: `bg-base-100`
- TO: `bg-base-300`

This gives the dropdown a darker background that is distinct from the page.

**LayoutWrapper.tsx - Darken Community dropdown background (line 119):**

Change the Community dropdown `<ul>` className:
- FROM: `bg-base-100`
- TO: `bg-base-300`

This matches the same darker background as the ProfileMenu dropdown for consistency.
  </action>
  <verify>
Run `npm run build` to confirm no TypeScript/build errors. Then visually inspect: `npm run dev` and check that (1) the chevron arrow is visible next to the avatar in the navbar, and (2) both the Community and Profile dropdowns have a noticeably darker background than the page.
  </verify>
  <done>
Chevron is visibly rendered beside the profile avatar (not clipped). Both the Community dropdown and Profile dropdown use bg-base-300, creating clear visual contrast against the bg-base-100 page background.
  </done>
</task>

</tasks>

<verification>
1. Profile avatar shows a visible downward chevron arrow to its right
2. Clicking the avatar opens a dropdown with a darker background (bg-base-300)
3. Community dropdown also has the same darker background (bg-base-300)
4. No layout shifts or visual regressions in the navbar
5. `npm run build` passes without errors
</verification>

<success_criteria>
- Chevron is visible next to profile avatar in desktop navbar
- All dropdown menus (Profile, Community) use bg-base-300 background
- Dropdowns are visually distinct from the page background
- No build errors
</success_criteria>

<output>
After completion, create `.planning/quick/13-add-visible-chevron-to-profile-avatar-an/13-SUMMARY.md`
</output>
