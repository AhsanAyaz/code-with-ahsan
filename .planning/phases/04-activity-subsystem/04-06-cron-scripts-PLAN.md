---
phase: 04-activity-subsystem
plan: 06
type: execute
wave: 2
depends_on:
  - 04-01-foundations-types-schemas
files_modified:
  - scripts/ambassador-report-flag.ts
  - scripts/ambassador-discord-reconciliation.ts
  - .github/workflows/ambassador-activity-checks.yml
autonomous: true
requirements:
  - REPORT-04
  - REPORT-05
  - DISC-04
must_haves:
  truths:
    - "Daily cron (08:00 UTC) reads every active ambassador subdoc, computes previous-month key in each ambassador's timezone, and writes an ambassador_cron_flags doc with type='missing_report' for ambassadors who have no monthly_reports/{uid}_{YYYY-MM} doc (REPORT-04)"
    - "Daily cron NEVER mutates ambassador subdocs, strikes, or roles — the only Firestore write is to ambassador_cron_flags (D-06)"
    - "Daily cron sends a Discord DM reminder via sendDirectMessage to ambassadors 3 days before the deadline AND on the deadline day in their timezone (REPORT-05)"
    - "Weekly cron (Monday 09:00 UTC) reads every active ambassador, fetches their Discord guild member, and writes an ambassador_cron_flags doc with type='missing_discord_role' when the Ambassador Discord role is missing (DISC-04)"
    - "Weekly cron NEVER calls assignDiscordRole — failures flag for admin review only (D-06)"
    - "Both crons are idempotent: re-running for the same period does not create duplicate unresolved flags — deterministic doc id `${ambassadorId}_${type}_${period ?? 'all'}` enforces one flag per ambassador per period"
    - "Both crons have a --dry-run CLI flag that logs intended writes without executing them"
    - "GitHub Actions workflow has two independent scheduled jobs guarded by cron-schedule match + workflow_dispatch input for manual runs"
  artifacts:
    - path: "scripts/ambassador-report-flag.ts"
      provides: "Daily cron: flag ambassadors missing previous-month report + send REPORT-05 DM reminders"
      min_lines: 150
      contains: "sendDirectMessage"
    - path: "scripts/ambassador-discord-reconciliation.ts"
      provides: "Weekly cron: flag ambassadors missing the Discord Ambassador role"
      min_lines: 120
      contains: "DISCORD_AMBASSADOR_ROLE_ID"
    - path: ".github/workflows/ambassador-activity-checks.yml"
      provides: "GitHub Actions workflow with two scheduled jobs + workflow_dispatch fallback"
      min_lines: 60
      contains: "ambassador-report-flag"
  key_links:
    - from: "scripts/ambassador-report-flag.ts"
      to: "db.collection('ambassador_cron_flags').doc(flagId).set(...)"
      via: "deterministic-id write; NEVER mutates strikes or roles"
      pattern: "AMBASSADOR_CRON_FLAGS_COLLECTION|ambassador_cron_flags"
    - from: "scripts/ambassador-report-flag.ts"
      to: "sendDirectMessage from src/lib/discord"
      via: "3-days-before + deadline-day reminder calls (REPORT-05)"
      pattern: "sendDirectMessage"
    - from: "scripts/ambassador-discord-reconciliation.ts"
      to: "db.collection('ambassador_cron_flags').doc(flagId).set({type: 'missing_discord_role'})"
      via: "flag-only write; NEVER calls assignDiscordRole"
      pattern: "missing_discord_role"
    - from: ".github/workflows/ambassador-activity-checks.yml"
      to: "npx tsx scripts/ambassador-report-flag.ts / ambassador-discord-reconciliation.ts"
      via: "schedule-guarded job steps mirroring mentorship-inactivity-checks.yml"
      pattern: "npx tsx scripts/ambassador"
---

<objective>
Implement the two human-in-the-loop cron scripts that close out Phase 4's observability loop: a daily missing-report flagger (REPORT-04 + REPORT-05 DM reminders) and a weekly Discord-role reconciliation flagger (DISC-04). Both write to `ambassador_cron_flags` only — per D-06, crons NEVER mutate strikes, roles, or any other state. A single GitHub Actions workflow runs both jobs on their respective schedules with a manual-dispatch fallback.

Purpose: Completes the last three Phase 4 requirements that Plans 01–05 set up types and admin UI for but did not build the execution layer. The daily cron gives the admin panel evidence rows (`CronFlagsPanel` from Plan 05) to act on before confirming a strike; the weekly cron surfaces Discord assignment drift (which happens when the bot is rate-limited at accept time or when the user leaves/rejoins the guild).

Output: Two `tsx`-executable TypeScript scripts in `scripts/` and one `.github/workflows/*.yml` file. No new API routes, no new UI — purely operational infrastructure.
</objective>

