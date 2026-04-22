---
phase: 02-application-subsystem
plan: "01"
subsystem: api
tags: [zod, typescript, firebase, discord, ambassador]

# Dependency graph
requires:
  - phase: 01-foundation-roles-array-migration
    provides: Role enum + MentorshipProfile.roles[] type contract; syncRoleClaim helper; ambassador folder scaffold (roleMutation.ts)

provides:
  - ApplicationDoc + CohortDoc TypeScript interfaces for Firestore shapes
  - ApplicationStatus, CohortStatus, VideoEmbedType, AcademicVerificationPath Zod enums + TS unions
  - ApplicationSubmitSchema + CohortCreateSchema + CohortPatchSchema + ApplicationReviewSchema Zod validation
  - AMBASSADOR_DISCORD_MIN_AGE_DAYS named constant (D-03)
  - AMBASSADOR_APPLICATIONS_COLLECTION / AMBASSADOR_COHORTS_COLLECTION Firestore collection names
  - APPLICATION_VIDEO_PROMPTS fixed-length prompt labels (D-04)
  - DISCORD_AMBASSADOR_ROLE_ID placeholder constant (DISC-02, DISC-03)

affects:
  - 02-02-video-url-validator (imports ApplicationSubmitSchema from @/types/ambassador)
  - 02-03-academic-email-validator (imports ApplicationDoc, AcademicVerificationPath)
  - 02-04-cohort-api (imports CohortDoc, CohortCreateSchema, CohortCreateInput)
  - 02-05-application-api (imports ApplicationDoc, ApplicationSubmitSchema)
  - 02-06-review-api (imports ApplicationDoc, ApplicationReviewSchema, DISCORD_AMBASSADOR_ROLE_ID)
  - 02-07-apply-form (imports ApplicationSubmitSchema, APPLICATION_VIDEO_PROMPTS)
  - 02-08-admin-panel (imports ApplicationDoc, CohortDoc)
  - 02-09-preflight (replaces DISCORD_AMBASSADOR_ROLE_ID placeholder, reviews AMBASSADOR_DISCORD_MIN_AGE_DAYS)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zod enum + TS union locked together — typos fail at both compile time and API boundary (mirrors src/types/mentorship.ts pattern)"
    - "Named constants module for all magic values — one-line edit to change Discord age threshold"
    - "Placeholder constant with doc-comment gate — DISCORD_AMBASSADOR_ROLE_ID surfaced for Plan 09 pre-flight"

key-files:
  created:
    - src/lib/ambassador/constants.ts
    - src/types/ambassador.ts
    - src/__tests__/ambassador/schemas.test.ts
  modified:
    - src/lib/discord.ts

key-decisions:
  - "AMBASSADOR_DISCORD_MIN_AGE_DAYS defaults to 30 (spec §4); 7-day alternative reviewed at Plan 09 pre-flight checkpoint (D-03)"
  - "DISCORD_AMBASSADOR_ROLE_ID set to PENDING_DISCORD_ROLE_CREATION placeholder; acceptance API must return discordRoleAssigned=false while placeholder is active so no ambassador accepts fail silently"
  - "VIDEO_PROMPTS array exported as const tuple — UI wizard Step 3 reads from this, not from hardcoded strings"

patterns-established:
  - "Ambassador type module pattern: src/types/ambassador.ts mirrors src/types/mentorship.ts exactly (import z, Zod enum + infer union, interface, schema)"
  - "Constants-only module: src/lib/ambassador/constants.ts owns every magic value; no other file hardcodes collection names or thresholds"

requirements-completed:
  - COHORT-01
  - APPLY-01
  - APPLY-02
  - DISC-02
  - DISC-03

# Metrics
duration: 3min
completed: "2026-04-22"
---

# Phase 2 Plan 01: Types, Zod, Feature Foundations Summary

**Shared type contracts + Zod API schemas + named constants for the Ambassador Program — every downstream plan in Phase 2 imports from these three files instead of inventing local types**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-22T13:00:56Z
- **Completed:** 2026-04-22T13:03:49Z
- **Tasks:** 3
- **Files modified:** 4 (3 new, 1 modified)

