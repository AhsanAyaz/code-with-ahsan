---
phase: 01-foundation-roles-array-migration
plan: 07
title: Call-site migration — replace profile.role === "x" with hasRole(profile, "x")
type: execute
wave: 3
depends_on: [03]
files_modified:
  - src/app/admin/page.tsx
  - src/app/admin/users/page.tsx
  - src/app/admin/users/[id]/page.tsx
  - src/app/admin/mentorship/page.tsx
  - src/app/mentorship/page.tsx
  - src/app/mentorship/[username]/page.tsx
  - src/app/api/mentorship/profile/route.ts
  - src/app/api/mentorship/[uid]/route.ts
  - src/app/api/mentorship/route.ts
  - src/app/api/projects/route.ts
  - src/app/api/projects/[id]/route.ts
  - src/app/api/invitations/route.ts
  - src/app/api/invitations/[id]/route.ts
  - src/app/api/roadmaps/route.ts
  - src/app/api/roadmaps/[id]/route.ts
  - src/components/mentorship/MentorshipCard.tsx
  - src/components/mentorship/RoleSelector.tsx
  - src/components/Projects/ProjectCard.tsx
  - src/components/Projects/ProjectForm.tsx
  - src/components/mentorship/MentorshipInvitations.tsx
  - src/components/admin/AdminMentorshipTable.tsx
  - src/contexts/MentorshipContext.tsx
  - src/lib/mentorship.ts
  - src/lib/validation/mentorship.ts
  - src/hooks/useMentorship.ts
autonomous: true
requirements:
  - ROLE-07
deploy: "#4 (app code consumes the new helper; roles-array is the source of truth in reads)"
must_haves:
  truths:
    - "Every `profile.role === \"mentor\"` / `\"mentee\"` / `\"ambassador\"` / `\"alumni-ambassador\"` comparison is replaced with `hasRole(profile, \"...\")`"
    - "Every `profile.role !== \"x\"` is replaced with `!hasRole(profile, \"x\")`"
    - "Every switch/case on `profile.role` is replaced with a guarded hasRole call or an equivalent roles.includes check"
    - "Every write path that previously set `{ role: 'x' }` now also (or instead) sets `roles: ['x', ...]` preserving intent"
    - "Zod form validators now parse `roles: RoleSchema.array()` alongside any legacy role field"
    - "TypeScript strict compile passes across the full repo with ZERO errors after this plan completes"
  artifacts:
    - path: src/lib/mentorship.ts
      provides: "Server-side helpers that consume MentorshipProfile now use roles[] + hasRole"
    - path: src/lib/validation/mentorship.ts
      provides: "Zod schema parses roles: RoleSchema.array()"
      contains: "RoleSchema"
  key_links:
    - from: "every call site previously using profile.role === 'x'"
      to: src/lib/permissions.ts
      via: 'import { hasRole } from "@/lib/permissions"'
      pattern: "hasRole\\("
---

<objective>
Migrate every call site in `src/` that compares against the legacy `profile.role` / `user.role` / `token.role` field to use the new `hasRole`/`hasAnyRole`/`hasAllRoles` helpers from `src/lib/permissions.ts`. After this plan, the roles-array is the canonical read path throughout the app. The legacy `role` field remains populated (for the dual-claim window and tests, until Plans 08 and 10 close it out) but is never consulted directly in logic.

Purpose: Implements ROLE-07 call-site coverage. The 29 files listed in `files_modified` reflect the scout inventory (grep of `.role\b` under src/); the actual count may shift slightly during implementation but the coverage principle stands: ZERO remaining `profile.role === "..."` comparisons in src/ except within src/lib/permissions.ts itself (where the dual-read fallback is INTENTIONAL).
Output: ~29 files migrated from single-role comparisons to hasRole/hasAnyRole/hasAllRoles.
Deploy: Part of Deploy #4.
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
Helper import shape (after Plan 03 is complete):

```typescript
import { hasRole, hasAnyRole, hasAllRoles } from "@/lib/permissions";
// Server-side only:
import { hasRoleClaim, hasAnyRoleClaim, hasAllRoleClaimsClaim } from "@/lib/permissions";
```

Replacement rubric (apply mechanically — one pattern per row):

