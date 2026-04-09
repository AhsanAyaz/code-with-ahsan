---
phase: quick
plan: 260409-lsg
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/mentorship/admin/sessions/route.ts
  - src/app/admin/mentors/page.tsx
autonomous: true
requirements: [GH-160]
must_haves:
  truths:
    - "Admin can see a Re-activate button on each cancelled mentorship card"
    - "Clicking Re-activate changes the mentorship status from cancelled to active"
    - "The cancelled mentorship card moves to the Active Mentorships section after re-activation"
  artifacts:
    - path: "src/app/api/mentorship/admin/sessions/route.ts"
      provides: "State machine allowing cancelled -> active transition"
      contains: "cancelled.*active"
    - path: "src/app/admin/mentors/page.tsx"
      provides: "Re-activate button in cancelled mentorship cards"
      contains: "Re-activate"
  key_links:
    - from: "src/app/admin/mentors/page.tsx"
      to: "/api/mentorship/admin/sessions"
      via: "handleSessionStatusChange(id, 'active')"
      pattern: "handleSessionStatusChange"
---

<objective>
Add a "Re-activate" button to cancelled mentorship cards on the admin mentors page (GitHub issue #160).

Purpose: Allow admins to re-activate cancelled mentorships directly from the mentor detail view, instead of the current terminal state where cancelled mentorships cannot be restored.

Output: Updated API state machine + UI button on cancelled mentorship cards.
</objective>

<context>
@src/app/api/mentorship/admin/sessions/route.ts
@src/app/admin/mentors/page.tsx
@src/types/mentorship.ts
</context>

<interfaces>
<!-- Current state machine in sessions/route.ts -->
```typescript
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: ['active'], // Allows revert
  cancelled: [], // Terminal state — THIS NEEDS TO CHANGE
}
```

<!-- handleSessionStatusChange already supports 'active' | 'completed' -->
```typescript
const handleSessionStatusChange = async (
  sessionId: string,
  newStatus: "active" | "completed"
) => { ... }
```

<!-- MentorshipCard component props -->
```typescript
function MentorshipCard({
  mentorship, showCompleteButton, showRevertButton,
  handleSessionStatusChange, updatingStatus, ...
}: { ... })
```

<!-- Cancelled mentorships currently rendered as plain cards WITHOUT MentorshipCard component, no action buttons -->
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Allow cancelled-to-active transition in API and render Re-activate button on cancelled mentorship cards</name>
  <files>src/app/api/mentorship/admin/sessions/route.ts, src/app/admin/mentors/page.tsx</files>
  <action>
1. In `src/app/api/mentorship/admin/sessions/route.ts`:
   - Change the ALLOWED_TRANSITIONS map entry for `cancelled` from `[]` to `['active']`.
   - Add a `reactivatedAt` timestamp field when transitioning from `cancelled` to `active` (similar pattern to `revertedAt` for completed->active).

2. In `src/app/admin/mentors/page.tsx`:
   - Replace the inline cancelled mentorship card rendering (the plain `<div>` cards inside the "Cancelled Mentorships" collapse, around line ~878) with the existing `MentorshipCard` component.
   - Pass `showCompleteButton={false}` and `showRevertButton={false}` (same as current cancelled behavior).
   - Add a new prop `showReactivateButton` to the `MentorshipCard` component. When true, render a "Re-activate" button (btn btn-success btn-xs) that calls `handleSessionStatusChange(mentorship.id, "active")`.
   - Pass `showReactivateButton={true}` only for cancelled mentorship cards, `false` for all others.
   - Update the `MentorshipCard` TypeScript interface to include the new `showReactivateButton: boolean` prop.
   - When re-activation succeeds, update local state so the mentorship moves from cancelled to active section (already handled by `handleSessionStatusChange` updating `setMentorshipData`).
  </action>
  <verify>
    <automated>cd /Users/amu1o5/personal/code-with-ahsan && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>
    - Cancelled mentorship cards show a "Re-activate" button
    - Clicking Re-activate calls PUT /api/mentorship/admin/sessions with status "active"
    - API accepts cancelled -> active transition
    - Card moves to Active Mentorships section in the UI after successful re-activation
    - TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- Manual check: Navigate to /admin/mentors, expand a mentor with cancelled mentorships, verify "Re-activate" button appears
- Click "Re-activate" on a cancelled mentorship and verify it moves to the Active section
</verification>

<success_criteria>
- Admin can re-activate any cancelled mentorship from the mentor detail page
- State machine allows cancelled -> active transition
- UI provides Re-activate button only on cancelled mentorship cards
- No TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/260409-lsg-add-button-to-re-activate-mentorship-for/260409-lsg-SUMMARY.md`
</output>
