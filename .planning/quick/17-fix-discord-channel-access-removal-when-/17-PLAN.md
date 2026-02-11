---
phase: quick-017
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/discord.ts
  - src/app/api/projects/[id]/members/[memberId]/route.ts
  - src/app/api/projects/[id]/leave/route.ts
autonomous: true
must_haves:
  truths:
    - "When a non-creator member is removed, their Discord permission overwrite is deleted and the result is logged"
    - "When a non-creator member leaves, their Discord permission overwrite is deleted and the result is logged"
    - "If Discord username lookup fails, the failure reason is clearly logged with the username attempted"
    - "All Discord operation outcomes (success/failure) are visible in structured logs"
  artifacts:
    - path: "src/lib/discord.ts"
      provides: "Enhanced removeMemberFromChannel with better error handling"
    - path: "src/app/api/projects/[id]/members/[memberId]/route.ts"
      provides: "Member removal endpoint with logged Discord results"
    - path: "src/app/api/projects/[id]/leave/route.ts"
      provides: "Leave endpoint with logged Discord results"
  key_links:
    - from: "src/app/api/projects/[id]/members/[memberId]/route.ts"
      to: "src/lib/discord.ts"
      via: "removeMemberFromChannel return value checked and logged"
      pattern: "removeMemberFromChannel.*\\.then|const.*=.*await.*removeMemberFromChannel"
    - from: "src/app/api/projects/[id]/leave/route.ts"
      to: "src/lib/discord.ts"
      via: "removeMemberFromChannel return value checked and logged"
      pattern: "removeMemberFromChannel.*\\.then|const.*=.*await.*removeMemberFromChannel"
---

<objective>
Fix Discord channel access removal to ensure permission overwrites are actually deleted when members leave or are removed, with proper error handling and logging so failures are visible.

Purpose: Quick task 016 fixed username resolution and creator protection, but the core issue may persist -- the `removeMemberFromChannel` return value is discarded by callers, failures are logged inconsistently (mix of console.error and winston), and there is no confirmation that the Discord API call actually succeeded. This task adds observability and robustness.

Output: Three modified files with better error handling, consistent structured logging, and Discord operation result tracking.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/discord.ts
@src/app/api/projects/[id]/members/[memberId]/route.ts
@src/app/api/projects/[id]/leave/route.ts
@src/lib/logger.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Improve removeMemberFromChannel error handling and add response validation</name>
  <files>src/lib/discord.ts</files>
  <action>
In `removeMemberFromChannel` (line ~1236):

1. After the DELETE call, handle additional response codes gracefully:
   - `204`: Success (already handled)
   - `404`: Permission overwrite didn't exist -- log as warning (not error) since the user may not have had a permission overwrite. Return `true` since the desired state (no permission) is achieved.
   - Other non-204: Keep as error

2. In the `lookupMemberByUsername` call within `removeMemberFromChannel`, add a more descriptive log when the member is not found: log the channelId and username being attempted so debugging is easier. Currently it returns `false` with a log error saying "Cannot remove member - user not found" -- change this to `log.warn` (not error) since a user leaving Discord is expected, and include the channelId for context.

3. In the catch block, log the full error with channelId and username context.

Do NOT change the function signature or return type. Keep it returning `Promise<boolean>`.
  </action>
  <verify>Run `npx tsc --noEmit` to confirm no type errors.</verify>
  <done>removeMemberFromChannel treats 404 as success (desired state achieved), uses warn level for "user not found", and includes channelId in all log messages for traceability.</done>
</task>

<task type="auto">
  <name>Task 2: Log Discord removal results and use structured logger in both endpoints</name>
  <files>
    src/app/api/projects/[id]/members/[memberId]/route.ts
    src/app/api/projects/[id]/leave/route.ts
  </files>
  <action>
In BOTH `members/[memberId]/route.ts` and `leave/route.ts`:

1. **Import the structured logger** at the top of each file:
   ```typescript
   import { createLogger } from "@/lib/logger";
   const log = createLogger("projects");
   ```

2. **Capture and log the return value of `removeMemberFromChannel`**. Currently the `await removeMemberFromChannel(...)` result is discarded. Change to:
   ```typescript
   const removed = await removeMemberFromChannel(
     projectData.discordChannelId,
     discordUsername
   );
   if (!removed) {
     log.warn(`Discord permission removal failed for ${discordUsername} in channel ${projectData.discordChannelId} (project: ${projectId})`);
   } else {
     log.info(`Discord permission removed for ${discordUsername} in channel ${projectData.discordChannelId} (project: ${projectId})`);
   }
   ```

3. **Replace all `console.error` calls** with `log.error` for consistency with the rest of the codebase:
   - `console.error("Discord channel removal message failed:", ...)` -> `log.error("Discord channel departure message failed", { error: ... })`
   - `console.error("Discord member removal failed:", ...)` -> `log.error("Discord member removal failed", { error: ... })`
   - `console.error("Error removing member:", ...)` / `console.error("Error leaving project:", ...)` -> `log.error(...)` at the bottom catch block

4. **Add a log when Discord username is missing** so we know if the root cause is a missing username:
   Before the `if (discordUsername && memberUserId !== projectData?.creatorId)` check, add:
   ```typescript
   if (!discordUsername) {
     log.warn(`No Discord username found for member ${memberUserId} in project ${projectId} - cannot revoke channel access`);
   }
   ```

5. Keep the try/catch wrapping (non-blocking behavior). The Discord failure should NOT prevent the Firestore member removal from succeeding.
  </action>
  <verify>Run `npx tsc --noEmit` to confirm no type errors. Grep for `console.error` in both files to confirm none remain.</verify>
  <done>Both endpoints log removeMemberFromChannel results (success/failure), use structured winston logger consistently (no console.error), and warn when Discord username is missing.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. `grep -r "console.error" src/app/api/projects/[id]/members/[memberId]/route.ts src/app/api/projects/[id]/leave/route.ts` returns NO results
3. Code review confirms:
   - `removeMemberFromChannel` return value is captured and logged in both endpoints
   - 404 response in `removeMemberFromChannel` treated as success
   - All logs use structured winston logger with service tag "projects" or "discord"
   - Missing Discord username is explicitly warned about
</verification>

<success_criteria>
- Non-creator member removal triggers a logged Discord API call with visible success/failure outcome
- Non-creator member leave triggers a logged Discord API call with visible success/failure outcome
- If Discord username is not found in the guild, warning is logged (not silent failure)
- If Discord permission overwrite doesn't exist (404), treated as success (idempotent)
- No `console.error` calls remain in either endpoint -- all use structured logger
- TypeScript compilation passes
</success_criteria>

<output>
After completion, create `.planning/quick/17-fix-discord-channel-access-removal-when-/17-SUMMARY.md`
</output>
