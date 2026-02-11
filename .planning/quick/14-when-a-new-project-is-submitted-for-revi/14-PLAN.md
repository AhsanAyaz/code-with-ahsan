---
phase: quick-014
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/discord.ts
  - src/app/api/projects/route.ts
autonomous: true
must_haves:
  truths:
    - "When a new project is submitted (POST /api/projects), a notification is sent to Discord channel 874565618458824715"
    - "The notification mentions the moderators role (874774318779887656) so they get pinged"
    - "The notification includes the project title and creator name for context"
    - "Discord notification failure does not block project creation (non-blocking)"
  artifacts:
    - path: "src/lib/discord.ts"
      provides: "sendProjectSubmissionNotification function"
      exports: ["sendProjectSubmissionNotification"]
    - path: "src/app/api/projects/route.ts"
      provides: "Calls notification after project creation"
      contains: "sendProjectSubmissionNotification"
  key_links:
    - from: "src/app/api/projects/route.ts"
      to: "src/lib/discord.ts"
      via: "import sendProjectSubmissionNotification"
      pattern: "sendProjectSubmissionNotification"
---

<objective>
Send a Discord notification to channel 874565618458824715 tagging moderators (role 874774318779887656) when a new project is submitted for review.

Purpose: Moderators need to be notified immediately when a project is submitted so they can review and approve/decline it promptly.
Output: Updated discord.ts with notification function, updated POST /api/projects to call it.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/discord.ts
@src/app/api/projects/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add sendProjectSubmissionNotification to discord.ts</name>
  <files>src/lib/discord.ts</files>
  <action>
Add a new exported function `sendProjectSubmissionNotification` to `src/lib/discord.ts` near the bottom of the file (in the "Project Channel Management" section).

The function signature:
```typescript
export async function sendProjectSubmissionNotification(
  projectTitle: string,
  creatorName: string,
  projectId: string
): Promise<boolean>
```

Implementation details:
1. Define a constant for the notification channel: `const PROJECT_REVIEW_CHANNEL_ID = "874565618458824715";`
2. Define a constant for the moderator role: `const MODERATOR_ROLE_ID = "874774318779887656";`
3. Place these constants near the existing `FIND_A_MENTOR_CHANNEL_ID` constant (around line 736) for consistency.
4. Build the message string:
   ```
   `**New Project Submitted for Review**\n\n` +
   `**Title:** ${projectTitle}\n` +
   `**Submitted by:** ${creatorName}\n\n` +
   `<@&${MODERATOR_ROLE_ID}> — Please review this project submission.`
   ```
5. Use `fetchWithRateLimit` (NOT the existing `sendChannelMessage`) to send the message because we need to include `allowed_mentions` in the payload to allow the role ping. The payload must be:
   ```json
   {
     "content": "<the message>",
     "allowed_mentions": { "roles": ["874774318779887656"] }
   }
   ```
   Without `allowed_mentions.roles`, Discord will NOT actually ping the role.
6. POST to `${DISCORD_API}/channels/${PROJECT_REVIEW_CHANNEL_ID}/messages` with `getHeaders()`.
7. Wrap in try/catch, log errors with `log.error`, return boolean (true=sent, false=failed).
8. Follow the same pattern as `sendMentorshipCompletionAnnouncement` for structure and logging.
  </action>
  <verify>Run `npx tsc --noEmit` to confirm no type errors. Grep for `sendProjectSubmissionNotification` in discord.ts to confirm export exists.</verify>
  <done>New function `sendProjectSubmissionNotification` exists in discord.ts, is exported, sends message to channel 874565618458824715 with role mention for 874774318779887656 using allowed_mentions.</done>
</task>

<task type="auto">
  <name>Task 2: Call notification from POST /api/projects after project creation</name>
  <files>src/app/api/projects/route.ts</files>
  <action>
In `src/app/api/projects/route.ts`:

1. Add import at top: `import { sendProjectSubmissionNotification } from "@/lib/discord";`
2. After the successful `db.collection("projects").add(projectData)` call (line ~127) and BEFORE the return statement, add a non-blocking Discord notification call:

```typescript
// Send Discord notification to moderators (non-blocking)
try {
  await sendProjectSubmissionNotification(
    title,
    creatorData?.displayName || "Unknown",
    docRef.id
  );
} catch (error) {
  console.error("Discord notification failed:", error);
  // Non-blocking - project creation succeeds even if notification fails
}
```

This follows the established pattern used in the PUT endpoint for approve/decline where Discord operations are wrapped in try/catch and are non-blocking.
  </action>
  <verify>Run `npx tsc --noEmit` to confirm no type errors. Read the POST handler to confirm the notification call is between the `db.collection("projects").add()` and the `return NextResponse.json()` statements.</verify>
  <done>POST /api/projects calls sendProjectSubmissionNotification after creating a project, non-blocking (try/catch), passing title, creator display name, and project ID.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. `sendProjectSubmissionNotification` is exported from `src/lib/discord.ts`
3. `src/app/api/projects/route.ts` imports and calls `sendProjectSubmissionNotification` in the POST handler
4. The Discord message includes `<@&874774318779887656>` for role mention
5. The `allowed_mentions` payload includes `roles: ["874774318779887656"]`
6. Notification failure does not prevent project creation (wrapped in try/catch)
</verification>

<success_criteria>
- New project submissions trigger a Discord notification to channel 874565618458824715
- Moderators with role 874774318779887656 are tagged/pinged in the notification
- Notification includes project title and creator name
- Discord failures are non-blocking (project creation still succeeds)
</success_criteria>

<output>
After completion, create `.planning/quick/14-when-a-new-project-is-submitted-for-revi/14-SUMMARY.md`
</output>
