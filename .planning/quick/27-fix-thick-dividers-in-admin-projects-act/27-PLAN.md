---
task: 27
type: quick
files_modified: [src/app/admin/projects/page.tsx]
autonomous: true
---

<objective>
Fix thick gray dividers in admin projects Actions dropdown menu by removing divider elements and using thin border styling on menu items instead.

Purpose: Improve visual polish and make dropdown menu look cleaner
Output: Dropdown menu with subtle 1px dividers instead of thick gray separators
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-quick.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
The Actions dropdown menu in src/app/admin/projects/page.tsx (lines 452-499) currently uses `<li className="divider my-0"></li>` elements that create thick gray dividers. These appear on:
- Line 463: Between "View Project" and the pending status actions
- Line 490: Between pending status actions and "Delete Project"

DaisyUI's divider class creates a thick 8px divider with gray background. This looks too heavy in a compact dropdown menu.
</context>

<tasks>

<task type="auto">
  <name>Replace thick dividers with thin borders</name>
  <files>src/app/admin/projects/page.tsx</files>
  <action>
Remove the two `<li className="divider my-0"></li>` elements (lines 463 and 490).

Add thin top border to menu items that need visual separation:
- Add `border-t border-base-300 pt-2` to the first `<li>` after line 463 (the Approve button li)
- Add `border-t border-base-300 pt-2` to the Delete Project `<li>` (line 491-497)

This creates subtle 1px dividers using Tailwind's border utilities instead of DaisyUI's thick divider component.
  </action>
  <verify>
Visual inspection:
1. Start dev server: npm run dev
2. Navigate to /admin/projects
3. Click Actions dropdown on any project card
4. Verify dividers are now thin 1px lines instead of thick gray bars
5. Check that spacing still looks good with pt-2 padding
  </verify>
  <done>
- Thick divider elements removed
- Menu items use border-t border-base-300 for subtle separation
- Dropdown menu looks cleaner and more polished
  </done>
</task>

</tasks>

<verification>
Run dev server and visually confirm the Actions dropdown has thin dividers instead of thick ones. The menu should feel lighter and more refined.
</verification>

<success_criteria>
- No `<li className="divider">` elements in Actions dropdown
- Visual separation maintained with thin 1px borders
- Menu spacing looks natural with border-t and pt-2 styling
</success_criteria>

<output>
After completion, create `.planning/quick/27-fix-thick-dividers-in-admin-projects-act/27-SUMMARY.md`
</output>
