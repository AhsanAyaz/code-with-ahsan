---
phase: quick-015
plan: 15
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/projects/TeamRoster.tsx
autonomous: true
must_haves:
  truths:
    - "When the creator has joined as a member, they appear in the team members list with a 'Creator' badge"
    - "When the creator has NOT joined as a member, they do NOT appear in the team members list"
    - "The team member count accurately reflects the creator-member's presence"
  artifacts:
    - path: "src/components/projects/TeamRoster.tsx"
      provides: "Team roster rendering with creator-as-member visibility"
  key_links:
    - from: "src/components/projects/TeamRoster.tsx"
      to: "members array from API"
      via: "props"
      pattern: "members\\.filter"
---

<objective>
Show the creator in the TeamRoster members list when they have joined the team as a member.

Purpose: Currently, TeamRoster filters out the creator from the members list unconditionally (line 23: `members.filter(m => m.userId !== project.creatorId)`). This means even when the creator explicitly joins the team via the "Join Project" button, they remain invisible in the team section. For clarity, the creator should appear in the members list when they are a member, distinguished with a "Creator" badge instead of the regular "Member" badge.

Output: Updated TeamRoster component that conditionally shows the creator in the members list.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/projects/TeamRoster.tsx
@src/app/projects/[id]/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Show creator in members list when they have joined as member</name>
  <files>src/components/projects/TeamRoster.tsx</files>
  <action>
    Update TeamRoster.tsx to stop unconditionally filtering out the creator from the members list.

    Current behavior (line 23):
    ```ts
    const nonCreatorMembers = members.filter(m => m.userId !== project.creatorId);
    ```

    New behavior: Remove this filter entirely. Show ALL members from the `members` array as-is. The API (`GET /api/projects/[id]/members`) returns members from the `project_members` collection. The creator only appears in this collection if they explicitly joined via `POST /api/projects/[id]/join`. So:
    - If creator has NOT joined as member: they have no `ProjectMember` document, so they won't be in the `members` array at all. No filtering needed.
    - If creator HAS joined as member: they will be in the `members` array and should be shown.

    Specific changes to `TeamRoster.tsx`:

    1. Remove the `nonCreatorMembers` filter (line 23). Use `members` directly instead.

    2. Update the member count display (line 31) to use `members.length` instead of `nonCreatorMembers.length`:
       ```
       Team ({members.length} / {project.maxTeamSize} members)
       ```

    3. Update the map on line 36 to iterate over `members` instead of `nonCreatorMembers`.

    4. For the badge on line 56, conditionally show "Creator" badge (with a distinct style) when `member.userId === project.creatorId`, otherwise show "Member":
       ```tsx
       {member.userId === project.creatorId ? (
         <span className="badge badge-primary">Creator</span>
       ) : (
         <span className="badge">Member</span>
       )}
       ```

    5. For the remove button (lines 57-83): do NOT show the remove button for the creator-member (the creator should not be able to remove themselves via this button; they use the "Leave Project" button instead). Update the condition:
       ```tsx
       {isCreator && onRemoveMember && member.userId !== project.creatorId && (
       ```

    6. Update the empty state message (line 88-92) to use `members.length === 0` instead of `nonCreatorMembers.length === 0`.

    Do NOT change the parent page (`page.tsx`). The separate "Creator" section at the top of the project detail page should remain as-is -- it always shows the creator regardless of membership status. The TeamRoster will additionally show them in the team list when they've joined.
  </action>
  <verify>
    Run `npx tsc --noEmit` to verify no TypeScript errors.
    Run `npx next lint` to verify no lint errors.
    Visually inspect the component logic: when members array contains a member with userId === project.creatorId, they should render with a "Creator" badge and no remove button. When the members array does not contain the creator, nothing changes.
  </verify>
  <done>
    - Creator appears in TeamRoster members list when they have a ProjectMember document (joined as member)
    - Creator does NOT appear in TeamRoster when they have not joined as member
    - Creator member shows "Creator" badge (badge-primary) instead of "Member" badge
    - Creator member does NOT have a remove button
    - Member count accurately reflects all members including creator-member
    - Non-creator members still show "Member" badge and remove button as before
  </done>
</task>

</tasks>

<verification>
- TypeScript compilation passes: `npx tsc --noEmit`
- Linting passes: `npx next lint`
- TeamRoster no longer has `nonCreatorMembers` filter variable
- Creator member renders with "Creator" badge when present in members array
- Remove button not shown for creator-member entry
</verification>

<success_criteria>
When a project creator joins their own team as a member, they appear in the TeamRoster members list with a distinguishing "Creator" badge, making their dual role visible to all team members and visitors.
</success_criteria>

<output>
After completion, create `.planning/quick/15-when-the-creator-joins-the-team-as-a-mem/15-SUMMARY.md`
</output>
