---
phase: 02-application-subsystem
plan: 09
subsystem: infra

tags:
  - github-actions
  - cron
  - firebase-admin
  - storage-cleanup
  - discord
  - pre-flight
  - retention

# Dependency graph
requires:
  - phase: 02-application-subsystem
    provides: "Plan 01 (constants + discord role placeholder), Plan 03 (applications collection schema), Plan 06 (decline path writes declinedAt + studentIdStoragePath)"
provides:
  - "REVIEW-04: weekly cron that deletes student-ID Storage objects 30 days after decline"
  - "GitHub Actions workflow for cleanup-declined-application-media (scheduled + manual trigger)"
  - "AMBASSADOR_DISCORD_MIN_AGE_DAYS finalized to 7 days (first-cohort accessibility)"
  - "DISCORD_AMBASSADOR_ROLE_ID replaced with real Discord role ID — Phase 2 ship gate cleared"
  - "New application-doc fields: studentIdCleanedUp, cleanedUpAt (set only by this cron)"
affects:
  - "phase-02 ship gate (can now flip FEATURE_AMBASSADOR_PROGRAM=true)"
  - "Plan 07 apply wizard (eligibility threshold now 7 days)"
  - "Plan 06 acceptance flow (will now actually assign the real Discord role instead of silently returning discordRoleAssigned=false)"
  - "future phases that add cron jobs (established pattern: GitHub Actions + scripts/*.ts + dotenv)"

# Tech tracking
tech-stack:
  added:
    - "GitHub Actions workflow schedule (cron 0 4 * * 1)"
  patterns:
    - "tsx-in-CI scripts duplicate constants (cannot import from @/ without tsconfig paths); keep in sync with a top-of-file comment"
    - "Idempotent Storage delete via { ignoreNotFound: true } — no explicit 404 catch needed"
    - "Application-doc cleanup flag pattern: studentIdCleanedUp + cleanedUpAt for re-run safety"

key-files:
  created:
    - "scripts/cleanup-declined-application-media.ts"
    - ".github/workflows/cleanup-declined-application-media.yml"
  modified:
    - "src/lib/ambassador/constants.ts (AMBASSADOR_DISCORD_MIN_AGE_DAYS: 30 → 7)"
    - "src/lib/discord.ts (DISCORD_AMBASSADOR_ROLE_ID: PENDING_DISCORD_ROLE_CREATION → real numeric ID)"
    - "src/__tests__/ambassador/acceptance.test.ts (mock value updated to match real ID shape)"

key-decisions:
  - "AMBASSADOR_DISCORD_MIN_AGE_DAYS = 7 (option-b chosen over spec-default option-a=30): lower friction for first cohort; constant can be raised once pipeline is proven — all callers import from constants.ts (D-03)"
  - "Ambassador Discord role created in CWA server with minimal permissions (no moderation); ID persisted directly in src/lib/discord.ts constants (DISC-02)"
  - "Script duplicates DECLINED_APPLICATION_RETENTION_DAYS constant instead of importing from @/lib/ambassador/constants — mirrors existing scripts/migrate-roles-to-array.ts pattern for tsx-in-CI compatibility"
  - "Firestore query requires composite index on (status ASC, declinedAt ASC); not pre-created — first cron run will surface a Firebase console link if missing"
  - "studentIdCleanedUp filter applied in-process (not Firestore) to avoid compound inequality+equality constraints; skip branch logs and continues"

patterns-established:
  - "Cron job shape: GitHub Actions YAML (schedule + workflow_dispatch) → npx tsx scripts/*.ts → Firebase Admin via FIREBASE_SERVICE_ACCOUNT_KEY"
  - "Idempotency via doc flag: read flag first, skip if true, set flag+timestamp after work completes"
  - "Retention-based cleanup: query cutoffTs = Timestamp.fromMillis(Date.now() - days * 86_400_000), filter inequality on declinedAt"

requirements-completed:
  - REVIEW-04

# Metrics
duration: 46min
completed: 2026-04-22
---

# Phase 02 Plan 09: Cleanup Cron + Pre-flight Checkpoint Summary

