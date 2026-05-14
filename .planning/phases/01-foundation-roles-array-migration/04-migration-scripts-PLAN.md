---
phase: 01-foundation-roles-array-migration
plan: 04
title: Data backfill + custom-claims sync scripts
type: execute
wave: 2
depends_on: [01]
files_modified:
  - scripts/migrate-roles-to-array.ts
  - scripts/sync-custom-claims.ts
  - package.json
autonomous: true
requirements:
  - ROLE-03
  - ROLE-05
deploy: "#2 and #2.5 (data backfill first, then claims sync — per D-15 ordering)"
must_haves:
  truths:
    - "scripts/migrate-roles-to-array.ts paginates every mentorship_profiles doc, derives roles[] from legacy role field (filtering null/empty), writes it back idempotently"
    - "Script supports --dry-run (no writes), --limit=N (bounded paginated run for staging verification), and default full run"
    - "Script never writes roles containing null or empty string (per PITFALLS.md §Pitfall 2 invariant)"
    - "Re-running the migration script after a successful run produces zero writes (idempotency)"
    - "scripts/sync-custom-claims.ts reads every migrated doc and calls admin.auth().setCustomUserClaims(uid, { ...existing, roles, admin }) with a rate-limited pagination loop"
    - "Claims sync preserves any existing custom claims on the auth user (reads current claims, merges, writes)"
    - "Both scripts log a clear final report (total scanned, updated, skipped, errors)"
    - "Both scripts exit 0 on success and non-zero on any unhandled error"
  artifacts:
    - path: scripts/migrate-roles-to-array.ts
      provides: "Idempotent Firestore backfill that populates mentorship_profiles.roles from legacy role field"
    - path: scripts/sync-custom-claims.ts
      provides: "Firebase Auth custom claims sync reading migrated docs as source of truth for roles + admin"
    - path: package.json
      provides: "npm run scripts for dry-run and apply invocations"
      contains: "migrate-roles-to-array"
  key_links:
    - from: scripts/migrate-roles-to-array.ts
      to: "mentorship_profiles collection"
      via: "admin.firestore().collection('mentorship_profiles') with paginated startAfter cursor"
      pattern: "mentorship_profiles"
    - from: scripts/sync-custom-claims.ts
      to: "Firebase Auth custom claims"
      via: "admin.auth().setCustomUserClaims(uid, claims)"
      pattern: "setCustomUserClaims"
---

<objective>
Ship the two backfill scripts that make the v5→v6 data shape transition safe and reversible: `scripts/migrate-roles-to-array.ts` (populates the `roles: string[]` array on every mentorship_profiles doc, idempotent + dry-run capable) and `scripts/sync-custom-claims.ts` (reads the now-migrated docs and sets Firebase Auth custom claims for `roles` + `admin` so `firestore.rules` can check claims directly).

Purpose: Implements ROLE-03 (data backfill) and ROLE-05 server side (claim sync). Honors D-13 (claim sync is active, not dormant), D-15 (data first, claims second — roles-array is source of truth), and PITFALLS §Pitfall 2 (never write null/empty into the roles array).
Output: Two runnable TypeScript scripts + npm script entries in package.json.
Deploy: These scripts ARE Deploy #2 and #2.5 (run as GitHub Actions or manual tsx invocation against prod; no code change ships until rules flip).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@scripts/set-admin-flag.js
@src/types/mentorship.ts
</context>

<interfaces>
<!-- Existing pattern from scripts/set-admin-flag.js — follow this shape for env loading + firebase-admin init -->

```javascript
// scripts/set-admin-flag.js reference (DO NOT MODIFY):
require("dotenv").config({ path: ".env.local" });
const admin = require("firebase-admin");
// Init from FIREBASE_SERVICE_ACCOUNT_KEY (JSON string) OR FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
```

<!-- New scripts use TypeScript (.ts) and npx tsx invocation — per STATE.md workflow note -->

Firestore shape AFTER Plan 01:
```typescript
interface MentorshipProfile {
  uid: string;
  role?: MentorshipRole;  // legacy: "mentor" | "mentee" | null
  roles: Role[];          // NEW required field — what the migration populates
  isAdmin?: boolean;
  // ...
}
```

