---
phase: 02-application-subsystem
plan: 09
type: execute
wave: 4
depends_on:
  - "02-01"
  - "02-03"
  - "02-06"
files_modified:
  - scripts/cleanup-declined-application-media.ts
  - .github/workflows/cleanup-declined-application-media.yml
  - src/lib/ambassador/constants.ts
  - src/lib/discord.ts
autonomous: false
requirements:
  - REVIEW-04
must_haves:
  truths:
    - "A GitHub Actions workflow runs weekly (Mondays 04:00 UTC) and deletes the student-ID Storage object for every application with status='declined' AND declinedAt older than DECLINED_APPLICATION_RETENTION_DAYS (30 days) — matching REVIEW-04."
    - "The cleanup script idempotently handles already-deleted Storage objects (Storage 404 is treated as success)."
    - "The cleanup script sets an audit flag on the application doc: { studentIdCleanedUp: true, cleanedUpAt: <ts> } so re-runs are no-ops."
    - "Before Phase 2 goes live, a human has explicitly chosen AMBASSADOR_DISCORD_MIN_AGE_DAYS value (7 vs 30 — per D-03) and set DISCORD_AMBASSADOR_ROLE_ID to the real Discord role ID (not the Plan 01 placeholder)."
    - "The pre-flight checkpoint in this plan BLOCKS execution of the phase ship until both values are confirmed."
  artifacts:
    - path: "scripts/cleanup-declined-application-media.ts"
      provides: "Node/tsx script: queries declined applications, deletes studentIdStoragePath objects, flags doc with cleanedUpAt"
      min_lines: 80
    - path: ".github/workflows/cleanup-declined-application-media.yml"
      provides: "GitHub Actions workflow: weekly cron trigger + manual workflow_dispatch + firebase service account env injection"
      min_lines: 25
  key_links:
    - from: "scripts/cleanup-declined-application-media.ts"
      to: "admin.storage().bucket().file(path).delete"
      via: "Firebase Admin SDK Storage delete; catches 404 (object already missing) as success"
      pattern: "\\.delete\\("
    - from: "scripts/cleanup-declined-application-media.ts"
      to: "DECLINED_APPLICATION_RETENTION_DAYS"
      via: "constant from Plan 01 — never hardcode 30 in the script"
      pattern: "DECLINED_APPLICATION_RETENTION_DAYS"
    - from: ".github/workflows/cleanup-declined-application-media.yml"
      to: "secrets.FIREBASE_SERVICE_ACCOUNT_KEY"
      via: "env injection — matches existing .github/workflows/cleanup-archived-discord-channels.yml"
      pattern: "FIREBASE_SERVICE_ACCOUNT_KEY"
---

<objective>
Two concerns bundled because both are phase-shipping gates:

1. **REVIEW-04 implementation** — the weekly cleanup cron. Declined applications with studentIdStoragePath: after 30 days, delete the Storage object. Uses GitHub Actions (per STATE.md convention: "Cron jobs — always use GitHub Actions + scripts/"), mirroring the shape of `.github/workflows/cleanup-archived-discord-channels.yml`.

2. **Pre-flight checkpoint** — BEFORE the phase goes live, a human MUST set two values that were deliberately left as placeholders:
   - `AMBASSADOR_DISCORD_MIN_AGE_DAYS` — currently 30 (D-03 default). Decide: 7 (lower friction) vs 30 (spec value).
   - `DISCORD_AMBASSADOR_ROLE_ID` — currently `"PENDING_DISCORD_ROLE_CREATION"` placeholder from Plan 01. Must be set to the real Discord role ID created in the server.

This plan is `autonomous: false` because of the checkpoint tasks. Plans 01-08 are autonomous; only THIS plan gates on the human.

