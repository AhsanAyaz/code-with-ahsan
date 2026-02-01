---
phase: quick
plan: 005
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/mentorship/admin/page.tsx
autonomous: true

must_haves:
  truths:
    - "Search input preserves its displayed value when switching between tabs"
    - "Search filter remains active and consistent with displayed input value"
    - "Typing in search input still debounces the filter query correctly"
  artifacts:
    - path: "src/app/mentorship/admin/page.tsx"
      provides: "Controlled search input with preserved value across tab switches"
      contains: "searchInputValue"
  key_links:
    - from: "search input value prop"
      to: "searchInputValue state"
      via: "controlled input"
      pattern: "value=\\{searchInputValue\\}"
---

<objective>
Fix the search input state sync issue on the admin dashboard where switching tabs clears the displayed search input value but leaves the filter active, causing confusion (empty input but filtered/no results).

Purpose: The uncontrolled input loses its DOM value on re-render (tab switch) while the `searchQuery` state persists. Making it a controlled input with a separate display state ensures the input value and filter stay in sync.

Output: A single file change to `src/app/mentorship/admin/page.tsx` that makes the search input controlled.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/app/mentorship/admin/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Make search input controlled with synced display value</name>
  <files>src/app/mentorship/admin/page.tsx</files>
  <action>
The search input (around line 1279) is currently uncontrolled - it has `onChange` but no `value` prop. When React re-renders on tab switch, the DOM input resets to empty while `searchQuery` state persists, causing the mismatch.

Fix:
1. Add a new state variable `searchInputValue` (string, default "") next to the existing `searchQuery` state (line 122). This tracks the raw (non-debounced) input display value.

2. Update the `debouncedSearch` callback (line 149) to also set `searchInputValue` immediately:
   ```
   const debouncedSearch = useDebouncedCallback((value: string) => {
     setSearchQuery(value);
     setCurrentPage(1);
   }, 300);
   ```
   Keep this as-is - it only handles the debounced query update.

3. Update the search input element (around line 1279) to be controlled:
   - Add `value={searchInputValue}` prop
   - Update `onChange` to: `(e) => { setSearchInputValue(e.target.value); debouncedSearch(e.target.value); }`

This ensures:
- The input always shows the current search value (controlled by React state)
- Tab switches preserve the displayed value (state persists across re-renders)
- The actual filter query is still debounced (300ms delay via useDebouncedCallback)
- The input value and active filter are always visually consistent

Do NOT add a clear/reset button or change any other search behavior. This is a minimal fix.
  </action>
  <verify>
    Run `npx next build` or `npx tsc --noEmit` to confirm no type errors.
    Manual verification: On the admin dashboard, type "test" in search on All Mentors tab, switch to Pending Mentors tab, switch back to All Mentors - the input should still show "test".
  </verify>
  <done>
    Search input displays its value consistently across tab switches. The displayed value and active filter are always in sync. Debounced search behavior is preserved.
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors (`npx tsc --noEmit`)
2. The search input element has both `value` and `onChange` props (controlled input)
3. `searchInputValue` state exists and is used as the input's value
</verification>

<success_criteria>
- Search input value persists when switching between admin dashboard tabs
- Search filter and displayed input value are always in sync
- Debounced search still works (typing rapidly does not cause excessive re-renders)
- No TypeScript or build errors introduced
</success_criteria>

<output>
After completion, create `.planning/quick/005-fix-search-input-state-sync-issue-on-adm/005-SUMMARY.md`
</output>
