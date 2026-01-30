---
phase: quick
plan: 002
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/discord.ts
  - src/app/api/mentorship/profile/route.ts
autonomous: true

must_haves:
  truths:
    - "When a mentor registers, they are assigned Discord role 1422193153397493893"
    - "When a mentee registers, they are assigned Discord role 1445734846730338386"
    - "Role assignment failure does not block registration (fire-and-forget)"
    - "Role assignment is logged for debugging"
  artifacts:
    - path: "src/lib/discord.ts"
      provides: "assignDiscordRole function"
      exports: ["assignDiscordRole"]
    - path: "src/app/api/mentorship/profile/route.ts"
      provides: "Role assignment call after profile creation"
      contains: "assignDiscordRole"
  key_links:
    - from: "src/app/api/mentorship/profile/route.ts"
      to: "src/lib/discord.ts"
      via: "import assignDiscordRole"
      pattern: "assignDiscordRole"
---

<objective>
Automatically assign Discord roles when a mentor or mentee signs up on the platform.

Purpose: Give new mentors access to the private "mentors-chat" channel and new mentees access to the private "mentees-chat" channel on Discord, immediately upon registration.

Output: Updated discord.ts with role assignment function, updated profile POST handler to call it after profile creation. Closes GitHub issue #121.
</objective>

<execution_context>
@/home/ahsan/.claude/get-shit-done/workflows/execute-plan.md
@/home/ahsan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/discord.ts (Discord bot service - has lookupMemberByUsername, getHeaders, getGuildId, fetchWithRateLimit, createLogger)
@src/app/api/mentorship/profile/route.ts (POST handler creates profile, has discordUsername in profileData)
@src/app/api/mentorship/validate-discord/route.ts (validates Discord username, returns discordId)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add assignDiscordRole function to discord.ts</name>
  <files>src/lib/discord.ts</files>
  <action>
Add a new exported async function `assignDiscordRole` to `src/lib/discord.ts`:

```typescript
export async function assignDiscordRole(
  discordUsername: string,
  roleId: string
): Promise<boolean>
```

Implementation:
1. Use the existing `lookupMemberByUsername` to resolve the Discord username to a member ID
2. If member not found, log a warning and return false
3. Use the Discord API `PUT /guilds/{guild_id}/members/{user_id}/roles/{role_id}` endpoint to assign the role
4. Use the existing `fetchWithRateLimit` for the API call
5. Use the existing `getHeaders` and `getGuildId` helpers
6. Use the existing `log` (createLogger("discord")) for logging
7. Return true on success (204 response), false on failure
8. Wrap in try/catch, log errors, never throw (this is fire-and-forget)

Also add two exported constants for the role IDs:
```typescript
export const DISCORD_MENTOR_ROLE_ID = "1422193153397493893";
export const DISCORD_MENTEE_ROLE_ID = "1445734846730338386";
```

The Discord API endpoint for adding a role returns 204 No Content on success. No request body is needed, just the PUT with the bot authorization header.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors. Grep for `assignDiscordRole` in discord.ts to confirm export exists.
  </verify>
  <done>
`assignDiscordRole` function exported from discord.ts, accepts username and roleId, looks up member, assigns role via Discord API, returns boolean success.
  </done>
</task>

<task type="auto">
  <name>Task 2: Call assignDiscordRole in profile POST handler</name>
  <files>src/app/api/mentorship/profile/route.ts</files>
  <action>
Update the POST handler in `src/app/api/mentorship/profile/route.ts` to assign the appropriate Discord role after successful profile creation:

1. Import `assignDiscordRole`, `DISCORD_MENTOR_ROLE_ID`, `DISCORD_MENTEE_ROLE_ID`, and `isDiscordConfigured` from `@/lib/discord` (isDiscordConfigured is already imported)
2. After the `await db.collection("mentorship_profiles").doc(uid).set(profile);` line (line 105), add a fire-and-forget Discord role assignment block:

```typescript
// Assign Discord role (fire-and-forget)
if (isDiscordConfigured() && profileData.discordUsername) {
  const roleId = role === "mentor" ? DISCORD_MENTOR_ROLE_ID : DISCORD_MENTEE_ROLE_ID;
  assignDiscordRole(profileData.discordUsername, roleId).catch((err) =>
    console.error("Failed to assign Discord role:", err)
  );
}
```

Place this right after the profile is saved to Firestore, alongside the existing fire-and-forget admin email notification for mentors.

Do NOT await the assignDiscordRole call - it should not block the registration response. Use `.catch()` to prevent unhandled promise rejections, matching the pattern already used for `sendAdminMentorPendingEmail`.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no type errors. Run `npm run build` to confirm the build succeeds. Verify the import statement includes `assignDiscordRole`, `DISCORD_MENTOR_ROLE_ID`, and `DISCORD_MENTEE_ROLE_ID`.
  </verify>
  <done>
Profile POST handler assigns Discord mentor role (1422193153397493893) for mentor registrations and mentee role (1445734846730338386) for mentee registrations, fire-and-forget after profile save. Registration flow is not blocked by role assignment.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. `npm run build` succeeds
3. `assignDiscordRole` is exported from `src/lib/discord.ts`
4. Profile POST handler calls `assignDiscordRole` with correct role ID based on role type
5. Role assignment is fire-and-forget (not awaited, has .catch() handler)
</verification>

<success_criteria>
- discord.ts exports `assignDiscordRole` function and role ID constants
- Profile creation POST handler assigns the correct Discord role for both mentor and mentee registrations
- Role assignment failure does not block or fail the registration
- TypeScript compilation passes, build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/002-assign-discord-roles-on-signup/002-SUMMARY.md`
</output>
