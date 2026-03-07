---
phase: quick-68
plan: 01
subsystem: discord-notifications
tags: [discord, projects, notifications, community]
dependency_graph:
  requires: [discord bot token, project approval flow]
  provides: [project collaboration announcements]
  affects: [src/lib/discord.ts, src/app/api/projects/[id]/route.ts]
tech_stack:
  added: []
  patterns: [non-blocking discord notifications, role mention with allowed_mentions]
key_files:
  created: []
  modified:
    - src/lib/discord.ts
    - src/app/api/projects/[id]/route.ts
decisions:
  - Hard-coded channel and role IDs as constants in discord.ts, consistent with existing PROJECT_REVIEW_CHANNEL_ID and MODERATOR_ROLE_ID pattern
  - Non-blocking notification wrapped in its own try/catch separate from channel creation block
metrics:
  duration: ~10 minutes
  completed: 2026-03-07
---

# Phase quick-68 Plan 01: Notify #project-collaboration on Project Approval Summary

**One-liner:** Discord announcement to #project-collaboration tagging @ProjectCollaborator role when admin approves a project, with project title and direct link.

## What Was Built

When an admin approves a project, a Discord message is now sent to the #project-collaboration channel tagging the @ProjectCollaborator role. The message includes the project title, creator name, and a link to the project page. The notification is non-blocking — project approval succeeds even if Discord fails.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Get Discord channel and role IDs | (pre-provided) | — |
| 2 | Add Discord function and wire into approval flow | c9cc36b | src/lib/discord.ts, src/app/api/projects/[id]/route.ts |

## Changes

### src/lib/discord.ts

- Added `PROJECT_COLLABORATION_CHANNEL_ID = "1419645803751805111"` constant
- Added `PROJECT_COLLABORATOR_ROLE_ID = "1447918848203427840"` constant
- Added exported `sendNewProjectAnnouncementToCollaborators(projectTitle, creatorName, projectId)` function following the same pattern as `sendProjectSubmissionNotification`

### src/app/api/projects/[id]/route.ts

- Added `sendNewProjectAnnouncementToCollaborators` to the discord import
- Added non-blocking try/catch call after the Discord channel creation block in the `action === "approve"` handler

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- [x] `sendNewProjectAnnouncementToCollaborators` exported from `src/lib/discord.ts` (line 1432)
- [x] Function imported and called in `src/app/api/projects/[id]/route.ts` (lines 9, 292)
- [x] `npx tsc --noEmit` passes with no errors
- [x] Commit c9cc36b exists