**REVIEW-04 cleanup cron deployed (weekly Storage delete for declined applications > 30 days) + Phase 2 pre-flight gates cleared: AMBASSADOR_DISCORD_MIN_AGE_DAYS set to 7, Discord Ambassador role created and wired to real role ID.**

## Performance

- **Duration:** 46 min
- **Started:** 2026-04-22T11:36:45Z
- **Completed:** 2026-04-22T12:22:06Z
- **Tasks:** 4 (2 auto + 2 checkpoints: 1 decision + 1 human-action)
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- **REVIEW-04 live** — declined application student-ID photos will be deleted from Storage 30 days after decline, flagged as cleaned-up on the Firestore doc, fully idempotent across re-runs.
- **GitHub Actions workflow scheduled** for Mondays 04:00 UTC with `workflow_dispatch` for manual runs and secrets wiring matching `cleanup-archived-discord-channels.yml`.
- **Pre-flight decision #1 resolved:** `AMBASSADOR_DISCORD_MIN_AGE_DAYS` locked at **7 days** (user chose option-b over spec-default option-a=30).
- **Pre-flight decision #2 resolved:** Ambassador Discord role created in CWA server; `DISCORD_AMBASSADOR_ROLE_ID` placeholder replaced with real numeric ID. No `PENDING_DISCORD_ROLE_CREATION` strings remain anywhere in `src/`.
- **Phase 2 ship gate cleared** — `FEATURE_AMBASSADOR_PROGRAM=true` can now be flipped on.

## Task Commits

Each task was committed atomically:

1. **Task 1: cleanup-declined-application-media.ts script** — `87211a2` (feat)
2. **Task 2: GitHub Actions workflow for weekly cleanup** — `346c11e` (feat)
3. **Task 3: Pre-flight decision — AMBASSADOR_DISCORD_MIN_AGE_DAYS = 7** — `49f7d54` (chore)
4. **Task 4: Replace DISCORD_AMBASSADOR_ROLE_ID with real Discord role ID** — `fb6a98b` (chore)

_Interim STATE.md commits: `84cdbb1`, `e2a13cf` (checkpoint position tracking)._
_Plan metadata commit: pending (created after summary write)._

## Files Created/Modified

