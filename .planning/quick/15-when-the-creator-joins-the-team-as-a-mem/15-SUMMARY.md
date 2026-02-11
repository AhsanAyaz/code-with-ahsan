---
phase: quick-015
plan: 15
subsystem: projects
tags: [ui, team-roster, creator-visibility]
dependency_graph:
  requires: [06.1-02]
  provides: [creator-as-member-visibility]
  affects: [team-roster-display]
tech_stack:
  patterns: [conditional-rendering, role-badges]
key_files:
  created: []
  modified:
    - src/components/projects/TeamRoster.tsx
decisions:
  - "Remove unconditional creator filter to allow creator visibility when joined as member"
  - "Use badge-primary for Creator badge to distinguish from regular Member badge"
  - "Prevent remove button on creator-member (creator uses Leave Project button instead)"
metrics:
  duration: 66
  completed: 2026-02-11T16:56:44Z
  tasks: 1
  commits: 1
---

# Quick Task 015: Show Creator in Team Roster When Joined as Member

**One-liner:** Creator now appears in TeamRoster members list with a distinct "Creator" badge when they have explicitly joined the team as a member.

## Objective

Allow the project creator to appear in the TeamRoster members list when they have joined the team via the "Join Project" button, distinguished by a "Creator" badge instead of filtering them out unconditionally.

## Context

Previously, TeamRoster unconditionally filtered out the creator from the members list (`members.filter(m => m.userId !== project.creatorId)`), even when the creator had explicitly joined the team as a member. This caused confusion because:
- The creator's dual role as both owner and team member was invisible in the team roster
- Team member counts were inaccurate when the creator had joined
- The separate "Creator" section at the top of the project detail page didn't indicate membership status

The API correctly returns the creator in the members array only when they have a ProjectMember document (created via `POST /api/projects/[id]/join`), so the filtering logic was unnecessary.

## Implementation Summary

### Task 1: Show creator in members list when they have joined as member

**Changes:**
1. Removed the `nonCreatorMembers` filter variable
2. Use `members` array directly throughout the component
3. Updated member count to `members.length` (line 25)
4. Added conditional badge rendering (lines 50-54):
   - Creator member: `<span className="badge badge-primary">Creator</span>`
   - Regular member: `<span className="badge">Member</span>`
5. Updated remove button condition to exclude creator-member (line 55)
6. Updated empty state check to use `members.length === 0` (line 86)

**Logic:**
- If creator has NOT joined: They have no ProjectMember document, so they won't be in the `members` array. Nothing changes.
- If creator HAS joined: They appear in the `members` array with a "Creator" badge and no remove button.

**Verification:**
- TypeScript compilation: PASSED
- ESLint: PASSED
- Visual inspection: Logic correctly handles creator-member rendering with badge differentiation and no remove button

**Files modified:**
- `src/components/projects/TeamRoster.tsx` (1 file, 9 insertions, 11 deletions)

**Commit:** b2a564f

## Deviations from Plan

None - plan executed exactly as written.

## Outcomes

### Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Show creator in members list when they have joined as member | b2a564f | src/components/projects/TeamRoster.tsx |

### Must-Haves Satisfied

**Truths:**
- ✅ When the creator has joined as a member, they appear in the team members list with a 'Creator' badge
- ✅ When the creator has NOT joined as a member, they do NOT appear in the team members list
- ✅ The team member count accurately reflects the creator-member's presence

**Artifacts:**
- ✅ `src/components/projects/TeamRoster.tsx` provides team roster rendering with creator-as-member visibility

**Key Links:**
- ✅ TeamRoster component reads `members` array from props (data from `GET /api/projects/[id]/members`)

### Success Criteria

✅ When a project creator joins their own team as a member, they appear in the TeamRoster members list with a distinguishing "Creator" badge, making their dual role visible to all team members and visitors.

## Impact

**User Experience:**
- Project creators can now see themselves in the team roster when they join as members
- The "Creator" badge clearly distinguishes the creator-member from regular members
- Team member counts are now accurate and include the creator when they've joined
- No confusion about whether the creator is part of the team

**Technical:**
- Simplified filtering logic (removed unnecessary filter)
- Component logic now aligns with API behavior (creator in members array = show in roster)
- Consistent with Phase 06.1-02 design where creator and team membership are separate concepts

## Self-Check

Verifying implementation claims:

```bash
[ -f "src/components/projects/TeamRoster.tsx" ] && echo "FOUND: src/components/projects/TeamRoster.tsx" || echo "MISSING: src/components/projects/TeamRoster.tsx"
```

Output: FOUND: src/components/projects/TeamRoster.tsx

```bash
git log --oneline --all | grep -q "b2a564f" && echo "FOUND: b2a564f" || echo "MISSING: b2a564f"
```

Output: FOUND: b2a564f

## Self-Check: PASSED

All claimed files and commits exist and are verified.
