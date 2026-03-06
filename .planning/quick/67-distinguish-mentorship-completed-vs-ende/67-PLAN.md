---
phase: quick-67
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/mentorship/dashboard/[matchId]/layout.tsx
  - src/app/api/mentorship/dashboard/[matchId]/route.ts
  - scripts/cleanup-archived-discord-channels.ts
  - .github/workflows/cleanup-archived-discord-channels.yml
autonomous: true
requirements: [QUICK-67]
must_haves:
  truths:
    - "Mentor sees 'End Mentorship' button instead of 'Remove Mentee'"
    - "Mentor's end mentorship modal says 'End Mentorship' not 'Remove Mentee'"
    - "API response messages say 'Mentorship ended' not 'Mentee removed'"
    - "Toast messages say 'Mentorship has been ended' not 'Mentee has been removed'"
    - "GitHub Action deletes archived Discord channels older than 30 days on weekly schedule"
  artifacts:
    - path: "src/app/mentorship/dashboard/[matchId]/layout.tsx"
      provides: "Renamed UI labels for mentor end action"
    - path: "src/app/api/mentorship/dashboard/[matchId]/route.ts"
      provides: "Updated API response message"
    - path: "scripts/cleanup-archived-discord-channels.ts"
      provides: "Script to delete old archived channels"
    - path: ".github/workflows/cleanup-archived-discord-channels.yml"
      provides: "Weekly cron trigger for cleanup"
  key_links:
    - from: "scripts/cleanup-archived-discord-channels.ts"
      to: "src/lib/discord.ts"
      via: "deleteDiscordChannel import"
      pattern: "deleteDiscordChannel"
---

<objective>
Rename the mentor's "Remove Mentee" button and modal to "End Mentorship" for consistent terminology, update API response messages, and create a GitHub Action to periodically delete archived Discord channels.

Purpose: The "Remove Mentee" label implies removing a person, while "End Mentorship" accurately describes ending a relationship. Archived Discord channels accumulate and should be cleaned up. Stats are already correct (only count status==="completed").
Output: Updated UI labels, updated API messages, new cleanup script + GitHub Action workflow.
</objective>

<execution_context>
@/home/ahsan/.claude/get-shit-done/workflows/execute-plan.md
@/home/ahsan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/mentorship/dashboard/[matchId]/layout.tsx
@src/app/api/mentorship/dashboard/[matchId]/route.ts
@src/lib/discord.ts
@scripts/mentorship-inactivity-cleanup.ts
@.github/workflows/mentorship-inactivity-checks.yml
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rename "Remove Mentee" to "End Mentorship" in UI and API</name>
  <files>src/app/mentorship/dashboard/[matchId]/layout.tsx, src/app/api/mentorship/dashboard/[matchId]/route.ts</files>
  <action>
In layout.tsx, update the mentor's remove action labels:

1. Line ~411: Button text "Remove Mentee" -> "End Mentorship" (keep the emoji and btn-error styling)
2. Line ~773: Modal title "Remove Mentee" -> "End Mentorship"
3. Line ~775-779: Modal body text: change "remove {name} from your mentee list? This will end the mentorship and archive the Discord channel." -> "end your mentorship with {name}? This will archive the Discord channel and cannot be undone."
4. Line ~809: Confirm button "Confirm Removal" -> "Confirm End" (keep "Removing..." spinner text -> "Ending...")
5. Line ~164: Toast "Mentee has been removed from your list." -> "Mentorship has been ended."
6. Line ~170: Error toast "Failed to remove mentee" -> "Failed to end mentorship"
7. Line ~173: Console error "Error removing mentee:" -> "Error ending mentorship:"

Also rename state/handler for clarity:
- Rename `showRemoveModal` -> `showMentorEndModal`, `removalReason` -> `mentorEndReason`, `removing` -> `mentorEnding`, `handleRemoveMentee` -> `handleMentorEndMentorship`, `setShowRemoveModal` -> `setShowMentorEndModal`, `setRemovalReason` -> `setMentorEndReason`, `setRemoving` -> `setMentorEnding`

In route.ts, update the API response message:
- Line ~348: "Mentee removed from your list" -> "Mentorship ended successfully"

