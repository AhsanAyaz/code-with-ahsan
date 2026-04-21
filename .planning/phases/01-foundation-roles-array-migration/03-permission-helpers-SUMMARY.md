---
phase: 01-foundation-roles-array-migration
plan: 03
subsystem: auth
tags: [permissions, roles, rbac, firebase-claims, dual-read, typescript, zod]

# Dependency graph
requires:
  - phase: 01-foundation-roles-array-migration (Plan 01)
    provides: "Role TS union + RoleSchema Zod enum + MentorshipProfile.roles: Role[] (imported from @/types/mentorship)"
provides:
  - "hasRole(profile, role) — profile-side dual-read + null-safe + three-verb API (D-05)"
  - "hasAnyRole(profile, roles[]) — at-least-one semantics with legacy fallback"
  - "hasAllRoles(profile, roles[]) — every-role semantics with single-legacy fallback"
  - "hasRoleClaim(token, role) — claim-side mirror for decoded Firebase ID tokens (D-08)"
  - "hasAnyRoleClaim(token, roles[]) — claim-side at-least-one mirror"
  - "hasAllRoleClaimsClaim(token, roles[]) — claim-side every-claim mirror"
  - "DecodedRoleClaim structural type (dep-free — no firebase-admin import)"
  - "PermissionUser.roles?: Role[] extension (dual-read window)"
  - "isAcceptedMentor refactored onto hasRole + now exported"
affects:
  - 01-05-firestore-rules-dual-read
  - 01-06-role-mutation-helper
  - 01-07-call-site-migration
  - 01-08-test-fixture-migration
  - 01-09-client-claim-refresh
  - 01-10-final-cleanup-deploy5
  - phase-02-application-pipeline
  - phase-04-activity-tracking
  - phase-05-dashboard-leaderboard

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-verb permission API (hasRole/hasAnyRole/hasAllRoles): singular verb takes scalar, plural verbs take array — compile-time prevents accidental misuse"
    - "Dual-read helper pattern: `profile.roles?.includes(x) ?? profile.role === x` — nullish-coalescing is load-bearing (empty array is a valid post-migration state, must NOT trigger legacy fallback)"
    - "Claim-side mirror pattern: identical semantics, separate signatures (D-08 over polymorphic helper) so token-shape changes don't ripple into PermissionUser"
    - "Dep-free helper modules: DecodedRoleClaim declared structurally instead of importing firebase-admin's DecodedIdToken — keeps permissions.ts runtime-neutral"

key-files:
  created: []
  modified:
    - src/lib/permissions.ts

key-decisions:
  - "PermissionUser.role stays required even though MentorshipProfile.role is now optional — PermissionUser is a narrower tests+call-site interface; keeping role required minimizes churn during the migration window"
  - "hasAllRoleClaimsClaim name kept verbatim per D-08 contract even though it reads awkwardly — matches planning docs for grep consistency; rename is a coordinated cleanup task, not this plan's concern"
  - "isAcceptedMentor promoted from private to exported helper (was previously module-internal) — needed by acceptance criteria; no behavior change since it was already used only by canCreateRoadmap internally"
  - "Task 1 placement: new role helpers inserted AFTER canOwnerOrAdminAccess and BEFORE isAcceptedMentor, with claim-side mirrors slotted between the profile-side helpers and isAcceptedMentor (keeps related helpers adjacent per plan guidance)"

patterns-established:
  - "Three-verb permission API per D-05: singular hasRole(x, role) takes a scalar Role; plural hasAnyRole/hasAllRoles take Role[]. Passing an array to hasRole is a TypeScript compile error."
  - "Dual-read with nullish-coalescing: `x.roles?.includes(r) ?? x.role === r` — the `??` (not `||`) is load-bearing because `[].includes(r)` returns `false` (not `null`/`undefined`), so an empty-array post-migration profile correctly returns false without silently falling back to legacy."
  - "Legacy-fallback invariant for plural verbs: when profile.roles is undefined (pre-migration), a single-role legacy profile can satisfy hasAllRoles ONLY if the requested set is exactly one role matching profile.role."

