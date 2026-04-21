---
phase: 01-foundation-roles-array-migration
plan: 01
title: Types and Zod role schema
type: execute
wave: 1
depends_on: []
files_modified:
  - src/types/mentorship.ts
autonomous: true
requirements:
  - ROLE-01
deploy: "#1 (types + helpers + dual-read; no-op ship)"
must_haves:
  truths:
    - "`Role` type union and `RoleSchema` Zod enum exist in src/types/mentorship.ts with exactly the four values"
    - "`MentorshipProfile` has `roles: string[]` as a required field and keeps `role?: MentorshipRole` as optional legacy during migration window"
    - "Importing `Role` / `RoleSchema` from '@/types/mentorship' compiles under strict TypeScript"
  artifacts:
    - path: src/types/mentorship.ts
      provides: "Role union, RoleSchema Zod enum, MentorshipProfile.roles field"
      contains: 'export const RoleSchema = z.enum(["mentor","mentee","ambassador","alumni-ambassador"])'
  key_links:
    - from: src/types/mentorship.ts
      to: "zod v4 import"
      via: 'import { z } from "zod"'
      pattern: "z\\.enum\\(\\[\"mentor\",\"mentee\",\"ambassador\",\"alumni-ambassador\"\\]\\)"
---

<objective>
Introduce the canonical `Role` vocabulary and Zod schema in src/types/mentorship.ts, and extend `MentorshipProfile` with a required `roles: string[]` field while keeping the legacy `role?: MentorshipRole` optional during the dual-read window. This is the forcing function that will surface every downstream call-site and test fixture that still uses the single-role shape.

Purpose: Lock the four-role vocabulary (D-01) into the type system and runtime validator so every downstream plan imports from a single path (D-03). Implements ROLE-01.
Output: `Role`, `RoleSchema`, updated `MentorshipProfile` interface exported from src/types/mentorship.ts.
Deploy: Part of Deploy #1 (types + helpers + dual-read; ships as no-op — no data changes yet).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md
@.planning/research/ARCHITECTURE.md
@.planning/research/STACK.md
@src/types/mentorship.ts
</context>

<interfaces>
<!-- Current shape (from src/types/mentorship.ts) — the target shape is derived from this. -->

Existing export (to remain available during migration):
```typescript
export type MentorshipRole = "mentor" | "mentee" | null;
```

Existing interface (fields kept verbatim, only role → add roles):
```typescript
export interface MentorshipProfile {
  uid: string;
  username?: string;
  role: MentorshipRole;       // becomes optional legacy
  displayName: string;
  // ... many other fields unchanged ...
}
```

