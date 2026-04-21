---
phase: 01-foundation-roles-array-migration
plan: 06
title: roleMutation helper stub + wire into profile write path
type: execute
wave: 3
depends_on: [03]
files_modified:
  - src/lib/ambassador/roleMutation.ts
  - src/app/api/mentorship/profile/route.ts
  - src/lib/auth.ts
autonomous: true
requirements:
  - ROLE-05
  - ROLE-07
deploy: "#4 (app code writes the new claim on every profile mutation — closes the drift window)"
must_haves:
  truths:
    - "src/lib/ambassador/roleMutation.ts exports a syncRoleClaim(uid, {roles, admin}) helper that merges with existing custom claims and calls admin.auth().setCustomUserClaims"
    - "The primary profile-write path in src/app/api/mentorship/profile/route.ts calls syncRoleClaim after the Firestore write"
    - "Claim-sync failures do NOT block the Firestore write — they are logged and surfaced in the response body as a non-fatal warning"
    - "src/lib/auth.ts verifyAuth() extends its return type to expose roles?: string[], admin?: boolean, role?: string from the decoded token"
    - "All three surfaces compile under TypeScript strict mode"
  artifacts:
    - path: src/lib/ambassador/roleMutation.ts
      provides: "syncRoleClaim helper — merged custom-claims write"
      exports: ["syncRoleClaim"]
      contains: "setCustomUserClaims"
    - path: src/app/api/mentorship/profile/route.ts
      provides: "Profile POST handler now syncs claims after write"
      contains: "syncRoleClaim"
    - path: src/lib/auth.ts
      provides: "verifyAuth returns extended token shape with roles + admin claims"
      contains: "roles"
  key_links:
    - from: src/app/api/mentorship/profile/route.ts
      to: src/lib/ambassador/roleMutation.ts
      via: 'import { syncRoleClaim } from "@/lib/ambassador/roleMutation"'
      pattern: "syncRoleClaim\\("
    - from: src/lib/ambassador/roleMutation.ts
      to: "Firebase Auth custom claims"
      via: "admin.auth().setCustomUserClaims(uid, merged)"
      pattern: "setCustomUserClaims"
---

<objective>
Create the runtime half of the claims-sync strategy: a shared `syncRoleClaim` helper in `src/lib/ambassador/roleMutation.ts` that every profile write path calls after a successful Firestore mutation. This closes the drift window — without it, a user who changes roles would wait up to 1 hour for the next token refresh before their claims catch up (and `scripts/sync-custom-claims.ts` only runs on demand). Additionally, extend `src/lib/auth.ts`'s `verifyAuth()` to expose `roles` and `admin` from the decoded token so API routes can authorize without a Firestore round-trip.

Purpose: Implements ROLE-05 server side (synchronous claim refresh on every mutation) and ROLE-07 for the primary write path. Honors D-13 (active claim sync), D-14 (no >1-hour stale-claim window).
Output: One new helper file, one modified API route, one extended auth helper.
Deploy: Part of Deploy #4 (app code closes the drift window).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md
@.planning/research/ARCHITECTURE.md
@src/lib/auth.ts
@src/app/api/mentorship/profile/route.ts
@src/lib/firebaseAdmin.ts
</context>

<interfaces>
Current verifyAuth return (src/lib/auth.ts) — extend, do not replace:

```typescript
// Current (simplified):
export async function verifyAuth(req: NextRequest): Promise<{ uid: string; email: string } | null>;
```

Target extended shape (backward-compatible; adds optional fields only):

```typescript
export async function verifyAuth(req: NextRequest): Promise<{
  uid: string;
  email: string;
  roles?: string[];    // from decoded token.roles custom claim
  admin?: boolean;     // from decoded token.admin custom claim
  role?: string;       // legacy single-role claim (dropped in Deploy #5)
} | null>;
```

Profile write path in src/app/api/mentorship/profile/route.ts (line ~111):

```typescript
// Current shape (inside the POST handler):
await db.collection("mentorship_profiles").doc(uid).set(profile);
return NextResponse.json(profile);
```

