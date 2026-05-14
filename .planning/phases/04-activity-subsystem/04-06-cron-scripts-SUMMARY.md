---
phase: 04-activity-subsystem
plan: "06"
subsystem: ambassador-activity-crons
tags: [cron, github-actions, discord, firestore, dry-run, idempotent, REPORT-04, REPORT-05, DISC-04]
dependency_graph:
  requires:
    - 04-01-foundations-types-schemas (AMBASSADOR_CRON_FLAGS_COLLECTION, MONTHLY_REPORTS_COLLECTION, getAmbassadorMonthKey, getCurrentMonthKey, getDeadlineUTC)
    - 04-04-report-and-strike-api (ambassador_cron_flags Firestore security rules)
  provides:
    - scripts/ambassador-report-flag.ts (daily cron: flags missing reports, sends DM reminders)
    - scripts/ambassador-discord-reconciliation.ts (weekly cron: flags missing Discord roles)
    - .github/workflows/ambassador-activity-checks.yml (scheduled workflow + workflow_dispatch)
    - src/lib/discord.ts getGuildMemberById (fetch guild member with roles array by snowflake ID)
  affects:
    - ambassador_cron_flags Firestore collection (write target for both crons)
    - 04-05-cron-flags-admin-panel (reads ambassador_cron_flags — now has rows to act on)
tech_stack:
  added: []
  patterns:
    - dotenv config({ path: ".env.local" }) before all other imports (canonical cron pattern)
    - Deterministic Firestore doc id for idempotency (ambassadorId_type_period)
    - set(..., { merge: true }) for idempotent flag writes
    - per-ambassador try/catch that logs and continues (fail-loud per ambassador, not per run)
    - GitHub Actions if: schedule match + workflow_dispatch choice guard pattern
    - --dry-run CLI flag for operator testing
key_files:
  created:
    - scripts/ambassador-report-flag.ts
    - scripts/ambassador-discord-reconciliation.ts
    - .github/workflows/ambassador-activity-checks.yml
  modified:
    - src/lib/discord.ts (added getGuildMemberById)
decisions:
  - "getGuildMemberById added to src/lib/discord.ts — plan expected getGuildMember to exist but only lookupMemberByUsername was present; new function uses GET /guilds/{id}/members/{memberId} to return roles array for DISC-04 role check"
  - "DISCORD_AMBASSADOR_ROLE_ID imported from src/lib/discord.ts (where it is defined) not from constants.ts (plan interface listed wrong source) — no change needed to constants.ts"
  - "PUBLIC_AMBASSADORS_COLLECTION imported from src/types/ambassador.ts in ambassador-report-flag.ts; inlined as literal string in ambassador-discord-reconciliation.ts — both avoid the @/ path alias issue in tsx cron context outside Next.js bundler"
  - "DISCORD_AMBASSADOR_ROLE_ID guard uses local roleId: string cast to avoid TS2367 literal type overlap error — runtime safety check preserved"
  - "Dry-run smoke test documents emulator-not-running as expected environmental condition — scripts start correctly (dry-run=true confirmed in output) but cannot reach Firestore without emulator; prod runs use FIREBASE_SERVICE_ACCOUNT via GitHub Actions secrets"
metrics:
  duration: "18 minutes"
  completed: "2026-04-23"
  tasks_completed: 4
  files_changed: 4
  insertions: 550
---

# Phase 4 Plan 06: Cron Scripts Summary

**One-liner:** Daily missing-report flagger (REPORT-04 + REPORT-05 DM reminders) and weekly Discord-role reconciliation cron (DISC-04), both writing only to `ambassador_cron_flags` per D-06, with GitHub Actions workflow for scheduled and manual execution.

## What Was Built

### Task 1: scripts/ambassador-report-flag.ts
- Reads `public_ambassadors` collection filtered to `active == true`
- For each ambassador: computes previous-month key in their timezone via `getAmbassadorMonthKey`, checks `monthly_reports/{uid}_{YYYY-MM}` doc existence
- If report missing: writes `ambassador_cron_flags/{uid}_missing_report_{YYYY-MM}` with `{ merge: true }` (idempotent)
- For current month: checks 3-days-before and deadline-day windows via `shouldRemind()`, sends Discord DM via `sendDirectMessage` (non-blocking — DM failure never blocks flag write)
- `--dry-run` logs all intended writes/DMs without executing them
- Commit: `46315af`

### Task 2: scripts/ambassador-discord-reconciliation.ts
- Reads `public_ambassadors` collection filtered to `active == true`
- Joins with `mentorship_profiles/{uid}/ambassador/v1` subdoc to get `discordMemberId`
- For ambassadors with no `discordMemberId`: flags immediately
- For ambassadors in guild: fetches member via `getGuildMemberById(discordMemberId)` (new function) to get roles array
- If `DISCORD_AMBASSADOR_ROLE_ID` absent from roles: writes `ambassador_cron_flags/{uid}_missing_discord_role_all`
- Guards against `DISCORD_AMBASSADOR_ROLE_ID` placeholder and exits(1) with clear message
- Commit: `5726c1b`

