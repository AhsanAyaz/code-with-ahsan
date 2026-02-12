---
phase: quick-20
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - firestore.indexes.json
  - src/app/api/projects/[id]/invitations/route.ts
  - src/lib/discord.ts
autonomous: true
---

<objective>
Fix two bugs with project invitations: (1) Discord notification not sent to project channel when invitation is created, and (2) invited user cannot see the invitation in their Invitations tab.

Purpose: Invitations are a core team formation feature. Without Discord notifications, invitees miss invitations. Without the Invitations tab working, users have no way to find and respond to invitations.

Output: Working invitation flow with Discord channel notification and visible invitations in the recipient's My Projects > Invitations tab.
</objective>

<context>
@.planning/STATE.md
@src/app/api/projects/[id]/invitations/route.ts
@src/app/api/projects/invitations/my/route.ts
@src/app/api/projects/[id]/invitations/[userId]/route.ts
@src/lib/discord.ts
@firestore.indexes.json
@src/app/projects/my/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add missing Firestore composite index for invitation queries</name>
  <files>firestore.indexes.json</files>
  <action>
    The `/api/projects/invitations/my` route performs a compound Firestore query:
    `.where("userId", "==", ...).where("status", "==", "pending").orderBy("createdAt", "desc")`

    This requires a composite index on `project_invitations` collection for fields `(userId ASC, status ASC, createdAt DESC)`. Without this index, the query fails silently (caught by try/catch, returns 500), causing the Invitations tab to show empty.

    Add the following composite index to `firestore.indexes.json`:
    ```json
    {
      "collectionGroup": "project_invitations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
    ```

    Also add an index for the project-specific invitations query in `GET /api/projects/[id]/invitations`:
    `.where("projectId", "==", ...).orderBy("createdAt", "desc")`

    ```json
    {
      "collectionGroup": "project_invitations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "projectId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
    ```

    After updating the file, deploy indexes: `npx firebase deploy --only firestore:indexes`
  </action>
  <verify>
    - `firestore.indexes.json` contains both new composite indexes for `project_invitations`
    - `npx firebase deploy --only firestore:indexes` succeeds (or note if auth is needed)
    - JSON is valid (no syntax errors)
  </verify>
  <done>Composite indexes defined for project_invitations queries, deployed to Firestore</done>
</task>

<task type="auto">
  <name>Task 2: Add Discord channel notification when invitation is sent</name>
  <files>src/app/api/projects/[id]/invitations/route.ts</files>
  <action>
    Currently, the POST handler in this route only sends a Discord DM to the invited user. There is no notification to the project's Discord channel (where team members would see it) or to the moderator review channel.

    Add a Discord channel notification after the invitation is created (non-blocking, following the existing pattern of try/catch with console.error):

    1. Import `sendChannelMessage` from `@/lib/discord` (already importing `sendDirectMessage`)
    2. After the existing DM block (line ~138), add a notification to the project's Discord channel if it exists:
       - Fetch the project's `discordChannelId` from `projectData` (already available)
       - If `projectData?.discordChannelId` exists, send a channel message:
         `"A new invitation has been sent to **{userData.displayName || 'a user'}** to join the project!"`
       - Wrap in try/catch, non-blocking (same pattern as the DM)

    The DM to the invited user already works correctly. The missing piece is the team/channel notification.
  </action>
  <verify>
    - `sendChannelMessage` is imported in the route file
    - POST handler sends a message to `projectData.discordChannelId` after creating invitation
    - Discord operations are non-blocking (wrapped in try/catch)
    - TypeScript compiles: `npx tsc --noEmit --pretty src/app/api/projects/[id]/invitations/route.ts` or `npm run build`
  </verify>
  <done>When an invitation is sent, a notification appears in the project's Discord channel informing the team</done>
</task>

</tasks>

<verification>
1. After deploying indexes, test the invitation flow end-to-end:
   - Creator sends invitation from project detail page
   - Discord channel shows notification about the invitation
   - Invited user receives Discord DM (already working)
   - Invited user visits My Projects > Invitations tab and sees the invitation
   - Invitation can be accepted/declined from the Invitations tab
2. TypeScript builds without errors: `npm run build`
</verification>

<success_criteria>
- Invited user sees pending invitations in their My Projects > Invitations tab
- Project Discord channel receives notification when invitation is sent
- No TypeScript compilation errors
- Firestore indexes deployed
</success_criteria>