Zod 4.3 is installed (per STACK.md). Use top-level helpers: `z.enum([...])`, `z.string()`, `z.array(...)`.
</interfaces>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add Role union, RoleSchema Zod enum, and update MentorshipProfile.roles in src/types/mentorship.ts</name>
  <files>src/types/mentorship.ts</files>
  <read_first>
    - src/types/mentorship.ts (read current state — especially lines 1-48 for the MentorshipProfile interface and line 6 MentorshipRole)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §decisions (D-01, D-03, D-04)
    - .planning/research/STACK.md §5 "Zod 4 note for planners" (z.enum, z.email, z.url top-level forms)
  </read_first>
  <action>
    Edit src/types/mentorship.ts to add the following exports at the TOP of the file (immediately after the header comment on lines 1-4, BEFORE the existing `export type MentorshipRole` on line 6):

    1. Add the zod import at the very top of the file (after the header comment, before any type declarations):
       ```typescript
       import { z } from "zod";
       ```

    2. Add the canonical Role vocabulary (per D-01). Immediately below the new import add:
       ```typescript
       /**
        * Canonical role vocabulary for v6.0+.
        * Locked as a Zod enum + TypeScript union so typos fail at compile time
        * and at the API boundary (per D-01 in 01-CONTEXT.md).
        *
        * NOTE: `admin` is deliberately NOT in this union. Admin remains a separate
        * `isAdmin: boolean` field on MentorshipProfile + `token.admin` custom claim
        * (per D-02 in 01-CONTEXT.md).
        */
       export const RoleSchema = z.enum(["mentor", "mentee", "ambassador", "alumni-ambassador"]);
       export type Role = z.infer<typeof RoleSchema>;
       ```

    3. Keep the existing `export type MentorshipRole = "mentor" | "mentee" | null;` UNCHANGED (it is still imported by src/lib/permissions.ts and will be removed in the final cleanup PR — Deploy #5).

    4. Modify the `MentorshipProfile` interface (currently lines 12-48):
       - Change the `role: MentorshipRole;` line to: `role?: MentorshipRole; // LEGACY — removed in Deploy #5 cleanup PR (per D-06 dual-read)`
       - Add a new required field immediately after the `role?` line: `roles: Role[]; // Post-migration invariant: always an array (possibly empty). Never undefined/null (per D-04).`

    Do NOT change any other field in MentorshipProfile. Do NOT touch any other exported type in this file (Project, Roadmap, MentorBooking, etc.). The change is surgical.

    Use the Role type (not MentorshipRole) for the new `roles` array. Mixing them would let `null` into the array and break every `array-contains` query silently (see PITFALLS.md §Pitfall 2).
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&amp;1 | head -100</automated>
  </verify>
  <acceptance_criteria>
    - `grep -n 'import { z } from "zod";' src/types/mentorship.ts` returns exactly one match
    - `grep -c 'export const RoleSchema = z.enum(\[\"mentor\",\"mentee\",\"ambassador\",\"alumni-ambassador\"\])' src/types/mentorship.ts` returns `1`
    - `grep -c 'export type Role = z.infer<typeof RoleSchema>' src/types/mentorship.ts` returns `1`
    - `grep -c 'roles: Role\[\];' src/types/mentorship.ts` returns `1`
    - `grep -c 'role?: MentorshipRole;' src/types/mentorship.ts` returns `1` (legacy field is now optional, not required)
    - `grep -c 'export type MentorshipRole = \"mentor\" \| \"mentee\" \| null;' src/types/mentorship.ts` returns `1` (legacy type still exported for downstream imports — removed in Deploy #5)
    - `npx tsc --noEmit` exits non-zero and reports errors ONLY in files that construct MentorshipProfile objects without the new `roles` field (this is the TypeScript-breaking forcing function; downstream plans fix them). Record the list of files that fail in the PLAN SUMMARY so Plan 07 can confirm coverage.
    - No changes to any other exported type in src/types/mentorship.ts (verify: `git diff --stat src/types/mentorship.ts` shows only additions + the one `role:` → `role?:` + new `roles:` line)
  </acceptance_criteria>
  <done>
    src/types/mentorship.ts exports the canonical Role union, RoleSchema Zod enum, and MentorshipProfile.roles: Role[] required field. Legacy MentorshipRole type and role? field remain for the dual-read window (removed in Deploy #5). TypeScript compile surfaces every downstream construction site (expected — Plans 03, 04, 06, 07, 08 will fix them).
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` surfaces the expected break sites (no runtime error; ok if there are errors in files that construct MentorshipProfile with only `role` and no `roles` — those are the downstream tasks that will be fixed by Plans 03, 04, 06, 07, 08).
- `grep -n "export const RoleSchema" src/types/mentorship.ts` returns exactly the one expected line.
- Import path `@/types/mentorship` exposes `Role`, `RoleSchema`, `MentorshipProfile`, and the legacy `MentorshipRole` simultaneously.
</verification>

<success_criteria>
- [x] Role union + RoleSchema Zod enum exported from src/types/mentorship.ts
- [x] MentorshipProfile now has `roles: Role[]` required field and `role?: MentorshipRole` optional legacy
- [x] No breaking changes to unrelated types in the same file
- [x] Legacy MentorshipRole type still exported (used by src/lib/permissions.ts:15 until Deploy #5)
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-roles-array-migration/01-01-SUMMARY.md` documenting:
- The exact exports added (Role, RoleSchema)
- The list of files that now fail `tsc --noEmit` (so Plan 07 can confirm full coverage)
- Any unexpected dependencies discovered (other files that break)
</output>