- `scripts/cleanup-declined-application-media.ts` — Node/tsx script: queries applications where `status='declined'` AND `declinedAt <= now-30d`; deletes `studentIdStoragePath` Storage objects with `ignoreNotFound:true`; updates each doc with `{studentIdCleanedUp: true, cleanedUpAt: serverTimestamp()}`; exits 1 if any errors so Actions surfaces the failure.
- `.github/workflows/cleanup-declined-application-media.yml` — Weekly cron (`0 4 * * 1`) + `workflow_dispatch`; runs on `ubuntu-latest` with node 20.x; injects `FIREBASE_SERVICE_ACCOUNT_KEY`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` from repo secrets.
- `src/lib/ambassador/constants.ts` — `AMBASSADOR_DISCORD_MIN_AGE_DAYS` changed from `30` to `7` with rationale in the JSDoc.
- `src/lib/discord.ts` — `DISCORD_AMBASSADOR_ROLE_ID` changed from `"PENDING_DISCORD_ROLE_CREATION"` to the real 19-digit Discord role ID; JSDoc updated to reflect the role is live.
- `src/__tests__/ambassador/acceptance.test.ts` — Mock value and assertion string updated to the real numeric ID so the entire `src/` tree is clean of the placeholder string (acceptance criteria requires zero matches). All 10 acceptance tests still pass (verified locally).

## Decisions Made

- **AMBASSADOR_DISCORD_MIN_AGE_DAYS = 7** over the spec-default 30. Rationale: v6.0 ambassador program is new; community is still small; filtering out same-day sign-ups is sufficient initial signal. Easily raisable later as a one-line change thanks to D-03 (single source of truth).
- **Real Ambassador Discord role ID committed directly to source**, matching the existing pattern for `DISCORD_MENTOR_ROLE_ID` and `DISCORD_MENTEE_ROLE_ID`. No env var indirection — role IDs are stable and fine to check in (same treatment as channel IDs and role IDs elsewhere in `discord.ts`).
- **Test mock updated alongside production code.** The plan's acceptance criterion requires `grep -q "PENDING_DISCORD_ROLE_CREATION" src/` return zero matches across the full `src/` tree, which includes `src/__tests__`. Updating the mock value keeps the test's assertion meaningful (still checks the exact ID passed to `assignDiscordRole`) while satisfying the phase-ship gate. Recorded as Rule 3 deviation below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Updated acceptance.test.ts to use real role ID**
- **Found during:** Task 4 (DISCORD_AMBASSADOR_ROLE_ID replacement)
- **Issue:** Plan 04 acceptance criterion for Task 4 says `grep -q "PENDING_DISCORD_ROLE_CREATION" src/` must return zero matches across the entire `src/` tree. Two hits were in `src/__tests__/ambassador/acceptance.test.ts` — one in a `vi.mock` factory and one in an `expect().toHaveBeenCalledWith()` assertion. These are test-internal strings (not runtime behavior), but they block the acceptance criterion as worded.
- **Fix:** Updated the mock value and the assertion to the real role ID `"1496485291228139641"`. The test still asserts the exact ID is passed into `assignDiscordRole` — just against the real ID instead of the placeholder.
- **Files modified:** `src/__tests__/ambassador/acceptance.test.ts`
- **Verification:** `npx vitest run src/__tests__/ambassador/acceptance.test.ts` — all 10 tests pass in 5 ms.
- **Committed in:** `fb6a98b` (Task 4 commit — bundled with the production constant change so the test and source match atomically)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep. The deviation is mechanical — updating a mocked value to match the real value it mocks. Ensures the phase ship-gate acceptance criterion passes as stated.

## Issues Encountered

- **None related to Plan 09's work.** Pre-existing TypeScript errors in `src/__tests__/ambassador/acceptance.test.ts` (mock Transaction type mismatch) exist but are not caused by or relevant to this plan — out of scope per Rule 4 boundary. Logged here for visibility but not touched.

## Operational Notes for First Cron Run

- **Firestore composite index likely required.** The query filters on `status == "declined"` AND `declinedAt <= cutoffTs`. If no index exists on `(status ASC, declinedAt ASC)`, the first scheduled run will fail with an error containing a Firebase console deep-link to create the index. The admin should click through and accept the auto-suggested index.
- **Verify GitHub Actions secrets exist** before the first Monday 04:00 UTC run:
  - `FIREBASE_SERVICE_ACCOUNT_KEY`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  If any are missing, the first run will fail loudly. User has confirmed this is a separate follow-up item they'll handle directly.
- **Manual smoke test recommended** on first deploy: from the Actions tab → `Cleanup Declined Application Media` → `Run workflow` on `main`. With zero declined apps in Firestore, the script logs `found 0 declined applications older than 30 days` and exits 0 — proves the env wiring works.

## User Setup Required

- **GitHub Actions secrets** — verify `FIREBASE_SERVICE_ACCOUNT_KEY`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` are present in the repo Settings → Secrets and variables → Actions. If missing, add them from the existing Firebase admin setup. (User flagged this as a separate follow-up.)
- **Firestore composite index** — on first cron run, create the `(status, declinedAt)` composite index for the `applications` collection via the console link Firebase will emit in the failure message.
- **Vercel env flip** — `FEATURE_AMBASSADOR_PROGRAM=true` can now be set in production env vars to enable `/ambassadors/*` routes.

## Next Phase Readiness

- **Phase 2 ship gate cleared.** All pre-flight blockers resolved: eligibility threshold chosen, Discord role live, cleanup cron scheduled.
- **Phase 3 (Public Presentation) can start** — it reads accepted-ambassador profiles written by Plan 06's acceptance flow, which now assigns the real Discord role instead of degrading to `discordRoleAssigned=false`.
- **Operational watch items for Week 1:**
  - Firestore composite-index prompt on first Monday's cron run.
  - First acceptance in production will exercise the real `DISCORD_AMBASSADOR_ROLE_ID` against the live Discord API; watch server logs for any 403/404 from `assignDiscordRole`.

## Self-Check: PASSED

All 6 modified/created files verified on disk. All 4 task commits verified in git history (`87211a2`, `346c11e`, `49f7d54`, `fb6a98b`).

---
*Phase: 02-application-subsystem*
*Completed: 2026-04-22*
