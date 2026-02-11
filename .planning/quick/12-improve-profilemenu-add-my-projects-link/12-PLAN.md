---
phase: quick-12
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/data/headerNavLinks.js
  - src/components/ProfileMenu.tsx
  - src/components/LayoutWrapper.tsx
autonomous: true
must_haves:
  truths:
    - "My Projects link appears in ProfileMenu dropdown, not Community dropdown"
    - "Avatar button has a visible chevron/down-arrow indicating it is a dropdown"
    - "ProfileMenu dropdown styling matches Community dropdown quality (shadow, spacing, hover states)"
  artifacts:
    - path: "src/components/ProfileMenu.tsx"
      provides: "Improved profile dropdown with My Projects link, chevron, polished styling"
    - path: "src/data/headerNavLinks.js"
      provides: "COMMUNITY_LINKS without My Projects entry"
    - path: "src/components/LayoutWrapper.tsx"
      provides: "Community dropdown without My Projects icon rendering"
  key_links:
    - from: "src/components/ProfileMenu.tsx"
      to: "/projects/my"
      via: "Link component href"
      pattern: 'href="/projects/my"'
---

<objective>
Improve the ProfileMenu component: move "My Projects" from the Community dropdown into the Profile dropdown, add a chevron indicator on the avatar button, and upgrade dropdown styling to match Community dropdown polish.

Purpose: Better UX — My Projects is user-specific (belongs in profile), avatar needs a visual affordance showing it is clickable, and dropdown styling should be consistent site-wide.
Output: Updated ProfileMenu with 3 items (Profile, My Projects, Logout), chevron on avatar, matching dropdown style.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/ProfileMenu.tsx
@src/components/LayoutWrapper.tsx
@src/data/headerNavLinks.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove My Projects from Community dropdown</name>
  <files>src/data/headerNavLinks.js, src/components/LayoutWrapper.tsx</files>
  <action>
In `src/data/headerNavLinks.js`:
- Remove the `{ href: "/projects/my", title: "My Projects", icon: "my-projects" }` entry from the `COMMUNITY_LINKS` array.

In `src/components/LayoutWrapper.tsx`:
- Remove the line `{item.icon === "my-projects" && <span>📂</span>}` from the Community dropdown icon rendering (around line 133). This icon mapping is no longer needed since My Projects is removed from COMMUNITY_LINKS.
  </action>
  <verify>
Grep for "my-projects" in headerNavLinks.js — should return no results.
Grep for "my-projects" in LayoutWrapper.tsx — should return no results.
`npm run build` compiles without errors.
  </verify>
  <done>My Projects no longer appears in the Community dropdown. No dead icon code remains.</done>
</task>

<task type="auto">
  <name>Task 2: Upgrade ProfileMenu with My Projects link, chevron, and polished styling</name>
  <files>src/components/ProfileMenu.tsx</files>
  <action>
Redesign the ProfileMenu dropdown to match the Community dropdown's visual quality. Key changes:

1. **Add chevron indicator to avatar button:**
   Replace the current `btn btn-ghost btn-circle avatar` button with a flex container that shows the avatar AND a small down-chevron SVG (same chevron used in Community dropdown: `M19 9l-7 7-7-7`, w-4 h-4). Use `flex items-center gap-1` layout. Keep the avatar at w-10 rounded-full. The chevron should be subtle (use `opacity-60` or similar).

2. **Switch from daisyUI dropdown to custom click-toggle** (matching Community dropdown pattern):
   - Use `useState` for `isOpen` (already exists) and `useRef` for the container div
   - Add a `useEffect` click-outside handler (same pattern as LayoutWrapper's Community dropdown: listen for mousedown, check if click is outside ref, close if so)
   - Replace daisyUI `dropdown dropdown-end dropdown-open` classes with a simple `relative` container
   - Render the dropdown menu conditionally with `{isOpen && (<ul>...</ul>)}`

3. **Upgrade dropdown menu styling** to match Community dropdown:
   - Change from: `mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52`
   - Change to: `absolute top-full right-0 z-[100] menu p-2 shadow-lg bg-base-100 rounded-box w-52 mt-2`
   - Key differences: `shadow-lg` (not `shadow`), `z-[100]` (not `z-[1]`), remove `menu-sm` for consistent text size, use `absolute top-full right-0` positioning (right-aligned since it's on the right side of navbar)

4. **Add My Projects link** between Profile and Logout:
   ```jsx
   <li>
     <Link href="/projects/my" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
       <span>📂</span>
       My Projects
     </Link>
   </li>
   ```

5. **Keep existing items** (Profile with user icon, Logout with logout icon) but ensure they all use consistent `flex items-center gap-2` styling (they already do).

6. **Remove daisyUI dropdown tabIndex attributes** — since we are using custom click-toggle, remove `tabIndex={0}` from both the button div and the ul element.

The final dropdown should have 3 items: Profile (user icon), My Projects (📂), Logout (arrow icon). All with consistent hover states inherited from daisyUI `menu` class.
  </action>
  <verify>
`npm run build` compiles without errors.
Visually confirm: avatar has chevron indicator, dropdown has 3 items (Profile, My Projects, Logout), dropdown shadow and spacing match Community dropdown.
  </verify>
  <done>
ProfileMenu shows avatar + chevron, opens on click with click-outside-to-close behavior, displays Profile / My Projects / Logout with consistent styling matching the Community dropdown.
  </done>
</task>

</tasks>

<verification>
1. `npm run build` — no TypeScript or compilation errors
2. Community dropdown no longer shows "My Projects"
3. ProfileMenu dropdown shows: Profile, My Projects, Logout
4. Avatar button has visible chevron/down-arrow indicator
5. ProfileMenu dropdown has shadow-lg, z-[100], proper spacing — visually consistent with Community dropdown
6. Click outside ProfileMenu closes it
7. Clicking any ProfileMenu item closes the dropdown
</verification>

<success_criteria>
- My Projects link moved from Community to Profile dropdown
- Avatar has chevron indicating dropdown behavior
- ProfileMenu styling matches Community dropdown (shadow-lg, z-index, spacing, hover states)
- Both dropdowns close on outside click and item click
- Build passes with no errors
</success_criteria>

<output>
After completion, create `.planning/quick/12-improve-profilemenu-add-my-projects-link/12-SUMMARY.md`
</output>