requirements-completed:
  - ROLE-02

# Metrics
duration: ~4min
completed: 2026-04-21
---

# Phase 01 Plan 03: Permission Helpers Summary

**Six new exported helpers (hasRole/hasAnyRole/hasAllRoles + hasRoleClaim/hasAnyRoleClaim/hasAllRoleClaimsClaim) in src/lib/permissions.ts implementing D-06 dual-read + D-07 null-safe + D-05 three-verb semantics, with PermissionUser extended to carry optional roles[] and isAcceptedMentor refactored onto hasRole for DRY.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-21T21:28:14Z
- **Completed:** 2026-04-21T21:32:10Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Added `import type { Role } from "@/types/mentorship"` alongside the existing `MentorshipRole` import (legacy + new vocabulary both importable)
- Extended `PermissionUser` with `roles?: Role[]` so existing call-sites and test fixtures keep compiling during the migration window (Plans 07/08 backfill)
- Added three profile-side helpers (`hasRole`, `hasAnyRole`, `hasAllRoles`) — each dual-read + null-safe, matching D-05/D-06/D-07
- Added three claim-side mirrors (`hasRoleClaim`, `hasAnyRoleClaim`, `hasAllRoleClaimsClaim`) + `DecodedRoleClaim` structural type for decoded Firebase ID tokens, implementing D-08
- Refactored `isAcceptedMentor` from a private helper with an inline expression to an exported wrapper on top of `hasRole(user, "mentor") && user?.status === "accepted"` — DRY + dual-read benefit for free, public signature preserved
- Preserved all existing helpers (`isAuthenticated`, `isAdminUser`, `isOwner`, `canOwnerOrAdminAccess`) untouched
- Zero new runtime dependencies — `permissions.ts` remains dep-free (no `firebase-admin` import)

## Helper Signatures (exact exports)

```typescript
// Profile-side (Task 1)
export function hasRole(
  profile: PermissionUser | null | undefined,
  role: Role
): boolean;

export function hasAnyRole(
  profile: PermissionUser | null | undefined,
  roles: Role[]
): boolean;

export function hasAllRoles(
  profile: PermissionUser | null | undefined,
  roles: Role[]
): boolean;

// Claim-side (Task 2)
export interface DecodedRoleClaim {
  role?: string | null;
  roles?: string[] | null;
  admin?: boolean;
  [key: string]: unknown;
}

export function hasRoleClaim(
  token: DecodedRoleClaim | null | undefined,
  role: Role
): boolean;

export function hasAnyRoleClaim(
  token: DecodedRoleClaim | null | undefined,
  roles: Role[]
): boolean;

export function hasAllRoleClaimsClaim(
  token: DecodedRoleClaim | null | undefined,
  roles: Role[]
): boolean;

// Refactored
export function isAcceptedMentor(user: PermissionUser | null): boolean;
```

## Dual-Read Expressions (load-bearing — copied from source)

**Profile-side (`hasRole`, line 110):**
```typescript
return profile.roles?.includes(role) ?? profile.role === role;
```

**Claim-side (`hasRoleClaim`, line 183):**
```typescript
return token.roles?.includes(role) ?? token.role === role;
```

The `??` (nullish-coalescing) is load-bearing: `[].includes('mentor')` returns `false` (not `null`/`undefined`), so an empty post-migration `roles` array correctly short-circuits to `false` without silently falling back to the legacy `role` field. Using `||` instead would incorrectly fall back on empty arrays.

## Refactored isAcceptedMentor Body

**Before (line 54-56 of pre-plan file, private helper):**
```typescript
function isAcceptedMentor(user: PermissionUser | null): boolean {
  if (!user) return false;
  return user.role === "mentor" && user.status === "accepted";
}
```

**After (line 231-233 of post-plan file, now exported + DRY on top of hasRole):**
```typescript
export function isAcceptedMentor(user: PermissionUser | null): boolean {
  return hasRole(user, "mentor") && user?.status === "accepted";
}
```

Public signature unchanged. Behavior preserved for legacy `role === "mentor"` profiles and extended for new `roles.includes("mentor")` profiles. Null-safety now routed through `hasRole`.

