---
phase: 01-foundation-roles-array-migration
plan: 01
subsystem: types
tags: [zod, typescript, roles, mentorship, ambassador, schema]

# Dependency graph
requires: []
provides:
  - "Canonical Role TypeScript union and RoleSchema Zod enum (locked to 4 values)"
  - "MentorshipProfile.roles: Role[] required field (post-migration invariant)"
  - "Legacy MentorshipRole type preserved + role? made optional (dual-read window)"
affects:
  - 01-03-permission-helpers
  - 01-04-migration-scripts
  - 01-06-role-mutation-helper
  - 01-07-call-site-migration
  - 01-08-test-fixture-migration
  - 01-10-final-cleanup-deploy5
  - phase-02-application-pipeline

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Role vocabulary locked via z.enum([...]) + z.infer type export (single-source-of-truth pattern)"
    - "Dual-read migration pattern: new required field added alongside legacy optional field during compatibility window"

key-files:
  created: []
  modified:
    - src/types/mentorship.ts

key-decisions:
  - "Four-role vocabulary frozen: mentor, mentee, ambassador, alumni-ambassador (D-01)"
  - "Admin deliberately NOT in roles[] — stays as isAdmin boolean + token.admin claim (D-02)"
  - "Canonical Role/RoleSchema exports live in src/types/mentorship.ts (single import path for downstream) (D-03)"
  - "roles: Role[] is required (never undefined/null) — empty arrays replace null checks (D-04)"

patterns-established:
  - "Zod enum + z.infer<typeof Schema> type export: runtime validator and compile-time type stay in lockstep"
  - "Legacy-field deprecation: change `field: T` to `field?: T` with LEGACY comment citing removal deploy"

requirements-completed:
  - ROLE-01

# Metrics
duration: ~2min
completed: 2026-04-21
---

# Phase 01 Plan 01: Types and Zod Role Schema Summary

**Four-role vocabulary (mentor, mentee, ambassador, alumni-ambassador) locked into src/types/mentorship.ts as a Zod enum + TypeScript union, with MentorshipProfile extended to require `roles: Role[]` while keeping `role?: MentorshipRole` as legacy for the dual-read window.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-21T21:21:44Z
- **Completed:** 2026-04-21T21:23:05Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added `import { z } from "zod"` to src/types/mentorship.ts (matches existing `src/lib/validation/urls.ts` convention)
- Exported `RoleSchema = z.enum(["mentor", "mentee", "ambassador", "alumni-ambassador"])` as the canonical runtime validator (per D-01)
- Exported `Role = z.infer<typeof RoleSchema>` as the canonical TS union (per D-03)
- Added required `roles: Role[]` field to MentorshipProfile (per D-04 — post-migration invariant: always an array, possibly empty, never undefined/null)
- Demoted legacy `role: MentorshipRole` to `role?: MentorshipRole` with inline comment citing Deploy #5 cleanup (per D-06)
- Preserved `export type MentorshipRole = "mentor" | "mentee" | null` for src/lib/permissions.ts:15 imports (removed in Deploy #5)
- Forced TypeScript-level break at every downstream MentorshipProfile construction site (intentional — fixed by Plans 03, 04, 06, 07, 08)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Role union, RoleSchema Zod enum, and update MentorshipProfile.roles** — `3c292c4` (feat)

**Plan metadata:** _pending_ (docs: complete plan)

## Files Created/Modified

- `src/types/mentorship.ts` — Added zod import, exported `RoleSchema` (Zod enum) and `Role` (TS union), added required `roles: Role[]` field to MentorshipProfile, demoted legacy `role` field to optional. No other types in the file were touched.

## TypeScript Break Sites (for Plan 07 coverage)

Running `npx tsc --noEmit` after this change surfaces exactly **1 construction site** that fails because the new `roles: Role[]` field is required:

| # | File | Line | Context |
|---|------|------|---------|
| 1 | `src/app/mentorship/dashboard/[matchId]/layout.tsx` | 24 | Builds a `MentorshipProfile`-typed object literal with `role: "mentee"` but no `roles` array |

**Why only one site?** The other 12 files that reference `MentorshipProfile` (grep shows 13 total including mentorship.ts itself) either:
- Use `MentorshipProfile` as a declared type for function params / state / return values (TypeScript allows structurally incomplete values only at creation, not at assignment-from-existing-value), so Firestore-sourced documents flow through without a literal-construction typecheck; OR
- Use `Partial<MentorshipProfile>` (as in denormalized `partnerProfile` fields in `MatchWithProfile`), which makes all fields optional.

**Plan 07 (call-site migration) will need to expand the surface beyond TS errors** — it must audit all 13 files plus the mentorship write paths (API routes) to ensure new profile docs are written with `roles: []` at creation time, even though TS alone will only flag the one literal construction above. Recommend Plan 07 grep for `MentorshipProfile` across src/ AND audit the profile write sites (`src/app/api/mentorship/profile/route.ts`, seeding scripts).

**Test fixture break sites (Plan 08):** Not yet surfaced — `src/__tests__/permissions.test.ts` uses a local `PermissionUser` fixture shape, not `MentorshipProfile` directly; Plan 08 will migrate those 95 fixtures to include `roles: []` based on its own grep pass.

## Decisions Made

None beyond the decisions already logged in 01-CONTEXT.md (D-01..D-04, D-06). Plan executed exactly as specified.

## Deviations from Plan

None — plan executed exactly as written. All grep-based acceptance criteria returned the expected counts of `1`. `npx tsc --noEmit` surfaced the expected downstream break (one construction site) with no other unexpected errors.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 02 (feature-flag-helper):** Unblocked. Runs in parallel (Wave 1).
- **Plan 03 (permission-helpers):** Unblocked — `Role`, `RoleSchema`, and `MentorshipProfile.roles` are all importable from `@/types/mentorship`.
- **Plan 04+ (downstream):** All downstream plans now have a stable canonical import path. Forcing function is live: `tsc --noEmit` will fail at every literal construction site until `roles: []` is added.

---
*Phase: 01-foundation-roles-array-migration*
*Completed: 2026-04-21*

## Self-Check: PASSED

Verified:
- FOUND: src/types/mentorship.ts (modified, contains RoleSchema + Role + roles field)
- FOUND: commit 3c292c4 (feat(01-01): add Role union, RoleSchema, and MentorshipProfile.roles field)
- FOUND: this SUMMARY.md at .planning/phases/01-foundation-roles-array-migration/01-types-zod-role-schema-SUMMARY.md