Firebase Auth custom claims shape AFTER sync:
```typescript
// admin.auth().getUser(uid).customClaims
{
  role?: string;      // legacy claim (still set during dual-claim window per D-13)
  roles: string[];    // NEW authoritative claim
  admin?: boolean;    // unchanged
  // other pre-existing custom claims preserved
}
```
</interfaces>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create scripts/migrate-roles-to-array.ts — paginated idempotent Firestore backfill with dry-run and filtering</name>
  <files>scripts/migrate-roles-to-array.ts, package.json</files>
  <read_first>
    - scripts/set-admin-flag.js (env loading pattern, service account init, logger usage)
    - scripts/sync-winners-to-hashnode.ts (if exists, for tsx pagination pattern) OR any other scripts/*.ts for the typed Firestore access pattern
    - src/lib/firebaseAdmin.ts (confirm the server-side admin SDK init location — reuse if exported, else inline the same init in the script)
    - src/lib/logger.ts (Winston logger usage for structured output)
    - package.json (read the existing "scripts" block so new entries append cleanly and don't clobber existing keys; also confirm tsx is in devDependencies)
    - .planning/research/PITFALLS.md §Pitfall 2 (Backfill data-loss) — MUST read; the null/empty-filter is the core defense here
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §decisions D-15 (backfill ordering)
  </read_first>
  <action>
    Create `scripts/migrate-roles-to-array.ts`. Use EXACTLY this structure. Critical invariants: (a) idempotent — re-running does nothing, (b) filters null/empty — never writes `[null]` or `[""]`, (c) dry-run mode, (d) paginated — supports arbitrarily large collections.

    ```typescript
    /**
     * scripts/migrate-roles-to-array.ts
     *
     * Deploy #2 of the roles-array migration (per D-15 in 01-CONTEXT.md).
     * Populates mentorship_profiles.roles from the legacy single-role field.
     *
     * Idempotent: re-running produces zero writes once all docs have roles populated.
     * Dry-run supported: --dry-run prints what WOULD be written, makes no changes.
     * Paginated: --limit=N bounds a staging/smoke run. Default = full collection.
     *
     * Invariant (PITFALLS.md §Pitfall 2): never writes null or empty string into the
     * roles array. A doc with role === null becomes roles: []. A doc with
     * role === "mentor" becomes roles: ["mentor"].
     *
     * Usage:
     *   npx tsx scripts/migrate-roles-to-array.ts --dry-run
     *   npx tsx scripts/migrate-roles-to-array.ts --limit=100
     *   npx tsx scripts/migrate-roles-to-array.ts          # full run
     */

    import "dotenv/config";
    import * as admin from "firebase-admin";

    const COLLECTION = "mentorship_profiles";
    const PAGE_SIZE = 200;

    // Re-create the same canonical role set as src/types/mentorship.ts RoleSchema.
    // Intentionally duplicated (not imported) so a scripts run doesn't drag the whole
    // Next.js tsconfig path-mapping chain behind it. Keep in sync manually — the
    // RoleSchema is the authority; this list is defensive filtering.
    const VALID_ROLES = new Set(["mentor", "mentee", "ambassador", "alumni-ambassador"]);

    function initAdmin(): void {
      if (admin.apps.length > 0) return;
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountJson) {
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
        });
        return;
      }
      if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          }),
        });
        return;
      }
      throw new Error(
        "Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_KEY or the FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY trio in .env.local."
      );
    }

    interface CliArgs {
      dryRun: boolean;
      limit: number | null;
    }

    function parseArgs(argv: string[]): CliArgs {
      const args: CliArgs = { dryRun: false, limit: null };
      for (const a of argv.slice(2)) {
        if (a === "--dry-run") args.dryRun = true;
        else if (a.startsWith("--limit=")) args.limit = parseInt(a.split("=")[1], 10);
      }
      return args;
    }

    /**
     * Derive the `roles` array from a doc's legacy `role` field.
     * Returns [] when role is null/undefined/empty/not-in-VALID_ROLES.
     * NEVER returns an array containing null or "".
     */
    function deriveRoles(legacyRole: unknown): string[] {
      if (typeof legacyRole !== "string") return [];
      if (legacyRole === "") return [];
      if (!VALID_ROLES.has(legacyRole)) return []; // defensive: skip unknown values
      return [legacyRole];
    }

    async function run(): Promise<void> {
      const { dryRun, limit } = parseArgs(process.argv);
      initAdmin();
      const db = admin.firestore();

      let totalScanned = 0;
      let totalWouldUpdate = 0;
      let totalUpdated = 0;
      let totalSkippedAlreadyMigrated = 0;
      let totalErrors = 0;

      let lastSnap: FirebaseFirestore.QueryDocumentSnapshot | null = null;

      while (true) {
        let q = db.collection(COLLECTION).orderBy("__name__").limit(PAGE_SIZE);
        if (lastSnap) q = q.startAfter(lastSnap);
        const page = await q.get();
        if (page.empty) break;

        for (const doc of page.docs) {
          totalScanned++;
          if (limit !== null && totalScanned > limit) break;

          const data = doc.data();
          const existingRoles = data.roles;
          const legacyRole = data.role;

          // Idempotency gate: if roles is ALREADY an array, skip (even if empty).
          if (Array.isArray(existingRoles)) {
            totalSkippedAlreadyMigrated++;
            continue;
          }

          const derived = deriveRoles(legacyRole);

          if (dryRun) {
            totalWouldUpdate++;
            console.log(`[DRY-RUN] ${doc.id}: role=${JSON.stringify(legacyRole)} -> roles=${JSON.stringify(derived)}`);
            continue;
          }

          try {
            await doc.ref.update({ roles: derived });
            totalUpdated++;
          } catch (err) {
            totalErrors++;
            console.error(`[ERROR] ${doc.id}:`, err instanceof Error ? err.message : err);
          }
        }

        if (limit !== null && totalScanned >= limit) break;
        lastSnap = page.docs[page.docs.length - 1];
        if (page.size < PAGE_SIZE) break;
      }

      console.log("\n=== Migration report ===");
      console.log(`Mode:                   ${dryRun ? "DRY-RUN" : "APPLY"}`);
      console.log(`Total scanned:          ${totalScanned}`);
      console.log(`Already migrated:       ${totalSkippedAlreadyMigrated}`);
      console.log(`${dryRun ? "Would update" : "Updated"}:          ${dryRun ? totalWouldUpdate : totalUpdated}`);
      console.log(`Errors:                 ${totalErrors}`);

      if (totalErrors > 0) process.exit(1);
    }

    run().catch((err) => {
      console.error("Fatal:", err);
      process.exit(1);
    });
    ```

    Then edit `package.json` — inside the `"scripts"` object add these three entries (append; preserve all existing entries):

    ```json
    "migrate-roles:dry-run": "tsx scripts/migrate-roles-to-array.ts --dry-run",
    "migrate-roles": "tsx scripts/migrate-roles-to-array.ts",
    "migrate-roles:limit-10": "tsx scripts/migrate-roles-to-array.ts --limit=10"
    ```

    The `limit-10` variant is for the smoke-test-in-prod validation step before running the full migration. Do NOT add a separate script for `--limit=N` with N as a placeholder — keep the three-variant pattern simple.

    Do NOT touch any other `package.json` field. Do NOT introduce new npm dependencies — firebase-admin and tsx are already installed.
  </action>
  <verify>
    <automated>ls scripts/migrate-roles-to-array.ts &amp;&amp; npx tsc --noEmit scripts/migrate-roles-to-array.ts 2>&amp;1 | head -20 ; grep -c "migrate-roles" package.json</automated>
  </verify>
  <acceptance_criteria>
    - `ls scripts/migrate-roles-to-array.ts` returns the path
    - `grep -c 'const COLLECTION = "mentorship_profiles"' scripts/migrate-roles-to-array.ts` returns `1`
    - `grep -c 'VALID_ROLES = new Set\(\["mentor", "mentee", "ambassador", "alumni-ambassador"\]\)' scripts/migrate-roles-to-array.ts` returns `1`
    - `grep -c "function deriveRoles" scripts/migrate-roles-to-array.ts` returns `1`
    - `grep -c "if (typeof legacyRole !== \"string\") return \[\]" scripts/migrate-roles-to-array.ts` returns `1` (null-filter invariant)
    - `grep -c "Array.isArray(existingRoles)" scripts/migrate-roles-to-array.ts` returns `1` (idempotency gate)
    - `grep -c '"migrate-roles:dry-run"' package.json` returns `1`
    - `grep -c '"migrate-roles"' package.json` returns at least `1`
    - `npx tsc --noEmit scripts/migrate-roles-to-array.ts` (or `npx tsc --noEmit` if the script's already in tsconfig include) reports no errors originating from this file
    - DRY-RUN sanity check (requires valid credentials — skip if running in CI without prod creds): `npm run migrate-roles:limit-10 -- --dry-run 2>&amp;1 | grep -E "DRY-RUN|Migration report" | head -5` prints a report footer
  </acceptance_criteria>
  <done>
    scripts/migrate-roles-to-array.ts exists, idempotently populates the roles array, filters null/empty correctly, supports --dry-run and --limit=N, and logs a clear report. package.json has three npm script entries for invocation.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create scripts/sync-custom-claims.ts — reads migrated docs, sets Auth custom claims, preserves existing claims</name>
  <files>scripts/sync-custom-claims.ts, package.json</files>
  <read_first>
    - scripts/migrate-roles-to-array.ts (your Task 1 output — same init + pagination pattern)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §decisions D-13, D-14, D-15 (claims strategy, claim-refresh timing, backfill ordering)
    - .planning/research/ARCHITECTURE.md §custom-claims strategy (dual-claim window, merge-don't-replace when writing custom claims)
    - Firebase Admin SDK docs — the `setCustomUserClaims` behavior: it REPLACES the claims object entirely (does NOT merge). Therefore this script MUST read existing claims first, merge, then write.
  </read_first>
  <action>
    Create `scripts/sync-custom-claims.ts`. Same pagination pattern as Task 1, but operates on `admin.auth()` not `admin.firestore()` alone — each doc's uid becomes an Auth user lookup + custom claims write.

    ```typescript
    /**
     * scripts/sync-custom-claims.ts
     *
     * Deploy #2.5 of the roles-array migration (per D-15 in 01-CONTEXT.md).
     * Reads the now-migrated mentorship_profiles.roles as the source of truth and
     * synchronizes each Firebase Auth user's custom claims to match.
     *
     * Preserves existing custom claims (does NOT replace the whole claims object).
     * setCustomUserClaims in the Admin SDK replaces the claims atomically — so this
     * script reads the user's current claims, merges roles + admin from Firestore,
     * and writes back.
     *
     * Keeps the legacy `role` claim populated during the dual-claim window so
     * firestore.rules can evaluate both claim shapes (per D-13). The legacy claim is
     * dropped in Deploy #5's cleanup PR.
     *
     * Idempotent: re-running with unchanged Firestore produces zero writes (detects
     * when the auth user's current claims already match the desired shape and skips).
     *
     * Usage:
     *   npx tsx scripts/sync-custom-claims.ts --dry-run
     *   npx tsx scripts/sync-custom-claims.ts --limit=100
     *   npx tsx scripts/sync-custom-claims.ts
     */

    import "dotenv/config";
    import * as admin from "firebase-admin";

    const COLLECTION = "mentorship_profiles";
    const PAGE_SIZE = 100;   // smaller than migration — auth.getUser is per-user RPC
    const RATE_DELAY_MS = 50; // conservative throttle for Firebase Auth API quota

    function initAdmin(): void {
      if (admin.apps.length > 0) return;
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountJson) {
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
        });
        return;
      }
      if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          }),
        });
        return;
      }
      throw new Error("Missing Firebase credentials — see scripts/migrate-roles-to-array.ts header comment.");
    }

    interface CliArgs {
      dryRun: boolean;
      limit: number | null;
    }

    function parseArgs(argv: string[]): CliArgs {
      const args: CliArgs = { dryRun: false, limit: null };
      for (const a of argv.slice(2)) {
        if (a === "--dry-run") args.dryRun = true;
        else if (a.startsWith("--limit=")) args.limit = parseInt(a.split("=")[1], 10);
      }
      return args;
    }

    /**
     * Return true if current claims already match the target roles + admin + legacy-role shape.
     * If true, skip the setCustomUserClaims call (idempotency).
     */
    function claimsMatchTarget(
      current: Record<string, unknown> | undefined,
      targetRoles: string[],
      targetAdmin: boolean
    ): boolean {
      if (!current) return false;
      const currentRoles = Array.isArray(current.roles) ? (current.roles as string[]) : null;
      if (!currentRoles) return false;
      if (currentRoles.length !== targetRoles.length) return false;
      for (const r of targetRoles) if (!currentRoles.includes(r)) return false;
      if ((current.admin === true) !== targetAdmin) return false;
      // Legacy-role claim: during dual-claim window, the legacy role claim should mirror the first role in targetRoles (or be absent if roles is empty)
      const expectedLegacyRole = targetRoles[0] ?? undefined;
      if (current.role !== expectedLegacyRole) return false;
      return true;
    }

    async function sleep(ms: number): Promise<void> {
      return new Promise((r) => setTimeout(r, ms));
    }

    async function run(): Promise<void> {
      const { dryRun, limit } = parseArgs(process.argv);
      initAdmin();
      const db = admin.firestore();
      const auth = admin.auth();

      let totalScanned = 0;
      let totalWouldUpdate = 0;
      let totalUpdated = 0;
      let totalSkippedAlreadyInSync = 0;
      let totalSkippedNoAuthUser = 0;
      let totalErrors = 0;

      let lastSnap: FirebaseFirestore.QueryDocumentSnapshot | null = null;

      while (true) {
        let q = db.collection(COLLECTION).orderBy("__name__").limit(PAGE_SIZE);
        if (lastSnap) q = q.startAfter(lastSnap);
        const page = await q.get();
        if (page.empty) break;

        for (const doc of page.docs) {
          totalScanned++;
          if (limit !== null && totalScanned > limit) break;

          const data = doc.data();
          const roles: string[] = Array.isArray(data.roles) ? data.roles : [];
          const isAdminFlag: boolean = data.isAdmin === true;

          let userRecord: admin.auth.UserRecord;
          try {
            userRecord = await auth.getUser(doc.id);
          } catch (err: unknown) {
            // user-not-found is expected for deleted users that still have profile docs
            if (err instanceof Error && /no user record/i.test(err.message)) {
              totalSkippedNoAuthUser++;
              continue;
            }
            totalErrors++;
            console.error(`[ERROR] auth.getUser(${doc.id}):`, err instanceof Error ? err.message : err);
            continue;
          }

          if (claimsMatchTarget(userRecord.customClaims, roles, isAdminFlag)) {
            totalSkippedAlreadyInSync++;
            continue;
          }

          // Merge: preserve any other custom claims we don't own.
          const merged: Record<string, unknown> = {
            ...(userRecord.customClaims ?? {}),
            roles,
            role: roles[0] ?? null, // legacy claim — removed in Deploy #5
            admin: isAdminFlag,
          };

          if (dryRun) {
            totalWouldUpdate++;
            console.log(`[DRY-RUN] ${doc.id}: claims -> ${JSON.stringify({ roles, admin: isAdminFlag })}`);
            continue;
          }

          try {
            await auth.setCustomUserClaims(doc.id, merged);
            totalUpdated++;
            await sleep(RATE_DELAY_MS);
          } catch (err) {
            totalErrors++;
            console.error(`[ERROR] setCustomUserClaims(${doc.id}):`, err instanceof Error ? err.message : err);
          }
        }

        if (limit !== null && totalScanned >= limit) break;
        lastSnap = page.docs[page.docs.length - 1];
        if (page.size < PAGE_SIZE) break;
      }

      console.log("\n=== Claims sync report ===");
      console.log(`Mode:                   ${dryRun ? "DRY-RUN" : "APPLY"}`);
      console.log(`Total scanned:          ${totalScanned}`);
      console.log(`Already in sync:        ${totalSkippedAlreadyInSync}`);
      console.log(`No auth user:           ${totalSkippedNoAuthUser}`);
      console.log(`${dryRun ? "Would update" : "Updated"}:          ${dryRun ? totalWouldUpdate : totalUpdated}`);
      console.log(`Errors:                 ${totalErrors}`);

      if (totalErrors > 0) process.exit(1);
    }

    run().catch((err) => {
      console.error("Fatal:", err);
      process.exit(1);
    });
    ```

    Then edit `package.json` — append three more npm script entries next to the migrate-roles ones:

    ```json
    "sync-claims:dry-run": "tsx scripts/sync-custom-claims.ts --dry-run",
    "sync-claims": "tsx scripts/sync-custom-claims.ts",
    "sync-claims:limit-10": "tsx scripts/sync-custom-claims.ts --limit=10"
    ```

    Do NOT change the firebase-admin version or any other package.json field.

    Anti-pattern to AVOID: calling `setCustomUserClaims(uid, { roles, admin })` WITHOUT the `...userRecord.customClaims` spread. Admin SDK REPLACES the claims object atomically — if you drop any pre-existing claim (e.g., the manual `admin: true` that was set via Firebase Console), you'll clobber auth for that user. The merge is load-bearing, and the test for that is the presence of the spread operator in the grep acceptance.
  </action>
  <verify>
    <automated>ls scripts/sync-custom-claims.ts &amp;&amp; npx tsc --noEmit scripts/sync-custom-claims.ts 2>&amp;1 | head -20 ; grep -c "sync-claims" package.json</automated>
  </verify>
  <acceptance_criteria>
    - `ls scripts/sync-custom-claims.ts` returns the path
    - `grep -c "setCustomUserClaims" scripts/sync-custom-claims.ts` returns at least `1`
    - `grep -c "...userRecord.customClaims" scripts/sync-custom-claims.ts` returns `1` (merge pattern present — prevents clobbering existing claims)
    - `grep -c "function claimsMatchTarget" scripts/sync-custom-claims.ts` returns `1` (idempotency gate present)
    - `grep -c "role: roles\[0\] ?? null" scripts/sync-custom-claims.ts` returns `1` (legacy claim kept during dual-claim window per D-13)
    - `grep -c "no user record" scripts/sync-custom-claims.ts` returns `1` (handles orphaned profile docs)
    - `grep -c '"sync-claims:dry-run"' package.json` returns `1`
    - `grep -c '"sync-claims"' package.json` returns at least `1`
    - `npx tsc --noEmit scripts/sync-custom-claims.ts` reports no errors from this file
    - DRY-RUN sanity check if prod creds available: `npm run sync-claims:limit-10 -- --dry-run 2>&amp;1 | grep -E "DRY-RUN|Claims sync report" | head -5` prints a report footer
  </acceptance_criteria>
  <done>
    scripts/sync-custom-claims.ts exists, reads migrated Firestore docs as source of truth, merges (does not replace) existing custom claims, writes roles + admin + legacy-role claims, supports --dry-run and --limit. package.json has three invocation scripts.
  </done>
</task>

</tasks>

<verification>
- Dry-run both scripts against staging (or a local emulator with seed data): both print clear reports and no errors.
- Inspect a sample doc after migrate-roles-to-array.ts runs: `roles` field present, correctly derived from legacy `role`, no `null`/`""` in the array.
- Inspect a sample auth user after sync-custom-claims.ts runs: `customClaims.roles` matches the Firestore doc's `roles` array, `customClaims.admin` matches `isAdmin`, any pre-existing custom claims still present.
- Both scripts re-run cleanly with zero writes after their first successful run (idempotency).
</verification>

<success_criteria>
- [x] scripts/migrate-roles-to-array.ts backfills `roles` from `role` with null/empty-filter + idempotency gate + dry-run + --limit support
- [x] scripts/sync-custom-claims.ts reads migrated docs as source of truth, merges (not replaces) existing claims, dry-run + limit + idempotency
- [x] package.json has six new npm script entries for invocation
- [x] Neither script introduces new runtime dependencies (firebase-admin + tsx already installed)
- [x] Both scripts handle orphaned users (profile doc exists, auth user deleted) gracefully
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-roles-array-migration/01-04-SUMMARY.md` documenting:
- The exact VALID_ROLES set the script filters against
- Confirmation that roles array is never populated with null/empty
- The merge pattern used in sync-custom-claims.ts (reproduce the spread expression)
- The six npm script entries added to package.json
- A note on how to test these in dry-run mode against staging before running prod
</output>
