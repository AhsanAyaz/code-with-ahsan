---
phase: quick-014
plan: 01
subsystem: discord-notifications
tags: [discord, notifications, projects, moderation]
dependency_graph:
  requires: [discord.ts, projects-api]
  provides: [project-submission-notifications]
  affects: [moderator-workflow]
tech_stack:
  added: []
  patterns: [non-blocking-notifications, role-mentions]
key_files:
  created: []
  modified:
    - src/lib/discord.ts
    - src/app/api/projects/route.ts
decisions:
  - Use fetchWithRateLimit directly instead of sendChannelMessage to enable allowed_mentions
  - Non-blocking notification pattern (project creation succeeds even if Discord fails)
  - Role mention requires both <@&roleId> in message and allowed_mentions in payload
metrics:
  duration_minutes: 1
  completed_date: 2026-02-11
  tasks_completed: 2
  files_modified: 2
  commits: 2
---

# Quick Task 014: Discord Notification for New Project Submissions

**One-liner:** Moderators receive Discord notifications with role ping when projects are submitted for review

## Overview

When a user submits a new project via POST /api/projects, moderators are now automatically notified in Discord channel 874565618458824715 with a role ping (@874774318779887656) so they can promptly review and approve/decline the submission.

This improves the moderator workflow by providing immediate visibility into pending project submissions rather than requiring manual checking.

## Tasks Completed

### Task 1: Add sendProjectSubmissionNotification to discord.ts
- **Commit:** 80f939c
- **Files:** src/lib/discord.ts
- **Changes:**
  - Added `PROJECT_REVIEW_CHANNEL_ID` constant (874565618458824715)
  - Added `MODERATOR_ROLE_ID` constant (874774318779887656)
  - Implemented `sendProjectSubmissionNotification` function
  - Function uses `fetchWithRateLimit` directly (not `sendChannelMessage`) to include `allowed_mentions` payload
  - Message format: title, creator name, role mention
  - Non-blocking pattern: returns boolean for success/failure
  - Follows same structure as `sendMentorshipCompletionAnnouncement`

### Task 2: Call notification from POST /api/projects
- **Commit:** a366056
- **Files:** src/app/api/projects/route.ts
- **Changes:**
  - Imported `sendProjectSubmissionNotification` from discord.ts
  - Added notification call after successful `db.collection("projects").add()`
  - Wrapped in try/catch for non-blocking behavior
  - Passes: project title, creator display name (or "Unknown"), project ID
  - Project creation succeeds even if Discord notification fails

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

**Why fetchWithRateLimit instead of sendChannelMessage?**
Discord role mentions require the `allowed_mentions` payload field to actually ping users. The existing `sendChannelMessage` helper only sends `{ content }`, so we use `fetchWithRateLimit` directly with:
```json
{
  "content": "<message with <@&roleId>>",
  "allowed_mentions": { "roles": ["roleId"] }
}
```

Without `allowed_mentions.roles`, Discord suppresses the ping even if the `<@&roleId>` syntax is present.

**Non-blocking Pattern:**
The notification is wrapped in try/catch in route.ts. If Discord fails (rate limit, API down, permissions issue), the project creation still succeeds and returns 201. This prevents external service failures from blocking core functionality.

## Verification

All verification criteria passed:
- ✅ `npx tsc --noEmit` passes with no errors
- ✅ `sendProjectSubmissionNotification` is exported from `src/lib/discord.ts`
- ✅ `src/app/api/projects/route.ts` imports and calls the function in POST handler
- ✅ Discord message includes `<@&874774318779887656>` for role mention
- ✅ `allowed_mentions` payload includes `roles: ["874774318779887656"]`
- ✅ Notification failure does not prevent project creation (wrapped in try/catch)

## Success Criteria Met

- ✅ New project submissions trigger a Discord notification to channel 874565618458824715
- ✅ Moderators with role 874774318779887656 are tagged/pinged in the notification
- ✅ Notification includes project title and creator name
- ✅ Discord failures are non-blocking (project creation still succeeds)

## Self-Check: PASSED

**Files exist:**
```
FOUND: src/lib/discord.ts
FOUND: src/app/api/projects/route.ts
```

**Commits exist:**
```
FOUND: 80f939c (Task 1)
FOUND: a366056 (Task 2)
```

**Function exported:**
```
FOUND: export async function sendProjectSubmissionNotification (line 1284 of discord.ts)
```

**Import exists:**
```
FOUND: import { sendProjectSubmissionNotification } from "@/lib/discord" (line 8 of route.ts)
```

All claims verified. Self-check PASSED.
