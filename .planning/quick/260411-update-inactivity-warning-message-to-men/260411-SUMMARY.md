---
phase: quick-260411
plan: 01
subsystem: mentorship
tags: [discord, mentions, cron, firestore, mentorship, inactivity]

# Dependency graph
requires:
  - phase: mentorship-inactivity-warning-script
    provides: sendChannelMessage + Firestore mentorship_profiles structure
provides:
  - Discord @mentions (mentor + mentee) in the inactivity warning channel message so both parties receive a notification before the 7-day auto-archive window closes
  - displayName fallback pattern reused from create-mentor-pending-channel.ts when discordUserId is missing
affects: [mentorship-inactivity, discord-notifications, mentorship-auto-archive]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fetch profile docs before sending Discord message so mention IDs are available; reuse same docs for downstream email send (single Firestore read per session)"

key-files:
  created:
    - .planning/quick/260411-update-inactivity-warning-message-to-men/260411-PLAN.md
    - .planning/quick/260411-update-inactivity-warning-message-to-men/260411-SUMMARY.md
  modified:
    - scripts/mentorship-inactivity-warning.ts

key-decisions:
  - "Moved mentorDoc/menteeDoc Promise.all fetch ABOVE sendChannelMessage (was after) so discordUserId is available for the mention, eliminating a duplicate Firestore read"
  - "Used raw doc.data() accessor for discordUserId (not typed on MentorshipProfile) — no interface change needed, optional chaining handles missing fields"
  - "Used modern <@ID> Discord mention syntax (no exclamation mark) matching create-mentor-pending-channel.ts pattern"

patterns-established:
  - "Mention-with-displayName-fallback: prefer `<@${discordUserId}>`, fall back to `**${displayName}**` when Discord ID missing"

requirements-completed: [GH-151]

# Metrics
duration: 2min
completed: 2026-04-10
---

# Quick Task 260411: Inactivity Warning @Mentions Summary

**Discord inactivity warning now @mentions both mentor and mentee via `discordUserId` (with bold displayName fallback) so they get a real notification before the 7-day auto-archive window.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-10T08:57:24Z
- **Completed:** 2026-04-10T08:58:37Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Fixed GH-151: the inactivity warning posted to a mentorship Discord channel now tags both participants, triggering Discord's push/notification system instead of being a silent wall-of-text
- Consolidated Firestore reads: previously the profile fetch ran AFTER the channel message (only used for email); now it runs ONCE before the channel message and is reused for the email step
- Preserved all other behavior: 35-day threshold, skip logic, Firestore `inactivityWarningAt` marker, and `sendMentorshipInactivityWarningEmail` call are all untouched

## Task Commits

1. **Task 1: Reorder profile fetch and add @mentions to inactivity warning message** - `3fa2bff` (fix)

## Files Created/Modified

- `scripts/mentorship-inactivity-warning.ts` - Moved mentor/mentee profile fetch before the Discord `sendChannelMessage` call, built `mentorMention`/`menteeMention` strings using `discordUserId` with `**displayName**` fallback, and interpolated them into the warning content. Email path now reuses the already-fetched docs.

## Decisions Made

- **Single Firestore read:** Rather than fetching profiles twice (once for mentions, once for email), the fetch was hoisted to before `sendChannelMessage` and the same `mentorDoc`/`menteeDoc` variables are used by the email block below.
- **No type interface change:** `discordUserId` is read off the raw `doc.data()` via optional chaining so the `MentorshipProfile` interface did not need a new field. Keeps the edit minimal and matches how other scripts currently access that field.
- **Modern mention syntax:** `<@ID>` (no `!`) per the existing `create-mentor-pending-channel.ts` pattern — both forms work but the modern form is canonical.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npx tsc --noEmit scripts/mentorship-inactivity-warning.ts` (single-file mode) surfaced pre-existing errors from `node_modules` and unrelated files (`src/lib/email.ts`, `src/lib/logger.ts`) because single-file invocation doesn't pick up the project `tsconfig.json` compiler options (`esModuleInterop`, `target: ES2020+`). These errors are NOT caused by this edit.
- Verified by running the project-wide type check (`npx tsc --noEmit` with the real `tsconfig.json`) and filtering for `mentorship-inactivity-warning` — zero errors attributable to the modified file.

## Next Phase Readiness

- Script is ready for the next scheduled GitHub Actions cron run (`.github/workflows/mentorship-inactivity-checks.yml`); no workflow changes required.
- Per STATE.md "Quick task + PR workflow" convention: next step is to cherry-pick `3fa2bff` onto a fix branch and open a PR with body `Closes #151`.

## Self-Check: PASSED

- `scripts/mentorship-inactivity-warning.ts` contains both `<@${mentorData.discordUserId}>` and `<@${menteeData.discordUserId}>` (verified via Grep, lines 170 and 173)
- Exactly one `db.collection("mentorship_profiles")` block in the loop (2 `.doc()` calls inside a single `Promise.all`)
- `**displayName**` fallback present for both mentor and mentee
- Commit `3fa2bff` exists on main (`git log --oneline` confirmed)
- `INACTIVITY_DAYS`, Firestore `inactivityWarningAt` update, and `sendMentorshipInactivityWarningEmail` call are unchanged (visual diff check)
- Project-wide `tsc --noEmit` reports zero new errors attributable to this file

---
*Quick task: 260411*
*Completed: 2026-04-10*
