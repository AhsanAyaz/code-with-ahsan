---
phase: quick-016
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/projects/[id]/members/[memberId]/route.ts
  - src/app/api/projects/[id]/leave/route.ts
autonomous: true
must_haves:
  truths:
    - "When creator removes a member, the member's Discord channel access is revoked"
    - "When a member leaves voluntarily, their Discord channel access is revoked"
    - "When the project creator leaves as a member, their Discord channel access is NOT revoked (they keep access as channel owner)"
  artifacts:
    - path: "src/app/api/projects/[id]/members/[memberId]/route.ts"
      provides: "Member removal with reliable Discord access revocation"
    - path: "src/app/api/projects/[id]/leave/route.ts"
      provides: "Member leave with Discord access revocation and creator protection"
  key_links:
    - from: "src/app/api/projects/[id]/members/[memberId]/route.ts"
      to: "src/lib/discord.ts"
      via: "removeMemberFromChannel call"
      pattern: "removeMemberFromChannel"
    - from: "src/app/api/projects/[id]/leave/route.ts"
      to: "src/lib/discord.ts"
      via: "removeMemberFromChannel call"
      pattern: "removeMemberFromChannel"
---

<objective>
Fix Discord channel access revocation when members are removed or leave a project.

Purpose: Currently when a member is removed by the creator or leaves voluntarily, their Discord channel access may not be properly revoked. The Discord username resolution should use the member document's `userProfile.discordUsername` as a fallback (in case the mentorship_profiles lookup fails or lacks the field). Additionally, when the project creator leaves as a member, their Discord access must be preserved since they own the channel.

Output: Two updated API route files with reliable Discord access revocation.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/app/api/projects/[id]/members/[memberId]/route.ts
@src/app/api/projects/[id]/leave/route.ts
@src/lib/discord.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Discord access revocation in member removal and leave endpoints</name>
  <files>
    src/app/api/projects/[id]/members/[memberId]/route.ts
    src/app/api/projects/[id]/leave/route.ts
  </files>
  <action>
In `src/app/api/projects/[id]/members/[memberId]/route.ts` (DELETE handler for removing a member):

1. Resolve the Discord username more robustly. Currently the code only uses `memberProfileData?.discordUsername` from the `mentorship_profiles` collection. Add a fallback: `const discordUsername = memberProfileData?.discordUsername || memberData?.userProfile?.discordUsername;` Then use this `discordUsername` variable everywhere in the Discord operations block (tag lookup on line 102, removeMemberFromChannel on line 124).

2. Prevent the creator from having their Discord access revoked when removed as a member. Before the Discord removal call (around line 124), add a guard: `if (memberUserId !== projectData?.creatorId)` wrapping the `removeMemberFromChannel` call. The creator's Discord access was granted at channel creation time and should be permanent. The departure message and tag lookup should still happen for all members (only skip the permission removal for creator).

In `src/app/api/projects/[id]/leave/route.ts` (POST handler for voluntary leave):

1. Same discordUsername fallback fix. Currently uses `memberProfileData?.discordUsername`. The member document (`memberDoc.data()`) also stores `userProfile.discordUsername`. Use: `const discordUsername = memberProfileData?.discordUsername || memberData?.userProfile?.discordUsername;` where `memberData = memberDoc.data()` (already fetched but not currently stored in a variable -- store it in a `const memberData = memberDoc.data();` line after line 40). Use this `discordUsername` variable for tag lookup and removeMemberFromChannel calls.

2. Add creator protection. Fetch `projectData?.creatorId` (already available from line 33). Before the `removeMemberFromChannel` call (around line 80), add guard: `if (userId !== projectData?.creatorId)` wrapping only the `removeMemberFromChannel` call. The departure message should still be sent (so the team sees the creator left as a member), but their Discord channel permission overwrite should NOT be deleted.

Important: Keep all Discord operations non-blocking (wrapped in try/catch with console.error). Do NOT change any Firestore batch logic.
  </action>
  <verify>
    Run `npx tsc --noEmit` to verify no type errors.
    Manually review that:
    - Both files resolve discordUsername with fallback from member document
    - Both files skip `removeMemberFromChannel` when the member is the project creator
    - Both files still send the departure/removal channel message for all members including creator
    - All Discord operations remain wrapped in try/catch
  </verify>
  <done>
    - Member removal revokes Discord access using robust username resolution (mentorship_profiles fallback to member userProfile)
    - Voluntary leave revokes Discord access using same robust resolution
    - Creator's Discord access is preserved in both removal and leave flows
    - All Discord operations remain non-blocking
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- Code review confirms discordUsername fallback in both endpoints
- Code review confirms creator protection guard in both endpoints
- No changes to Firestore batch write logic
</verification>

<success_criteria>
- When a non-creator member is removed: their Discord channel permission overwrite is deleted (access revoked)
- When a non-creator member leaves: their Discord channel permission overwrite is deleted (access revoked)
- When the project creator is removed or leaves as a member: their Discord channel permission overwrite is NOT deleted (access preserved)
- Discord username resolution works even if mentorship_profiles doesn't have discordUsername (falls back to member document)
</success_criteria>

<output>
After completion, create `.planning/quick/16-when-the-creator-removed-a-member-the-me/16-SUMMARY.md`
</output>
