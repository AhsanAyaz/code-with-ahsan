---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Brand Identity & Site Restructure
status: defining_requirements
stopped_at: Defining requirements for v3.0
last_updated: "2026-03-10"
last_activity: "2026-03-10 - Milestone v3.0 started"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-10)

**Core value:** Community members can find mentors, collaborate on real projects with structured support, and follow clear learning roadmaps—all within a mentor-led, quality-focused environment.
**Current focus:** v3.0 Brand Identity & Site Restructure

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-10 — Milestone v3.0 started

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

### Workflow Notes

**Cron jobs — always use GitHub Actions + scripts/:**
Scheduled/recurring tasks use `.github/workflows/*.yml` (schedule trigger) running `npx tsx scripts/*.ts` standalone scripts. Scripts initialize Firebase Admin directly (not via Next.js API layer). Do NOT use Vercel cron jobs or Next.js API routes for scheduled work.

**Inactivity detection — use Discord channel message history:**
For mentorship inactivity checks, query the Discord channel's actual message history via `getLastChannelActivityDate(channelId)` (in `src/lib/discord.ts`).

**Quick task + PR workflow:**
For GitHub issue fixes, use `/gsd:quick` to plan and execute, then cherry-pick onto a fix branch and create PR with "Closes #NNN".

### Timezone Handling Architecture

**Decision (quick-054):** Display times in viewer/recipient timezone, NEVER hardcode to booking timezone.

1. **Storage:** Always store UTC (Date objects in Firestore)
2. **Platform Display:** Use viewer's browser timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`
3. **Discord Notifications:** Fetch recipient's timezone from their profile
4. **Channel Messages:** Show both timezones if different

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-10
Stopped at: Defining requirements for v3.0
Resume file: None

---
*Updated: 2026-03-10 after v3.0 milestone start*