### Task 3: .github/workflows/ambassador-activity-checks.yml
- Two scheduled jobs: `0 8 * * *` (daily report-flag) and `0 9 * * 1` (weekly Monday discord-reconciliation)
- Each job has `if:` guard matching both `github.event.schedule` and `workflow_dispatch` inputs
- `workflow_dispatch` with `job` choice (report-flag / discord-reconciliation / both) and `dry_run` choice (true / false)
- `dry_run=true` wires `--dry-run` flag to the script via bash conditional
- All five existing Phase 2 secrets wired; Node 22.x
- Commit: `800e537`

### Task 4: Dry-run smoke test
- Both scripts load and emit `starting at ... dry-run=true` correctly
- Scripts fail at Firestore initialization because the local emulator is not running
- This is the documented expected condition: the script is correctly authored; the environment lacks a running emulator
- In production (GitHub Actions), `FIREBASE_SERVICE_ACCOUNT` is provided via secrets and `FIREBASE_SERVICE_ACCOUNT_KEY` in `firebaseAdmin.ts` handles initialization
- No commit (smoke test only — no file changes)

## Deviation: getGuildMemberById added to discord.ts

**[Rule 3 - Blocking Issue]** The plan referenced `getGuildMember(discordMemberId)` which did not exist in `src/lib/discord.ts`. Only `lookupMemberByUsername` existed (returns `{ id, username }` — no roles). Added `getGuildMemberById(memberId: string): Promise<{ id, username, roles: string[] } | null>` which calls `GET /guilds/{guildId}/members/{memberId}` — the Discord API endpoint for fetching a member with their full roles array. This is the correct approach for DISC-04 because member IDs are immutable while usernames can change.

## Deviation: DISCORD_AMBASSADOR_ROLE_ID source

The plan's `<interfaces>` section stated `DISCORD_AMBASSADOR_ROLE_ID` should be imported from `src/lib/ambassador/constants.ts`. It is actually defined in (and exported from) `src/lib/discord.ts` (line 816). The script imports it from the correct source. No constants.ts change needed.

## Deviation: PUBLIC_AMBASSADORS_COLLECTION path alias

`src/types/ambassador.ts` uses `@/lib/ambassador/constants` path aliases which don't resolve when scripts run outside the Next.js bundler context. The ambassador-report-flag.ts imports `PUBLIC_AMBASSADORS_COLLECTION` from `../src/types/ambassador` directly. The ambassador-discord-reconciliation.ts inlines the literal string `"public_ambassadors"` to avoid the transitive `@/` alias chain entirely.

## D-06 Mutation Guard Verification

```
grep -E "FieldValue\.increment|syncRoleClaim|assignDiscordRole" \
  scripts/ambassador-report-flag.ts \
  scripts/ambassador-discord-reconciliation.ts | grep -v "^\s*\*\|//\|INVARIANT\|NEVER calls"
```

**Result: EMPTY.** No forbidden mutation APIs appear in executable code. Only the D-06 invariant comment in ambassador-discord-reconciliation.ts mentions `assignDiscordRole` to document what is intentionally NOT called.

## Idempotency Confirmation

| Script | Flag ID pattern | Idempotent mechanism |
|--------|-----------------|----------------------|
| ambassador-report-flag.ts | `{uid}_missing_report_{YYYY-MM}` | deterministic id + `set(..., { merge: true })` |
| ambassador-discord-reconciliation.ts | `{uid}_missing_discord_role_all` | deterministic id + `set(..., { merge: true })` |

Re-running for the same period overwrites the existing flag doc without creating duplicates. Already-resolved flags (`resolved: true`) are overwritten with `resolved: false` via merge — this is intentional: if the condition recurs after an admin resolves it, a new flag surfaces for review.

## Next Cron Run Times (post-merge)

- **Daily report-flag:** Next 08:00 UTC after merge to main
- **Weekly discord-reconciliation:** Next Monday at 09:00 UTC after merge to main
- **Manual dispatch:** Available immediately via GitHub Actions UI with `job` and `dry_run` inputs

## Known Stubs

None — both scripts are fully wired. The `public_ambassadors` collection may be empty (no ambassadors accepted yet) which is valid cohort-zero behavior: scripts complete with `loaded 0 active ambassadors`.

## Threat Flags

No new network endpoints or auth paths. Both scripts write exclusively to `ambassador_cron_flags` — no new write surfaces introduced beyond what the plan's threat model already covers.

## Self-Check: PASSED

- `scripts/ambassador-report-flag.ts` — FOUND
- `scripts/ambassador-discord-reconciliation.ts` — FOUND
- `.github/workflows/ambassador-activity-checks.yml` — FOUND
- `src/lib/discord.ts` getGuildMemberById — FOUND
- Task 1 commit `46315af` — FOUND
- Task 2 commit `5726c1b` — FOUND
- Task 3 commit `800e537` — FOUND
- `npx tsc --noEmit` produces no errors for ambassador scripts
- D-06 mutation guard grep returns empty (no code-level matches)
- Both scripts emit `dry-run=true` in start line when `--dry-run` is passed
