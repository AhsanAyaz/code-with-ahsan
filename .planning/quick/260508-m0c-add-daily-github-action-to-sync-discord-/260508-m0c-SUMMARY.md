---
phase: quick-260508-m0c
plan: "01"
subsystem: discord-stats-sync
tags: [github-actions, discord, firestore, cron, stats-api]
dependency_graph:
  requires: []
  provides:
    - "platform_stats/discord Firestore doc updated daily"
    - "GET /api/stats returns live Discord member count"
  affects:
    - "src/app/api/stats/route.ts"
    - "src/data/socialReach.ts"
tech_stack:
  added: []
  patterns:
    - "firebase-admin init (production/dev branch) — mirrors send-mentor-pending-reminders.ts"
    - "platformStatsPromise isolated .catch() for graceful fallback in Promise.all"
key_files:
  created:
    - scripts/update-discord-stats.ts
    - .github/workflows/update-discord-stats.yml
  modified:
    - src/app/api/stats/route.ts
    - src/data/socialReach.ts
decisions:
  - "Cron offset: 05:30 UTC (+30 min from mentor-pending-reminders at 05:00) to avoid runner contention"
  - "platform_stats fetch uses isolated .catch() — its failure must never cause a 500 on /api/stats"
  - "Static fallback bumped 4500 -> 5000 to reflect approximate current Discord size"
metrics:
  duration: "~5 min"
  completed: "2026-05-08"
  tasks_completed: 3
  files_changed: 4
---

# Quick Task 260508-m0c: Add Daily GitHub Action to Sync Discord Stats Summary

**One-liner:** Daily GitHub Action fetches Discord guild approximate_member_count via Discord API v10 and writes it to Firestore `platform_stats/discord`; GET /api/stats merges the live count into `social.discord.count` with graceful static fallback.

## What Was Built

| File | Action | Purpose |
|------|--------|---------|
| `scripts/update-discord-stats.ts` | Created | Fetches Discord guild member count, writes to Firestore |
| `.github/workflows/update-discord-stats.yml` | Created | Daily cron (05:30 UTC) + workflow_dispatch trigger |
| `src/app/api/stats/route.ts` | Modified | Adds platform_stats/discord to parallel fetch; merges live count |
| `src/data/socialReach.ts` | Modified | Bumps discord static fallback count 4500 → 5000 |

## Implementation Notes

### Script (scripts/update-discord-stats.ts)
- Mirrors `send-mentor-pending-reminders.ts` firebase-admin init pattern verbatim (production/dev branch, dotenv, banner logging, `main().catch()` entrypoint)
- Calls `GET https://discord.com/api/v10/guilds/{GUILD_ID}?with_counts=true` with `Authorization: Bot` header
- Uses native Node 20 `fetch` — no new dependencies
- Writes `{ memberCount, updatedAt: FieldValue.serverTimestamp() }` to `platform_stats/discord` with `{ merge: true }`

### Workflow (.github/workflows/update-discord-stats.yml)
- Cron: `30 5 * * *` (05:30 UTC daily)
- 30-minute offset from `mentor-pending-reminders.yml` (05:00 UTC) to avoid runner slot contention
- Identical secrets block: `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `FIREBASE_SERVICE_ACCOUNT`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` — all already configured in the repo

### API Route (src/app/api/stats/route.ts)
- `platform_stats/discord` fetch added as isolated Promise with `.catch()` that returns `null` on failure
- Result injected as 5th element in existing `Promise.all` — parallel fan-out unchanged
- `mergedSocial` derivation: only overrides `social.discord.count` when `discordStatsSnap` is non-null, `.exists`, `memberCount` is a finite positive number
- Fallback path: missing doc, null snap, or invalid count → `mergedSocial = socialReach` (static values)

## Cron Schedule Rationale

| Workflow | Cron | UTC Time |
|----------|------|----------|
| mentor-pending-reminders.yml | `0 5 * * *` | 05:00 |
| update-discord-stats.yml | `30 5 * * *` | 05:30 |

30-minute offset prevents both jobs competing for the same GitHub-hosted runner slot and avoids noisy overlap in admin notification digests.

## Manual Verification Steps

1. **Trigger the workflow manually:**
   ```bash
   gh workflow run "Update Discord Stats"
   ```

2. **Check the run completed successfully:**
   ```bash
   gh run list --workflow=update-discord-stats.yml --limit=1
   ```

3. **Verify Firestore doc was written** (Firebase Console or Admin SDK):
   - Collection: `platform_stats`
   - Document: `discord`
   - Fields: `memberCount` (number), `updatedAt` (timestamp)

4. **Verify /api/stats returns live count:**
   ```bash
   curl http://localhost:3000/api/stats | jq '.social.discord'
   ```
   Expected: `{ "label": "Discord", "count": <live-number>, "url": "https://codewithahsan.dev/discord" }`
   If the cron has not run yet: `count` will be `5000` (static fallback).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `scripts/update-discord-stats.ts` — created, type-checks, follows firebase-admin init pattern
- `.github/workflows/update-discord-stats.yml` — valid YAML, both triggers present, correct run command
- `src/app/api/stats/route.ts` — `platform_stats` present, isolated catch, mergedSocial wired
- `src/data/socialReach.ts` — `count: 5000` confirmed
- Commits: `b6cd167`, `1d8ae9c`, `2ff5dd2` — all exist in git log