After patch:
```typescript
await db.collection("mentorship_profiles").doc(uid).set(profile);
const claimSync = await syncRoleClaim(uid, {
  roles: profile.roles ?? [],
  admin: profile.isAdmin === true,
});
return NextResponse.json({
  ...profile,
  _claimSync: claimSync.ok ? { refreshed: true } : { refreshed: false, error: claimSync.error },
});
```
</interfaces>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create src/lib/ambassador/roleMutation.ts with syncRoleClaim helper</name>
  <files>src/lib/ambassador/roleMutation.ts</files>
  <read_first>
    - src/lib/firebaseAdmin.ts (confirm the admin app init — use its export if available; do not re-initialize)
    - scripts/sync-custom-claims.ts (Plan 04 output) — REUSE the merge pattern exactly — this helper is the runtime-single-user version of that batch script
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §decisions D-13, D-14
    - .planning/research/ARCHITECTURE.md §6.2 (roleMutation module design; landing as a stub in Phase 1, hardened in Phase 2)
  </read_first>
  <action>
    Create `src/lib/ambassador/roleMutation.ts` with this EXACT content. The module stays minimal for Phase 1 — just the synchronous claim-sync — and will grow in Phase 2 to own the full accept-ambassador write path.

    ```typescript
    /**
     * src/lib/ambassador/roleMutation.ts
     *
     * Shared helper for synchronizing Firebase Auth custom claims with
     * mentorship_profiles.roles (+ isAdmin). Called by every write path that mutates
     * these fields so the claim is fresh within seconds of the Firestore write,
     * rather than waiting for the next ID-token refresh (per D-14 in 01-CONTEXT.md).
     *
     * Phase 1: stub — this module only exposes syncRoleClaim. Phase 2 hardens it
     * into the owner of the full accept-ambassador mutation (write profile doc +
     * sync claims + assign Discord role + audit-log) per ARCHITECTURE.md §6.2.
     *
     * Merge semantics: REPLACES roles + role + admin keys; PRESERVES any other
     * custom claims (same pattern as scripts/sync-custom-claims.ts). This matters
     * because setCustomUserClaims atomically replaces the entire claims object.
     */

    import { getAuth } from "firebase-admin/auth";

    export interface SyncRoleClaimInput {
      /** The roles-array to write. Pass the final post-mutation array (possibly empty). */
      roles: string[];
      /** The isAdmin flag to mirror as the admin claim. */
      admin: boolean;
    }

    export type SyncRoleClaimResult =
      | { ok: true }
      | { ok: false; error: string };

    /**
     * Synchronize the Firebase Auth custom claims for uid to match the given roles + admin.
     *
     * Merge rules (per D-13 in 01-CONTEXT.md):
     *   - Reads the user's current custom claims (preserving any we don't own)
     *   - Overwrites roles, role (legacy — first element, null if empty), and admin
     *   - Leaves all other keys intact
     *
     * Failure handling: returns { ok: false, error } instead of throwing. Callers
     * MUST treat sync failure as non-fatal (the Firestore write is authoritative;
     * claims will catch up on next scripts/sync-custom-claims.ts run or next mutation).
     */
    export async function syncRoleClaim(
      uid: string,
      input: SyncRoleClaimInput
    ): Promise<SyncRoleClaimResult> {
      try {
        const auth = getAuth();
        const userRecord = await auth.getUser(uid);
        const existing = userRecord.customClaims ?? {};
        const merged: Record<string, unknown> = {
          ...existing,
          roles: input.roles,
          role: input.roles[0] ?? null, // legacy claim — removed in Deploy #5
          admin: input.admin,
        };
        await auth.setCustomUserClaims(uid, merged);
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // Do NOT rethrow — callers need to know claim sync failed but not abort the txn.
        return { ok: false, error: message };
      }
    }
    ```

    If `src/lib/ambassador/` directory does not exist, create it. Place only this file there — no index.ts or other exports yet (stub discipline).

    Do NOT import from `../../types/mentorship` to type `roles` as `Role[]` — keep the helper accepting `string[]` so it remains usable from scripts/ (which don't share the Next.js path alias). The caller is responsible for passing valid role strings; RoleSchema validation happens at the API boundary (see Task 2).

    Anti-pattern to AVOID: using `admin.auth()` from the namespace import instead of `getAuth()` from the modular import. The modular form (`firebase-admin/auth`) is the v12+ recommended shape.
  </action>
  <verify>
    <automated>ls src/lib/ambassador/roleMutation.ts 2>&amp;1 | head -5 ; npx tsc --noEmit 2>&amp;1 | grep "src/lib/ambassador/roleMutation.ts" | head -10</automated>
  </verify>
  <acceptance_criteria>
    - `ls src/lib/ambassador/roleMutation.ts` returns the path
    - `grep -c "export async function syncRoleClaim" src/lib/ambassador/roleMutation.ts` returns `1`
    - `grep -c "export interface SyncRoleClaimInput" src/lib/ambassador/roleMutation.ts` returns `1`
    - `grep -c "export type SyncRoleClaimResult" src/lib/ambassador/roleMutation.ts` returns `1`
    - `grep -c "...existing" src/lib/ambassador/roleMutation.ts` returns `1` (merge pattern present)
    - `grep -c "setCustomUserClaims" src/lib/ambassador/roleMutation.ts` returns `1`
    - `grep -c 'from "firebase-admin/auth"' src/lib/ambassador/roleMutation.ts` returns `1` (modular import)
    - `grep -c "throw " src/lib/ambassador/roleMutation.ts` returns `0` (never throws — returns result object)
    - `npx tsc --noEmit` reports no errors originating from this file
  </acceptance_criteria>
  <done>
    src/lib/ambassador/roleMutation.ts exports syncRoleClaim(uid, { roles, admin }) — merges custom claims, returns a result object, never throws. Stub-minimal for Phase 1; Phase 2 will expand it.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Wire syncRoleClaim into src/app/api/mentorship/profile/route.ts after the Firestore write</name>
  <files>src/app/api/mentorship/profile/route.ts</files>
  <read_first>
    - src/app/api/mentorship/profile/route.ts (FULL file — do not skim; pay attention to every exported handler (GET, POST, PUT, PATCH), the exact location of `db.collection("mentorship_profiles").doc(uid).set(...)` / `.update(...)` calls, and any existing response-shape contract the client depends on)
    - src/contexts/MentorshipContext.tsx (inspect only — Plan 09 is the client side; confirm the current shape of how it reads the API response so this plan's additive _claimSync field doesn't break existing consumers)
    - src/lib/ambassador/roleMutation.ts (your Task 1 output)
    - src/types/mentorship.ts (confirm the `roles` field is now part of MentorshipProfile per Plan 01)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §specifics (claim refresh signal — Option A for Phase 1: API response includes refresh signal)
  </read_first>
  <action>
    Edit `src/app/api/mentorship/profile/route.ts`. The goal is ADDITIVE — do not refactor the handler shape, just add the claim sync call in the right places.

    1. Add the import at the top of the file (alongside existing imports, preserving import ordering convention):
       ```typescript
       import { syncRoleClaim } from "@/lib/ambassador/roleMutation";
       ```

    2. For EVERY call to `db.collection("mentorship_profiles").doc(uid).set(...)` or `.update(...)` in the POST / PUT / PATCH handlers (there may be one or more — the scout found at least one around line 111), add a follow-up call immediately after the `await` returns:

       ```typescript
       await db.collection("mentorship_profiles").doc(uid).set(profile);
       // Sync Firebase Auth custom claims so the user's next ID token carries the
       // updated roles within seconds (per D-14 — no >1hr stale-claim window).
       // Non-fatal: a claim-sync failure is logged but does not reject the request.
       // scripts/sync-custom-claims.ts cleans up any drift on its next run.
       const claimSync = await syncRoleClaim(uid, {
         roles: profile.roles ?? [],
         admin: profile.isAdmin === true,
       });
       if (!claimSync.ok) {
         console.warn(`[profile.POST] claim sync failed for ${uid}:`, claimSync.error);
       }
       ```

       Ensure the object you pass to `syncRoleClaim` reads from the same `profile` variable that was just written to Firestore. Do NOT compute `roles` or `isAdmin` from a separate source — it must mirror what was written.

    3. Update the final `NextResponse.json(...)` in each handler that calls `syncRoleClaim` to include a non-fatal claim-sync signal, so the client can call `user.getIdToken(true)` when appropriate:

       ```typescript
       return NextResponse.json({
         ...profile,
         _claimSync: claimSync.ok ? { refreshed: true } : { refreshed: false, error: claimSync.error },
       });
       ```

       The `_claimSync` underscore-prefixed key is a convention for "server-generated metadata not part of the profile itself". Existing client code reads named fields from the response; adding a new key is additive and won't break anything.

    4. Do NOT touch the GET handler. Do NOT rename existing variables. Do NOT change the validation / Zod parsing. Do NOT change the Discord role assignment block (that's Phase 2 territory).

    5. Critical: the `syncRoleClaim` call is `await`-ed — not fire-and-forget. D-14's "synchronous refresh on every mutation" is load-bearing for UX. The performance cost (one Admin SDK RPC, ~50-150ms) is acceptable on profile-save paths.
  </action>
  <verify>
    <automated>grep -c "syncRoleClaim" src/app/api/mentorship/profile/route.ts ; grep -c "_claimSync" src/app/api/mentorship/profile/route.ts ; npx tsc --noEmit 2>&amp;1 | grep "src/app/api/mentorship/profile/route.ts" | head -10</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'from "@/lib/ambassador/roleMutation"' src/app/api/mentorship/profile/route.ts` returns `1`
    - `grep -c "await syncRoleClaim(" src/app/api/mentorship/profile/route.ts` returns at least `1` (one per write path)
    - `grep -c "_claimSync" src/app/api/mentorship/profile/route.ts` returns at least `1`
    - `grep -c "roles: profile.roles ?? \[\]" src/app/api/mentorship/profile/route.ts` returns at least `1` (correct source of truth)
    - `grep -c "admin: profile.isAdmin === true" src/app/api/mentorship/profile/route.ts` returns at least `1`
    - For EVERY `db.collection("mentorship_profiles").doc(...).set(` OR `.update(` call in the file, a `syncRoleClaim` call appears within the next 10 lines. Verify manually: `grep -n 'mentorship_profiles").doc' src/app/api/mentorship/profile/route.ts` produces line numbers; for each, inspect ±10 lines for the syncRoleClaim call. Record count in SUMMARY.
    - `npx tsc --noEmit` reports no errors originating from this file
    - Existing tests (if any touch this route) continue to pass
  </acceptance_criteria>
  <done>
    src/app/api/mentorship/profile/route.ts syncs custom claims synchronously after every profile write (POST/PUT/PATCH). Claim-sync failure is logged but non-fatal. Response includes `_claimSync` signal for client-side token refresh.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Extend src/lib/auth.ts verifyAuth to expose roles, admin, and legacy role claims</name>
  <files>src/lib/auth.ts</files>
  <read_first>
    - src/lib/auth.ts (FULL file — note the current return type of verifyAuth and exactly where the decoded token is available after `admin.auth().verifyIdToken(...)`)
    - src/lib/permissions.ts (Plan 03 output — the hasRoleClaim family expects exactly the shape this plan produces; note the DecodedRoleClaim interface there)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §decisions D-08 (claim-side helpers need to read these fields)
  </read_first>
  <action>
    Edit `src/lib/auth.ts` to extend the `verifyAuth()` return type. The change is PURELY ADDITIVE — existing callers that destructure `{ uid, email }` continue to work; new callers that want claims can now read `roles` / `admin` / `role` from the same return.

    1. Locate the current return type. If it's an inline object type or a named interface, extend it with three optional fields. Prefer extracting a named `AuthContext` interface at the top of the file:
       ```typescript
       export interface AuthContext {
         uid: string;
         email: string;
         roles?: string[];   // from decoded token.roles custom claim
         admin?: boolean;    // from decoded token.admin custom claim
         role?: string;      // legacy single-role claim — removed in Deploy #5
       }
       ```

       If the current code uses an inline return type like `Promise<{ uid: string; email: string } | null>`, extract into the named `AuthContext` interface — it's reused by permissions.ts's `DecodedRoleClaim` in Plan 03 (structurally compatible).

    2. Inside `verifyAuth`, after the decoded token is obtained (via `admin.auth().verifyIdToken(...)`), extract the three claim fields and include them in the return:
       ```typescript
       const decoded = await admin.auth().verifyIdToken(token);
       return {
         uid: decoded.uid,
         email: decoded.email ?? "",
         roles: Array.isArray(decoded.roles) ? (decoded.roles as string[]) : undefined,
         admin: decoded.admin === true ? true : undefined,
         role: typeof decoded.role === "string" ? decoded.role : undefined,
       };
       ```

       Use `undefined` (not `null`) for absent fields so the optional chaining in permissions.ts works correctly (`decoded.roles?.includes(...)`).

    3. Update the function signature to return `Promise<AuthContext | null>` (matching whatever "null-on-failure" convention the current code uses).

    4. Do NOT change any other behavior — error handling, token extraction from cookies or Authorization header, null return on no-auth — all stay identical.

    5. If the file currently catches errors via a try/catch and returns null, keep that pattern; only the successful return path is extended.
  </action>
  <verify>
    <automated>grep -Ec "roles\?: string\[\]" src/lib/auth.ts ; grep -c "admin\?: boolean" src/lib/auth.ts ; npx tsc --noEmit 2>&amp;1 | grep "src/lib/auth.ts" | head -10</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "roles\?: string\[\]" src/lib/auth.ts` returns `1` (extended return shape)
    - `grep -c "admin\?: boolean" src/lib/auth.ts` returns `1`
    - `grep -c "Array.isArray(decoded.roles)" src/lib/auth.ts` returns `1` (defensive cast)
    - `grep -c "export interface AuthContext" src/lib/auth.ts` returns `1` (named + exported interface)
    - `grep -c "decoded.admin === true" src/lib/auth.ts` returns `1`
    - `npx tsc --noEmit` reports no NEW errors originating from src/lib/auth.ts (pre-existing errors in unrelated files are OK)
    - Existing callers that destructure `{ uid, email }` from `verifyAuth()` still compile (the new fields are optional — additive change only)
    - `grep -c "verifyAuth" src/app/api/**/*.ts 2>/dev/null` — all existing call sites unchanged (optional check; actual grep target will vary by project structure)
  </acceptance_criteria>
  <done>
    src/lib/auth.ts verifyAuth() returns AuthContext including optional roles, admin, role claim fields. Existing callers are backward-compatible. permissions.ts's hasRoleClaim family now has a real token source to validate against.
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` surfaces no new errors from the three touched files.
- An end-to-end manual test via `npm run dev` + Postman: POST to /api/mentorship/profile with a valid auth token and a profile body containing `roles: ["mentor"]`. Response includes `_claimSync: { refreshed: true }`. Run `firebase-admin` one-off script to read the user's customClaims — confirm they match.
- If claim sync mocking is desired in tests, Phase 2 tests can spy on `syncRoleClaim` — no Phase 1 test coverage required (claim sync is observable via response body).
</verification>

<success_criteria>
- [x] src/lib/ambassador/roleMutation.ts exists with syncRoleClaim helper
- [x] src/app/api/mentorship/profile/route.ts calls syncRoleClaim after every write + returns _claimSync signal
- [x] src/lib/auth.ts verifyAuth returns extended AuthContext with roles/admin/role optional fields
- [x] No breaking changes to existing callers of verifyAuth
- [x] Claim-sync failures are non-fatal (logged, surfaced in response, not thrown)
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-roles-array-migration/01-06-SUMMARY.md` documenting:
- The exact syncRoleClaim signature + result type
- The list of mentorship_profiles write call sites in src/app/api/mentorship/profile/route.ts that were wired (file + line numbers)
- The final AuthContext interface shape
- Confirmation the merge pattern (...existing, roles, role, admin) is present in BOTH scripts/sync-custom-claims.ts (Plan 04) and src/lib/ambassador/roleMutation.ts (this plan) — single source of merge-semantics truth
</output>