Note: The action value "remove" in the API stays as-is (it's an internal API contract, not user-facing). The cancellationReason "removed_by_mentor" also stays (it's a database enum for analytics).
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>No UI text says "Remove Mentee" or "Confirm Removal". Mentor sees "End Mentorship" button, "End Mentorship" modal title, and "Confirm End" button. Toast says "Mentorship has been ended." API returns "Mentorship ended successfully".</done>
</task>

<task type="auto">
  <name>Task 2: Create GitHub Action for archived Discord channel cleanup</name>
  <files>scripts/cleanup-archived-discord-channels.ts, .github/workflows/cleanup-archived-discord-channels.yml</files>
  <action>
Create scripts/cleanup-archived-discord-channels.ts following the pattern from mentorship-inactivity-cleanup.ts:

1. Import dotenv, firebase-admin, and from src/lib/discord.ts import: `deleteDiscordChannel`, `isDiscordConfigured`, and the Discord API fetching utilities.
2. Initialize Firebase Admin using same pattern as mentorship-inactivity-cleanup.ts (check admin.apps.length, production vs dev).
3. The script should:
   a. Fetch all guild channels via Discord API: GET /guilds/{guildId}/channels
   b. Filter to channels whose name starts with "archived-"
   c. For each archived channel, check if it has been inactive for 30+ days by fetching the last message timestamp (GET /channels/{id}/messages?limit=1). If no messages or last message is older than 30 days, it qualifies for deletion.
   d. Call `deleteDiscordChannel(channelId, "Automated cleanup: archived channel older than 30 days")` for each qualifying channel.
   e. Log summary: "Deleted X of Y archived channels"
4. Use fetchWithRateLimit from discord.ts if exported, otherwise use the same DISCORD_API constant and getHeaders pattern. Since these are internal functions, import what's available and use direct fetch with rate limit headers for guild channel listing.
5. Actually, since discord.ts functions like getHeaders/fetchWithRateLimit may not all be exported, use direct Discord API calls with process.env.DISCORD_BOT_TOKEN and process.env.DISCORD_GUILD_ID. Follow the same pattern as existing scripts that import from src/lib/discord.ts for the deleteDiscordChannel function.

Create .github/workflows/cleanup-archived-discord-channels.yml:
- name: "Cleanup Archived Discord Channels"
- Schedule: weekly on Sundays at 06:00 UTC (cron: '0 6 * * 0')
- Allow manual trigger via workflow_dispatch
- Single job following the mentorship-inactivity-checks.yml pattern:
  - checkout, setup node 20.x with npm cache, npm ci
  - Run: npx tsx scripts/cleanup-archived-discord-channels.ts
  - Env vars: NODE_ENV=production, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID (from secrets). No Firebase needed since we only query Discord API. Actually, no Firebase imports needed for this script - remove Firebase init if not needed. The script only needs Discord API access.
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx tsc --noEmit --pretty 2>&1 | head -30 && cat .github/workflows/cleanup-archived-discord-channels.yml | head -5</automated>
  </verify>
  <done>Script exists at scripts/cleanup-archived-discord-channels.ts, compiles without errors. Workflow exists at .github/workflows/cleanup-archived-discord-channels.yml with weekly schedule trigger. Script fetches guild channels, filters archived ones, checks age via last message timestamp, and deletes channels older than 30 days.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (no TypeScript errors)
- No occurrence of "Remove Mentee" or "Confirm Removal" in layout.tsx
- scripts/cleanup-archived-discord-channels.ts exists and compiles
- .github/workflows/cleanup-archived-discord-channels.yml exists with schedule trigger
</verification>

<success_criteria>
- Mentor's button says "End Mentorship" instead of "Remove Mentee"
- Modal title, body, and confirm button all use "end" terminology
- Toast and API messages updated to "ended" language
- Cleanup script deletes archived Discord channels older than 30 days
- GitHub Action runs weekly on Sundays at 06:00 UTC
</success_criteria>

<output>
After completion, create `.planning/quick/67-distinguish-mentorship-completed-vs-ende/67-SUMMARY.md`
</output>