## Three-Verb Enforcement (D-05) — Compile-Time Evidence

Scratch test (`hasRole(p, ["mentor"])` — passing an array where a scalar Role is expected) produces:

```
error TS2345: Argument of type 'string[]' is not assignable to parameter
of type '"mentor" | "mentee" | "ambassador" | "alumni-ambassador"'.
```

This confirms callers cannot accidentally call `hasRole(user, ["mentor", "admin"])` hoping for "any-of" semantics — they must reach for `hasAnyRole`. Three verbs, three semantics, enforced by the compiler.

## Untouched Helpers (confirmed)

All pre-existing exports are preserved without modification:

- `isAuthenticated(user)` — lines 63-65
- `isAdminUser(user)` — lines 55-58
- `isOwner(user, resource)` — lines 70-76
- `canOwnerOrAdminAccess(user, resource)` — lines 82-89

The pre-existing private `isAcceptedMentor` (formerly lines 53-56) was promoted to exported and relocated below the new role helpers (now lines 231-233) — behavior preserved, public signature preserved, internally rewired onto `hasRole`.

## Task Commits

Each task was committed atomically (with `--no-verify` per parallel-executor protocol):

1. **Task 1: Add profile-side helpers + extend PermissionUser + refactor isAcceptedMentor** — `adf1eb8` (feat)
2. **Task 2: Add claim-side mirrors (hasRoleClaim / hasAnyRoleClaim / hasAllRoleClaimsClaim) + DecodedRoleClaim** — `b83dff7` (feat)

**Plan metadata:** _pending_ (docs: complete plan)

## Files Created/Modified

- `src/lib/permissions.ts` — +146 lines, −8 lines. Added `Role` type import, extended `PermissionUser` with `roles?: Role[]`, added three profile-side helpers + three claim-side helpers + `DecodedRoleClaim` interface, promoted+refactored `isAcceptedMentor` onto `hasRole`. All existing helpers untouched.

## Acceptance Criteria Results

All Task 1 criteria satisfied:
- Role imported from @/types/mentorship: 1 match (broad grep)
- `roles?: Role[];` on PermissionUser: 1 match
- `export function hasRole(`: 1 match
- `export function hasAnyRole(`: 1 match
- `export function hasAllRoles(`: 1 match
- D-06 dual-read expression `profile.roles?.includes(role) ?? profile.role === role`: 1 match (verbatim)
- `hasRole(user, "mentor")` inside isAcceptedMentor: 1 match
- `export function isAcceptedMentor`: 1 match
- `export function isAuthenticated` preserved: 1 match
- `canOwnerOrAdminAccess` preserved: 1 match
- `npx tsc --noEmit` reports 0 errors originating from `src/lib/permissions.ts`
- Scratch compile test produces `error TS2345: Argument of type 'string[]' is not assignable...` — D-05 three-verb enforced at compile time

All Task 2 criteria satisfied:
- `export interface DecodedRoleClaim`: 1 match
- `export function hasRoleClaim(`: 1 match
- `export function hasAnyRoleClaim(`: 1 match
- `export function hasAllRoleClaimsClaim(`: 1 match (exact name per D-08)
- Claim-side dual-read expression `token.roles?.includes(role) ?? token.role === role`: 1 match
- `from "firebase-admin` imports: 0 matches (helper stays dep-free)
- All six new helpers exported: `grep -cE "^export function (hasRole|hasAnyRole|hasAllRoles|hasRoleClaim|hasAnyRoleClaim|hasAllRoleClaimsClaim)\("` returns 6
- `npx tsc --noEmit` reports 0 new errors originating from `src/lib/permissions.ts`

The only TypeScript error repo-wide remains the pre-existing Plan-01-induced break at `src/app/mentorship/dashboard/[matchId]/layout.tsx(24,3)` — expected, carried over from Plan 01, scheduled for Plan 07 (call-site migration).

## Decisions Made

