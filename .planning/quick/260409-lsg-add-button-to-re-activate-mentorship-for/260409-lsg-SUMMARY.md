---
phase: quick
plan: 260409-lsg
subsystem: mentorship-admin
tags: [mentorship, admin, ui, state-machine]
requirements: [GH-160]
dependency_graph:
  requires: []
  provides: [cancelled-to-active-transition, reactivate-button-ui]
  affects: [admin-mentors-page, mentorship-sessions-api]
tech_stack:
  added: []
  patterns: [state-machine-transition, conditional-button-prop]
key_files:
  created: []
  modified:
    - src/app/api/mentorship/admin/sessions/route.ts
    - src/app/admin/mentors/page.tsx
decisions:
  - "showReactivateButton prop added to MentorshipCard; cancelled section passes true, all others false"
  - "Replaced inline cancelled mentorship card JSX with MentorshipCard component to avoid duplication"
  - "reactivatedAt timestamp added to distinguish re-activation from revert (completed->active uses revertedAt)"
metrics:
  duration: "10 minutes"
  completed: "2026-04-09"
  tasks_completed: 1
  files_changed: 2
---

# Quick Task 260409-lsg: Add Re-activate Button to Cancelled Mentorship Cards

**One-liner:** API state machine allows cancelled->active transition with reactivatedAt timestamp; admin UI adds Re-activate button to cancelled mentorship cards via MentorshipCard component refactor.

## What Was Done

### Task 1: Allow cancelled-to-active transition in API and render Re-activate button on cancelled mentorship cards

**API changes (`src/app/api/mentorship/admin/sessions/route.ts`):**
- Changed `ALLOWED_TRANSITIONS.cancelled` from `[]` (terminal) to `['active']`
- Added `reactivatedAt` timestamp field when transitioning from `cancelled` to `active`, following the same pattern as `revertedAt` for completed->active transitions

**UI changes (`src/app/admin/mentors/page.tsx`):**
- Added `showReactivateButton` boolean prop to `MentorshipCard` component (TypeScript interface + destructuring)
- Added Re-activate button (btn btn-success btn-xs) inside `MentorshipCard` that calls `handleSessionStatusChange(mentorship.id, "active")` when `showReactivateButton` is true
- Replaced inline cancelled mentorship card JSX with `MentorshipCard` component, passing `showReactivateButton={true}`
- All other `MentorshipCard` usages (active, completed, pending) pass `showReactivateButton={false}`
- Updated toast message from "Mentorship reverted to active" to "Mentorship re-activated" (used for both revert and re-activate paths)

## Commits

| Hash | Description |
|------|-------------|
| 852e56d | feat(quick-260409-lsg): add Re-activate button to cancelled mentorship cards |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] `src/app/api/mentorship/admin/sessions/route.ts` exists and contains `cancelled: ['active']`
- [x] `src/app/admin/mentors/page.tsx` exists and contains `Re-activate` button
- [x] Commit 852e56d exists
- [x] `npx tsc --noEmit` passes with no errors
