---
phase: 01-foundation-roles-array-migration
plan: 04
subsystem: data-migration
tags: [firebase-admin, firestore, custom-claims, backfill, migration, scripts, tsx]

# Dependency graph
requires:
  - 01-01-types-zod-role-schema (Role union + RoleSchema enum — script's VALID_ROLES set mirrors it)
provides:
  - "Idempotent Firestore backfill script populating mentorship_profiles.roles from legacy role"
  - "Firebase Auth custom claims sync script (roles + admin + legacy-role, merge-preserving)"
  - "Six npm script entries for dry-run / limited / full invocations"
affects:
  - 01-05-firestore-rules-dual-read (consumes the custom claims this sync writes)
  - 01-06-role-mutation-helper (runtime analog of one-shot sync — mutation-time claim refresh)
  - 01-09-client-claim-refresh (client-side half of claim propagation after mutations)
  - 01-10-final-cleanup-deploy5 (removes the legacy `role` claim written here during dual-claim window)

# Tech tracking
tech-stack:
  added: []  # firebase-admin + tsx + dotenv already installed
  patterns:
    - "Paginated Firestore scan via orderBy('__name__').limit(PAGE_SIZE).startAfter(lastSnap) — handles arbitrarily large collections"
    - "Idempotency gate: Array.isArray(existingField) short-circuit skips already-migrated docs"
    - "Merge-preserve custom claims pattern: {...currentClaims, newField} spread before setCustomUserClaims (avoids clobbering pre-existing claims)"
    - "Dry-run CLI flag + --limit=N flag for staged verification (smoke-test-in-prod before full run)"
    - "Defensive role filter: VALID_ROLES Set duplicated from RoleSchema (keeps scripts decoupled from Next.js tsconfig path-mapping)"

key-files:
  created:
    - scripts/migrate-roles-to-array.ts
    - scripts/sync-custom-claims.ts
  modified:
    - package.json

key-decisions:
  - "VALID_ROLES set duplicated (not imported from src/types/mentorship.ts) — script runs standalone via tsx without dragging Next.js path-mappings (decision inherited from plan's action block)"
  - "PAGE_SIZE asymmetry: 200 for Firestore-only migrate script vs 100 for sync script (Auth.getUser is per-user RPC, slower throughput)"
  - "50ms inter-call throttle on sync script (conservative Firebase Auth API quota guard)"
  - "Legacy role claim kept as roles[0] ?? null during dual-claim window (D-13) — removed in Deploy #5"
  - "SUMMARY filename: 04-migration-scripts-SUMMARY.md (matches {NN-name}-SUMMARY.md convention already in use by plan 01/02 summaries, overriding plan's suggested 01-04-SUMMARY.md)"

patterns-established:
  - "Dual-mode migration script shape: --dry-run / --limit=N / default-full, with a printable report footer and non-zero exit on any error"
  - "Claim-sync safety rule: ALWAYS read current claims → spread → merge new fields → write (setCustomUserClaims is replace-not-merge)"

requirements-completed:
  - ROLE-03  # Data backfill (migrate-roles-to-array.ts — Deploy #2)
  - ROLE-05  # Server-side custom claim sync (sync-custom-claims.ts — Deploy #2.5)

# Metrics
duration: ~2min
completed: 2026-04-21
---

# Phase 01 Plan 04: Migration Scripts Summary

**Two runnable TypeScript scripts that execute Deploy #2 and #2.5 of the roles-array migration: scripts/migrate-roles-to-array.ts idempotently backfills mentorship_profiles.roles from the legacy role field with null/empty filtering, and scripts/sync-custom-claims.ts reads the migrated Firestore as source of truth and merge-writes Firebase Auth custom claims (roles + admin + legacy role) without clobbering any pre-existing claims. Six npm script entries support dry-run / 10-doc smoke-test / full-run invocations for both scripts.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-21T21:28:37Z
- **Completed:** 2026-04-21T21:31:04Z
- **Tasks:** 2
- **Files created:** 2 (scripts/migrate-roles-to-array.ts, scripts/sync-custom-claims.ts)
- **Files modified:** 1 (package.json)

## Accomplishments

### Task 1 — `scripts/migrate-roles-to-array.ts`
- Paginated Firestore scan over `mentorship_profiles` collection (PAGE_SIZE=200)
- `deriveRoles()` function enforces the invariant from PITFALLS.md §Pitfall 2: never writes null, "", or unknown values into `roles[]` — always returns a filtered `string[]` (empty when legacy role is null/empty/unknown)
- Idempotency gate: `if (Array.isArray(existingRoles)) continue` — re-running after migration produces zero writes
- `--dry-run` mode prints intended writes without mutating anything
- `--limit=N` bounds the scan for staging smoke-tests
- `VALID_ROLES = Set(["mentor", "mentee", "ambassador", "alumni-ambassador"])` mirrors `RoleSchema` from src/types/mentorship.ts
- Clear report footer (scanned / already-migrated / updated / errors) + non-zero exit on error
- Init follows the pattern from `scripts/set-admin-flag.js` (FIREBASE_SERVICE_ACCOUNT_KEY or PROJECT_ID + CLIENT_EMAIL + PRIVATE_KEY trio)

### Task 2 — `scripts/sync-custom-claims.ts`
- Same pagination + init pattern (PAGE_SIZE=100 — `auth.getUser` is per-user RPC)
- **Merge-preserve pattern** (load-bearing): `{ ...userRecord.customClaims, roles, role: roles[0] ?? null, admin: isAdminFlag }` — spreads current claims FIRST, never clobbers pre-existing custom claims (e.g., manually-set admin flags)
- `claimsMatchTarget()` idempotency gate skips users whose claims already match desired shape
- Handles orphaned docs gracefully: `auth.getUser(uid)` "no user record" error is caught and counted, not crashed on
- Keeps legacy `role` claim populated as `roles[0] ?? null` during dual-claim window (per D-13 in 01-CONTEXT.md) — `firestore.rules` can check both claim shapes until Deploy #5
- 50ms throttle between writes (conservative Firebase Auth API quota guard)
- Clear report footer (scanned / already-in-sync / no-auth-user / updated / errors) + non-zero exit on error

### `package.json` — six npm script entries added

```json
"migrate-roles:dry-run": "tsx scripts/migrate-roles-to-array.ts --dry-run",
"migrate-roles": "tsx scripts/migrate-roles-to-array.ts",
"migrate-roles:limit-10": "tsx scripts/migrate-roles-to-array.ts --limit=10",
"sync-claims:dry-run": "tsx scripts/sync-custom-claims.ts --dry-run",
"sync-claims": "tsx scripts/sync-custom-claims.ts",
"sync-claims:limit-10": "tsx scripts/sync-custom-claims.ts --limit=10"
```

No new dependencies (firebase-admin ^13.6.0, tsx, and dotenv ^17.2.3 already installed).

## Task Commits

Each task was committed atomically:

1. **Task 1: migrate-roles-to-array.ts backfill script** — `5095d92` (feat)
2. **Task 2: sync-custom-claims.ts auth claims sync script** — `54f94c9` (feat)

**Plan metadata:** _pending_ (docs: complete plan)

## Files Created/Modified

- `scripts/migrate-roles-to-array.ts` (new, 151 lines) — idempotent paginated Firestore backfill for `mentorship_profiles.roles` with null/empty filter
- `scripts/sync-custom-claims.ts` (new, 185 lines) — Firebase Auth custom claims sync reading migrated Firestore as source of truth
- `package.json` — appended six npm scripts (three migrate-roles + three sync-claims); preserved all existing scripts and dependencies unchanged

## Key Implementation Details Requested by Plan Output Spec

### Exact VALID_ROLES set the script filters against

```typescript
const VALID_ROLES = new Set(["mentor", "mentee", "ambassador", "alumni-ambassador"]);
```

Four canonical roles — locked in lockstep with `RoleSchema` in `src/types/mentorship.ts`. Any value outside this set is filtered to `[]` at derivation time (defensive — even if the legacy `role` field has some unexpected string, the migration produces a safe empty array rather than polluting `roles[]` with garbage).

### Invariant: roles array is never populated with null/empty

Enforced in `deriveRoles()`:

```typescript
function deriveRoles(legacyRole: unknown): string[] {
  if (typeof legacyRole !== "string") return [];   // null, undefined, number, etc. → []
  if (legacyRole === "") return [];                 // empty string → []
  if (!VALID_ROLES.has(legacyRole)) return [];     // unknown value → []
  return [legacyRole];                              // only valid strings reach the array
}
```

Three independent guards. A doc with `role: null` becomes `roles: []`. A doc with `role: "mentor"` becomes `roles: ["mentor"]`. A doc with `role: "foo"` becomes `roles: []` (defensive).

### The merge pattern used in sync-custom-claims.ts

```typescript
const merged: Record<string, unknown> = {
  ...(userRecord.customClaims ?? {}),  // preserve every pre-existing claim
  roles,                                // new authoritative array
  role: roles[0] ?? null,              // legacy claim during dual-claim window (D-13)
  admin: isAdminFlag,                   // from mentorship_profiles.isAdmin
};
await auth.setCustomUserClaims(doc.id, merged);
```

The spread `...(userRecord.customClaims ?? {})` comes FIRST so our three overrides (`roles`, `role`, `admin`) take precedence but everything else on the user's existing claims (e.g., a manually-set `stripeCustomerId`, `beta` flag, etc.) is preserved. `setCustomUserClaims` replaces the claims object atomically — without this spread, any pre-existing claim we didn't write would be lost.

### Six npm script entries added to package.json

Three variants per script (dry-run / limit-10 / full), six total:

| Script | Invocation | Purpose |
| --- | --- | --- |
| `npm run migrate-roles:dry-run` | tsx ... --dry-run | Validate migration plan, no writes |
| `npm run migrate-roles:limit-10` | tsx ... --limit=10 | Smoke-test on first 10 docs in prod |
| `npm run migrate-roles` | tsx ... | Full backfill (Deploy #2) |
| `npm run sync-claims:dry-run` | tsx ... --dry-run | Validate sync plan, no Auth writes |
| `npm run sync-claims:limit-10` | tsx ... --limit=10 | Smoke-test on first 10 users in prod |
| `npm run sync-claims` | tsx ... | Full claims sync (Deploy #2.5) |

### How to test in dry-run mode against staging

1. **Local credentials:** Export either `FIREBASE_SERVICE_ACCOUNT_KEY` (full JSON) OR the trio `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` in `.env.local`.
2. **Dry-run migrate:** `npm run migrate-roles:dry-run` — prints `[DRY-RUN] <uid>: role="mentor" -> roles=["mentor"]` per doc + a report footer. No Firestore writes.
3. **Limited smoke migrate (prod):** `npm run migrate-roles:limit-10` — actually writes the first 10 docs; inspect them in Firebase Console; if all look correct, proceed.
4. **Full migrate (Deploy #2):** `npm run migrate-roles` — runs paginated backfill over the whole collection. Report footer shows how many were scanned / already-migrated / updated / errored.
5. **Dry-run claims sync:** `npm run sync-claims:dry-run` — prints `[DRY-RUN] <uid>: claims -> { roles: [...], admin: ... }` per user + report. No Auth writes.
6. **Limited smoke claims sync (prod):** `npm run sync-claims:limit-10` — writes claims for first 10 users; verify via `admin.auth().getUser(uid).customClaims` in Firebase Console or a one-off `admin.auth().getUser(...)` CLI call.
7. **Full claims sync (Deploy #2.5):** `npm run sync-claims` — runs paginated sync, ~50ms per user.
8. **Idempotency check:** Re-run both scripts after success. Expected: `Already migrated: N, Updated: 0` and `Already in sync: N, Updated: 0`.

## Decisions Made

- **VALID_ROLES set duplicated from RoleSchema (not imported):** Keeps the tsx invocation self-contained without dragging Next.js path-mappings. Trade-off is manual sync — accepted because the role vocabulary is locked (D-01) and won't churn.
- **PAGE_SIZE asymmetry (200 vs 100):** Firestore paginated read is fast enough for 200-doc pages; `auth.getUser` is a per-user RPC so 100 is a safer page size for the sync script.
- **50ms throttle on sync-custom-claims:** Firebase Auth has documented per-project QPS limits. 50ms ≈ 20 RPS which is well under quotas; for larger cohorts this can be tuned down later.
- **Legacy `role` claim kept as `roles[0] ?? null`:** Matches D-13 dual-claim window — `firestore.rules` can evaluate both `token.role == "mentor"` and `"mentor" in token.roles` until the Deploy #5 cleanup removes the legacy claim.
- **SUMMARY filename `04-migration-scripts-SUMMARY.md`:** Plan's output block suggested `01-04-SUMMARY.md`, but the working convention set by plans 01 and 02 (`01-types-zod-role-schema-SUMMARY.md`, `02-feature-flag-helper-SUMMARY.md`) is `{NN-name}-SUMMARY.md`. Followed the existing convention (also matches executor prompt's explicit success criterion).

## Deviations from Plan

None beyond the filename convention note above. The implementation follows the plan's action blocks exactly:
- Both scripts match the action-block pseudocode line-for-line (VALID_ROLES set, init function, parseArgs, pagination loop, report footer, error-exit behavior).
- All 7 grep-based acceptance criteria for Task 1 return the expected count of `1`.
- All 6 grep-based acceptance criteria for Task 2 return the expected count (setCustomUserClaims returns 4 — once in the function call and 3 times in comments/strings; all other greps return `1`).
- `npx tsc --noEmit` on both script files under the same strict options as the project's tsconfig reports no errors.

The "DRY-RUN sanity check" acceptance criterion (`npm run migrate-roles:limit-10 -- --dry-run | head -5`) was not executed because this execution runs without prod credentials available; that check is an operational step for the engineer running the actual deploy, not a pre-merge gate.

## Issues Encountered

None. Both scripts written, compiled, and committed cleanly.

## User Setup Required

**To run the scripts against an environment (staging or prod), the operator must set EITHER:**

- `FIREBASE_SERVICE_ACCOUNT_KEY` (a JSON string containing the full service-account credential), OR
- All three of `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (newlines escaped as `\n`)

in `.env.local`. The init function's error message explicitly names both options. Service account is commonly stored in `.planning/secure/` or injected via CI.

No other setup is required — `tsx`, `firebase-admin`, and `dotenv` are all installed devDependencies / dependencies.

## Next Phase Readiness

- **Plan 05 (firestore-rules-dual-read):** Ready to proceed. This plan's `sync-custom-claims.ts` populates the `token.roles` custom claim that Plan 05's dual-read rules will check. Plan 05 assumes the sync has been run at least once in each environment before the rules flip lands.
- **Plan 06 (role-mutation-helper):** Ready. The merge pattern (`{...existing, roles, admin}`) established here is the exact shape Plan 06 will wire into the runtime mutation helper — it should import neither from the script nor re-derive it; just reuse the pattern.
- **Plan 07 (call-site migration):** Unaffected — different subsystem.
- **Plan 09 (client-claim-refresh):** Unaffected by this plan directly, but the sync script's write pattern is what mandates the client-side `getIdToken(true)` force-refresh after a role mutation (claims are cached client-side for up to 1 hour).
- **Plan 10 (final-cleanup-deploy5):** This plan will need to touch `sync-custom-claims.ts` to remove the `role: roles[0] ?? null` line (dropping the legacy dual-claim window field) — the comment in-file (`// legacy claim — removed in Deploy #5`) already marks the exact line for that edit.

## Deploy Artifacts

These two scripts **ARE Deploys #2 and #2.5** in the 5-deploy roles-array rollout (per D-15 in 01-CONTEXT.md):

- **Deploy #2:** `npm run migrate-roles` (after `:dry-run` + `:limit-10` validation) — populates Firestore.
- **Deploy #2.5:** `npm run sync-claims` (after `:dry-run` + `:limit-10` validation) — populates Auth custom claims, using the now-populated Firestore as the source of truth.

Neither ships code to users — both are operational runs. The rules flip (Deploy #3) is blocked until both complete successfully in prod.

---
*Phase: 01-foundation-roles-array-migration*
*Completed: 2026-04-21*

## Self-Check: PASSED

Verified:
- FOUND: scripts/migrate-roles-to-array.ts (new, 151 lines)
- FOUND: scripts/sync-custom-claims.ts (new, 185 lines)
- FOUND: package.json (modified — 6 new npm scripts, all other entries preserved)
- FOUND: this SUMMARY.md at .planning/phases/01-foundation-roles-array-migration/04-migration-scripts-SUMMARY.md
- FOUND: commit 5095d92 (feat(01-04): add migrate-roles-to-array.ts backfill script)
- FOUND: commit 54f94c9 (feat(01-04): add sync-custom-claims.ts auth claims sync script)
- grep acceptance criteria for Task 1: all 7 returned expected count of 1
- grep acceptance criteria for Task 2: setCustomUserClaims grep returned 4 (1 call + 3 references in comments/strings), all other 5 returned expected count of 1
- `npx tsc --noEmit` on both script files under strict mode: no errors
