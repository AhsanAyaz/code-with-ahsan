---
phase: quick-18
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/discord.ts
  - src/app/api/roadmaps/[id]/route.ts
autonomous: true
must_haves:
  truths:
    - "Moderators receive Discord notification when a new roadmap is submitted for review"
    - "Moderators receive Discord notification when a new version of an approved roadmap is submitted"
    - "Creator receives Discord DM when admin requests changes on initial submission"
    - "Creator receives Discord DM when admin requests changes on a draft version"
    - "Creator receives Discord DM when roadmap is approved"
    - "Creator receives Discord DM when draft version is approved"
  artifacts:
    - path: "src/lib/discord.ts"
      provides: "sendRoadmapSubmissionNotification and sendRoadmapStatusNotification functions"
      exports: ["sendRoadmapSubmissionNotification", "sendRoadmapStatusNotification"]
    - path: "src/app/api/roadmaps/[id]/route.ts"
      provides: "Discord notification calls in all 5 action branches"
  key_links:
    - from: "src/app/api/roadmaps/[id]/route.ts"
      to: "src/lib/discord.ts"
      via: "import and function calls"
      pattern: "sendRoadmap(Submission|Status)Notification"
---

<objective>
Add Discord notifications for all roadmap lifecycle events: moderator channel notifications when roadmaps are submitted, and DMs to creators when admin takes action (approve, request changes).

Purpose: Keep moderators informed of new roadmap submissions and keep creators informed of review outcomes, matching the existing project notification pattern.
Output: Two new Discord functions and their integration into the roadmap API route.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/discord.ts (existing Discord infrastructure - sendProjectSubmissionNotification pattern, PROJECT_REVIEW_CHANNEL_ID, MODERATOR_ROLE_ID, sendDirectMessage, sendChannelMessage)
@src/app/api/roadmaps/[id]/route.ts (PUT handler with actions: submit, approve, request-changes, approve-draft, edit)
@src/types/mentorship.ts (Roadmap type with creatorProfile.discordUsername)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add roadmap notification functions to discord.ts</name>
  <files>src/lib/discord.ts</files>
  <action>
Add two new exported functions at the bottom of src/lib/discord.ts, after sendProjectSubmissionNotification:

1. `sendRoadmapSubmissionNotification(title: string, creatorName: string, roadmapId: string, isNewVersion?: boolean): Promise<boolean>`
   - Sends to PROJECT_REVIEW_CHANNEL_ID (reuse same channel as project reviews)
   - Tags MODERATOR_ROLE_ID for attention
   - Message format:
     - If isNewVersion=false (default): "**New Roadmap Submitted for Review**\n\n**Title:** {title}\n**Submitted by:** {creatorName}\n\n<@&{MODERATOR_ROLE_ID}> -- Please review this roadmap submission."
     - If isNewVersion=true: "**New Roadmap Version Submitted for Review**\n\n**Title:** {title}\n**Submitted by:** {creatorName}\n\n<@&{MODERATOR_ROLE_ID}> -- Please review this updated roadmap."
   - Use fetchWithRateLimit (same as sendProjectSubmissionNotification pattern)
   - Include allowed_mentions: { roles: [MODERATOR_ROLE_ID] }

2. `sendRoadmapStatusNotification(discordUsername: string, title: string, status: "approved" | "changes-requested" | "draft-approved" | "draft-changes-requested", feedback?: string): Promise<boolean>`
   - Uses sendDirectMessage (already exported) to DM the creator
   - Message varies by status:
     - "approved": "Your roadmap **{title}** has been approved and is now published! View it at https://codewithahsan.dev/roadmaps"
     - "changes-requested": "Changes have been requested on your roadmap **{title}**.\n\nFeedback: {feedback}\n\nPlease update and resubmit at https://codewithahsan.dev/mentorship/roadmaps"
     - "draft-approved": "Your updated version of **{title}** has been approved and is now published! View it at https://codewithahsan.dev/roadmaps"
     - "draft-changes-requested": "Changes have been requested on your updated version of **{title}**.\n\nFeedback: {feedback}\n\nPlease revise and resubmit at https://codewithahsan.dev/mentorship/roadmaps"
   - Returns result of sendDirectMessage call
   - If discordUsername is falsy, log warning and return false (same as sendDirectMessage pattern)

