---
phase: quick-057
plan: "01"
subsystem: mentorship
tags: [cron, inactivity, discord, email, vercel]
dependency_graph:
  requires: [src/lib/discord.ts, src/lib/email.ts, src/lib/firebaseAdmin.ts, src/lib/logger.ts]
  provides: [mentorship-inactivity-warning-cron, mentorship-inactivity-cleanup-cron]
  affects: [mentorship_sessions collection, discordChannelId, email notifications]
tech_stack:
  added: [vercel.json cron scheduling]
  patterns: [CRON_SECRET bearer auth, per-session try/catch, FieldValue.serverTimestamp, FieldValue.delete]
key_files:
  created:
    - src/app/api/cron/mentorship-inactivity-warning/route.ts
    - src/app/api/cron/mentorship-inactivity-cleanup/route.ts
    - vercel.json
  modified:
    - src/types/mentorship.ts
    - src/lib/email.ts
decisions:
  - "Use FieldValue.delete() to clear inactivityWarningAt on cleanup (not set to null) to keep Firestore clean"
  - "Both crons use per-session try/catch so one failure does not abort the full job"
  - "Warning cron sets inactivityWarningAt BEFORE sending email to ensure state is persisted even if email fails"
  - "Cleanup cron sends Discord final message then archives, then updates Firestore — all within per-session try/catch"
metrics:
  duration: "~2 min"
  completed: "2026-02-18"
  tasks_completed: 3
  files_created: 3
  files_modified: 2
---

# Phase quick-057 Plan 01: Mentorship Inactivity Auto-Cleanup Summary

**One-liner:** Two Vercel cron jobs (daily 09:00/10:00 UTC) auto-warn and auto-archive inactive mentorship sessions using CRON_SECRET bearer auth, Discord messages, and Firestore state tracking.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add inactivityWarningAt to MentorshipMatch and warning email function | 689a852 | src/types/mentorship.ts, src/lib/email.ts |
| 2 | Create mentorship-inactivity-warning cron route | b451b6a | src/app/api/cron/mentorship-inactivity-warning/route.ts |
| 3 | Create mentorship-inactivity-cleanup cron route and vercel.json | 68a7564 | src/app/api/cron/mentorship-inactivity-cleanup/route.ts, vercel.json |

## What Was Built

### Type Update
`src/types/mentorship.ts`: Added `inactivityWarningAt?: Date` to `MentorshipMatch` interface to track when the inactivity warning was issued.

### Warning Email Function
`src/lib/email.ts`: Added `sendMentorshipInactivityWarningEmail(mentor, mentee)` that sends a warning email to both parties explaining the 7-day countdown to auto-cancellation.

### Warning Cron (`/api/cron/mentorship-inactivity-warning`)
- Rejects requests without valid `Bearer ${CRON_SECRET}` header (401)
- Queries all `active` mentorship sessions
- Skips sessions that already have `inactivityWarningAt` set
- For sessions where `lastContactAt` or `approvedAt` is older than 35 days:
  - Sends Discord warning message to the session channel
  - Sets `inactivityWarningAt` via `FieldValue.serverTimestamp()`
  - Fetches mentor and mentee profiles, sends warning email to both
- Returns `{ warned: N }` on success

### Cleanup Cron (`/api/cron/mentorship-inactivity-cleanup`)
- Rejects requests without valid `Bearer ${CRON_SECRET}` header (401)
- Queries all `active` sessions that have `inactivityWarningAt` set
- Skips if warning was issued less than 7 days ago
- Skips if `lastContactAt`/`approvedAt` is now less than 35 days ago (new activity)
- For eligible sessions:
  - Sends final Discord message before archiving
  - Calls `archiveMentorshipChannel` to rename and archive Discord channel
  - Updates Firestore: `status="cancelled"`, `cancellationReason="inactivity"`, `cancelledAt=serverTimestamp`, clears `inactivityWarningAt`
  - Sends `sendMentorshipRemovedEmail` to mentee
- Returns `{ archived: N }` on success

### Vercel Scheduling (`vercel.json`)
```json
{
  "crons": [
    { "path": "/api/cron/mentorship-inactivity-warning", "schedule": "0 9 * * *" },
    { "path": "/api/cron/mentorship-inactivity-cleanup", "schedule": "0 10 * * *" }
  ]
}
```

## Decisions Made

1. **FieldValue.delete() on cleanup**: Clears `inactivityWarningAt` after cancellation rather than leaving stale data in Firestore.
2. **Per-session try/catch**: Both crons wrap each document processing in try/catch so a single Discord or email failure doesn't abort the entire batch.
3. **Warning state written before email**: `inactivityWarningAt` is set in Firestore before sending emails — ensures state persists even if email delivery fails.
4. **Type cast for email function parameters**: Used `as { uid: string; displayName: string; email: string; role: "mentor" | "mentee" }` because the email.ts local `MentorshipProfile` interface requires non-null role while the global type allows null.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Type incompatibility with MentorshipProfile.role**
- **Found during:** Task 2 TypeScript check
- **Issue:** `sendMentorshipInactivityWarningEmail` accepts the local `email.ts` `MentorshipProfile` interface where `role` is `"mentor" | "mentee"`, but the global `MentorshipProfile` from `src/types/mentorship.ts` has `role: MentorshipRole` which can be `null`. TypeScript rejected the import.
- **Fix:** Used type cast pattern `as { uid: string; displayName: string; email: string; role: "mentor" | "mentee" }` matching the pattern already used elsewhere in the codebase (plan's original code also used this approach).
- **Files modified:** src/app/api/cron/mentorship-inactivity-warning/route.ts
- **Commit:** b451b6a (included in Task 2 commit)

## Self-Check: PASSED

All files verified present:
- FOUND: src/types/mentorship.ts
- FOUND: src/lib/email.ts
- FOUND: src/app/api/cron/mentorship-inactivity-warning/route.ts
- FOUND: src/app/api/cron/mentorship-inactivity-cleanup/route.ts
- FOUND: vercel.json

All commits verified:
- 689a852: feat(quick-057): add inactivityWarningAt to MentorshipMatch and warning email function
- b451b6a: feat(quick-057): create mentorship-inactivity-warning cron route
- 68a7564: feat(quick-057): create mentorship-inactivity-cleanup cron route and vercel.json