Purpose:
- Close REVIEW-04: nobody wants a student-ID photo sitting in Storage forever after decline; 30-day retention is the spec.
- Close the last two open questions from RESEARCH.md (Open Questions #1, #2): force the human to make the decision before the first acceptance writes bad data.

Output:
- `scripts/cleanup-declined-application-media.ts` + `.github/workflows/cleanup-declined-application-media.yml` for REVIEW-04.
- Updated `AMBASSADOR_DISCORD_MIN_AGE_DAYS` constant with chosen value.
- Updated `DISCORD_AMBASSADOR_ROLE_ID` constant with real Discord role ID.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-application-subsystem/02-CONTEXT.md
@.planning/phases/02-application-subsystem/02-RESEARCH.md
@.planning/phases/02-application-subsystem/02-01-SUMMARY.md
@.planning/phases/02-application-subsystem/02-06-SUMMARY.md

<interfaces>
<!-- Contracts the executor needs — no codebase scavenging required. -->

From @/lib/ambassador/constants (Plan 01):
```typescript
export const AMBASSADOR_DISCORD_MIN_AGE_DAYS: number;              // 30 (default — this plan may change to 7)
export const AMBASSADOR_APPLICATIONS_COLLECTION: "applications";
export const DECLINED_APPLICATION_RETENTION_DAYS: number;          // 30 (per REVIEW-04)
```

Firebase Admin init pattern (reference — DO NOT copy; use existing helper from scripts/):
```typescript
// Existing scripts in scripts/ directory (e.g. scripts/migrate-roles-to-array.ts) already have the init pattern:
//   import * as admin from "firebase-admin";
//   const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
//   admin.initializeApp({ credential: admin.credential.cert(serviceAccount), storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET });
// Reuse this pattern — do not invent a new init.
```

Reference workflow (mirror its shape):
- `.github/workflows/cleanup-archived-discord-channels.yml` (existing) — shows the exact YAML shape to follow.

From @/lib/discord (Plan 01, needs replacement here):
```typescript
// Currently: export const DISCORD_AMBASSADOR_ROLE_ID = "PENDING_DISCORD_ROLE_CREATION";
// After Task 3: export const DISCORD_AMBASSADOR_ROLE_ID = "{real-id-from-checkpoint}";
```

Application doc shape (Plan 01, Plan 05/06 writes):
```typescript
interface ApplicationDoc {
  status: "submitted" | "under_review" | "accepted" | "declined";
  declinedAt?: Timestamp;            // set by Plan 06 decline path
  studentIdStoragePath?: string;     // set by Plan 05 submit path (path B)
  studentIdCleanedUp?: boolean;      // NEW — set by this cleanup script
  cleanedUpAt?: Timestamp;           // NEW — set by this cleanup script
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: cleanup-declined-application-media.ts script</name>
  <files>scripts/cleanup-declined-application-media.ts</files>
  <read_first>
    - @scripts/migrate-roles-to-array.ts (existing Firebase Admin init pattern — REUSE exactly)
    - @scripts/sync-custom-claims.ts (another existing admin script — confirm shape)
    - @src/lib/ambassador/constants.ts (DECLINED_APPLICATION_RETENTION_DAYS, AMBASSADOR_APPLICATIONS_COLLECTION)
    - @.planning/phases/02-application-subsystem/02-RESEARCH.md (Pattern 5 GitHub Actions cron)
  </read_first>
  <action>
Create `scripts/cleanup-declined-application-media.ts`:

```typescript
/**
 * REVIEW-04: Delete student-ID Storage objects for applications declined > 30 days ago.
 *
 * Runs weekly via .github/workflows/cleanup-declined-application-media.yml.
 * Idempotent — re-runs on the same decline skip because the doc is flagged { studentIdCleanedUp: true }.
 *
 * Env vars required:
 *   FIREBASE_SERVICE_ACCOUNT_KEY               (JSON-serialized service account)
 *   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET        (e.g. project-id.appspot.com)
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID            (optional; admin SDK derives from SA key)
 *
 * Usage:
 *   npx tsx scripts/cleanup-declined-application-media.ts
 */
import * as admin from "firebase-admin";

// --- Constants (mirrors src/lib/ambassador/constants.ts — scripts cannot import from src/ in CI without tsconfig paths, so keep values in sync manually) ---
const DECLINED_APPLICATION_RETENTION_DAYS = 30;
const AMBASSADOR_APPLICATIONS_COLLECTION = "applications";

function daysAgoMs(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function initAdmin() {
  if (admin.apps.length > 0) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY env var is required.");
  }
  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

async function deleteStorageObjectSafe(bucket: ReturnType<typeof admin.storage>["bucket"] extends infer T ? T : never, path: string): Promise<"deleted" | "already_gone"> {
  // Ignore 404 — object already deleted / never existed.
  try {
    await (bucket as unknown as { file: (p: string) => { delete: (opts?: unknown) => Promise<unknown> } }).file(path).delete({ ignoreNotFound: true });
    return "deleted";
  } catch (e) {
    const err = e as { code?: number; message?: string };
    if (err.code === 404) return "already_gone";
    throw e;
  }
}

async function main() {
  initAdmin();
  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  const cutoffMs = daysAgoMs(DECLINED_APPLICATION_RETENTION_DAYS);
  const cutoffTs = admin.firestore.Timestamp.fromMillis(cutoffMs);

  // Firestore query: declined AND declinedAt <= cutoff AND NOT yet cleaned up
  // studentIdCleanedUp may be missing on older docs; treat missing as false.
  // Query with inequality on declinedAt requires Firestore composite index if combined with equality on status.
  const snap = await db
    .collection(AMBASSADOR_APPLICATIONS_COLLECTION)
    .where("status", "==", "declined")
    .where("declinedAt", "<=", cutoffTs)
    .get();

  console.log(`[cleanup] found ${snap.size} declined applications older than ${DECLINED_APPLICATION_RETENTION_DAYS} days`);

  let deleted = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as { studentIdStoragePath?: string; studentIdCleanedUp?: boolean };
    if (data.studentIdCleanedUp === true) {
      skipped += 1;
      continue;
    }
    try {
      if (data.studentIdStoragePath) {
        const result = await deleteStorageObjectSafe(bucket, data.studentIdStoragePath);
        console.log(`[cleanup] ${doc.id}: ${result} (${data.studentIdStoragePath})`);
      } else {
        console.log(`[cleanup] ${doc.id}: no studentIdStoragePath, marking cleaned`);
      }
      await doc.ref.update({
        studentIdCleanedUp: true,
        cleanedUpAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      deleted += 1;
    } catch (e) {
      errors += 1;
      console.error(`[cleanup] ${doc.id} error:`, e);
    }
  }

  console.log(`[cleanup] done. deleted=${deleted}, skipped=${skipped}, errors=${errors}`);
  if (errors > 0) process.exit(1);
}

main().catch((e) => {
  console.error("[cleanup] fatal", e);
  process.exit(1);
});
```

Notes:
- The script hardcodes the two constants (DECLINED_APPLICATION_RETENTION_DAYS, AMBASSADOR_APPLICATIONS_COLLECTION) rather than importing from `@/lib/ambassador/constants`. Why: scripts run via `tsx` in CI without full Next.js path resolution, and the existing scripts in `scripts/` follow this duplication-of-constants pattern. Keep in sync with a comment reminder.
- `ignoreNotFound: true` is the Firebase Admin Storage way to make delete idempotent — no explicit 404 catch needed in modern SDKs, but the outer try/catch handles any edge case.
- The Firestore query requires a composite index on `(status, declinedAt)`. If it doesn't exist, the first cron run will fail with a Firebase console link to create it. Document this in the SUMMARY.
- Exit code 1 on any error so GitHub Actions surfaces the failure.
  </action>
  <verify>
    <automated>npx tsc --noEmit scripts/cleanup-declined-application-media.ts 2>&1 | head -20</automated>
  </verify>
  <done>Script exists, typechecks, queries declined applications, deletes Storage objects idempotently, flags docs with studentIdCleanedUp + cleanedUpAt.</done>
  <acceptance_criteria>
    - `grep -q "status.*==.*declined" scripts/cleanup-declined-application-media.ts`
    - `grep -q "declinedAt.*<=" scripts/cleanup-declined-application-media.ts`
    - `grep -q "studentIdCleanedUp" scripts/cleanup-declined-application-media.ts`
    - `grep -q "ignoreNotFound" scripts/cleanup-declined-application-media.ts` (idempotent delete)
    - `grep -q "DECLINED_APPLICATION_RETENTION_DAYS" scripts/cleanup-declined-application-media.ts`
    - `grep -q "30" scripts/cleanup-declined-application-media.ts` (retention days value)
    - `grep -q "FIREBASE_SERVICE_ACCOUNT_KEY" scripts/cleanup-declined-application-media.ts`
    - `grep -q "admin.storage" scripts/cleanup-declined-application-media.ts`
    - `grep -q "process.exit" scripts/cleanup-declined-application-media.ts` (error exit)
  </acceptance_criteria>
</task>

<task type="auto" tdd="false">
  <name>Task 2: GitHub Actions workflow for weekly cleanup</name>
  <files>.github/workflows/cleanup-declined-application-media.yml</files>
  <read_first>
    - @.github/workflows/cleanup-archived-discord-channels.yml (reference workflow — MIRROR this shape)
    - @scripts/cleanup-declined-application-media.ts (script created in Task 1)
  </read_first>
  <action>
Create `.github/workflows/cleanup-declined-application-media.yml`:

```yaml
name: Cleanup Declined Application Media

on:
  schedule:
    # Weekly on Mondays at 04:00 UTC — matches RESEARCH.md Pattern 5
    - cron: '0 4 * * 1'
  workflow_dispatch: {}

jobs:
  cleanup:
    name: Delete declined student-ID photos older than 30 days
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install deps
        run: npm ci

      - name: Run cleanup
        run: npx tsx scripts/cleanup-declined-application-media.ts
        env:
          FIREBASE_SERVICE_ACCOUNT_KEY: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_KEY }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
```

Notes:
- Cron string `0 4 * * 1` = Mondays 04:00 UTC. Chosen to match existing archived-channels cleanup cadence from STATE.md.
- `workflow_dispatch: {}` allows manual runs from the Actions tab.
- All three secrets MUST be present in the repo settings. The executor should surface a warning if any of them is missing (via the pre-flight checkpoint in Task 4 below).
- `node-version: '20.x'` matches the existing cleanup-archived-discord-channels.yml — bump to match if that workflow has moved to newer Node.
  </action>
  <verify>
    <automated>test -f .github/workflows/cleanup-declined-application-media.yml && cat .github/workflows/cleanup-declined-application-media.yml | grep -E "^(on:|jobs:|      - cron:|.*FIREBASE_SERVICE_ACCOUNT_KEY)"</automated>
  </verify>
  <done>Workflow file exists, schedules weekly cron + workflow_dispatch, injects Firebase secrets, runs the script via tsx.</done>
  <acceptance_criteria>
    - `test -f .github/workflows/cleanup-declined-application-media.yml`
    - `grep -q "cron:.*0 4 \* \* 1" .github/workflows/cleanup-declined-application-media.yml`
    - `grep -q "workflow_dispatch" .github/workflows/cleanup-declined-application-media.yml`
    - `grep -q "FIREBASE_SERVICE_ACCOUNT_KEY" .github/workflows/cleanup-declined-application-media.yml`
    - `grep -q "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" .github/workflows/cleanup-declined-application-media.yml`
    - `grep -q "npx tsx scripts/cleanup-declined-application-media.ts" .github/workflows/cleanup-declined-application-media.yml`
    - `grep -q "actions/checkout@v4" .github/workflows/cleanup-declined-application-media.yml`
    - `grep -q "actions/setup-node@v4" .github/workflows/cleanup-declined-application-media.yml`
  </acceptance_criteria>
</task>

<task type="checkpoint:decision" gate="blocking">
  <name>Task 3: Pre-flight decision — AMBASSADOR_DISCORD_MIN_AGE_DAYS (7 vs 30)</name>
  <files>src/lib/ambassador/constants.ts</files>
  <decision>Set the Discord membership age threshold for ambassador applications.</decision>
  <context>
Per D-03, `AMBASSADOR_DISCORD_MIN_AGE_DAYS` is a named constant so the threshold can be changed without a codebase search. Plan 01 set it to the spec default of 30. This is the decision gate before Phase 2 goes live.

**Why this matters:** The constant gates Step 1 of the apply wizard (Plan 07 EligibilityStep). Setting it to 30 matches the original spec; setting it to 7 makes the program more accessible during the first cohort when the community is still small.

**Current value:** `AMBASSADOR_DISCORD_MIN_AGE_DAYS = 30` in `src/lib/ambassador/constants.ts`.

**What this task does:** Once the human picks a value, the executor updates `src/lib/ambassador/constants.ts` to the chosen value. No other files change (every caller imports the constant — that's the point of D-03).
  </context>
  <options>
    <option id="option-a">
      <name>30 days (spec default)</name>
      <pros>Matches the original spec; higher signal that applicants are committed community members; aligns with other ambassador programs in the ecosystem.</pros>
      <cons>Blocks enthusiastic early members of the server (first cohort especially).</cons>
    </option>
    <option id="option-b">
      <name>7 days (lower friction)</name>
      <pros>More accessible for first cohort; still filters out same-day sign-ups; can be raised later without a new decision (just update the constant).</pros>
      <cons>Less filtering — applicants may have <1 week of community context.</cons>
    </option>
  </options>
  <action>
PAUSE for the human's choice (option-a = 30, option-b = 7). Once signalled, executor updates `src/lib/ambassador/constants.ts`:

```typescript
// Change this line:
export const AMBASSADOR_DISCORD_MIN_AGE_DAYS = 30;
// To match the user's decision (30 or 7).
```

Then commit with message: `chore(02-09): set AMBASSADOR_DISCORD_MIN_AGE_DAYS to <chosen value> per pre-flight decision`.
  </action>
  <verify>
    <automated>grep -qE "AMBASSADOR_DISCORD_MIN_AGE_DAYS = (7|30);" src/lib/ambassador/constants.ts</automated>
  </verify>
  <done>Constant is set to the human's chosen value (7 or 30) and committed.</done>
  <resume-signal>Select: option-a (30 days) or option-b (7 days)</resume-signal>
  <acceptance_criteria>
    - After human confirms: `grep -qE "AMBASSADOR_DISCORD_MIN_AGE_DAYS = (7|30);" src/lib/ambassador/constants.ts`
    - The chosen value matches the human's selection (verify in the commit diff)
  </acceptance_criteria>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 4: Pre-flight Discord role creation + DISCORD_AMBASSADOR_ROLE_ID replacement</name>
  <files>src/lib/discord.ts</files>
  <what-built>The Discord Ambassador role must be created in the CWA Discord server, its ID copied, and the Plan 01 placeholder (`DISCORD_AMBASSADOR_ROLE_ID = "PENDING_DISCORD_ROLE_CREATION"`) replaced with the real ID.

This is one of the few genuine `checkpoint:human-action` cases — only a Discord server admin logged into the Discord web/desktop UI can create a role and copy its ID. There is no bot API to create the role in this specific server without OAuth scope that we don't currently hold.</what-built>
  <how-to-verify>
1. **Open Discord.** In the Code With Ahsan server → Server Settings → Roles → Create Role.
2. **Name the role** `Ambassador` (exact spelling). Give it a distinct color (purple is suggested to match the ambassador program branding).
3. **Set role permissions.** Minimal permissions — the role is for visibility / gating, not moderation. Grant only:
   - Read Message History (already default)
   - Add Reactions (already default)
4. **Copy the role ID.** Developer Mode must be on (Discord Settings → Advanced → Developer Mode). Right-click the role → "Copy Role ID".
5. **Also check for GitHub Actions secrets.** In the GitHub repo settings → Secrets and variables → Actions, confirm these secrets exist:
   - `FIREBASE_SERVICE_ACCOUNT_KEY`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   If any are missing, the Task 2 workflow will fail. Add them from existing Firebase admin setup.
6. **Paste the role ID into the resume signal.** Format: `role-id: <numeric-discord-role-id>` (a 17–19 digit number).
  </how-to-verify>
  <action>
PAUSE for the human to create the role in Discord and reply with the numeric role ID. Once signalled, executor updates two files:

**File 1: `src/lib/discord.ts`** — replace the placeholder.

```typescript
// Change:
export const DISCORD_AMBASSADOR_ROLE_ID = "PENDING_DISCORD_ROLE_CREATION";
// To:
export const DISCORD_AMBASSADOR_ROLE_ID = "<role-id-from-human>";
```

**File 2: (verification only)** Run `grep -r "PENDING_DISCORD_ROLE_CREATION" src/` — should return no matches. If it still appears anywhere, update those too.

Then commit with: `chore(02-09): set DISCORD_AMBASSADOR_ROLE_ID to real Discord role ID per pre-flight checkpoint`.

**IMPORTANT:** Do NOT commit the role ID if it is still the placeholder. If the human cannot provide a real ID, this task remains blocked and Plan 06's accept flow will fail at first acceptance.
  </action>
  <verify>
    <automated>grep -qE "DISCORD_AMBASSADOR_ROLE_ID = \"[0-9]{17,19}\"" src/lib/discord.ts && ! grep -rq "PENDING_DISCORD_ROLE_CREATION" src/</automated>
  </verify>
  <done>DISCORD_AMBASSADOR_ROLE_ID is a real 17–19 digit numeric ID, no PENDING_DISCORD_ROLE_CREATION placeholder remains in src/, and the three GitHub Actions secrets are confirmed present.</done>
  <resume-signal>Reply with: `role-id: <id>` (17–19 digit Discord role ID).  
If you cannot provide an ID, reply `blocked: <reason>` and this phase will not ship until resolved.</resume-signal>
  <acceptance_criteria>
    - After human provides id: `grep -qE "DISCORD_AMBASSADOR_ROLE_ID = \"[0-9]{17,19}\"" src/lib/discord.ts`
    - `grep -q "PENDING_DISCORD_ROLE_CREATION" src/` returns 0 matches (entire src/ tree clean)
    - The GitHub Actions secrets are confirmed present (trust the human's statement; no programmatic check)
  </acceptance_criteria>
</task>

</tasks>

<verification>
```bash
# Script typechecks independently
npx tsc --noEmit

# Workflow is syntactically valid YAML
npx --yes yaml-lint .github/workflows/cleanup-declined-application-media.yml 2>/dev/null || \
  python3 -c "import yaml; yaml.safe_load(open('.github/workflows/cleanup-declined-application-media.yml'))"

# Pre-flight constants are set (not placeholders)
grep "AMBASSADOR_DISCORD_MIN_AGE_DAYS" src/lib/ambassador/constants.ts
grep "DISCORD_AMBASSADOR_ROLE_ID" src/lib/discord.ts
! grep -q "PENDING_DISCORD_ROLE_CREATION" src/
```

Manual smoke (after Task 3 + Task 4 complete):
1. Trigger the workflow manually via `gh workflow run cleanup-declined-application-media.yml` — should succeed with no declined apps present.
2. Seed a declined application with `declinedAt` 31 days ago and a valid `studentIdStoragePath` → run workflow manually → Storage object deleted, doc flagged `studentIdCleanedUp: true, cleanedUpAt: <now>`.
3. Re-run workflow → same doc skipped (`studentIdCleanedUp === true`).
4. Trigger apply wizard Step 1 as a young account → block message uses the correct threshold (7 or 30).
5. Accept a test application → Discord role assignment uses the real role ID, not the placeholder.
</verification>

<success_criteria>
- [ ] `scripts/cleanup-declined-application-media.ts` queries declined+old applications, deletes their student-ID Storage objects, flags docs as cleaned (REVIEW-04).
- [ ] `.github/workflows/cleanup-declined-application-media.yml` runs the script weekly + allows manual trigger.
- [ ] Workflow mirrors the shape of the existing cleanup-archived-discord-channels.yml workflow.
- [ ] `AMBASSADOR_DISCORD_MIN_AGE_DAYS` is set to either 7 or 30 per the human's decision (not a placeholder).
- [ ] `DISCORD_AMBASSADOR_ROLE_ID` is set to a real numeric Discord role ID (not `"PENDING_DISCORD_ROLE_CREATION"`).
- [ ] No file in `src/` contains the string `PENDING_DISCORD_ROLE_CREATION` after Task 4 completes.
- [ ] Phase 2 is ready to ship — feature flag can be flipped on.
</success_criteria>

<output>
After completion, create `.planning/phases/02-application-subsystem/02-09-SUMMARY.md` with:
- The REVIEW-04 cleanup cron is live and scheduled weekly.
- The chosen `AMBASSADOR_DISCORD_MIN_AGE_DAYS` value (7 or 30) and rationale.
- The real `DISCORD_AMBASSADOR_ROLE_ID` (or a marker confirming it was set — but do NOT log the actual id in the summary since summary docs are checked in).
- Reminder that the Firestore composite index `(status ASC, declinedAt ASC)` may need to be created from the Firebase console on first cron run.
- Phase 2 ship gate cleared — toggle `FEATURE_AMBASSADOR_PROGRAM=true` in production env vars.
</output>