<threat_model>
- Authentication: N/A — scripts run in GitHub Actions with `FIREBASE_SERVICE_ACCOUNT` and `DISCORD_BOT_TOKEN` secrets. No user auth involved.
- Authorization: Admin SDK bypasses Firestore rules — threat is uncontrolled writes. Mitigated by two guarantees: (a) scripts write ONLY to `ambassador_cron_flags`, never to `mentorship_profiles/*/ambassador/*`, `strikes`, or `roles`; (b) the GitHub Actions matrix is scoped to main branch only.
- Data integrity — no auto-mutation: D-06 is the critical invariant. Verified by acceptance_criteria grep that NEITHER script contains `FieldValue.increment`, `syncRoleClaim`, `assignDiscordRole`, or any `mentorship_profiles/*/ambassador/*.update`.
- Data integrity — idempotency: Deterministic flag doc id (`${ambassadorId}_${type}_${period ?? 'all'}`) + `set(payload, { merge: true })` means re-running for the same period never creates duplicate unresolved flags. Unresolved flags re-appear in the admin panel but do not multiply.
- Cron safety — human-in-the-loop: All strike increments and role mutations are explicit admin actions (Plan 04 strike route + Plan 02 acceptance retry). The crons exist to SURFACE evidence, not enforce. Admin panel (Plan 05) is the only mutation surface for flagged items.
- Cookie security: N/A.
- Discord rate-limit: sendDirectMessage is non-blocking (catches its own errors per `src/lib/discord.ts` contract). DM failures log but do not stop the flag write — the flag is more important than the DM.
- Secret hygiene: Workflow references secrets via `${{ secrets.* }}` only — never echoes to logs. `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `FIREBASE_SERVICE_ACCOUNT`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `DISCORD_AMBASSADOR_ROLE_ID` all inherited from existing Phase 2 secrets.
- Block-on severity: HIGH for (a) no mutation of strikes/roles, (b) idempotent flag writes, (c) sendDirectMessage failure does not block flag write, (d) --dry-run flag prevents accidental production runs during development.
</threat_model>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/REQUIREMENTS.md
@.planning/phases/04-activity-subsystem/04-CONTEXT.md
@.planning/phases/04-activity-subsystem/04-RESEARCH.md
@.planning/phases/04-activity-subsystem/04-PATTERNS.md
@.planning/phases/04-activity-subsystem/04-01-foundations-types-schemas-PLAN.md
@scripts/mentorship-inactivity-warning.ts
@.github/workflows/mentorship-inactivity-checks.yml
@src/lib/discord.ts
@src/lib/ambassador/constants.ts

<interfaces>
From Plan 01 (MUST be complete before this plan runs):
- `AMBASSADOR_CRON_FLAGS_COLLECTION = "ambassador_cron_flags"` — `@/lib/ambassador/constants`
- `MONTHLY_REPORTS_COLLECTION = "monthly_reports"`
- `PUBLIC_AMBASSADORS_COLLECTION = "public_ambassadors"` (already in constants from Phase 3)
- `getAmbassadorMonthKey(timezone: string): string` — previous month key in ambassador's timezone, format `"YYYY-MM"` — `@/lib/ambassador/reportDeadline`
- `getDeadlineUTC(year: number, month: number, timezone: string): number` — UTC ms of last-second-of-month in timezone — `@/lib/ambassador/reportDeadline`
- `getCurrentMonthKey(timezone: string): string` — current month key (used for DM reminder "deadline today" check) — `@/lib/ambassador/reportDeadline`
- `interface AmbassadorCronFlagDoc { ambassadorId, type: "missing_report" | "missing_discord_role", period?, flaggedAt: Date, resolved: boolean }` — `@/types/ambassador`
- `interface AmbassadorSubdoc { timezone?, active, discordMemberId, ... }` — `@/types/ambassador`

Existing discord.ts exports (confirmed from src/lib/discord.ts):
- `sendDirectMessage(discordUsername: string, message: string): Promise<boolean>` — line ~526; returns true on success, false on failure, NEVER throws (safe to call without try/catch per its contract). **Known limitation:** takes a Discord username (mutable) not a member ID. DMs may silently fail if an ambassador changes their Discord username; this is acceptable for v1 since DM failure is non-fatal and the flag write still succeeds.
- `getGuildMember(discordMemberId: string): Promise<GuildMember | null>` — fetches by immutable Discord member id; returns null on 404/error
- `DISCORD_AMBASSADOR_ROLE_ID` — constant exported from `src/lib/ambassador/constants.ts` (set in Phase 2 preflight)
- `DISCORD_GUILD_ID` — env var read directly via `process.env.DISCORD_GUILD_ID`

Canonical cron script structure (from scripts/mentorship-inactivity-warning.ts):
- Top of file: `import { config } from "dotenv"; config({ path: ".env.local" });` BEFORE any other imports that read env
- Firebase Admin init guarded by `!admin.apps.length` with production vs dev branch
- `const db = admin.firestore()` — note scripts import admin directly (NOT @/lib/firebaseAdmin because script runs outside Next.js context); however for Phase 4 consistency use `import { db } from "../src/lib/firebaseAdmin"` — this works in tsx because firebaseAdmin.ts handles the named-app emulator guard which is also safe in production
- CLI args parsed from `process.argv` — look for `--dry-run` as a literal string
- Use `console.log` / `console.error` for all output — these become GitHub Actions step output

Canonical workflow file (from .github/workflows/mentorship-inactivity-checks.yml):
- Two cron schedules + workflow_dispatch with choice input
- Each job guarded by `if:` that matches BOTH scheduled trigger AND dispatch input
- Steps: checkout → setup-node (node-version: '22.x' to match package.json) → npm ci → run script with env vars
- Env vars: NODE_ENV=production, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, FIREBASE_SERVICE_ACCOUNT, NEXT_PUBLIC_FIREBASE_PROJECT_ID
- Additional env for DISC-04: DISCORD_AMBASSADOR_ROLE_ID
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create scripts/ambassador-report-flag.ts — daily missing-report flagger + DM reminders (REPORT-04, REPORT-05)</name>
  <files>scripts/ambassador-report-flag.ts</files>
  <read_first>
    - scripts/mentorship-inactivity-warning.ts (ENTIRE file — canonical shape: dotenv load, admin init pattern, CLI arg parsing, console output, exit codes)
    - src/lib/discord.ts lines 500-560 (sendDirectMessage signature, non-throwing contract)
    - src/lib/ambassador/constants.ts (AMBASSADOR_CRON_FLAGS_COLLECTION, MONTHLY_REPORTS_COLLECTION, PUBLIC_AMBASSADORS_COLLECTION)
    - src/lib/ambassador/reportDeadline.ts (from Plan 01 — getAmbassadorMonthKey, getCurrentMonthKey, getDeadlineUTC)
    - src/types/ambassador.ts (AmbassadorSubdoc.timezone, AmbassadorCronFlagDoc)
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §23 (script delta vs mentorship-inactivity-warning.ts)
    - .planning/phases/04-activity-subsystem/04-RESEARCH.md §Pitfall 5 (timezone-aware cron correctness)
  </read_first>
  <action>
    Create `scripts/ambassador-report-flag.ts` with exactly this structure:

    ```typescript
    #!/usr/bin/env npx tsx
    /**
     * Phase 4 (REPORT-04 + REPORT-05): Daily missing-report flagger.
     *
     * For each active ambassador:
     *   1. Compute the PREVIOUS calendar month key (`YYYY-MM`) in their timezone.
     *   2. If no `monthly_reports/{ambassadorId}_{prevMonth}` doc exists AND the deadline
     *      has passed, write a `ambassador_cron_flags` doc with type=missing_report.
     *   3. For the CURRENT calendar month, send a Discord DM reminder:
     *        - 3 days before deadline (REPORT-05)
     *        - On deadline day (REPORT-05)
     *
     * D-06 INVARIANT: NEVER mutate strikes, roles, or any field on the ambassador
     * subdoc. The only Firestore write this script performs is to `ambassador_cron_flags`.
     *
     * Run: npx tsx scripts/ambassador-report-flag.ts [--dry-run]
     */
    import { config } from "dotenv";
    config({ path: ".env.local" });

    import { db } from "../src/lib/firebaseAdmin";
    import { FieldValue } from "firebase-admin/firestore";
    import { sendDirectMessage } from "../src/lib/discord";
    import {
      AMBASSADOR_CRON_FLAGS_COLLECTION,
      MONTHLY_REPORTS_COLLECTION,
      PUBLIC_AMBASSADORS_COLLECTION,
    } from "../src/lib/ambassador/constants";
    import {
      getAmbassadorMonthKey,
      getCurrentMonthKey,
      getDeadlineUTC,
    } from "../src/lib/ambassador/reportDeadline";

    const DRY_RUN = process.argv.includes("--dry-run");
    const DM_REMINDER_LEAD_DAYS = 3;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    interface ActiveAmbassador {
      uid: string;
      discordHandle?: string;
      displayName?: string;
      timezone: string;
    }

    async function loadActiveAmbassadors(): Promise<ActiveAmbassador[]> {
      // Use public_ambassadors projection (already filtered to active ambassadors in Phase 3)
      // Join with subdoc for timezone + Discord info.
      const snap = await db
        .collection(PUBLIC_AMBASSADORS_COLLECTION)
        .where("active", "==", true)
        .get();

      const results: ActiveAmbassador[] = [];
      for (const doc of snap.docs) {
        const uid = doc.id;
        // Read subdoc for timezone
        const subdocSnap = await db
          .collection("mentorship_profiles")
          .doc(uid)
          .collection("ambassador")
          .doc("v1")
          .get();
        const subdoc = subdocSnap.data() ?? {};
        const profileSnap = await db.collection("mentorship_profiles").doc(uid).get();
        const profile = profileSnap.data() ?? {};

        results.push({
          uid,
          discordHandle: typeof profile.discordUsername === "string" ? profile.discordUsername : undefined,
          displayName: typeof profile.displayName === "string" ? profile.displayName : uid,
          timezone: typeof subdoc.timezone === "string" && subdoc.timezone.length > 0 ? subdoc.timezone : "UTC",
        });
      }
      return results;
    }

    async function hasReportForMonth(uid: string, monthKey: string): Promise<boolean> {
      const docId = `${uid}_${monthKey}`;
      const snap = await db.collection(MONTHLY_REPORTS_COLLECTION).doc(docId).get();
      return snap.exists;
    }

    async function writeFlag(ambassadorId: string, period: string): Promise<void> {
      // Deterministic doc id — re-runs do not duplicate unresolved flags.
      const flagId = `${ambassadorId}_missing_report_${period}`;
      if (DRY_RUN) {
        console.log(`[DRY-RUN] would write flag: ${flagId}`);
        return;
      }
      await db.collection(AMBASSADOR_CRON_FLAGS_COLLECTION).doc(flagId).set(
        {
          ambassadorId,
          type: "missing_report",
          period,
          flaggedAt: FieldValue.serverTimestamp(),
          resolved: false,
        },
        { merge: true }
      );
    }

    function shouldRemind(currentMonthKey: string, timezone: string, nowMs: number): "three_days" | "today" | null {
      const [yearStr, monthStr] = currentMonthKey.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      const deadlineMs = getDeadlineUTC(year, month, timezone);
      const diffMs = deadlineMs - nowMs;
      if (diffMs < 0) return null;
      const diffDays = diffMs / MS_PER_DAY;
      if (diffDays <= 0.5) return "today"; // within last 12h
      if (diffDays >= DM_REMINDER_LEAD_DAYS - 0.5 && diffDays <= DM_REMINDER_LEAD_DAYS + 0.5) {
        return "three_days";
      }
      return null;
    }

    function reminderMessage(kind: "three_days" | "today", displayName: string, monthLabel: string): string {
      if (kind === "three_days") {
        return `Hi ${displayName} — just a heads-up, your ${monthLabel} ambassador self-report is due in 3 days. It takes about 3-5 minutes: https://codewithahsan.dev/ambassadors/report`;
      }
      return `Hi ${displayName} — your ${monthLabel} ambassador self-report is due today. https://codewithahsan.dev/ambassadors/report`;
    }

    async function main() {
      console.log(`[ambassador-report-flag] starting at ${new Date().toISOString()} (dry-run=${DRY_RUN})`);
      const nowMs = Date.now();
      const ambassadors = await loadActiveAmbassadors();
      console.log(`[ambassador-report-flag] loaded ${ambassadors.length} active ambassadors`);

      let flagsWritten = 0;
      let remindersSent = 0;
      let errors = 0;

      for (const amb of ambassadors) {
        try {
          // 1. Missing-report flag for PREVIOUS month
          const prevMonthKey = getAmbassadorMonthKey(amb.timezone);
          const hasReport = await hasReportForMonth(amb.uid, prevMonthKey);
          if (!hasReport) {
            await writeFlag(amb.uid, prevMonthKey);
            flagsWritten++;
            console.log(`[flag] ${amb.uid} (${amb.displayName}) missing ${prevMonthKey}`);
          }

          // 2. DM reminder for CURRENT month (if within reminder window)
          const currMonthKey = getCurrentMonthKey(amb.timezone);
          const hasCurrReport = await hasReportForMonth(amb.uid, currMonthKey);
          if (!hasCurrReport && amb.discordHandle) {
            const reminderKind = shouldRemind(currMonthKey, amb.timezone, nowMs);
            if (reminderKind) {
              const monthLabel = new Intl.DateTimeFormat("en-US", {
                month: "long",
                year: "numeric",
                timeZone: amb.timezone,
              }).format(new Date(nowMs));
              const msg = reminderMessage(reminderKind, amb.displayName ?? amb.uid, monthLabel);
              if (DRY_RUN) {
                console.log(`[DRY-RUN] would DM ${amb.discordHandle}: ${msg}`);
              } else {
                const sent = await sendDirectMessage(amb.discordHandle, msg);
                if (sent) {
                  remindersSent++;
                  console.log(`[dm] ${amb.uid} (${amb.discordHandle}) ${reminderKind}`);
                } else {
                  console.warn(`[dm-failed] ${amb.uid} (${amb.discordHandle}) — non-fatal`);
                }
              }
            }
          }
        } catch (err) {
          errors++;
          console.error(`[error] ${amb.uid}:`, err);
          // Continue — do NOT fail the whole run on one bad ambassador
        }
      }

      console.log(
        `[ambassador-report-flag] done. flags=${flagsWritten} reminders=${remindersSent} errors=${errors}`
      );
      // Exit 0 even with per-ambassador errors; exit 1 only on fatal initialization failure.
    }

    main().catch((err) => {
      console.error("[ambassador-report-flag] fatal:", err);
      process.exit(1);
    });
    ```

    **CRITICAL MUTATION GUARDS** — NONE of these tokens may appear in the file:
    - `FieldValue.increment` (would mutate strike count)
    - `syncRoleClaim` / `assignDiscordRole` (role mutations)
    - `.collection("mentorship_profiles").*update` / `.set.*strikes` / `.set.*roles` (subdoc mutation)

    Verify with the grep in acceptance_criteria below.
  </action>
  <verify>
    <automated>npx tsc --noEmit scripts/ambassador-report-flag.ts 2>&1 | head -20 && grep -c "AMBASSADOR_CRON_FLAGS_COLLECTION" scripts/ambassador-report-flag.ts && ! grep -E "FieldValue\.increment|syncRoleClaim|assignDiscordRole" scripts/ambassador-report-flag.ts</automated>
  </verify>
  <acceptance_criteria>
    - `scripts/ambassador-report-flag.ts` exists and imports `sendDirectMessage` from `../src/lib/discord`
    - File imports `AMBASSADOR_CRON_FLAGS_COLLECTION` and `MONTHLY_REPORTS_COLLECTION` from `../src/lib/ambassador/constants`
    - File imports `getAmbassadorMonthKey`, `getCurrentMonthKey`, `getDeadlineUTC` from `../src/lib/ambassador/reportDeadline`
    - File contains `config({ path: ".env.local" })` BEFORE any non-dotenv import (verify line order)
    - `grep -E "FieldValue\\.increment|syncRoleClaim|assignDiscordRole" scripts/ambassador-report-flag.ts` returns EMPTY (no matches — D-06 mutation guard)
    - `grep -c "strikes" scripts/ambassador-report-flag.ts` returns 0 or only in comments (no writes to strikes field)
    - `grep -c "ambassador_cron_flags\\|AMBASSADOR_CRON_FLAGS_COLLECTION" scripts/ambassador-report-flag.ts` is at least 2 (write target is `ambassador_cron_flags` only)
    - File contains `const DRY_RUN = process.argv.includes("--dry-run")`
    - File contains a deterministic flag id: `${ambassadorId}_missing_report_${period}` pattern (idempotency)
    - File uses `{ merge: true }` on the flag write (re-run safe)
    - File reads `public_ambassadors` collection with `.where("active", "==", true)` filter
    - File reads `subdoc.timezone` with `"UTC"` default when absent
    - `npx tsc --noEmit scripts/ambassador-report-flag.ts` exits 0
    - File handles per-ambassador errors with try/catch that logs and continues (does not exit the loop)
  </acceptance_criteria>
  <done>
    Daily cron script exists, never mutates strikes/roles, writes idempotent flags only, and sends timezone-aware DM reminders 3 days before + on deadline day. `--dry-run` flag supported for local testing.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create scripts/ambassador-discord-reconciliation.ts — weekly Discord-role flagger (DISC-04)</name>
  <files>scripts/ambassador-discord-reconciliation.ts</files>
  <read_first>
    - scripts/mentorship-inactivity-warning.ts (canonical cron shape — same as Task 1)
    - src/lib/discord.ts (getGuildMember signature; DISCORD_GUILD_ID env var usage)
    - src/lib/ambassador/constants.ts (AMBASSADOR_CRON_FLAGS_COLLECTION, DISCORD_AMBASSADOR_ROLE_ID, PUBLIC_AMBASSADORS_COLLECTION)
    - src/types/ambassador.ts (AmbassadorCronFlagDoc with type 'missing_discord_role')
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §24 (reconciliation script delta)
    - .planning/phases/04-activity-subsystem/04-CONTEXT.md §D-06 (crons never mutate — flag only)
  </read_first>
  <action>
    Create `scripts/ambassador-discord-reconciliation.ts`:

    ```typescript
    #!/usr/bin/env npx tsx
    /**
     * Phase 4 (DISC-04): Weekly Discord-role reconciliation.
     *
     * For each active ambassador with a resolved `discordMemberId`:
     *   - Fetch their guild member via `getGuildMember(discordMemberId)`.
     *   - If the member's roles array does NOT include `DISCORD_AMBASSADOR_ROLE_ID`,
     *     write `ambassador_cron_flags` with type=missing_discord_role.
     *
     * D-06 INVARIANT: This script NEVER calls `assignDiscordRole`. Missing roles
     * are flagged for admin review only. Admins use the existing
     * `/api/ambassador/applications/[applicationId]/discord-resolve` retry (Phase 2)
     * or the future Phase 5 member offboarding UI.
     *
     * Run: npx tsx scripts/ambassador-discord-reconciliation.ts [--dry-run]
     */
    import { config } from "dotenv";
    config({ path: ".env.local" });

    import { db } from "../src/lib/firebaseAdmin";
    import { FieldValue } from "firebase-admin/firestore";
    import { getGuildMember } from "../src/lib/discord";
    import {
      AMBASSADOR_CRON_FLAGS_COLLECTION,
      DISCORD_AMBASSADOR_ROLE_ID,
      PUBLIC_AMBASSADORS_COLLECTION,
    } from "../src/lib/ambassador/constants";

    const DRY_RUN = process.argv.includes("--dry-run");

    interface AmbassadorRecord {
      uid: string;
      discordMemberId: string | null;
      displayName: string;
    }

    async function loadActiveAmbassadors(): Promise<AmbassadorRecord[]> {
      const snap = await db
        .collection(PUBLIC_AMBASSADORS_COLLECTION)
        .where("active", "==", true)
        .get();

      const results: AmbassadorRecord[] = [];
      for (const doc of snap.docs) {
        const uid = doc.id;
        const subdocSnap = await db
          .collection("mentorship_profiles")
          .doc(uid)
          .collection("ambassador")
          .doc("v1")
          .get();
        const subdoc = subdocSnap.data() ?? {};
        const data = doc.data() ?? {};

        results.push({
          uid,
          discordMemberId:
            typeof subdoc.discordMemberId === "string" && subdoc.discordMemberId.length > 0
              ? subdoc.discordMemberId
              : null,
          displayName: typeof data.displayName === "string" ? data.displayName : uid,
        });
      }
      return results;
    }

    async function writeFlag(ambassadorId: string): Promise<void> {
      // Deterministic doc id — re-runs never duplicate unresolved flags.
      const flagId = `${ambassadorId}_missing_discord_role_all`;
      if (DRY_RUN) {
        console.log(`[DRY-RUN] would write flag: ${flagId}`);
        return;
      }
      await db.collection(AMBASSADOR_CRON_FLAGS_COLLECTION).doc(flagId).set(
        {
          ambassadorId,
          type: "missing_discord_role",
          flaggedAt: FieldValue.serverTimestamp(),
          resolved: false,
        },
        { merge: true }
      );
    }

    async function main() {
      console.log(
        `[ambassador-discord-reconciliation] starting at ${new Date().toISOString()} (dry-run=${DRY_RUN})`
      );
      if (!DISCORD_AMBASSADOR_ROLE_ID || DISCORD_AMBASSADOR_ROLE_ID === "PENDING_DISCORD_ROLE_CREATION") {
        console.error("[ambassador-discord-reconciliation] DISCORD_AMBASSADOR_ROLE_ID is not set; exiting");
        process.exit(1);
      }

      const ambassadors = await loadActiveAmbassadors();
      console.log(`[ambassador-discord-reconciliation] loaded ${ambassadors.length} active ambassadors`);

      let flagsWritten = 0;
      let noDiscordId = 0;
      let errors = 0;

      for (const amb of ambassadors) {
        try {
          if (!amb.discordMemberId) {
            // No resolved Discord id — surface as missing_discord_role flag so admin can re-resolve
            await writeFlag(amb.uid);
            flagsWritten++;
            noDiscordId++;
            console.log(`[flag-no-discord-id] ${amb.uid} (${amb.displayName})`);
            continue;
          }

          const member = await getGuildMember(amb.discordMemberId);
          if (!member) {
            await writeFlag(amb.uid);
            flagsWritten++;
            console.log(`[flag-not-in-guild] ${amb.uid} (${amb.displayName})`);
            continue;
          }

          const roles: string[] = Array.isArray(member.roles) ? member.roles : [];
          if (!roles.includes(DISCORD_AMBASSADOR_ROLE_ID)) {
            await writeFlag(amb.uid);
            flagsWritten++;
            console.log(`[flag-role-missing] ${amb.uid} (${amb.displayName})`);
          }
        } catch (err) {
          errors++;
          console.error(`[error] ${amb.uid}:`, err);
          // Continue on per-ambassador failures
        }
      }

      console.log(
        `[ambassador-discord-reconciliation] done. flags=${flagsWritten} noDiscordId=${noDiscordId} errors=${errors}`
      );
    }

    main().catch((err) => {
      console.error("[ambassador-discord-reconciliation] fatal:", err);
      process.exit(1);
    });
    ```

    **CRITICAL MUTATION GUARDS** — NONE of these tokens may appear:
    - `assignDiscordRole` (would mutate Discord state — DISC-04 forbids)
    - `syncRoleClaim` / `FieldValue.increment` (app state mutation)
    - Any `.update` or `.set` on `mentorship_profiles/*` paths

    NOTE: `getGuildMember` may not exist yet in `src/lib/discord.ts`. If it does not, the executor MUST first confirm the correct function name by reading `src/lib/discord.ts` and use whichever of these is present: `getGuildMember`, `fetchGuildMember`, or `lookupGuildMemberById`. If none exist but `lookupMemberByUsername` is available, use that with `amb.discordHandle` instead of `discordMemberId` (flag a TODO at the top of the file so a future quick task can swap to member-id lookup).
  </action>
  <verify>
    <automated>npx tsc --noEmit scripts/ambassador-discord-reconciliation.ts 2>&1 | head -20 && ! grep -E "assignDiscordRole|syncRoleClaim|FieldValue\.increment" scripts/ambassador-discord-reconciliation.ts</automated>
  </verify>
  <acceptance_criteria>
    - `scripts/ambassador-discord-reconciliation.ts` exists and imports `AMBASSADOR_CRON_FLAGS_COLLECTION`, `DISCORD_AMBASSADOR_ROLE_ID`, `PUBLIC_AMBASSADORS_COLLECTION` from `../src/lib/ambassador/constants`
    - File contains `config({ path: ".env.local" })` before any non-dotenv import
    - `grep -E "assignDiscordRole|syncRoleClaim|FieldValue\\.increment" scripts/ambassador-discord-reconciliation.ts` returns EMPTY (no matches — D-06 mutation guard)
    - File reads `public_ambassadors` with `.where("active", "==", true)` filter
    - File writes ONLY to `ambassador_cron_flags` (grep for `.collection(` should only find that collection and the read-only `public_ambassadors`, `mentorship_profiles`)
    - File contains deterministic flag id `${ambassadorId}_missing_discord_role_all` (idempotency)
    - File uses `{ merge: true }` on flag writes
    - File has `--dry-run` support via `process.argv.includes("--dry-run")`
    - File exits(1) when `DISCORD_AMBASSADOR_ROLE_ID` is missing or equals placeholder
    - `npx tsc --noEmit scripts/ambassador-discord-reconciliation.ts` exits 0
  </acceptance_criteria>
  <done>
    Weekly reconciliation cron flags ambassadors missing the Discord role without calling any mutation API. Script passes type-check and D-06 mutation-guard grep returns empty.
  </done>
</task>

<task type="auto">
  <name>Task 3: Create .github/workflows/ambassador-activity-checks.yml — two scheduled jobs + workflow_dispatch</name>
  <files>.github/workflows/ambassador-activity-checks.yml</files>
  <read_first>
    - .github/workflows/mentorship-inactivity-checks.yml (entire file — canonical workflow shape, schedule/dispatch guards, env var wiring)
    - package.json "engines.node" field if present (to confirm node-version)
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §25 (workflow delta)
    - .planning/phases/04-activity-subsystem/04-RESEARCH.md §Pattern 5 (cron schedule values)
  </read_first>
  <action>
    Create `.github/workflows/ambassador-activity-checks.yml` with this exact structure:

    ```yaml
    name: Ambassador Activity Checks

    on:
      schedule:
        # Daily at 08:00 UTC — missing-report flag + REPORT-05 DM reminders
        - cron: '0 8 * * *'
        # Weekly Monday at 09:00 UTC — Discord Ambassador role reconciliation (DISC-04)
        - cron: '0 9 * * 1'
      workflow_dispatch:
        inputs:
          job:
            description: 'Which job to run'
            required: true
            default: 'report-flag'
            type: choice
            options:
              - report-flag
              - discord-reconciliation
              - both
          dry_run:
            description: 'Run with --dry-run (no Firestore writes)'
            required: false
            default: 'false'
            type: choice
            options:
              - 'true'
              - 'false'

    jobs:
      ambassador-report-flag:
        name: Daily missing-report flag (REPORT-04 + REPORT-05)
        runs-on: ubuntu-latest
        if: |
          (github.event_name == 'schedule' && github.event.schedule == '0 8 * * *') ||
          (github.event_name == 'workflow_dispatch' && (github.event.inputs.job == 'report-flag' || github.event.inputs.job == 'both'))
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: '22.x'
              cache: 'npm'
          - run: npm ci
          - name: Run report-flag cron
            env:
              NODE_ENV: production
              DISCORD_BOT_TOKEN: ${{ secrets.DISCORD_BOT_TOKEN }}
              DISCORD_GUILD_ID: ${{ secrets.DISCORD_GUILD_ID }}
              FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
              NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
              DISCORD_AMBASSADOR_ROLE_ID: ${{ secrets.DISCORD_AMBASSADOR_ROLE_ID }}
            run: |
              if [ "${{ github.event.inputs.dry_run }}" = "true" ]; then
                npx tsx scripts/ambassador-report-flag.ts --dry-run
              else
                npx tsx scripts/ambassador-report-flag.ts
              fi

      ambassador-discord-reconciliation:
        name: Weekly Discord role reconciliation (DISC-04)
        runs-on: ubuntu-latest
        if: |
          (github.event_name == 'schedule' && github.event.schedule == '0 9 * * 1') ||
          (github.event_name == 'workflow_dispatch' && (github.event.inputs.job == 'discord-reconciliation' || github.event.inputs.job == 'both'))
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: '22.x'
              cache: 'npm'
          - run: npm ci
          - name: Run discord-reconciliation cron
            env:
              NODE_ENV: production
              DISCORD_BOT_TOKEN: ${{ secrets.DISCORD_BOT_TOKEN }}
              DISCORD_GUILD_ID: ${{ secrets.DISCORD_GUILD_ID }}
              FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
              NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
              DISCORD_AMBASSADOR_ROLE_ID: ${{ secrets.DISCORD_AMBASSADOR_ROLE_ID }}
            run: |
              if [ "${{ github.event.inputs.dry_run }}" = "true" ]; then
                npx tsx scripts/ambassador-discord-reconciliation.ts --dry-run
              else
                npx tsx scripts/ambassador-discord-reconciliation.ts
              fi
    ```

    **Node version:** use `'22.x'` to match the `scripts/mentorship-inactivity-warning.ts` canonical file and the project's node v22.13.1 runtime.

    **Secrets required (all already exist — Phase 2 preflight):**
    - DISCORD_BOT_TOKEN
    - DISCORD_GUILD_ID
    - FIREBASE_SERVICE_ACCOUNT
    - NEXT_PUBLIC_FIREBASE_PROJECT_ID
    - DISCORD_AMBASSADOR_ROLE_ID

    No new secrets to configure. If a secret is missing in the repo, the run will fail fast at script startup with a clear error message — this is acceptable fail-loud behavior.
  </action>
  <verify>
    <automated>test -f .github/workflows/ambassador-activity-checks.yml && grep -c "ambassador-report-flag\|ambassador-discord-reconciliation" .github/workflows/ambassador-activity-checks.yml</automated>
  </verify>
  <acceptance_criteria>
    - `.github/workflows/ambassador-activity-checks.yml` exists
    - File contains `name: Ambassador Activity Checks`
    - File contains both cron schedules: `'0 8 * * *'` and `'0 9 * * 1'`
    - File defines exactly two jobs: `ambassador-report-flag` and `ambassador-discord-reconciliation`
    - Each job has an `if:` guard that matches both the scheduled event AND the workflow_dispatch input
    - File references `npx tsx scripts/ambassador-report-flag.ts` and `npx tsx scripts/ambassador-discord-reconciliation.ts`
    - File uses `node-version: '22.x'` in setup-node
    - File includes all five required secrets: `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `FIREBASE_SERVICE_ACCOUNT`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `DISCORD_AMBASSADOR_ROLE_ID`
    - File includes `workflow_dispatch` with `job` choice input (options: report-flag, discord-reconciliation, both) AND `dry_run` choice input
    - `dry_run` input is wired into the run step via an `if/else` bash conditional that appends `--dry-run`
  </acceptance_criteria>
  <done>
    Workflow file exists, references both cron scripts, has proper schedule+dispatch guards with a --dry-run option, and references only existing Phase 2 secrets.
  </done>
</task>

<task type="auto">
  <name>Task 4: Local dry-run smoke test of both cron scripts</name>
  <files></files>
  <read_first>
    - scripts/ambassador-report-flag.ts (just written)
    - scripts/ambassador-discord-reconciliation.ts (just written)
  </read_first>
  <action>
    Run both scripts in dry-run mode against the local environment. This is a smoke test — it verifies the scripts load, connect to Firestore (or the emulator), and walk their logic branches without writing anything.

    Step 1: Verify `.env.local` has the required variables (or document skipping this step if no Firebase credentials are available locally — Phase 2/3 executors have already set this up):

    ```bash
    grep -E "NEXT_PUBLIC_FIREBASE_PROJECT_ID|DISCORD_GUILD_ID" .env.local | head -3
    ```

    Step 2: Dry-run the report-flag script:

    ```bash
    npx tsx scripts/ambassador-report-flag.ts --dry-run 2>&1 | tee /tmp/ambassador-report-flag-dryrun.log
    ```

    Expected output:
    - `[ambassador-report-flag] starting at <iso-timestamp> (dry-run=true)`
    - `[ambassador-report-flag] loaded N active ambassadors`
    - Zero `[error]` lines (or if present, document them in the plan summary)
    - Final line: `[ambassador-report-flag] done. flags=N reminders=N errors=N`
    - Any flag writes logged as `[DRY-RUN] would write flag: ...` — NOT actual writes

    Step 3: Dry-run the discord-reconciliation script:

    ```bash
    npx tsx scripts/ambassador-discord-reconciliation.ts --dry-run 2>&1 | tee /tmp/ambassador-discord-reconciliation-dryrun.log
    ```

    Expected output:
    - `[ambassador-discord-reconciliation] starting at <iso-timestamp> (dry-run=true)`
    - Final line: `[ambassador-discord-reconciliation] done. flags=N noDiscordId=N errors=N`

    Step 4: Verify no Firestore writes occurred. Spot-check the emulator UI or run:

    ```bash
    # Count docs in ambassador_cron_flags before and after (should be identical)
    # If no emulator available, skip this step and rely on the [DRY-RUN] log lines instead
    ```

    If either script fails to load (TypeScript error, missing import, env var error), DO NOT proceed — fix the upstream script. Only commit when both dry-runs complete without a fatal error.

    **Failure modes documented for operators:**
    - If `FIREBASE_SERVICE_ACCOUNT` is missing locally, both scripts exit(1) at admin init — this is expected behavior and the workflow file handles it via `secrets.*`
    - If `DISCORD_AMBASSADOR_ROLE_ID` is the `PENDING_DISCORD_ROLE_CREATION` placeholder, the reconciliation script exits(1) with a clear message — this is fail-loud by design
    - If `public_ambassadors` collection is empty (no accepted ambassadors yet), both scripts complete successfully with `loaded 0 active ambassadors` — this is valid cohort-zero behavior
  </action>
  <verify>
    <automated>npx tsx scripts/ambassador-report-flag.ts --dry-run 2>&1 | tail -3 && npx tsx scripts/ambassador-discord-reconciliation.ts --dry-run 2>&1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - `npx tsx scripts/ambassador-report-flag.ts --dry-run` exits with code 0 (or documents the environmental reason if Firestore is unreachable locally — e.g. emulator not running)
    - `npx tsx scripts/ambassador-discord-reconciliation.ts --dry-run` exits with code 0 (or documents the environmental reason)
    - Output of report-flag contains `dry-run=true` in the start log line
    - Output of report-flag contains `done. flags=` in the final log line
    - Output of reconciliation contains `dry-run=true` in the start log line
    - Output of reconciliation contains `done. flags=` in the final log line
    - NO `[DRY-RUN]` log lines appear in production runs (verified implicitly — only appears when `--dry-run` is passed)
  </acceptance_criteria>
  <done>
    Both scripts execute to completion in dry-run mode. Operators now have a tested local-smoke path before the first GitHub Actions run. Any runtime surprises (e.g. stale subdoc shapes) are caught here rather than in production.
  </done>
</task>

</tasks>

<verification>
Run after all 4 tasks:

```bash
# Type check
npx tsc --noEmit scripts/ambassador-report-flag.ts scripts/ambassador-discord-reconciliation.ts

# D-06 mutation guard (must produce zero matches)
grep -E "FieldValue\.increment|syncRoleClaim|assignDiscordRole" scripts/ambassador-report-flag.ts scripts/ambassador-discord-reconciliation.ts || echo "OK: no mutation APIs referenced"

# Workflow file sanity
grep -E "^name:|ambassador-report-flag|ambassador-discord-reconciliation" .github/workflows/ambassador-activity-checks.yml

# Dry-run smoke
npx tsx scripts/ambassador-report-flag.ts --dry-run 2>&1 | tail -5
npx tsx scripts/ambassador-discord-reconciliation.ts --dry-run 2>&1 | tail -5
```

All commands must complete without error output.
</verification>

<success_criteria>
- REPORT-04 satisfied: daily cron flags ambassadors missing their previous-month report in each ambassador's timezone; no state mutation
- REPORT-05 satisfied: cron sends Discord DM reminders 3 days before AND on deadline day
- DISC-04 satisfied: weekly cron flags ambassadors missing the Discord Ambassador role; no role mutation
- D-06 invariant upheld: `grep -E "FieldValue\.increment|syncRoleClaim|assignDiscordRole"` against both scripts returns EMPTY
- Idempotent: deterministic flag doc ids + `{ merge: true }` means re-runs never duplicate unresolved flags
- GitHub Actions workflow runnable manually via workflow_dispatch with `--dry-run` option for operator testing
- Both scripts type-check (`npx tsc --noEmit`)
- Both scripts pass local dry-run smoke test
</success_criteria>

<output>
After completion, create `.planning/phases/04-activity-subsystem/04-06-SUMMARY.md` capturing:
- File paths created
- Any environment surprises encountered during dry-run
- Confirmation that the three forbidden tokens (`FieldValue.increment`, `syncRoleClaim`, `assignDiscordRole`) are absent from both scripts
- Next cron run times (next 08:00 UTC and next Monday 09:00 UTC after merge)
- Any open follow-ups (e.g. if a Discord function name had to be substituted per Task 2 note)
</output>