| Legacy code | Migrated code |
|---|---|
| `profile.role === "mentor"` | `hasRole(profile, "mentor")` |
| `profile.role !== "mentor"` | `!hasRole(profile, "mentor")` |
| `user?.role === "mentee"` | `hasRole(user, "mentee")` |
| `profile.role === "mentor" \|\| profile.role === "mentee"` | `hasAnyRole(profile, ["mentor", "mentee"])` |
| `profile.role === "mentor" && profile.role === "ambassador"` (shouldn't exist but if it does) | `hasAllRoles(profile, ["mentor", "ambassador"])` |
| `decodedToken.role === "mentor"` (API routes) | `hasRoleClaim(decodedToken, "mentor")` |
| `if (profile.role)` (truthiness check) | `if (profile.roles && profile.roles.length > 0)` — PRESERVE null-treatment semantics |
| switch (profile.role) { case "mentor": ... } | Replace with if/else-if ladder using hasRole, OR keep switch on `profile.roles[0] ?? null` if semantics is "primary role" |

Write-side rubric (for forms / API writes that previously set single role):

| Legacy | Migrated |
|---|---|
| `doc.set({ role: "mentor", ... })` | `doc.set({ role: "mentor", roles: ["mentor"], ... })` — keep legacy field populated during dual-write window |
| `doc.update({ role: "mentor" })` | `doc.update({ role: "mentor", roles: FieldValue.arrayUnion("mentor") })` — use arrayUnion to avoid clobbering existing roles |
| Zod schema: `role: RoleSchema` | `role: RoleSchema.optional(), roles: z.array(RoleSchema).default([])` |

**DO NOT** remove the legacy `role` write yet — Plan 10 removes it in Deploy #5.
</interfaces>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Scout the final call-site inventory and produce a migration checklist</name>
  <files>.planning/phases/01-foundation-roles-array-migration/01-07-CALL-SITES.md</files>
  <read_first>
    - src/types/mentorship.ts (Plan 01 output — `Role` type and `MentorshipProfile.roles`)
    - src/lib/permissions.ts (Plan 03 output — the six new helpers)
    - .planning/research/ARCHITECTURE.md §call-site surface (75 occurrences across 29 files from the scout)
  </read_first>
  <action>
    Produce a write-once inventory of every file that references `.role` in `src/` so Task 2 can migrate mechanically. The output goes into `.planning/phases/01-foundation-roles-array-migration/01-07-CALL-SITES.md` and becomes the driving checklist.

    Run these exact grep commands and capture their outputs in the inventory doc:

    ```bash
    # 1. Every file with .role on a profile/user/token object (exclude node_modules, .next, tests)
    grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -E "\b(profile|user|u|token|decoded|member|m|owner|creator)\??\.role\b" src/ | grep -v "\.roles" | grep -v "roleName" | grep -v "RoleSchema" | grep -v "rolePermissions" > /tmp/role-sites.txt

    # 2. Every write-side occurrence (forms, API bodies, Firestore sets/updates)
    grep -rn --include="*.ts" --include="*.tsx" -E "role:\s*\"(mentor|mentee|ambassador|alumni-ambassador)\"" src/ > /tmp/role-writes.txt

    # 3. Every switch/case on role
    grep -rn --include="*.ts" --include="*.tsx" -B1 -A5 "switch.*\.role" src/ > /tmp/role-switches.txt

    # 4. Every MentorshipRole union import (need updating to also import Role)
    grep -rn --include="*.ts" --include="*.tsx" "MentorshipRole" src/ > /tmp/role-imports.txt
    ```

    Write `01-07-CALL-SITES.md` in this structure:

    ```markdown
    # Call-site Migration Inventory — Plan 07

    Generated: <date>
    Source: grep of src/ at HEAD

    ## Read-side call sites (N total across M files)

    | File | Line | Code | Replacement |
    |---|---|---|---|
    | src/app/admin/page.tsx | 42 | `profile.role === "mentor"` | `hasRole(profile, "mentor")` |
    | ... | ... | ... | ... |

    ## Write-side call sites

    | File | Line | Code | Replacement |
    |---|---|---|---|
    | ... | ... | ... | ... |

    ## Switch statements on role

    | File | Line | Action |
    |---|---|---|
    | ... | ... | (rewrite as if/else-if using hasRole) |

    ## Files needing `Role` import added alongside existing MentorshipRole

    - src/...
    - src/...

    ## Files INTENTIONALLY left untouched (documented exceptions)

    - src/lib/permissions.ts — contains the dual-read fallback `profile.role === role`; this is the intentional bridge and MUST stay until Plan 10
    - src/types/mentorship.ts — exports both Role and legacy MentorshipRole during the migration window
    - src/__tests__/permissions.test.ts — fixtures migrate in Plan 08 (separate concern; keeping them separate keeps this PR reviewable)
    ```

    After writing the file, commit it separately so Task 2 has a fixed target — every row must be ticked.
  </action>
  <verify>
    <automated>ls .planning/phases/01-foundation-roles-array-migration/01-07-CALL-SITES.md &amp;&amp; wc -l .planning/phases/01-foundation-roles-array-migration/01-07-CALL-SITES.md</automated>
  </verify>
  <acceptance_criteria>
    - `ls .planning/phases/01-foundation-roles-array-migration/01-07-CALL-SITES.md` returns the path
    - The file has at least one row in the "Read-side call sites" table (the scout found 75 occurrences — expect 50+ rows minimum across the Read + Write tables combined)
    - The file explicitly lists `src/lib/permissions.ts`, `src/types/mentorship.ts`, and `src/__tests__/permissions.test.ts` under "Files INTENTIONALLY left untouched"
    - Each row in the "Read-side" table has a concrete replacement (no "TBD" entries)
    - `grep -c "hasRole" .planning/phases/01-foundation-roles-array-migration/01-07-CALL-SITES.md` returns at least `10`
  </acceptance_criteria>
  <done>
    01-07-CALL-SITES.md exists, lists every legacy role comparison with its mechanical replacement, and enumerates the three intentional exceptions. Task 2's migration has a ticked-checklist target.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Apply the call-site migration — replace every legacy role comparison with hasRole/hasAnyRole/hasAllRoles</name>
  <files>All files listed in 01-07-CALL-SITES.md under "Read-side" and "Write-side" tables (the frontmatter files_modified list is representative; actual edits driven by the inventory)</files>
  <read_first>
    - .planning/phases/01-foundation-roles-array-migration/01-07-CALL-SITES.md (your Task 1 output — this IS the checklist)
    - src/lib/permissions.ts (confirm the import path and exact helper names — no typos)
    - src/types/mentorship.ts (confirm Role import path)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §decisions D-05 (three-verb helpers), D-06 (dual-read fallback is in the helper, not in call-sites)
  </read_first>
  <action>
    Work through the inventory file top-to-bottom. For EACH row:

    **Read-side edits** (mechanical):
    1. Ensure `import { hasRole, hasAnyRole, hasAllRoles } from "@/lib/permissions";` is present in the file (add if missing; merge with existing permissions import if already there).
    2. Replace the legacy expression with its mapped replacement per the rubric in the `<interfaces>` block.
    3. If the file is a server-side API route dealing with a DECODED TOKEN rather than a profile, use the claim-side helpers: `hasRoleClaim` / `hasAnyRoleClaim` / `hasAllRoleClaimsClaim`.

    **Write-side edits** (dual-write during the migration window):
    1. Wherever `doc.set({ role: "x", ... })` appears, change to `doc.set({ role: "x", roles: ["x"], ... })`. Do NOT remove `role` — Plan 10 removes it.
    2. Wherever `doc.update({ role: "x" })` appears, change to:
       ```typescript
       doc.update({
         role: "x",
         roles: FieldValue.arrayUnion("x"),
       });
       ```
       (Add `import { FieldValue } from "firebase-admin/firestore";` if not already imported.)
    3. Wherever a Zod schema accepts `role: RoleSchema` (or the legacy union), change to:
       ```typescript
       role: RoleSchema.optional(),  // legacy dual-write — removed in Deploy #5
       roles: z.array(RoleSchema).default([]),
       ```

    **Switch-statement edits:**
    Switch statements that branch on `profile.role` should be rewritten as if/else-if ladders:
    ```typescript
    if (hasRole(profile, "mentor")) { /* ... */ }
    else if (hasRole(profile, "mentee")) { /* ... */ }
    else if (hasRole(profile, "ambassador")) { /* ... */ }
    ```
    If the switch's semantics is "primary role" (first role wins), an alternative is `switch (profile.roles[0] ?? null)` — but the if/else-if form is preferred because it scales to multi-role profiles correctly.

    **Component prop edits:**
    If a React component has a prop like `role: MentorshipRole`, consider:
    - If the prop is just displayed ("Mentor badge"), leave the prop name as-is and let parents compute it from roles[0].
    - If the prop drives logic, rename to `roles: Role[]` and have the parent pass the array.
    Pick based on blast-radius — renaming a prop is a bigger diff than computing the primary role inline.

    **Critical invariants:**
    - Do NOT touch the three exception files (permissions.ts, types/mentorship.ts, __tests__/permissions.test.ts).
    - Do NOT introduce an `any` cast to silence a type error — fix the underlying shape (usually means adding the `roles` field to the interface or refactoring the call site).
    - Do NOT remove the legacy `role` write — Plan 10 does that.
    - After every 5-10 file edits, run `npx tsc --noEmit 2>&1 | wc -l` and confirm the error count is decreasing (or zero). The error count at the start of this task will be nonzero (Plan 01 broke types intentionally); by the end, `npx tsc --noEmit` MUST return zero errors.

    Commit in small logical groups (by directory: api/, components/, hooks/, etc.) — makes review + potential revert easier.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&amp;1 | tee /tmp/tsc-after-plan-07.log | wc -l ; grep -rEn --include="*.ts" --include="*.tsx" "(profile|user|token|decoded)\??\.role\s*===" src/ | grep -v "src/lib/permissions.ts" | grep -v "src/types/mentorship.ts" | wc -l</automated>
  </verify>
  <acceptance_criteria>
    - `npx tsc --noEmit 2>&1` exits 0 (ZERO TypeScript errors across the whole repo — the end-state invariant for Plan 07)
    - `grep -rEn --include="*.ts" --include="*.tsx" "(profile|user|token|decoded)\??\.role\s*===" src/ | grep -v "src/lib/permissions.ts" | grep -v "src/types/mentorship.ts" | wc -l` returns `0` — NO remaining direct role-string comparisons outside the exception files
    - `grep -rcE "hasRole\(" src/ | grep -v ":0$" | wc -l` returns at least `15` (hasRole is used in at least 15 files)
    - Every row in 01-07-CALL-SITES.md is marked with a "migrated" tick (update the inventory file as you go — this is the checklist)
    - `git diff --stat src/` shows modifications in at least 20 files
    - `npm test` (if the project has a test command) — run this AFTER Plan 08 migrates fixtures. If Plan 08 hasn't run yet, tests will fail with type errors from fixtures; that's expected and handled by Plan 08.
    - No new `any` casts introduced: `git diff src/ | grep -E "^\+.*as any" | wc -l` returns `0`
  </acceptance_criteria>
  <done>
    Every call site in src/ outside the three exception files uses hasRole/hasAnyRole/hasAllRoles (or their claim-side mirrors). TypeScript strict mode compiles with zero errors. Write-side paths dual-write both `role` and `roles` during the migration window.
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` returns zero errors — the primary coverage signal.
- `grep -rEn --include="*.ts" --include="*.tsx" "\.role\s*===" src/ | grep -v permissions.ts | grep -v types/mentorship.ts | wc -l` returns `0`.
- `git grep "hasRole" src/ | wc -l` returns at least 30 (coverage is broad, not just one file).
- Manual smoke test via `npm run dev`: load the existing mentor directory page, verify mentor-tagged cards still render correctly (no regressions from the migration).
</verification>

<success_criteria>
- [x] Call-site inventory written to 01-07-CALL-SITES.md
- [x] Every legacy `profile.role === "x"` migrated to `hasRole(profile, "x")` outside the three exception files
- [x] Every write-side path dual-writes `role` + `roles` during the migration window
- [x] Zod schemas accept `roles: z.array(RoleSchema).default([])` alongside optional legacy `role`
- [x] TypeScript strict compile passes with zero errors across the full repo
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-roles-array-migration/01-07-SUMMARY.md` documenting:
- Final count of files modified (from `git diff --stat src/ | tail -1`)
- Final count of hasRole occurrences introduced (`grep -rc "hasRole" src/ | awk -F: '{s+=$2} END{print s}'`)
- The three files intentionally left untouched (permissions.ts, types/mentorship.ts, __tests__/permissions.test.ts)
- Confirmation that `npx tsc --noEmit` exits 0
- Any unexpected call-sites found during migration that weren't in the Plan 01 scout (surface for future refactor consideration)
</output>
