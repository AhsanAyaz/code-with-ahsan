---
phase: quick-8
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/projects/[id]/page.tsx
  - src/components/projects/TeamRoster.tsx
autonomous: true
must_haves:
  truths:
    - "Creator is displayed in its own section above the team roster, visually distinct from team members"
    - "A share/copy button exists in the project header that copies the project URL to clipboard"
    - "Team roster heading shows current member count out of maxTeamSize (e.g., '2 / 5 members')"
  artifacts:
    - path: "src/app/projects/[id]/page.tsx"
      provides: "Creator section, share button, updated layout"
    - path: "src/components/projects/TeamRoster.tsx"
      provides: "Team roster without creator, X/Y member count display"
  key_links:
    - from: "src/app/projects/[id]/page.tsx"
      to: "TeamRoster component"
      via: "project.maxTeamSize passed through, creator section rendered separately"
---

<objective>
Improve the project detail page UX with three targeted changes: (1) separate creator into a distinct section above the team roster, (2) add a copy/share button for the project URL, and (3) show member count as X / Y with maxTeamSize.

Purpose: Reduce confusion between creator and team members, make sharing easier, and surface team capacity at a glance.
Output: Updated project detail page and TeamRoster component.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/projects/[id]/page.tsx
@src/components/projects/TeamRoster.tsx
@src/types/mentorship.ts (Project interface — has maxTeamSize: number, memberCount?: number, creatorProfile)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add creator section and share button to project detail page</name>
  <files>src/app/projects/[id]/page.tsx</files>
  <action>
Two changes to the project detail page:

**1. Creator Section (new, placed between badges and Description):**
- Add a new section after the status/difficulty badges div (line ~497) and before the Description section (line ~500).
- Render a card-style section with heading "Creator" containing the creator's avatar, display name, and discord contact info (using ContactInfo component already imported).
- Remove the creator info (avatar + "Created by" text, lines 473-485) from the header area since it will now live in its own section.
- Style: Use a `bg-base-200 rounded-lg p-4` container. Show the creator avatar (48x48), display name as font-semibold, and ContactInfo below. Use flex layout with items-center and gap-3 (same pattern as TeamRoster member rows).

**2. Share/Copy Button (in header area):**
- Add a "Share" button in the header's flex container (the `flex items-start justify-between` div at line 469).
- Place it in the right side of the header, where the justify-between gap is.
- The button should use `navigator.clipboard.writeText(window.location.href)` to copy the current URL.
- On click, show a toast via the existing `showToast` function: `showToast("Project URL copied to clipboard!", "success")`.
- Style: `btn btn-ghost btn-sm gap-1` with an inline SVG clipboard/link icon (use a simple share/link icon — a chain link or clipboard).
- After copying, briefly change button text to "Copied!" for 2 seconds using local state, then revert to "Share".
- Add a `const [copied, setCopied] = useState(false);` state variable. On click, set copied=true, copy URL, setTimeout to set copied=false after 2000ms.
  </action>
  <verify>Run `npx tsc --noEmit` to confirm no type errors. Visually inspect that the creator section appears as a standalone block above the team roster and the share button is in the header.</verify>
  <done>Creator info removed from header subtitle and shown in its own labeled section. Share button in header copies URL to clipboard and shows success toast.</done>
</task>

<task type="auto">
  <name>Task 2: Update TeamRoster to show X/Y member count and remove creator rendering</name>
  <files>src/components/projects/TeamRoster.tsx</files>
  <action>
Two changes to TeamRoster:

**1. Remove creator rendering from TeamRoster:**
- Remove the entire creator block (lines 39-59) that renders the creator's avatar, name, and "Creator" / "Creator · Member" badge.
- The creator is now rendered in the parent page's dedicated Creator section.
- Keep the `isCreatorAlsoMember` logic only for counting purposes if needed, but since the parent page now owns creator display, simplify:
  - Remove the `isCreatorAlsoMember` variable.
  - The `nonCreatorMembers` filter stays as-is (still filter out creator from members to avoid duplicate if creator is also a member).
  - `totalMembers` should simply be `nonCreatorMembers.length` (team members only, creator shown separately).

**2. Show X / Y with maxTeamSize:**
- Change the heading from `Team ({totalMembers} member{s})` to `Team ({totalMembers} / {project.maxTeamSize} members)`.
- This shows capacity at a glance, e.g., "Team (2 / 5 members)".
- The `project` prop already contains `maxTeamSize: number` from the Project type.

**3. Update empty state text:**
- Change from "No team members yet. Applications will appear here once approved." to "No team members yet." (simpler, since creator is shown above).
  </action>
  <verify>Run `npx tsc --noEmit` to confirm no type errors. The TeamRoster no longer renders the creator row and shows "Team (X / Y members)" format.</verify>
  <done>TeamRoster displays only non-creator members, heading shows X/Y capacity format, creator rendering responsibility moved to parent page.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- Project detail page renders: header with title + share button, badges, Creator section, Description, Tech Stack, Links, Team roster (members only with X/Y count)
- Share button copies URL and shows toast
- Creator section shows avatar, name, discord contact
- Team heading shows format like "Team (2 / 5 members)"
</verification>

<success_criteria>
1. Creator is visually separated from team members in its own labeled section above the team roster
2. Share button in header copies project URL to clipboard with feedback
3. Team roster heading displays current/max member count (X / Y format)
4. No TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/8-improve-project-detail-page-ux-1-separat/8-SUMMARY.md`
</output>
