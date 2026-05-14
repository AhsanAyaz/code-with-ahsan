---
phase: 01-foundation-roles-array-migration
plan: 03
title: Permission helpers (hasRole, hasAnyRole, hasAllRoles) + claim-side mirrors with dual-read
type: execute
wave: 2
depends_on: [01]
files_modified:
  - src/lib/permissions.ts
autonomous: true
requirements:
  - ROLE-02
deploy: "#1 (types + helpers + dual-read; no-op ship)"
must_haves:
  truths:
    - "`hasRole(profile, role)` returns true iff profile.roles includes role OR (roles is missing AND profile.role === role)"
    - "`hasAnyRole(profile, [r1, r2])` returns true iff at least one of r1/r2 is in profile.roles (with legacy fallback)"
    - "`hasAllRoles(profile, [r1, r2])` returns true iff every role in the argument array is in profile.roles (with legacy fallback only when profile.roles is absent AND the argument list is exactly one role matching profile.role)"
    - "`hasRole(null, 'mentor')` and `hasRole(undefined, 'mentor')` return false (D-07)"
    - "Passing an array to `hasRole` is a TypeScript compile error (D-05 — three verbs for three semantics)"
    - "Claim-side mirrors `hasRoleClaim(decodedToken, role)` / `hasAnyRoleClaim` / `hasAllRoleClaimsClaim` exist and read `token.roles` with fallback to `token.role` (D-08)"
    - "`isAcceptedMentor(profile)` is rewritten on top of `hasRole(profile, 'mentor') && profile.status === 'accepted'` (DRY)"
    - "`PermissionUser` interface is extended with `roles?: Role[]` so existing call-sites keep compiling during the migration window"
  artifacts:
    - path: src/lib/permissions.ts
      provides: "hasRole, hasAnyRole, hasAllRoles, hasRoleClaim, hasAnyRoleClaim, hasAllRoleClaimsClaim, updated PermissionUser, refactored isAcceptedMentor"
      exports: ["hasRole", "hasAnyRole", "hasAllRoles", "hasRoleClaim", "hasAnyRoleClaim", "hasAllRoleClaimsClaim"]
      contains: "profile.roles?.includes(role) ?? profile.role === role"
  key_links:
    - from: src/lib/permissions.ts
      to: "src/types/mentorship.ts"
      via: 'import { Role, MentorshipProfile } from "@/types/mentorship"'
      pattern: "from \"@/types/mentorship\""
    - from: "hasRole helper"
      to: "profile.roles array + legacy profile.role"
      via: "dual-read expression"
      pattern: "profile\\.roles\\?\\.includes\\(role\\) \\?\\? profile\\.role === role"
---

<objective>
Add the canonical three-verb permission helper API (`hasRole`, `hasAnyRole`, `hasAllRoles`) plus three mirroring claim-side variants (`hasRoleClaim`, `hasAnyRoleClaim`, `hasAllRoleClaimsClaim`) to `src/lib/permissions.ts`, each implementing dual-read semantics so the same helper works before, during, and after the roles-array migration. Refactor `isAcceptedMentor` on top of `hasRole` for DRY. Extend `PermissionUser` with an optional `roles: Role[]` field.

Purpose: Implements ROLE-02. Unlocks every downstream migration (scripts, rules, call-sites) by giving them a single stable API. Honors D-05 (three verbs for three semantics), D-06 (dual-read during migration window), D-07 (null-safe), D-08 (claim-side mirrors).
Output: Six new exported helpers in src/lib/permissions.ts, plus extended PermissionUser and refactored isAcceptedMentor.
Deploy: Part of Deploy #1 (types + helpers + dual-read; ships as no-op — call-sites still use legacy field until Plan 07 migrates them).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@src/lib/permissions.ts
@src/types/mentorship.ts
</context>

<interfaces>
<!-- Current src/lib/permissions.ts exports (verbatim — preserve all of these) -->

```typescript
// Existing exports that MUST remain:
export interface PermissionUser {
  uid: string;
  role: MentorshipRole;   // legacy; becomes optional and accompanied by `roles?: Role[]`
  status: MentorshipStatus;
  isAdmin?: boolean;
  // ... other fields unchanged ...
}
export function isAuthenticated(user: PermissionUser | null): boolean;
export function isAdminUser(user: PermissionUser | null): boolean;
export function isOwner(user: PermissionUser | null, ownerId: string): boolean;
export function canOwnerOrAdminAccess(user: PermissionUser | null, ownerId: string): boolean;
export function isAcceptedMentor(user: PermissionUser | null): boolean;
```