## Accomplishments

- Created `src/lib/ambassador/constants.ts` with all Phase 2 named constants (D-03, D-04): Discord age threshold, Firestore collection names, motivation prompt labels, retention/expiry values
- Created `src/types/ambassador.ts` with complete type contract: 4 Zod enums, 2 Firestore document interfaces (ApplicationDoc, CohortDoc), 4 API boundary Zod schemas, 8 TypeScript inferred types — 18 exports total
- Added `DISCORD_AMBASSADOR_ROLE_ID = "PENDING_DISCORD_ROLE_CREATION"` to `src/lib/discord.ts` after existing mentor/mentee role IDs, with comment gating Plan 09 replacement

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/lib/ambassador/constants.ts** - `b6da6b3` (feat)
2. **Task 2 RED: Failing tests for ambassador schemas** - `84bb70a` (test)
3. **Task 2 GREEN: Create src/types/ambassador.ts** - `cf2b737` (feat)
4. **Task 3: Add DISCORD_AMBASSADOR_ROLE_ID to discord.ts** - `2662a4e` (feat)

_Note: TDD task 2 produced test commit before implementation commit._

## Files Created/Modified

- `src/lib/ambassador/constants.ts` — Single source of truth for all Phase 2 named constants
- `src/types/ambassador.ts` — Centralized types + Zod schemas for the Ambassador Program (18 exports)
- `src/__tests__/ambassador/schemas.test.ts` — 14 passing tests covering ApplicationSubmitSchema, CohortCreateSchema, ApplicationReviewSchema edge cases
- `src/lib/discord.ts` — Added DISCORD_AMBASSADOR_ROLE_ID constant (placeholder, +1 export)

## Pre-flight Items for Plan 09

Two decisions intentionally deferred to Plan 09's pre-flight checkpoint:

1. **DISCORD_AMBASSADOR_ROLE_ID placeholder** (`src/lib/discord.ts:810`): `"PENDING_DISCORD_ROLE_CREATION"` MUST be replaced with the real Discord role ID before Phase 2 goes live. The acceptance API checks this value and returns `discordRoleAssigned=false` while placeholder is set.

2. **AMBASSADOR_DISCORD_MIN_AGE_DAYS = 30** (`src/lib/ambassador/constants.ts:25`): Default is 30 days per spec §4 eligibility. The 7-day alternative (lower friction) is reviewed at Plan 09 pre-flight. Changing is a one-line edit — all callers import this constant, no search-and-replace needed.

## Decisions Made

- AMBASSADOR_DISCORD_MIN_AGE_DAYS defaults to 30 (spec §4 value); 7-day alternative surfaced for intentional decision at Plan 09 pre-flight (D-03)
- DISCORD_AMBASSADOR_ROLE_ID is a placeholder constant — acceptance API signals retry needed rather than failing silently against fake role ID (DISC-02)
- APPLICATION_VIDEO_PROMPTS is a `const` tuple (3 elements, `as const`) — UI wizard and API schema reuse the same reference

## Downstream Import Contracts

After this plan, all Phase 2 plans can import:

```typescript
// Types + schemas
import { ApplicationDoc, CohortDoc, ApplicationSubmitSchema, CohortCreateSchema } from "@/types/ambassador";

// Constants
import { AMBASSADOR_DISCORD_MIN_AGE_DAYS, APPLICATION_VIDEO_PROMPTS, AMBASSADOR_APPLICATIONS_COLLECTION } from "@/lib/ambassador/constants";

// Discord role
import { DISCORD_AMBASSADOR_ROLE_ID } from "@/lib/discord";
```

## Deviations from Plan

None — plan executed exactly as written. TDD flow followed: test file committed before implementation, 14 tests passing (>= 13 required).

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

All Phase 2 downstream plans (02-02 through 02-09) can now import from these three files. The type contract is locked; changing `ApplicationDoc` or `CohortDoc` would require coordinated updates to all consumers. Plan 02-02 (video URL validator) and Plan 02-03 (academic email validator) are ready to execute in Wave 1.

---
*Phase: 02-application-subsystem*
*Completed: 2026-04-22*
