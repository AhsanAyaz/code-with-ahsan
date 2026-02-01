---
phase: quick
plan: 005
subsystem: admin-ui
tags: [react, state-management, search, controlled-input]
requires: []
provides:
  - Controlled search input on admin dashboard
  - Persistent search value across tab switches
affects: []
tech-stack:
  added: []
  patterns:
    - "Controlled input pattern for search with debounced filter"
key-files:
  created: []
  modified:
    - src/app/mentorship/admin/page.tsx
decisions:
  - id: "quick-005-01"
    decision: "Use separate searchInputValue state for controlled input display"
    rationale: "Preserves raw input value for immediate display while searchQuery remains debounced"
    date: "2026-02-01"
metrics:
  duration: "52 seconds"
  completed: "2026-02-01"
---

# Quick Task 005: Fix Search Input State Sync Issue on Admin Dashboard Summary

**One-liner:** Converted uncontrolled search input to controlled input with separate display state to preserve value across tab switches.

## What Was Done

Fixed the search input state synchronization issue on the admin dashboard where switching tabs would clear the displayed search value while the filter remained active, causing confusion (empty input with filtered/no results).

**Root Cause:** The search input was uncontrolled (no `value` prop). When React re-rendered on tab switch, the DOM input reset to empty while the `searchQuery` state persisted.

**Solution:** Made the input controlled by:
1. Adding `searchInputValue` state to track the raw (non-debounced) display value
2. Adding `value={searchInputValue}` prop to the input element
3. Updating `onChange` to set both the immediate display value and trigger the debounced search

This ensures the input value and active filter are always visually consistent, while preserving the debounced search behavior.

## Tasks Completed

| Task | Files | Commit |
|------|-------|--------|
| Make search input controlled with synced display value | src/app/mentorship/admin/page.tsx | 8e6b4b6 |

## Technical Details

**State management:**
- `searchInputValue` (string): Immediate display value, updates on every keystroke
- `searchQuery` (string): Debounced filter value, updates after 300ms delay
- Input element is now controlled via `value={searchInputValue}`

**Behavior preserved:**
- Debounced search (300ms) still works via `useDebouncedCallback`
- Search resets page to 1 on query change
- Filter applies to displayName, email, and discordUsername

**Files modified:**
- `src/app/mentorship/admin/page.tsx`:
  - Line 123: Added `searchInputValue` state declaration
  - Line 1284: Added `value={searchInputValue}` prop to input
  - Lines 1286-1288: Updated onChange to set both immediate display and trigger debounced search

## Decisions Made

**1. Separate display state vs. unified state**
- **Decision:** Use separate `searchInputValue` state for display, keep `searchQuery` for filter
- **Rationale:** Preserves existing debounce logic without refactoring. Clear separation of concerns: immediate display vs. delayed filter
- **Alternative considered:** Unify into single state with debounced derivation - would require more refactoring

## Verification Results

- TypeScript compilation: ✓ No errors (`npx tsc --noEmit`)
- Controlled input: ✓ Input has both `value` and `onChange` props
- State sync: ✓ `searchInputValue` state exists and is used as input's value
- Debounce preserved: ✓ `debouncedSearch` still called on onChange

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for:** Any future admin dashboard work

**No blockers or concerns.**

## Related Context

- **Issue:** Search input cleared on tab switch but filter remained active
- **User impact:** Confusing UX - empty input showing "no results" because filter was still active
- **Fix type:** State management bug - uncontrolled to controlled input conversion
- **Pattern established:** Use controlled inputs with separate display state when debouncing is required

## Files Changed

```
src/app/mentorship/admin/page.tsx
```

## Commit Log

```
8e6b4b6 fix(quick-005): make search input controlled to preserve value across tab switches
```