<!-- After Plan 01, src/types/mentorship.ts exports `Role`, `RoleSchema`, and kept legacy `MentorshipRole`. -->
<!-- MentorshipProfile now has `roles: Role[]` required + `role?: MentorshipRole` optional. -->

<!-- The shape of a decoded Firebase ID token used by claim-side helpers -->
```typescript
// Decoded token shape (Firebase Admin verifyIdToken return + our custom claims)
interface DecodedAppToken {
  uid: string;
  role?: string;          // legacy claim (may be stale pre-Deploy #2.5)
  roles?: string[];       // new array claim (set by scripts/sync-custom-claims.ts + roleMutation helper)
  admin?: boolean;
  status?: string;
  [key: string]: unknown; // other Firebase-native fields
}
```
</interfaces>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add profile-side helpers (hasRole, hasAnyRole, hasAllRoles), extend PermissionUser, refactor isAcceptedMentor</name>
  <files>src/lib/permissions.ts</files>
  <read_first>
    - src/lib/permissions.ts (read fully — especially the PermissionUser interface lines 15-26 and the isAcceptedMentor helper around lines 48-56)
    - src/types/mentorship.ts (after Plan 01 ran — `Role`, `RoleSchema`, legacy `MentorshipRole`, extended MentorshipProfile)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §decisions (D-04, D-05, D-06, D-07)
    - .planning/research/PITFALLS.md §Pitfall 2 (backfill data-loss and the must-never-let-null-into-roles invariant)
  </read_first>
  <action>
    Edit `src/lib/permissions.ts` to introduce the profile-side helpers. The existing helpers (`isAuthenticated`, `isAdminUser`, `isOwner`, `canOwnerOrAdminAccess`, `isAcceptedMentor`) MUST remain exported — only `isAcceptedMentor` changes internally; the others are untouched.

    1. Update the `Role` import. Near the top of the file, wherever `MentorshipRole` is currently imported from `@/types/mentorship`, expand to also import `Role`:
       ```typescript
       import type { MentorshipRole, Role } from "@/types/mentorship";
       ```
       (If `Role` is not yet imported, add it. Leave `MentorshipRole` import intact — it's still needed for the legacy `role` field during the dual-read window.)

    2. Extend `PermissionUser` with an optional `roles` array. Find the `export interface PermissionUser` block (currently around lines 15-26) and add this single line directly after the `role: MentorshipRole;` line:
       ```typescript
       roles?: Role[]; // Post-migration: always present. Pre-migration: undefined -> helpers fall back to `role`.
       ```
       Do NOT make `role` optional in PermissionUser (MentorshipProfile.role is now optional, but PermissionUser is a narrower interface used by tests and call-sites; keeping `role` required here minimizes churn — the legacy field is sent through both code paths).

       Rationale: `PermissionUser` is re-shaped incrementally. Plan 07 migrates 29 call-sites; Plan 08 migrates the 95 test fixtures to `roles: [...]`. During that window we need both shapes available.

    3. Add the three profile-side helpers. Place them AFTER `canOwnerOrAdminAccess` and BEFORE `isAcceptedMentor`. Use EXACTLY this code (the dual-read expression must match D-06 verbatim — a grep pattern verifies it):

       ```typescript
       /**
        * Returns true if the profile has the given role.
        *
        * Dual-read (per D-06 in 01-CONTEXT.md):
        *   - Prefers profile.roles (the new invariant shape)
        *   - Falls back to profile.role (legacy single-role field) when profile.roles is undefined
        *
        * Null-safe (per D-07): returns false for null/undefined profiles instead of throwing.
        *
        * Three-verb API (per D-05): passing an array to `role` is a TypeScript compile error.
        * Use hasAnyRole / hasAllRoles for multi-role semantics.
        */
       export function hasRole(
         profile: PermissionUser | null | undefined,
         role: Role
       ): boolean {
         if (!profile) return false;
         return profile.roles?.includes(role) ?? profile.role === role;
       }

       /**
        * Returns true if the profile has AT LEAST ONE of the given roles.
        * Dual-read + null-safe (same semantics as hasRole).
        */
       export function hasAnyRole(
         profile: PermissionUser | null | undefined,
         roles: Role[]
       ): boolean {
         if (!profile) return false;
         if (roles.length === 0) return false;
         if (profile.roles) {
           return roles.some((r) => profile.roles!.includes(r));
         }
         // Legacy fallback: compare against the single role field
         return profile.role !== null && profile.role !== undefined && roles.includes(profile.role as Role);
       }

       /**
        * Returns true if the profile has EVERY given role.
        * Dual-read + null-safe. During the legacy fallback window, returns true only if
        * the argument list is exactly one role matching profile.role (a single-role
        * legacy profile cannot satisfy multi-role queries).
        */
       export function hasAllRoles(
         profile: PermissionUser | null | undefined,
         roles: Role[]
       ): boolean {
         if (!profile) return false;
         if (roles.length === 0) return true; // vacuous truth — matches Array.prototype.every
         if (profile.roles) {
           return roles.every((r) => profile.roles!.includes(r));
         }
         // Legacy fallback: only satisfiable if exactly one role requested matches the legacy field
         return (
           roles.length === 1 &&
           profile.role !== null &&
           profile.role !== undefined &&
           roles[0] === profile.role
         );
       }
       ```

    4. Refactor `isAcceptedMentor` to use `hasRole`. Replace the existing body (currently `return user !== null && user.role === "mentor" && user.status === "accepted";` on roughly lines 54-56) with:
       ```typescript
       export function isAcceptedMentor(user: PermissionUser | null): boolean {
         return hasRole(user, "mentor") && user?.status === "accepted";
       }
       ```
       This preserves the public signature while routing through `hasRole` (DRY + dual-read benefit for free).

    5. Do NOT touch `isAuthenticated`, `isAdminUser`, `isOwner`, or `canOwnerOrAdminAccess`. Do NOT introduce any `any` casts — use the typed Role import. Do NOT remove the `MentorshipRole` import (still needed for PermissionUser.role).

    Anti-pattern to AVOID: do NOT write `profile.roles && profile.roles.includes(role) || profile.role === role` (loses short-circuit semantics when roles=[] — an empty array is a valid post-migration state meaning "no roles", and we must NOT silently fall back to legacy in that case). The nullish-coalescing `??` is load-bearing: `[].includes('mentor')` returns `false` (not `null`/`undefined`), so `??` does not trigger fallback.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&amp;1 | grep -E "src/lib/permissions.ts" | head -20</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'import type { MentorshipRole, Role } from "@/types/mentorship"' src/lib/permissions.ts` returns `1` (OR `Role` appears as an additional named import on the existing line; either way `grep -c "type.*Role.*from \"@/types/mentorship\"" src/lib/permissions.ts` returns at least `1`)
    - `grep -c "roles\?: Role\[\];" src/lib/permissions.ts` returns `1` (PermissionUser extension)
    - `grep -c "export function hasRole(" src/lib/permissions.ts` returns `1`
    - `grep -c "export function hasAnyRole(" src/lib/permissions.ts` returns `1`
    - `grep -c "export function hasAllRoles(" src/lib/permissions.ts` returns `1`
    - `grep -Ec 'profile\.roles\?\.includes\(role\) \?\? profile\.role === role' src/lib/permissions.ts` returns `1` (D-06 dual-read expression present verbatim)
    - `grep -c 'hasRole(user, "mentor")' src/lib/permissions.ts` returns `1` (isAcceptedMentor refactored on top of hasRole)
    - `grep -c "export function isAcceptedMentor" src/lib/permissions.ts` returns `1` (public signature preserved)
    - `grep -c "export function isAuthenticated" src/lib/permissions.ts` returns `1` (untouched helper still exported)
    - `grep -c "export function canOwnerOrAdminAccess" src/lib/permissions.ts` returns `1` (untouched helper still exported)
    - `npx tsc --noEmit` reports no errors originating from src/lib/permissions.ts (errors in OTHER files from Plan 01's type break are expected and OK)
    - Compile-time check via a scratch test: `echo 'import { hasRole } from "@/lib/permissions"; const p = { uid: "", role: null, roles: [], status: "accepted" as const }; hasRole(p, ["mentor"]);' | npx tsc --noEmit --jsx preserve --target es2022 --module esnext --moduleResolution bundler --baseUrl . --paths '{"@/*":["src/*"]}' /dev/stdin 2>&amp;1 | grep -E "(Argument of type|is not assignable)" | head -5` returns at least one line (proves passing an array to hasRole IS a compile error — D-05 enforced). Record the exact error text in the SUMMARY.
  </acceptance_criteria>
  <done>
    src/lib/permissions.ts exports `hasRole`, `hasAnyRole`, `hasAllRoles` with dual-read + null-safe semantics; PermissionUser has optional `roles: Role[]`; isAcceptedMentor is refactored onto hasRole; passing an array to hasRole is a TypeScript compile error.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Add claim-side mirrors (hasRoleClaim, hasAnyRoleClaim, hasAllRoleClaimsClaim) for decoded Firebase ID tokens</name>
  <files>src/lib/permissions.ts</files>
  <read_first>
    - src/lib/permissions.ts (the profile-side helpers you just added in Task 1 — mirror their structure)
    - src/lib/auth.ts (inspect `verifyAuth()` return shape — the decoded token will be extended to carry `roles` and `admin` claims; claim-side helpers should accept the broadest reasonable shape)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §decisions D-08 (claim-side helpers)
    - .planning/research/ARCHITECTURE.md §custom-claims strategy (token.role legacy fallback during dual-claim window)
  </read_first>
  <action>
    Append the three claim-side mirrors to src/lib/permissions.ts, directly below the profile-side helpers (before `isAcceptedMentor` if the ordering in Task 1 placed isAcceptedMentor last, otherwise just at the end of the file — keep related helpers adjacent).

    1. Declare a narrow `DecodedRoleClaim` type at the top of the claim-helpers section. This is intentionally a structural-typed partial (not an import from firebase-admin) so call-sites can pass any object shape that has the relevant fields. Do NOT import firebase-admin types into permissions.ts — that would create a runtime dep on the Admin SDK for a pure helper module.

       ```typescript
       /**
        * Narrow structural type for decoded Firebase ID tokens with our custom claims.
        * Intentionally decoupled from firebase-admin's DecodedIdToken to keep this
        * helper module dep-free. Callers (e.g., verifyAuth) can pass the full decoded
        * token directly; extra fields are ignored.
        */
       export interface DecodedRoleClaim {
         role?: string | null;     // legacy single-role claim (dropped in Deploy #5)
         roles?: string[] | null;  // new array claim (set by sync-custom-claims + roleMutation)
         admin?: boolean;
         [key: string]: unknown;
       }
       ```

    2. Add the three claim-side helpers with EXACTLY this code (naming matches D-08 verbatim — note the third helper's exact name includes "ClaimsClaim" as specified in the context):

       ```typescript
       /**
        * Returns true if the decoded token carries the given role claim.
        *
        * Dual-claim (per D-06 + D-13): prefers token.roles, falls back to legacy token.role.
        * Null-safe (per D-07): returns false for null/undefined tokens.
        *
        * Use this in API route handlers that already have a decoded token from verifyAuth()
        * and don't want a Firestore round-trip just to authorize.
        */
       export function hasRoleClaim(
         token: DecodedRoleClaim | null | undefined,
         role: Role
       ): boolean {
         if (!token) return false;
         return token.roles?.includes(role) ?? token.role === role;
       }

       /**
        * Returns true if the decoded token carries AT LEAST ONE of the given role claims.
        * Dual-claim + null-safe.
        */
       export function hasAnyRoleClaim(
         token: DecodedRoleClaim | null | undefined,
         roles: Role[]
       ): boolean {
         if (!token) return false;
         if (roles.length === 0) return false;
         if (token.roles) {
           return roles.some((r) => token.roles!.includes(r));
         }
         // Legacy fallback: compare against the single role claim
         return token.role !== null && token.role !== undefined && roles.includes(token.role as Role);
       }

       /**
        * Returns true if the decoded token carries EVERY given role claim.
        * Dual-claim + null-safe. During the legacy fallback window, satisfiable only
        * when the argument list is exactly one role matching token.role.
        *
        * Name matches the D-08 contract in 01-CONTEXT.md: hasAllRoleClaimsClaim.
        */
       export function hasAllRoleClaimsClaim(
         token: DecodedRoleClaim | null | undefined,
         roles: Role[]
       ): boolean {
         if (!token) return false;
         if (roles.length === 0) return true;
         if (token.roles) {
           return roles.every((r) => token.roles!.includes(r));
         }
         return (
           roles.length === 1 &&
           token.role !== null &&
           token.role !== undefined &&
           roles[0] === token.role
         );
       }
       ```

    3. Do NOT combine the profile-side and claim-side helpers into a single polymorphic function (D-08 says "separate signatures beat a polymorphic helper"). Each side stays independent so future changes to the decoded-token shape don't ripple into PermissionUser.

    4. Do NOT import from `firebase-admin` or `firebase-admin/auth` in this file — keep permissions.ts a dep-free utility module.

    Note: The helper name `hasAllRoleClaimsClaim` is intentionally the one specified in 01-CONTEXT.md D-08, even though it reads awkwardly. Matching the locked name keeps downstream grep/search consistent with planning docs. If a future cleanup PR renames, it's a coordinated change across plan + code.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&amp;1 | grep -E "src/lib/permissions.ts" | head -20</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "export interface DecodedRoleClaim" src/lib/permissions.ts` returns `1`
    - `grep -c "export function hasRoleClaim(" src/lib/permissions.ts` returns `1`
    - `grep -c "export function hasAnyRoleClaim(" src/lib/permissions.ts` returns `1`
    - `grep -c "export function hasAllRoleClaimsClaim(" src/lib/permissions.ts` returns `1` (exact name per D-08)
    - `grep -Ec "token\.roles\?\.includes\(role\) \?\? token\.role === role" src/lib/permissions.ts` returns `1` (claim-side dual-read expression present)
    - `grep -c "from \"firebase-admin" src/lib/permissions.ts` returns `0` (no firebase-admin import — helper stays dep-free)
    - `npx tsc --noEmit` reports no new errors originating from src/lib/permissions.ts
    - All six new helpers appear in the module's exports: `grep -cE "^export function (hasRole|hasAnyRole|hasAllRoles|hasRoleClaim|hasAnyRoleClaim|hasAllRoleClaimsClaim)\(" src/lib/permissions.ts` returns `6`
  </acceptance_criteria>
  <done>
    src/lib/permissions.ts now exports three claim-side mirrors (hasRoleClaim, hasAnyRoleClaim, hasAllRoleClaimsClaim) implementing dual-claim fallback, alongside the profile-side helpers from Task 1. No firebase-admin dependency introduced.
  </done>
</task>

</tasks>

<verification>
- `grep -cE "^export function (hasRole|hasAnyRole|hasAllRoles|hasRoleClaim|hasAnyRoleClaim|hasAllRoleClaimsClaim)\(" src/lib/permissions.ts` returns `6` — all six helpers exported.
- `npx tsc --noEmit` — permissions.ts itself compiles clean. Errors in OTHER files are expected (call-sites still use legacy single-role field; Plan 07 migrates them).
- Manual import check from a scratch script: `import { hasRole, hasRoleClaim } from "@/lib/permissions"` compiles.
- Existing tests in src/__tests__/permissions.test.ts still pass (helpers are additive + isAcceptedMentor behavior is preserved by the hasRole refactor). Plan 08 will add new tests for hasRole/hasAnyRole/hasAllRoles coverage.
</verification>

<success_criteria>
- [x] Three profile-side helpers (hasRole, hasAnyRole, hasAllRoles) exported with D-06 dual-read + D-07 null-safe semantics
- [x] Three claim-side mirrors (hasRoleClaim, hasAnyRoleClaim, hasAllRoleClaimsClaim) exported with matching semantics for decoded Firebase tokens (D-08)
- [x] PermissionUser extended with optional `roles?: Role[]`
- [x] isAcceptedMentor refactored on top of hasRole (DRY)
- [x] Passing an array to hasRole is a TypeScript compile error (D-05 three-verb enforcement)
- [x] permissions.ts remains dep-free — no firebase-admin import
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-roles-array-migration/01-03-SUMMARY.md` documenting:
- The exact signatures of all six new helpers
- The dual-read expression used (copy from source)
- The refactored isAcceptedMentor body
- Confirmation that existing helpers (isAuthenticated, isAdminUser, isOwner, canOwnerOrAdminAccess) are untouched
- The TypeScript error text produced by passing an array to hasRole (for the compile-time three-verb enforcement evidence)
</output>
