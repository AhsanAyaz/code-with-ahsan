---
phase: 01-foundation-roles-array-migration
plan: 08
title: Test fixture migration + new coverage for hasRole/hasAnyRole/hasAllRoles
type: execute
wave: 4
depends_on: [03, 07]
files_modified:
  - src/__tests__/permissions.test.ts
autonomous: true
requirements:
  - ROLE-06
deploy: "#4 (tests updated alongside app code so CI stays green; no data change)"
must_haves:
  truths:
    - "Every existing test fixture that previously carried `role: \"mentor\"` / `role: \"mentee\"` now ALSO carries `roles: [\"mentor\"]` / `roles: [\"mentee\"]` — dual-write at the fixture level so tests exercise both the array-read and legacy-fallback paths"
    - "New test coverage exists for hasRole (6+ cases), hasAnyRole (6+ cases), hasAllRoles (6+ cases), covering: single-role match, no-match, empty-roles, null-profile, legacy fallback, empty argument arrays"
    - "New test coverage exists for hasRoleClaim, hasAnyRoleClaim, hasAllRoleClaimsClaim (3+ cases each)"
    - "Every existing test that was passing before Plan 01 still passes after Plan 08"
    - "`npm test` exits 0 with no warnings about deprecated fixture shape"
    - "Coverage on src/lib/permissions.ts reaches 100% line + branch (or as close as Jest/Vitest reports)"
  artifacts:
    - path: src/__tests__/permissions.test.ts
      provides: "Migrated fixtures + comprehensive coverage for the six new helpers"
      contains: "hasRole"
  key_links:
    - from: src/__tests__/permissions.test.ts
      to: src/lib/permissions.ts
      via: 'import { hasRole, hasAnyRole, hasAllRoles, hasRoleClaim, hasAnyRoleClaim, hasAllRoleClaimsClaim } from "@/lib/permissions"'
      pattern: "hasRole"
---

<objective>
Migrate the 95 test fixtures in `src/__tests__/permissions.test.ts` from the legacy single-role shape (`role: "mentor"`) to the dual-shape expected during the migration window (`role: "mentor", roles: ["mentor"]`). Also add comprehensive new coverage for the six helpers introduced in Plan 03 so the test suite validates dual-read semantics, null-safety, and three-verb separation at every boundary.

Purpose: Implements ROLE-06. Closes the "tests silently passing on stub data" pitfall from PITFALLS.md §Pitfall 3.
Output: One large edit to src/__tests__/permissions.test.ts.
Deploy: Part of Deploy #4 (tests updated alongside app code).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md
@.planning/research/PITFALLS.md
@src/__tests__/permissions.test.ts
@src/lib/permissions.ts
@src/types/mentorship.ts
</context>

<interfaces>
Current test fixture shape (example from scout):

```typescript
const mentor: PermissionUser = {
  uid: "u1",
  role: "mentor",
  status: "accepted",
  isAdmin: false,
};
```

Target post-migration fixture shape:

```typescript
const mentor: PermissionUser = {
  uid: "u1",
  role: "mentor",        // legacy — kept during dual-read window
  roles: ["mentor"],     // NEW — authoritative post-migration
  status: "accepted",
  isAdmin: false,
};
```

For multi-role scenarios (new in v6.0 — not present in v5.x tests):

```typescript
const mentorAndAmbassador: PermissionUser = {
  uid: "u2",
  role: "mentor",        // legacy captures only the primary role
  roles: ["mentor", "ambassador"],  // new — captures the full set
  status: "accepted",
  isAdmin: false,
};
```