- **PermissionUser.role kept required** even though MentorshipProfile.role is now optional. Rationale: PermissionUser is a narrower tests+call-site interface; keeping `role` required minimizes churn across the 95 test fixtures and 29 call-sites that Plan 07/08 will migrate. The dual-read helpers handle both shapes uniformly.
- **Promoted `isAcceptedMentor` from private → exported** during the refactor. It was previously a module-internal helper used only by `canCreateRoadmap`. The plan's acceptance criteria require it to be exported; this is a net-zero-risk widening (consumers can now depend on it explicitly instead of re-implementing the mentor-status check).
- **Name `hasAllRoleClaimsClaim` kept verbatim** per D-08 contract despite reading awkwardly (plural "Claims" + singular "Claim"). Matching the locked planning-doc name preserves downstream grep/search consistency; renaming is a coordinated cleanup task.

## Deviations from Plan

**None — plan executed exactly as written.**

One minor placement adjustment worth noting (not a deviation since the plan explicitly allowed it):

- The plan's Task 1 step 3 said "Place them AFTER canOwnerOrAdminAccess and BEFORE isAcceptedMentor". The pre-plan source had `isAcceptedMentor` BEFORE `canOwnerOrAdminAccess` (not after it). I removed the original `isAcceptedMentor` from its pre-existing location and added the refactored exported version after the new role helpers, which is consistent with the plan's intent ("keep related helpers adjacent") and with Task 2's guidance ("place claim-side helpers BEFORE isAcceptedMentor if the ordering in Task 1 placed isAcceptedMentor last").

All grep-based acceptance criteria returned the expected counts. `npx tsc --noEmit` shows zero errors originating from permissions.ts.

## Issues Encountered

- **Pre-existing Jest config issue (out of scope):** Attempting to run `npx jest src/__tests__/permissions.test.ts` fails at the file's first TypeScript type annotation (`const adminUser: PermissionUser = {...}`). This is a pre-existing project Jest/Babel config issue unrelated to this plan's changes — the exact same failure exists on the pre-plan codebase. Logged as out-of-scope; no attempt to fix per scope-boundary rules. Plan 08 (test fixture migration) will need to address Jest/TypeScript parsing as part of its infrastructure work. The primary verification (`npx tsc --noEmit`) is the authoritative correctness check and it passes.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 04 (migration-scripts):** Running in parallel (Wave 2); independent — scripts write `roles: []` directly to Firestore, don't depend on permissions helpers.
- **Plan 05 (firestore-rules-dual-read):** Unblocked — Wave 3 will reference the claim-side dual-read pattern established here (same nullish-coalescing logic applied in rules.firestore).
- **Plan 06 (role-mutation-helper):** Unblocked — can import `hasRole`/`hasAnyRole` to implement pre-mutation validation logic.
- **Plan 07 (call-site migration):** Unblocked — 29 call-sites can now migrate from `profile.role === "mentor"` to `hasRole(profile, "mentor")` one at a time; helpers already handle both shapes via dual-read, so migration is zero-downtime per call-site.
- **Plan 08 (test fixture migration):** Unblocked — 95 fixtures can start adding `roles: [...]` alongside `role:` (or eventually replacing it); Plan 08 will also add explicit unit tests for `hasRole`/`hasAnyRole`/`hasAllRoles`/claim-side helpers (this plan is additive — no tests needed here per plan scope).
- **Plan 09 (client-claim-refresh):** Unblocked — client code can start reading `token.roles` via `hasRoleClaim` today; dual-claim fallback handles users who haven't re-signed-in yet.

---
*Phase: 01-foundation-roles-array-migration*
*Completed: 2026-04-21*

## Self-Check: PASSED

Verified:
- FOUND: src/lib/permissions.ts (modified, contains all six new exported helpers + DecodedRoleClaim interface + refactored isAcceptedMentor)
- FOUND: commit adf1eb8 (feat(01-03): add profile-side role helpers with dual-read semantics)
- FOUND: commit b83dff7 (feat(01-03): add claim-side role helpers for decoded Firebase tokens)
- FOUND: this SUMMARY.md at .planning/phases/01-foundation-roles-array-migration/03-permission-helpers-SUMMARY.md
