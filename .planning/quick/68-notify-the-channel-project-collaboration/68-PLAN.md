---
phase: quick-68
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/discord.ts
  - src/app/api/projects/[id]/route.ts
autonomous: false
requirements: [QUICK-68]
user_setup:
  - service: discord
    why: "Need channel ID for #project-collaboration and role ID for ProjectCollaborator"
    env_vars: []
    dashboard_config:
      - task: "Get #project-collaboration channel ID"
        location: "Discord → right-click #project-collaboration channel → Copy Channel ID (Developer Mode must be on)"
      - task: "Get ProjectCollaborator role ID"
        location: "Discord → Server Settings → Roles → ProjectCollaborator → Copy Role ID (or right-click role in member list)"

must_haves:
  truths:
    - "When a project is approved by an admin, a message appears in #project-collaboration tagging @ProjectCollaborator"
    - "The message includes the project title and a direct link to the project page"
    - "The notification is non-blocking — project approval succeeds even if Discord fails"
  artifacts:
    - path: "src/lib/discord.ts"
      provides: "sendNewProjectAnnouncementToCollaborators function"
      exports: ["sendNewProjectAnnouncementToCollaborators"]
    - path: "src/app/api/projects/[id]/route.ts"
      provides: "Call to announce function on approve action"
  key_links:
    - from: "src/app/api/projects/[id]/route.ts"
      to: "src/lib/discord.ts"
      via: "sendNewProjectAnnouncementToCollaborators import"
      pattern: "sendNewProjectAnnouncementToCollaborators"
---

<objective>
Notify the #project-collaboration Discord channel whenever a project is approved (goes live), tagging the ProjectCollaborator role so community members can discover and join new active projects.

Purpose: Community members with the ProjectCollaborator role want to know when new projects are available to join.
Output: A Discord announcement in #project-collaboration on every project approval, mentioning @ProjectCollaborator with the project title and link.
</objective>

<execution_context>
@/home/ahsan/.claude/get-shit-done/workflows/execute-plan.md
@/home/ahsan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Key patterns established in this codebase:
- Channel/role IDs are hard-coded constants at the top of `src/lib/discord.ts` (see `FIND_A_MENTOR_CHANNEL_ID`, `PROJECT_REVIEW_CHANNEL_ID`, `MODERATOR_ROLE_ID`)
- Discord operations are non-blocking: wrapped in try/catch, failures logged but never thrown
- Notification functions follow the pattern of `sendProjectSubmissionNotification` in `src/lib/discord.ts`
- The approve action lives in `src/app/api/projects/[id]/route.ts` at `if (action === "approve")` (~line 236)
- The approve block already has a try/catch for Discord channel creation — add the collaborator announcement in a separate non-blocking try/catch after the channel creation block
</context>

<tasks>

<task type="checkpoint:human-action">
  <name>Task 1: Get Discord channel and role IDs</name>
  <what-to-do>
    Before writing code, you need two Discord IDs. With Discord Developer Mode enabled (User Settings → Advanced → Developer Mode):

    1. Right-click the #project-collaboration channel → "Copy Channel ID" → note it
    2. Go to Server Settings → Roles → find "ProjectCollaborator" → right-click → "Copy Role ID" → note it

    These will be hard-coded as constants in discord.ts in the next task.
  </what-to-do>
  <resume-signal>Provide the two IDs: channel ID and role ID</resume-signal>
</task>

<task type="auto">
  <name>Task 2: Add Discord function and wire into approval flow</name>
  <files>src/lib/discord.ts, src/app/api/projects/[id]/route.ts</files>
  <action>
    **In `src/lib/discord.ts`:**

    After the existing `PROJECT_REVIEW_CHANNEL_ID` and `MODERATOR_ROLE_ID` constants (~line 814), add two new constants using the IDs from Task 1:

    ```
    // #project-collaboration channel and ProjectCollaborator role
    const PROJECT_COLLABORATION_CHANNEL_ID = "<channel-id-from-task-1>";
    const PROJECT_COLLABORATOR_ROLE_ID = "<role-id-from-task-1>";
    ```

    Then add a new exported function `sendNewProjectAnnouncementToCollaborators` after `sendProjectSubmissionNotification`. Follow the exact same implementation pattern as `sendProjectSubmissionNotification`:
    - Parameters: `projectTitle: string`, `creatorName: string`, `projectId: string`
    - Returns: `Promise<boolean>`
    - Message content:
      ```
      🎉 **New Project is Now Open for Collaboration!**

      **{projectTitle}**
      Created by {creatorName}

      <@&{PROJECT_COLLABORATOR_ROLE_ID}> — Check it out and apply to join the team!

      🔗 https://codewithahsan.com/projects/{projectId}
      ```
    - Use `allowed_mentions: { roles: [PROJECT_COLLABORATOR_ROLE_ID] }` in the request body
    - POST to `${DISCORD_API}/channels/${PROJECT_COLLABORATION_CHANNEL_ID}/messages`
    - Log debug on start, log error on failure, return true/false

    **In `src/app/api/projects/[id]/route.ts`:**

    Import `sendNewProjectAnnouncementToCollaborators` from `@/lib/discord` (add to existing import on line 5).

    In the `action === "approve"` block, after the existing Discord channel creation try/catch block (~line 287), add a separate non-blocking try/catch:

    ```typescript
    // Notify #project-collaboration channel (non-blocking)
    try {
      await sendNewProjectAnnouncementToCollaborators(
        projectData?.title || "Untitled Project",
        projectData?.creatorProfile?.displayName || "Creator",
        id
      );
    } catch (notifyError) {
      console.error("Project collaboration notification failed:", notifyError);
    }
    ```
  </action>
  <verify>npx tsc --noEmit 2>&1 | head -20</verify>
  <done>
    TypeScript compiles without errors. `sendNewProjectAnnouncementToCollaborators` is exported from discord.ts and called in the approve action of the project [id] route.
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- `src/lib/discord.ts` exports `sendNewProjectAnnouncementToCollaborators`
- `src/app/api/projects/[id]/route.ts` imports and calls the function in the approve action block
- The call is wrapped in its own try/catch separate from the Discord channel creation block
</verification>

<success_criteria>
Approving a project from the admin dashboard triggers a Discord message in #project-collaboration that:
- Tags the @ProjectCollaborator role
- Shows the project title
- Links to https://codewithahsan.com/projects/{projectId}
- Does not block or affect the approval response if Discord is unavailable
</success_criteria>

<output>
After completion, create `.planning/quick/68-notify-the-channel-project-collaboration/68-SUMMARY.md`
</output>