Both functions follow the existing non-blocking, fire-and-forget pattern with try/catch and logging.
  </action>
  <verify>Run `npx tsc --noEmit` to verify no TypeScript errors. Grep for "sendRoadmapSubmissionNotification" and "sendRoadmapStatusNotification" in discord.ts to confirm exports exist.</verify>
  <done>Two new exported functions exist in discord.ts: sendRoadmapSubmissionNotification (channel message to moderators) and sendRoadmapStatusNotification (DM to creator).</done>
</task>

<task type="auto">
  <name>Task 2: Integrate notifications into roadmap API route actions</name>
  <files>src/app/api/roadmaps/[id]/route.ts</files>
  <action>
Import both new functions at the top of src/app/api/roadmaps/[id]/route.ts:
```
import { sendRoadmapSubmissionNotification, sendRoadmapStatusNotification } from "@/lib/discord";
```

Add non-blocking notification calls (wrapped in try/catch with console.error, matching the project submission pattern from src/app/api/projects/route.ts) in these 5 locations within the PUT handler:

1. **"submit" action** (line ~182, after the roadmapRef.update succeeds, before the return):
   - Call sendRoadmapSubmissionNotification(roadmapData.title, roadmapData.creatorProfile?.displayName || "Unknown", id)
   - Non-blocking: wrap in try/catch

2. **"edit" action when isApproved** (line ~492, after the version subcollection add, before the return):
   - This is when an approved roadmap gets a new draft version submitted for review
   - Call sendRoadmapSubmissionNotification(title || roadmapData.title, roadmapData.creatorProfile?.displayName || "Unknown", id, true)
   - Non-blocking: wrap in try/catch

3. **"approve" action** (line ~213, after the roadmapRef.update succeeds, before the return):
   - Call sendRoadmapStatusNotification(roadmapData.creatorProfile?.discordUsername, roadmapData.title, "approved")
   - Only call if discordUsername exists (guard: `if (roadmapData?.creatorProfile?.discordUsername)`)
   - Non-blocking: wrap in try/catch

4. **"request-changes" action** -- two sub-cases:
   a. **isPendingDraft branch** (line ~292, after both updates, before the return):
      - Call sendRoadmapStatusNotification(roadmapData.creatorProfile?.discordUsername, roadmapData.title, "draft-changes-requested", feedback)
      - Guard with discordUsername check
   b. **isPendingInitial branch** (line ~307, after the update, before the return):
      - Call sendRoadmapStatusNotification(roadmapData.creatorProfile?.discordUsername, roadmapData.title, "changes-requested", feedback)
      - Guard with discordUsername check

5. **"approve-draft" action** (line ~380, after both updates, before the return):
   - Call sendRoadmapStatusNotification(roadmapData.creatorProfile?.discordUsername, roadmapData.title, "draft-approved")
   - Guard with discordUsername check

All Discord calls must be non-blocking: failures should log but NOT prevent the API response from succeeding (same pattern as sendProjectSubmissionNotification in projects route).
  </action>
  <verify>Run `npx tsc --noEmit` to verify no TypeScript errors. Run `npm run build` to verify the build succeeds. Grep for "sendRoadmap" in route.ts to confirm all 5 notification call sites exist.</verify>
  <done>All 6 roadmap events trigger Discord notifications: 2 moderator channel notifications (submit, edit-approved) and 4 creator DMs (approve, request-changes, approve-draft, draft-changes-requested). All are non-blocking with try/catch guards.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. `npm run build` succeeds
3. `grep -c "sendRoadmapSubmissionNotification\|sendRoadmapStatusNotification" src/lib/discord.ts` shows the function definitions
4. `grep -c "sendRoadmap" src/app/api/roadmaps/\[id\]/route.ts` shows 5+ call sites (import + 5 invocations)
</verification>

<success_criteria>
- Two new functions exported from discord.ts following existing patterns
- Five notification call sites in the roadmap API route covering all 6 events
- All notifications are non-blocking (try/catch wrapped)
- TypeScript compiles without errors
- Build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/18-implement-discord-notifications-for-road/18-SUMMARY.md`
</output>