For tests exercising the LEGACY-FALLBACK branch of hasRole (simulating a pre-migration doc that hasn't been backfilled yet):

```typescript
const legacyProfile: PermissionUser = {
  uid: "u3",
  role: "mentor",
  // roles INTENTIONALLY absent — forces helper to fall back to legacy role
  status: "accepted",
  isAdmin: false,
};
// expect: hasRole(legacyProfile, "mentor") === true
```
</interfaces>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Migrate all 95 existing fixtures to dual-shape + add new coverage for the six helpers</name>
  <files>src/__tests__/permissions.test.ts</files>
  <read_first>
    - src/__tests__/permissions.test.ts (FULL file — read every describe/it block so the migration preserves existing semantics)
    - src/lib/permissions.ts (Plan 03 output — signatures for hasRole, hasAnyRole, hasAllRoles, hasRoleClaim, hasAnyRoleClaim, hasAllRoleClaimsClaim)
    - src/types/mentorship.ts (Plan 01 output — Role type + RoleSchema)
    - .planning/research/PITFALLS.md §Pitfall 3 (tests silently passing on stub data — the core risk this plan defends against)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §decisions D-07 (null-safe helpers)
  </read_first>
  <action>
    **Part A — Mechanical fixture migration:**

    For every fixture object in src/__tests__/permissions.test.ts that carries a `role: "mentor" | "mentee"` field, add a matching `roles: [...]` field immediately after. The recipe is:

    - `role: "mentor"` → add `roles: ["mentor"]`
    - `role: "mentee"` → add `roles: ["mentee"]`
    - `role: null` or absent → add `roles: []`

    Do NOT remove the `role` field — keep both shapes. Plan 10 removes `role` from fixtures when the legacy field is removed repo-wide.

    Grep-verifiable: after this part, `grep -c "role: \"" src/__tests__/permissions.test.ts` should return the same count as before (no legacy fields removed) AND `grep -c "roles: \[" src/__tests__/permissions.test.ts` should return roughly the same count (every fixture now has both shapes).

    **Part B — Preserve existing it() blocks verbatim:**

    Each existing `it("...", () => { expect(...).toBe(...) })` block MUST still pass with the migrated fixture. Only the fixture objects change. If a previous test was `expect(isAcceptedMentor(mentor)).toBe(true)`, that test must still pass because `isAcceptedMentor` was refactored onto `hasRole` in Plan 03 with preserved semantics.

    **Part C — Add new describe blocks for the six helpers:**

    Add these describe blocks at the END of the file (after existing blocks). Each is self-contained — no shared mutable state with existing tests.

    ```typescript
    describe("hasRole (new helper)", () => {
      const mentorProfile: PermissionUser = { uid: "u1", role: "mentor", roles: ["mentor"], status: "accepted", isAdmin: false };
      const multiProfile: PermissionUser = { uid: "u2", role: "mentor", roles: ["mentor", "ambassador"], status: "accepted", isAdmin: false };
      const emptyProfile: PermissionUser = { uid: "u3", role: null, roles: [], status: "pending", isAdmin: false };
      const legacyOnlyProfile: PermissionUser = {
        uid: "u4",
        role: "mentor",
        status: "accepted",
        isAdmin: false,
        // roles INTENTIONALLY absent — forces legacy fallback path
      } as PermissionUser; // cast needed because roles is optional on PermissionUser

      it("returns true for a role present in profile.roles", () => {
        expect(hasRole(mentorProfile, "mentor")).toBe(true);
      });

      it("returns true for any role in a multi-role profile", () => {
        expect(hasRole(multiProfile, "mentor")).toBe(true);
        expect(hasRole(multiProfile, "ambassador")).toBe(true);
      });

      it("returns false for a role not in profile.roles (even if other roles exist)", () => {
        expect(hasRole(mentorProfile, "ambassador")).toBe(false);
      });

      it("returns false for empty roles array (post-migration state)", () => {
        expect(hasRole(emptyProfile, "mentor")).toBe(false);
      });

      it("falls back to legacy profile.role when profile.roles is absent (D-06 dual-read)", () => {
        expect(hasRole(legacyOnlyProfile, "mentor")).toBe(true);
        expect(hasRole(legacyOnlyProfile, "mentee")).toBe(false);
      });

      it("returns false for null or undefined profile (D-07 null-safe)", () => {
        expect(hasRole(null, "mentor")).toBe(false);
        expect(hasRole(undefined, "mentor")).toBe(false);
      });
    });

    describe("hasAnyRole (new helper)", () => {
      const multiProfile: PermissionUser = { uid: "u1", role: "mentor", roles: ["mentor", "ambassador"], status: "accepted", isAdmin: false };
      const emptyProfile: PermissionUser = { uid: "u2", role: null, roles: [], status: "pending", isAdmin: false };
      const legacyOnlyProfile = {
        uid: "u3", role: "mentee", status: "accepted", isAdmin: false,
      } as PermissionUser;

      it("returns true when at least one argument role is present", () => {
        expect(hasAnyRole(multiProfile, ["mentor", "alumni-ambassador"])).toBe(true);
      });

      it("returns true when the profile has all argument roles", () => {
        expect(hasAnyRole(multiProfile, ["mentor", "ambassador"])).toBe(true);
      });

      it("returns false when no argument role is present", () => {
        expect(hasAnyRole(multiProfile, ["mentee", "alumni-ambassador"])).toBe(false);
      });

      it("returns false for empty argument array", () => {
        expect(hasAnyRole(multiProfile, [])).toBe(false);
      });

      it("returns false for empty roles array", () => {
        expect(hasAnyRole(emptyProfile, ["mentor"])).toBe(false);
      });

      it("falls back to legacy role when roles is absent", () => {
        expect(hasAnyRole(legacyOnlyProfile, ["mentee", "mentor"])).toBe(true);
        expect(hasAnyRole(legacyOnlyProfile, ["ambassador"])).toBe(false);
      });

      it("returns false for null/undefined profile", () => {
        expect(hasAnyRole(null, ["mentor"])).toBe(false);
        expect(hasAnyRole(undefined, ["mentor"])).toBe(false);
      });
    });

    describe("hasAllRoles (new helper)", () => {
      const multiProfile: PermissionUser = { uid: "u1", role: "mentor", roles: ["mentor", "ambassador"], status: "accepted", isAdmin: false };
      const mentorOnly: PermissionUser = { uid: "u2", role: "mentor", roles: ["mentor"], status: "accepted", isAdmin: false };
      const legacyOnlyProfile = {
        uid: "u3", role: "mentor", status: "accepted", isAdmin: false,
      } as PermissionUser;

      it("returns true when profile has every argument role", () => {
        expect(hasAllRoles(multiProfile, ["mentor", "ambassador"])).toBe(true);
      });

      it("returns false when profile is missing one argument role", () => {
        expect(hasAllRoles(mentorOnly, ["mentor", "ambassador"])).toBe(false);
      });

      it("returns true (vacuous) for empty argument array", () => {
        expect(hasAllRoles(multiProfile, [])).toBe(true);
      });

      it("legacy fallback: returns true iff argument is exactly one role matching profile.role", () => {
        expect(hasAllRoles(legacyOnlyProfile, ["mentor"])).toBe(true);
        expect(hasAllRoles(legacyOnlyProfile, ["mentor", "ambassador"])).toBe(false);
      });

      it("returns false for null/undefined profile", () => {
        expect(hasAllRoles(null, ["mentor"])).toBe(false);
        expect(hasAllRoles(undefined, ["mentor"])).toBe(false);
      });
    });

    describe("claim-side helpers (hasRoleClaim / hasAnyRoleClaim / hasAllRoleClaimsClaim)", () => {
      const arrayClaim = { uid: "u1", roles: ["mentor", "ambassador"], admin: false } as const;
      const legacyClaim = { uid: "u2", role: "mentor", admin: false } as const;
      const emptyClaim = { uid: "u3", roles: [], admin: false } as const;

      it("hasRoleClaim reads token.roles", () => {
        expect(hasRoleClaim(arrayClaim, "mentor")).toBe(true);
        expect(hasRoleClaim(arrayClaim, "mentee")).toBe(false);
      });

      it("hasRoleClaim falls back to legacy token.role", () => {
        expect(hasRoleClaim(legacyClaim, "mentor")).toBe(true);
        expect(hasRoleClaim(legacyClaim, "mentee")).toBe(false);
      });

      it("hasRoleClaim returns false for null/undefined/empty-roles token", () => {
        expect(hasRoleClaim(null, "mentor")).toBe(false);
        expect(hasRoleClaim(undefined, "mentor")).toBe(false);
        expect(hasRoleClaim(emptyClaim, "mentor")).toBe(false);
      });

      it("hasAnyRoleClaim honors multi-role intent", () => {
        expect(hasAnyRoleClaim(arrayClaim, ["mentee", "ambassador"])).toBe(true);
        expect(hasAnyRoleClaim(arrayClaim, ["mentee", "alumni-ambassador"])).toBe(false);
      });

      it("hasAllRoleClaimsClaim returns true iff every argument is present", () => {
        expect(hasAllRoleClaimsClaim(arrayClaim, ["mentor", "ambassador"])).toBe(true);
        expect(hasAllRoleClaimsClaim(arrayClaim, ["mentor", "mentee"])).toBe(false);
      });

      it("hasAllRoleClaimsClaim legacy fallback only satisfiable for single-role argument", () => {
        expect(hasAllRoleClaimsClaim(legacyClaim, ["mentor"])).toBe(true);
        expect(hasAllRoleClaimsClaim(legacyClaim, ["mentor", "ambassador"])).toBe(false);
      });
    });
    ```

    **Part D — Update the import line:**

    At the top of the file, update the import from `@/lib/permissions` to include the six new helpers:

    ```typescript
    import {
      // existing imports preserved:
      isAuthenticated, isAdminUser, isOwner, canOwnerOrAdminAccess, isAcceptedMentor,
      // NEW:
      hasRole, hasAnyRole, hasAllRoles,
      hasRoleClaim, hasAnyRoleClaim, hasAllRoleClaimsClaim,
    } from "@/lib/permissions";
    ```

    If the existing file imports helpers individually, merge them into a single import statement to avoid duplicate-import lint errors.

    Do NOT remove any existing describe / it block. Do NOT change any assertion. If the existing test file has 95 fixtures across N describe blocks, the output file has at least 95+new-coverage fixtures across N+4 describe blocks.
  </action>
  <verify>
    <automated>npm test -- src/__tests__/permissions.test.ts 2>&amp;1 | tail -30 ; grep -c "hasRole(" src/__tests__/permissions.test.ts ; grep -c "roles: \[" src/__tests__/permissions.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `npm test -- src/__tests__/permissions.test.ts` exits 0 (all tests pass)
    - `grep -c "describe(\"hasRole" src/__tests__/permissions.test.ts` returns at least `1`
    - `grep -c "describe(\"hasAnyRole" src/__tests__/permissions.test.ts` returns at least `1`
    - `grep -c "describe(\"hasAllRoles" src/__tests__/permissions.test.ts` returns at least `1`
    - `grep -c "describe(\"claim-side helpers" src/__tests__/permissions.test.ts` returns `1`
    - `grep -c "hasRole(" src/__tests__/permissions.test.ts` returns at least `10`
    - `grep -c "hasAnyRole(" src/__tests__/permissions.test.ts` returns at least `6`
    - `grep -c "hasAllRoles(" src/__tests__/permissions.test.ts` returns at least `6`
    - `grep -c "hasRoleClaim(" src/__tests__/permissions.test.ts` returns at least `4`
    - `grep -c "hasAllRoleClaimsClaim(" src/__tests__/permissions.test.ts` returns at least `2`
    - `grep -c "roles: \[" src/__tests__/permissions.test.ts` returns at least `50` (all existing fixtures migrated + new ones)
    - `grep -c "role: \"mentor\"" src/__tests__/permissions.test.ts` returns at least `20` (legacy field preserved for dual-shape testing)
    - Coverage report (if `npm test -- --coverage` is supported): src/lib/permissions.ts shows 100% line + branch coverage, or as close as the tooling reports
  </acceptance_criteria>
  <done>
    src/__tests__/permissions.test.ts has every existing fixture migrated to dual-shape, all pre-existing tests still pass, and four new describe blocks cover hasRole/hasAnyRole/hasAllRoles + claim-side mirrors with null-safety, legacy-fallback, multi-role, and empty-argument edge cases.
  </done>
</task>

</tasks>

<verification>
- `npm test` exits 0 across the whole repo.
- Coverage of src/lib/permissions.ts reaches 100% line + branch (inspect `coverage/lcov-report/src/lib/permissions.ts.html` if available).
- `git diff --stat src/__tests__/permissions.test.ts` shows a large additive diff (hundreds of line-insertions) but no fixture removals beyond whitespace cleanup.
- Manual spot-check: pick one migrated fixture, run the single test in isolation: `npm test -- -t "hasRole returns true for a role present"` passes.
</verification>

<success_criteria>
- [x] All 95 existing permissions.test.ts fixtures migrated to dual-shape (both `role` and `roles` fields present)
- [x] Four new describe blocks added for hasRole / hasAnyRole / hasAllRoles / claim-side helpers
- [x] Null-safe, legacy-fallback, multi-role, and empty-argument edge cases all covered
- [x] Import statement consolidated to include the six new helpers alongside existing ones
- [x] npm test exits 0
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-roles-array-migration/01-08-SUMMARY.md` documenting:
- Total number of fixtures migrated (from `grep -c "PermissionUser =" src/__tests__/permissions.test.ts`)
- Total new describe blocks (should be 4)
- Total new it() tests added (count from `grep -c "^    it(" src/__tests__/permissions.test.ts` minus the pre-existing count)
- Coverage numbers for src/lib/permissions.ts (line/branch/function)
- Confirmation that all previously-passing tests still pass
</output>
