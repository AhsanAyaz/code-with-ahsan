---
phase: quick-260621-tsl
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/mentorship/dashboard/[matchId]/route.ts
autonomous: true
requirements: [VIS-60]
must_haves:
  truths:
    - "Mentee removal DM explicitly states the mentorship was ended by the mentor"
    - "Mentor end DM explicitly states the mentorship was ended by the mentee"
    - "Admin-ended DMs already state 'ended by an administrator' (unchanged)"
    - "Completion (graduation) DM remains celebratory, not reframed as an ending"
    - "All actor wording (mentor/mentee/admin) is grammatically correct and consistent"
  artifacts:
    - path: "src/app/api/mentorship/dashboard/[matchId]/route.ts"
      provides: "Mentorship ending DM notifications with explicit actor attribution"
      contains: "ended by your mentor"
  key_links:
    - from: "action 'remove' mentee DM"
      to: "Discord sendDirectMessage"
      via: "string literal at the mentee removal DM"
      pattern: "ended by your mentor"
    - from: "action 'end' mentor DM"
      to: "Discord sendDirectMessage"
      via: "string literal at the mentor end DM"
      pattern: "ended by your mentee"
---

<objective>
Clarify WHO ended a mentorship in Discord DM notifications (VIS-60 / GitHub #204).
The mentee-facing DM for the mentor-initiated `remove` action is ambiguous ("has been
ended" with no actor). Standardize ending-DM wording so all three actor paths
(mentor / mentee / admin) explicitly name who ended the mentorship.

Purpose: Recipients should never be confused about who ended their mentorship.
Output: Updated DM strings in the mentorship dashboard route.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Verified current strings (line numbers confirmed at planning time; re-verify before editing):
#
# src/app/api/mentorship/dashboard/[matchId]/route.ts
#   action "remove" (mentor ends mentee) — mentee DM, line 319:
#     `📢 Your mentorship with **${mentorData.displayName}** has been ended.\n\n` +
#       `You can browse for a new mentor: https://codewithahsan.dev/mentorship/browse`
#     → GAP: no actor. Add explicit "ended by your mentor".
#
#   action "end" (mentee ends) — mentor DM, line 417:
#     `📢 **${menteeData.displayName || "Your mentee"}** has ended the mentorship.\n\n` +
#       `You now have an open slot for a new mentee.`
#     → Names the mentee but standardize to explicitly include "ended by your mentee".
#
#   action "complete" (graduation) — mentee DM, line 189: celebratory, LEAVE AS-IS.
#   Channel messages line 298 ("ended by the mentor") and 396 ("ended by the mentee"): already correct, LEAVE AS-IS.
#
# src/app/api/mentorship/admin/sessions/route.ts
#   DMs lines 162/172 ("ended by an administrator"), channel line 141: already satisfy AC, NO CHANGE.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Clarify ending-actor in mentee removal DM (mentor-initiated)</name>
  <files>src/app/api/mentorship/dashboard/[matchId]/route.ts</files>
  <action>
    In the `action === "remove"` block (mentor removes mentee), update the mentee DM
    string currently at ~line 319. Replace the ambiguous first line
    `📢 Your mentorship with **${mentorData.displayName}** has been ended.` with wording
    that explicitly attributes the ending to the mentor, e.g.:
    `📢 Your mentorship with **${mentorData.displayName}** has been ended by your mentor.`
    Keep the second line (browse-for-new-mentor URL) unchanged. Do NOT touch the channel
    message at ~line 298 (already says "ended by the mentor"). This addresses the core
    AC gap for VIS-60.
  </action>
  <verify>
    <automated>grep -n "ended by your mentor" "src/app/api/mentorship/dashboard/[matchId]/route.ts"</automated>
  </verify>
  <done>Mentee removal DM explicitly reads "ended by your mentor"; channel message and email path unchanged.</done>
</task>

<task type="auto">
  <name>Task 2: Standardize mentor end DM to explicitly name the actor</name>
  <files>src/app/api/mentorship/dashboard/[matchId]/route.ts</files>
  <action>
    In the `action === "end"` block (mentee ends mentorship), update the mentor DM string
    currently at ~line 417. Standardize the wording so it explicitly states the mentorship
    was ended by the mentee, e.g.:
    `📢 Your mentorship with **${menteeData.displayName || "your mentee"}** has been ended by your mentee.`
    Keep the second line ("You now have an open slot for a new mentee.") unchanged. Ensure
    grammar reads correctly with the displayName fallback. Do NOT touch the channel message
    at ~line 396 (already says "ended by the mentee") or the completion DM at ~line 189
    (celebratory graduation message — intentionally left as-is).
  </action>
  <verify>
    <automated>grep -n "ended by your mentee" "src/app/api/mentorship/dashboard/[matchId]/route.ts"</automated>
  </verify>
  <done>Mentor end DM explicitly reads "ended by your mentee" with correct grammar; completion DM and channel message unchanged.</done>
</task>

<task type="auto">
  <name>Task 3: Build/typecheck verification</name>
  <files>src/app/api/mentorship/dashboard/[matchId]/route.ts</files>
  <action>
    Confirm the edited route file still type-checks and lints cleanly. Run the project's
    TypeScript/lint check scoped as narrowly as the toolchain allows. Confirm no other
    "has been ended" strings in the dashboard route remain actor-ambiguous (the admin
    route is intentionally out of scope and already correct).
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -i "mentorship/dashboard" || echo "no type errors in dashboard route"</automated>
  </verify>
  <done>Route file compiles with no new type errors; both ending DMs name their actor; admin route and completion DM untouched.</done>
</task>

</tasks>

<verification>
- `grep -n "ended by your mentor" src/app/api/mentorship/dashboard/[matchId]/route.ts` returns the remove-mentee DM.
- `grep -n "ended by your mentee" src/app/api/mentorship/dashboard/[matchId]/route.ts` returns the end-mentor DM.
- Admin route (`src/app/api/mentorship/admin/sessions/route.ts`) unchanged — already says "ended by an administrator".
- Completion DM (~line 189) and channel messages (~298, ~396) unchanged.
- `npx tsc --noEmit` shows no new errors for the dashboard route.
</verification>

<success_criteria>
- DM clearly states "ended by mentor" / "ended by mentee" / "ended by admin" across the three actor paths (mentor + mentee edited; admin already compliant).
- Messages are grammatically correct in each case, including displayName fallbacks.
- Positive completion/graduation flow is NOT reframed as an "ending".
- No changes outside the two targeted DM strings.
</success_criteria>

<output>
Create `.planning/quick/260621-tsl-vis-60-update-mentorship-ending-completi/260621-tsl-SUMMARY.md` when done.
</output>
