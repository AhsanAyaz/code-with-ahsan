---
phase: 01-foundation-roles-array-migration
plan: 10
title: Final cleanup — drop legacy role field, flip rules to array-only (Deploy #5)
type: execute
wave: 5
depends_on: [05, 06, 07, 08, 09]
files_modified:
  - src/types/mentorship.ts
  - src/lib/permissions.ts
  - src/__tests__/permissions.test.ts
  - src/app/api/mentorship/profile/route.ts
  - src/lib/ambassador/roleMutation.ts
  - scripts/sync-custom-claims.ts
  - scripts/drop-legacy-role-field.ts
  - firestore.rules
  - package.json
autonomous: false
requirements:
  - ROLE-04
deploy: "#5 (manual close of dual-claim window — per D-16, held until prod verification gates pass)"
must_haves:
  truths:
    - "All five human gates are satisfied before this plan's tasks run: (a) ≥2 weeks have elapsed since the rules dual-read deploy, (b) zero permission-denied errors in Vercel logs over ≥2 weeks of dual-claim window, (c) 100% of mentorship_profiles docs have roles field populated, (d) 100% of active Firebase Auth users have roles custom claim, (e) no call sites outside src/lib/permissions.ts and src/types/mentorship.ts still read the legacy role field"
    - "`MentorshipRole` type export is deleted from src/types/mentorship.ts"
    - "`role` field on MentorshipProfile is deleted (both the optional field and every write path)"
    - "`role?: MentorshipRole` is deleted from PermissionUser in src/lib/permissions.ts"
    - "Dual-read fallback `?? profile.role === role` is deleted from hasRole/hasAnyRole/hasAllRoles (helpers read only from profile.roles)"
    - "Dual-claim fallback `?? token.role === role` is deleted from hasRoleClaim/hasAnyRoleClaim/hasAllRoleClaimsClaim"
    - "firestore.rules isAcceptedMentor() drops the `token.role == \"mentor\"` arm, reads only from `token.roles`"
    - "scripts/sync-custom-claims.ts stops writing the legacy `role` claim (only writes `roles` + `admin`)"
    - "src/lib/ambassador/roleMutation.ts stops writing the legacy `role` claim"
    - "A one-shot cleanup script scripts/drop-legacy-role-field.ts removes the now-stale legacy field from every Firestore doc AND from every auth user's custom claims"
    - "Test fixtures in permissions.test.ts drop the legacy `role:` field (roles-array-only)"
    - "Zod schemas stop accepting `role: RoleSchema.optional()` (field removed)"
  artifacts:
    - path: src/types/mentorship.ts
      provides: "Clean post-migration type definitions — no MentorshipRole, no MentorshipProfile.role"
    - path: firestore.rules
      provides: "Array-only isAcceptedMentor helper"
    - path: scripts/drop-legacy-role-field.ts
      provides: "One-shot cleanup of stale legacy fields (Firestore docs + Auth claims)"
  key_links:
    - from: src/lib/permissions.ts
      to: "profile.roles only (no legacy fallback)"
      via: "return !!profile && profile.roles.includes(role)"
      pattern: "profile\\.roles\\.includes\\(role\\)"
---

<objective>
Close the dual-claim migration window by removing every legacy-compatibility bridge that was intentionally left during Plans 01-09: the `MentorshipRole` type, the optional `role` field on `MentorshipProfile` and `PermissionUser`, the dual-read fallback in helpers, the dual-claim arm in firestore.rules, the legacy-role custom claim writes, the legacy-role column in Firestore docs (removed by a cleanup script), and the legacy fixture shape in tests. After this plan, the roles-array is the sole source of truth everywhere.

Purpose: Implements the final arm of ROLE-04 (rules become array-only) and completes the migration's endgame per D-16 (manual close of dual-claim window after explicit "all clear" verification across five gates).
Output: ~8 touched files + a one-shot cleanup script + a checkpoint task that gates on the human verification.
Deploy: Deploy #5. `autonomous: false` because the first task is a mandatory human-verify checkpoint per D-16.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@src/types/mentorship.ts
@src/lib/permissions.ts
@src/__tests__/permissions.test.ts
@firestore.rules
</context>

<interfaces>
Current state of the migration at Plan 10's start (post-Plans 01-09):

- `src/types/mentorship.ts`: exports both `Role` (new) and `MentorshipRole` (legacy).
- `MentorshipProfile`: has both `role?: MentorshipRole` (legacy, optional) and `roles: Role[]` (new, required).
- `PermissionUser`: has both `role: MentorshipRole` (legacy, required — narrower than Profile) and `roles?: Role[]` (new, optional).
- `hasRole` etc.: dual-read fallback `profile.roles?.includes(role) ?? profile.role === role`.
- Claim-side helpers: dual-claim fallback `token.roles?.includes(role) ?? token.role === role`.
- `firestore.rules` isAcceptedMentor: dual-claim `token.role == "mentor" || "mentor" in token.roles`.
- `sync-custom-claims.ts` and `roleMutation.ts` BOTH write `role: roles[0] ?? null` claim alongside the new `roles` array claim.
- Every Firestore doc has both `role` (legacy) and `roles` (array) fields populated.
- 95+ test fixtures have both `role: "mentor"` and `roles: ["mentor"]` shapes.

Target end state:

- `MentorshipRole` type: DELETED.
- `MentorshipProfile.role`: DELETED.
- `PermissionUser.role`: DELETED, `roles: Role[]` now required (not optional).
- Helpers read only `profile.roles.includes(role)` — no `??` fallback.
- Claim helpers read only `token.roles.includes(role)` — no `??` fallback.
- `firestore.rules` isAcceptedMentor reads only `"mentor" in request.auth.token.roles && token.status == "accepted"`.
- Scripts and roleMutation write only `{ roles, admin }` — no legacy `role` claim.
- `scripts/drop-legacy-role-field.ts` runs once in prod to delete `role` from every Firestore doc + strip the legacy claim from every Auth user.
- Test fixtures drop `role:` (roles-only shape).
</interfaces>

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 0 (CHECKPOINT): Verify all five dual-claim close gates have been met</name>
  <files>.planning/phases/01-foundation-roles-array-migration/01-10-SUMMARY.md</files>
  <what-built>
    Deploys #1 through #4 have shipped. The migration is now in the dual-claim window. Per D-16 in 01-CONTEXT.md, Plan 10 MUST NOT proceed until five verification gates pass. This checkpoint halts execution until the user confirms all five — or reports findings that require a return to Plan 04 (claims sync) or Plan 07 (call-site) fixes.
  </what-built>
  <action>
    This is a human-verification checkpoint — NO automated changes. Pause execution and present the five gates below to the user. Wait for an explicit "all five gates pass" resume signal before moving to Task 1. If ANY gate fails, return a CHECKPOINT INCONCLUSIVE status to the orchestrator with the failing gate details, and do not proceed. See <how-to-verify> for the verification steps.
  </action>
  <how-to-verify>
    Confirm EACH of these five gates in sequence. Do not proceed with Plan 10 tasks until all five are met.

    **Gate 1 — Dual-claim window duration:**
    At least 2 weeks have elapsed since the rules dual-read was deployed (the `firestore.rules` change from Plan 05 / Deploy #3). Check the commit date of the rules file in git:
    ```bash
    git log -1 --format="%ai" firestore.rules
    ```
    If the resulting date is less than 14 days ago, STOP and resume later. Per D-16, research recommended >=2-week minimum and we close manually.

    **Gate 2 — Zero permission-denied errors:**
    Review Vercel logs (or Firebase Firestore audit logs) for the last 2 weeks. Confirm ZERO `PERMISSION_DENIED` errors correlated with `mentorship_profiles` writes, roadmap creates, or any rule that uses `isAcceptedMentor`. The Vercel logs URL: https://vercel.com/<org>/<project>/logs — filter by "PERMISSION_DENIED".

    If any are found, STOP and investigate. Likely causes:
    - A user's ID token still has stale claims (cache longer than 1hr — rare but possible if the client doesn't call getIdToken(true) after mutations).
    - An API route not yet migrated still reads `token.role`.
    - A client-side Firestore read uses rules with the token before Plan 09's client refresh landed.

    **Gate 3 — 100% docs migrated:**
    Confirm EVERY mentorship_profiles doc has the `roles` field populated:
    ```bash
    npx tsx scripts/migrate-roles-to-array.ts --dry-run
    ```
    Expected output: `Would update: 0` — no doc is missing the roles field. If any remain, STOP, run the migration in apply mode, then return here.

    **Gate 4 — 100% active users have roles claim:**
    Confirm EVERY active Firebase Auth user has the `roles` custom claim:
    ```bash
    npx tsx scripts/sync-custom-claims.ts --dry-run
    ```
    Expected output: `Would update: 0` or small residual (only orphaned / test users). If a non-trivial number remain, STOP, run sync in apply mode, then return here.

    **Gate 5 — Zero direct legacy-role reads outside exception files:**
    Confirm the codebase does not read `.role === "..."` anywhere except the intentional two files:
    ```bash
    grep -rEn --include="*.ts" --include="*.tsx" "\??\.role\s*===" src/ \
      | grep -v "\.roles" \
      | grep -v "src/lib/permissions.ts" \
      | grep -v "src/types/mentorship.ts"
    ```
    Expected output: EMPTY. If any lines appear, STOP and re-run Plan 07 to cover them.

    Record the verification evidence (screenshots / command outputs / dates) in the SUMMARY for this plan.
  </how-to-verify>
  <verify>
    Human-verified only — no automated check. The human confirms all five gates pass and signals resume. Evidence (dates, log excerpts, grep outputs, script dry-run reports) is captured in 01-10-SUMMARY.md.
  </verify>
  <done>
    User has replied "all five gates pass — proceed with Plan 10 cleanup" AND the verification evidence for each of the five gates is recorded in 01-10-SUMMARY.md. Any other reply pauses the plan.
  </done>
  <resume-signal>
    Reply with one of:
    - "all five gates pass — proceed with Plan 10 cleanup"
    - "Gate N failed because <reason>; returning to <plan> to fix"
    - "extending dual-claim window by <days> days — pausing Plan 10"

    Only the first signal continues execution. The others pause the plan.
  </resume-signal>
</task>

<task type="auto" tdd="false">
  <name>Task 1: Remove MentorshipRole and role field from types + helpers + tests + Zod schemas</name>
  <files>src/types/mentorship.ts, src/lib/permissions.ts, src/__tests__/permissions.test.ts, src/lib/validation/mentorship.ts (if exists), src/app/api/mentorship/profile/route.ts</files>
  <read_first>
    - src/types/mentorship.ts (Plan 01 output + whatever accreted since)
    - src/lib/permissions.ts (Plan 03 output — the six helpers with dual-read)
    - src/__tests__/permissions.test.ts (Plan 08 output — dual-shape fixtures)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §decisions D-06 (dual-read removal trigger), D-16 (manual close gate — all FIVE gates)
  </read_first>
  <action>
    Execute in this exact order to keep TypeScript happy at every intermediate step:

    **Step 1 — Drop dual-read fallback from hasRole / hasAnyRole / hasAllRoles (src/lib/permissions.ts):**

    Replace the body of `hasRole`:
    ```typescript
    // BEFORE:
    if (!profile) return false;
    return profile.roles?.includes(role) ?? profile.role === role;

    // AFTER:
    if (!profile) return false;
    return profile.roles.includes(role);
    ```

    Similarly strip the legacy fallback from hasAnyRole and hasAllRoles:
    ```typescript
    // hasAnyRole AFTER:
    if (!profile) return false;
    if (roles.length === 0) return false;
    return roles.some((r) => profile.roles.includes(r));

    // hasAllRoles AFTER:
    if (!profile) return false;
    if (roles.length === 0) return true;
    return roles.every((r) => profile.roles.includes(r));
    ```

    **Step 2 — Drop dual-claim fallback from hasRoleClaim / hasAnyRoleClaim / hasAllRoleClaimsClaim:**

    Same transformation for each — strip the `?? token.role === role` / `token.role !== null` fallback arms. Helpers now read only from `token.roles`.

    **Step 3 — Remove PermissionUser.role (keep roles required):**

    In `src/lib/permissions.ts` change:
    ```typescript
    // BEFORE:
    export interface PermissionUser {
      uid: string;
      role: MentorshipRole;
      roles?: Role[];
      status: MentorshipStatus;
      isAdmin?: boolean;
      // ...
    }

    // AFTER:
    export interface PermissionUser {
      uid: string;
      roles: Role[];
      status: MentorshipStatus;
      isAdmin?: boolean;
      // ...
    }
    ```

    Remove the `MentorshipRole` import at the top of permissions.ts.

    **Step 4 — Remove MentorshipRole + MentorshipProfile.role (src/types/mentorship.ts):**

    Delete the line:
    ```typescript
    export type MentorshipRole = "mentor" | "mentee" | null;
    ```

    Delete the `role?: MentorshipRole;` line from `MentorshipProfile`. Make `roles: Role[];` required (no change; it was already required per Plan 01).

    **Step 5 — Update Zod schemas (src/lib/validation/mentorship.ts, if exists, and any inline schemas in route.ts):**

    Find and remove `role: RoleSchema.optional(),` entries. The schema now expects only `roles: z.array(RoleSchema).default([])` (or `.min(0)` — default is equivalent).

    **Step 6 — Strip legacy role field from API write payloads (src/app/api/mentorship/profile/route.ts):**

    Find every `{ role: "...", roles: [...] }` object literal in the profile POST/PUT/PATCH handlers and remove the `role: "..."` entry. The write payload is now roles-array-only.

    **Step 7 — Migrate test fixtures (src/__tests__/permissions.test.ts):**

    Delete the `role: "..."` line from every fixture object (the `roles: [...]` line stays). Example:
    ```typescript
    // BEFORE:
    const mentor: PermissionUser = { uid: "u1", role: "mentor", roles: ["mentor"], status: "accepted", isAdmin: false };
    // AFTER:
    const mentor: PermissionUser = { uid: "u1", roles: ["mentor"], status: "accepted", isAdmin: false };
    ```

    Also delete the fixture that specifically tested legacy-fallback (`legacyOnlyProfile` in the hasRole describe block from Plan 08). Delete the associated it() block too — that test case is no longer valid. Record the deleted test count in the SUMMARY.

    **Step 8 — Run tsc and fix residual breakage:**

    `npx tsc --noEmit` — iterate until zero errors. Residual errors are likely:
    - Call sites that still reference `MentorshipRole` type (these should have been cleaned in Plan 07 but some niche cases like prop types may have been missed).
    - Test fixtures for OTHER test files (not permissions.test.ts) that still carry `role:`.
    - Storybook stories / fixture files (if present) that still use the legacy shape.

    Fix each — no `any` casts, no `@ts-ignore`.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&amp;1 | tee /tmp/tsc-plan-10-step-1.log | wc -l ; grep -c "MentorshipRole" src/types/mentorship.ts ; grep -c "??  profile.role" src/lib/permissions.ts</automated>
  </verify>
  <acceptance_criteria>
    - `npx tsc --noEmit 2>&1` exits 0 (zero errors)
    - `grep -c "MentorshipRole" src/types/mentorship.ts` returns `0` (type deleted)
    - `grep -rc "MentorshipRole" src/` returns `0` (type removed from every importer)
    - `grep -c "role?: MentorshipRole" src/types/mentorship.ts` returns `0`
    - `grep -Ec "profile\.roles\?\.includes\(role\) \?\? profile\.role" src/lib/permissions.ts` returns `0` (dual-read fallback gone)
    - `grep -Ec "token\.roles\?\.includes\(role\) \?\? token\.role" src/lib/permissions.ts` returns `0` (dual-claim fallback gone)
    - `grep -c "role: \"mentor\"" src/__tests__/permissions.test.ts` returns `0` OR very few matches (only if the fixtures legitimately need a `role:` field for a REASON other than the legacy shape — none are expected)
    - `grep -c "role:" src/__tests__/permissions.test.ts` returns a number less than before (fixtures shrank)
    - `npm test` exits 0 — all tests pass after fixture migration
    - `grep -c "RoleSchema.optional" src/lib/validation/mentorship.ts 2>/dev/null` returns `0` (if the file exists; ignore if not)
  </acceptance_criteria>
  <done>
    MentorshipRole type deleted. MentorshipProfile.role and PermissionUser.role deleted. hasRole family reads only from roles array (no dual-read). Test fixtures migrated. TypeScript compiles clean. npm test passes.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Flip firestore.rules to array-only, strip legacy-role claim writes from scripts and roleMutation</name>
  <files>firestore.rules, scripts/sync-custom-claims.ts, src/lib/ambassador/roleMutation.ts</files>
  <read_first>
    - firestore.rules (Plan 05 output — dual-claim isAcceptedMentor)
    - scripts/sync-custom-claims.ts (Plan 04 output — writes legacy role claim)
    - src/lib/ambassador/roleMutation.ts (Plan 06 output — writes legacy role claim)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §decisions D-13, D-16
    - .planning/research/PITFALLS.md §Pitfall 1 (rules-vs-app deploy race — this is the final arm of the bridge removal)
  </read_first>
  <action>
    **Step 1 — firestore.rules:**

    Update `isAcceptedMentor()` to drop the legacy arm:
    ```javascript
    // BEFORE (dual-claim):
    function isAcceptedMentor() {
      return request.auth != null
        && (
          request.auth.token.role == "mentor"
          || ("roles" in request.auth.token && "mentor" in request.auth.token.roles)
        )
        && request.auth.token.status == "accepted";
    }

    // AFTER (array-only):
    function isAcceptedMentor() {
      return request.auth != null
        && "roles" in request.auth.token
        && "mentor" in request.auth.token.roles
        && request.auth.token.status == "accepted";
    }
    ```

    Keep the `"roles" in request.auth.token` existence guard — even array-only rules crash on missing fields if you skip the guard.

    **Step 2 — scripts/sync-custom-claims.ts:**

    Actively strip the legacy `role` claim from every user's existing customClaims. Use destructure-and-drop:

    ```typescript
    // AFTER:
    const priorClaims = userRecord.customClaims ?? {};
    // Firebase custom claims API does not accept FieldValue sentinels — destructure to drop the field.
    const { role: _legacyRole, ...preserved } = priorClaims;
    const merged: Record<string, unknown> = {
      ...preserved,
      roles,
      admin: isAdminFlag,
    };
    await auth.setCustomUserClaims(uid, merged);
    ```

    Also update `claimsMatchTarget` to no longer require the legacy `role` claim to match — it's actively dropped now:
    ```typescript
    // Remove this line from the match check:
    // if (current.role !== expectedLegacyRole) return false;
    ```

    **Step 3 — src/lib/ambassador/roleMutation.ts:**

    Mirror the same changes: strip the legacy `role` claim, actively destructure-and-drop it from existing claims:

    ```typescript
    // Inside syncRoleClaim:
    const existing = userRecord.customClaims ?? {};
    // Firebase custom claims API does not accept FieldValue sentinels — destructure to drop the field.
    const { role: _legacyRole, ...preserved } = existing;
    const merged: Record<string, unknown> = {
      ...preserved,
      roles: input.roles,
      admin: input.admin,
    };
    ```

    Remove the line `role: input.roles[0] ?? null,` — it no longer has any legitimate place.

    **Step 4 — Deploy ordering note:**

    This task's three file changes ship as a single Deploy #5 PR. The deploy order within #5 is:
    1. Merge/push this commit.
    2. CI runs unit tests + rules lint.
    3. Deploy the app (Vercel) first — now the app writes only array claims.
    4. Wait 30-60s for the app deploy to propagate.
    5. Deploy firestore.rules second — the rules flip to array-only AFTER the app stops writing the legacy claim, so there's never a window where the rules expect array-only but the app still writes legacy-only.

    Include this ordering in the task's commit message or the plan's SUMMARY so whoever ships #5 knows the sequence.

    The deploy ordering is critical — see PITFALLS.md §Pitfall 1 for the rules-vs-app race analysis.
  </action>
  <verify>
    <automated>grep -c 'request.auth.token.role == "mentor"' firestore.rules ; grep -c 'role: roles\[0\]' scripts/sync-custom-claims.ts ; grep -c 'role: input.roles\[0\]' src/lib/ambassador/roleMutation.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'request.auth.token.role == "mentor"' firestore.rules` returns `0` (legacy arm deleted)
    - `grep -c '"mentor" in request.auth.token.roles' firestore.rules` returns `1` (array-only arm preserved)
    - `grep -c '"roles" in request.auth.token' firestore.rules` returns `1` (existence guard preserved)
    - `grep -c "role: roles\[0\]" scripts/sync-custom-claims.ts` returns `0` (legacy claim write removed)
    - `grep -c "role: input.roles\[0\]" src/lib/ambassador/roleMutation.ts` returns `0` (legacy claim write removed)
    - `grep -c "role: _legacyRole, ...preserved" scripts/sync-custom-claims.ts` returns `1` (active strip pattern present)
    - `grep -c "role: _legacyRole, ...preserved" src/lib/ambassador/roleMutation.ts` returns `1` (same pattern in the runtime helper)
    - `grep -c "FieldValue.delete" scripts/sync-custom-claims.ts` returns `0` (confusion-avoidance check — FieldValue.delete() is NOT valid for custom claims)
    - `grep -c "FieldValue.delete" src/lib/ambassador/roleMutation.ts` returns `0` (same)
    - `firebase deploy --only firestore:rules --dry-run` exits 0
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    firestore.rules array-only. sync-custom-claims.ts and roleMutation.ts both actively strip the legacy `role` claim from existing customClaims using the destructure-and-drop pattern (NOT FieldValue.delete() — that sentinel is not supported by the custom-claims API). Deploy ordering documented for #5.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Create scripts/drop-legacy-role-field.ts and wire npm scripts for it</name>
  <files>scripts/drop-legacy-role-field.ts, package.json</files>
  <read_first>
    - scripts/migrate-roles-to-array.ts (Plan 04 — pagination pattern + init pattern, reuse)
    - scripts/sync-custom-claims.ts (Plan 04 — claims-side pattern)
    - .planning/research/PITFALLS.md §Pitfall 2 (backfill data loss — mirror the defensive style here)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §decisions D-15 (backfill ordering — this is the REVERSE, strip-only flow)
  </read_first>
  <action>
    Create `scripts/drop-legacy-role-field.ts`. This is a one-shot script that runs AFTER Task 2 has been deployed — its job is to physically remove the stale legacy `role` field from every mentorship_profiles doc AND strip the legacy `role` claim from any Auth user whose claims weren't touched by the newer sync-custom-claims.ts run.

    ```typescript
    /**
     * scripts/drop-legacy-role-field.ts
     *
     * One-shot cleanup (Deploy #5). Removes the legacy `role` field from every
     * mentorship_profiles doc AND strips the legacy `role` claim from every Auth user.
     *
     * Runs AFTER firestore.rules array-only flip + app deploy (Plan 10 Task 2).
     *
     * Idempotent: re-running with unchanged state produces zero writes.
     * Dry-run supported.
     *
     * Usage:
     *   npx tsx scripts/drop-legacy-role-field.ts --dry-run
     *   npx tsx scripts/drop-legacy-role-field.ts --limit=100
     *   npx tsx scripts/drop-legacy-role-field.ts
     */

    import "dotenv/config";
    import * as admin from "firebase-admin";
    import { FieldValue } from "firebase-admin/firestore";

    const COLLECTION = "mentorship_profiles";
    const PAGE_SIZE = 200;
    const RATE_DELAY_MS = 50;

    function initAdmin(): void {
      if (admin.apps.length > 0) return;
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountJson) {
        admin.initializeApp({ credential: admin.credential.cert(JSON.parse(serviceAccountJson)) });
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
      throw new Error("Missing Firebase credentials. See scripts/migrate-roles-to-array.ts header.");
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

    async function sleep(ms: number): Promise<void> {
      return new Promise((r) => setTimeout(r, ms));
    }

    async function run(): Promise<void> {
      const { dryRun, limit } = parseArgs(process.argv);
      initAdmin();
      const db = admin.firestore();
      const auth = admin.auth();

      let totalScanned = 0;
      let totalDocsUpdated = 0;
      let totalClaimsUpdated = 0;
      let totalSkippedCleanAlready = 0;
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
          const hasLegacyRoleField = Object.prototype.hasOwnProperty.call(data, "role");

          // 1. Firestore doc cleanup — remove the legacy `role` field if present.
          // FieldValue.delete() IS valid here — Firestore documents (unlike custom claims) support it.
          if (hasLegacyRoleField) {
            if (dryRun) {
              console.log(`[DRY-RUN] doc ${doc.id}: would delete legacy role field (current value: ${JSON.stringify(data.role)})`);
            } else {
              try {
                await doc.ref.update({ role: FieldValue.delete() });
                totalDocsUpdated++;
              } catch (err) {
                totalErrors++;
                console.error(`[ERROR] doc.update(${doc.id}):`, err instanceof Error ? err.message : err);
              }
            }
          }

          // 2. Auth claims cleanup — strip legacy `role` claim if present.
          // Firebase custom claims API does NOT support FieldValue.delete() — destructure to drop.
          try {
            const userRecord = await auth.getUser(doc.id);
            const current = userRecord.customClaims ?? {};
            if (Object.prototype.hasOwnProperty.call(current, "role")) {
              const { role: _legacyRole, ...preserved } = current;
              if (dryRun) {
                console.log(`[DRY-RUN] auth ${doc.id}: would strip legacy role claim (current value: ${JSON.stringify(_legacyRole)})`);
              } else {
                await auth.setCustomUserClaims(doc.id, preserved);
                totalClaimsUpdated++;
                await sleep(RATE_DELAY_MS);
              }
            } else if (!hasLegacyRoleField) {
              totalSkippedCleanAlready++;
            }
          } catch (err: unknown) {
            if (err instanceof Error && /no user record/i.test(err.message)) {
              // Orphaned profile doc — skip auth cleanup, log.
              continue;
            }
            totalErrors++;
            console.error(`[ERROR] auth cleanup(${doc.id}):`, err instanceof Error ? err.message : err);
          }
        }

        if (limit !== null && totalScanned >= limit) break;
        lastSnap = page.docs[page.docs.length - 1];
        if (page.size < PAGE_SIZE) break;
      }

      console.log("\n=== Legacy-role cleanup report ===");
      console.log(`Mode:                   ${dryRun ? "DRY-RUN" : "APPLY"}`);
      console.log(`Total scanned:          ${totalScanned}`);
      console.log(`Already clean:          ${totalSkippedCleanAlready}`);
      console.log(`Docs updated:           ${totalDocsUpdated}`);
      console.log(`Claims updated:         ${totalClaimsUpdated}`);
      console.log(`Errors:                 ${totalErrors}`);

      if (totalErrors > 0) process.exit(1);
    }

    run().catch((err) => {
      console.error("Fatal:", err);
      process.exit(1);
    });
    ```

    Then edit `package.json` and add three npm script entries alongside the existing migrate/sync scripts:

    ```json
    "drop-legacy-role:dry-run": "tsx scripts/drop-legacy-role-field.ts --dry-run",
    "drop-legacy-role": "tsx scripts/drop-legacy-role-field.ts",
    "drop-legacy-role:limit-10": "tsx scripts/drop-legacy-role-field.ts --limit=10"
    ```

    Do NOT change any other package.json field.

    Deploy ordering for this script: RUN IT LAST, AFTER:
    1. Task 1 changes deployed (app writes roles-array only).
    2. Task 2 changes deployed (rules flipped to array-only; sync scripts write claims without legacy field).
    3. At least one subsequent run of `npm run sync-claims` has passed through every active user (picks up the active-strip behavior introduced in Task 2).

    Then and only then run `npm run drop-legacy-role:dry-run` to confirm expected scope, followed by `npm run drop-legacy-role` to execute.

    Record the exact run date + counts in the Plan 10 SUMMARY.
  </action>
  <verify>
    <automated>ls scripts/drop-legacy-role-field.ts ; grep -c "drop-legacy-role" package.json ; npx tsc --noEmit scripts/drop-legacy-role-field.ts 2>&amp;1 | head -10</automated>
  </verify>
  <acceptance_criteria>
    - `ls scripts/drop-legacy-role-field.ts` returns the path
    - `grep -c "FieldValue.delete()" scripts/drop-legacy-role-field.ts` returns `1` (Firestore field deletion — valid for docs, NOT claims)
    - `grep -c "const { role: _legacyRole, ...preserved }" scripts/drop-legacy-role-field.ts` returns `1` (destructure-and-drop for claims — the ONLY valid pattern for custom-claims key removal)
    - `grep -c "hasOwnProperty.call(data, \"role\")" scripts/drop-legacy-role-field.ts` returns `1` (existence check — distinguishes "field absent" from "field present with null value")
    - `grep -c '"drop-legacy-role:dry-run"' package.json` returns `1`
    - `grep -c '"drop-legacy-role"' package.json` returns at least `1`
    - `npx tsc --noEmit` reports no errors from this file
    - `npm run drop-legacy-role:dry-run` (against staging or dev Firestore) completes without unhandled errors and prints a report footer
  </acceptance_criteria>
  <done>
    scripts/drop-legacy-role-field.ts exists, idempotently strips legacy role field from Firestore docs (via FieldValue.delete() — valid for docs) AND legacy role claim from Auth users (via destructure-and-drop — the ONLY valid pattern for custom claims). Supports --dry-run + --limit. package.json has three npm script invocations. Deploy ordering is documented.
  </done>
</task>

</tasks>

<verification>
- All five human gates (Task 0 checkpoint) verified before Tasks 1-3 run.
- After Task 1 ships: `npx tsc --noEmit` and `npm test` both exit 0. `grep -rc "MentorshipRole" src/` returns 0.
- After Task 2 ships: firestore.rules dry-run deploy succeeds. Staged in prod — verify no permission-denied errors over 24-48 hours before running Task 3.
- After Task 3 ships + runs: `npm run drop-legacy-role:dry-run` returns "Would update: 0". Sample-inspect 5-10 Firestore docs in the console — confirm no `role` field. Sample-inspect the same users' auth custom claims — confirm no `role` key.
- `git grep "MentorshipRole\|profile\.role\|token\.role == " -- src/` returns zero matches (residual legacy references all cleaned).
</verification>

<success_criteria>
- [x] All five pre-cleanup gates verified (Task 0 checkpoint passed)
- [x] MentorshipRole type + MentorshipProfile.role + PermissionUser.role all deleted
- [x] Dual-read / dual-claim fallback removed from all six helpers
- [x] firestore.rules flipped to array-only (with existence guard preserved)
- [x] sync-custom-claims.ts + roleMutation.ts actively strip legacy claim from existing customClaims (destructure-and-drop — NOT FieldValue.delete, which is not valid for custom claims)
- [x] scripts/drop-legacy-role-field.ts exists and has been run in prod (reported in SUMMARY)
- [x] Test fixtures migrated to roles-only shape
- [x] TypeScript strict compile passes with zero errors
- [x] npm test exits 0
- [x] Deploy ordering documented in SUMMARY (app first, rules second, drop-legacy-role script last)
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-roles-array-migration/01-10-SUMMARY.md` documenting:
- Task 0 checkpoint evidence: all five gates passed (dates, log screenshots, grep output, script dry-run output)
- Exact counts of symbols deleted (MentorshipRole imports removed, fixture role: lines removed, etc.)
- The final state of firestore.rules isAcceptedMentor() (copy the body)
- The date drop-legacy-role-field.ts ran in prod + its apply-mode counts
- Final deploy-ordering confirmation (app → rules → cleanup script)
- A PHASE-COMPLETE marker for the phase: "Phase 01 Foundation — Roles Array Migration complete. v6.0 Phase 2 may now commence."
</output>
