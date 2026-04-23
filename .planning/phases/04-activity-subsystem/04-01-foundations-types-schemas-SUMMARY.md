---
phase: 04-activity-subsystem
plan: "01"
subsystem: ambassador-activity-foundations
tags: [types, zod, constants, utilities, tdd, timezone, referral-codes]
dependency_graph:
  requires: []
  provides:
    - src/types/ambassador.ts (Phase 4 interfaces + Zod schemas)
    - src/lib/ambassador/eventTypes.ts (EventTypeSchema, EVENT_TYPE_LABELS)
    - src/lib/ambassador/referralCode.ts (buildCode, generateUniqueReferralCode)
    - src/lib/ambassador/reportDeadline.ts (getDeadlineUTC, getAmbassadorMonthKey, getCurrentMonthKey)
    - src/lib/ambassador/constants.ts (8 Phase 4 constants)
  affects:
    - All Phase 4 Wave 2+ plans (import from these files)
tech_stack:
  added: []
  patterns:
    - TDD red-green for all 4 tasks
    - top-level Firestore lookup doc (O(1), no collection-group index)
    - date-fns-tz fromZonedTime/toZonedTime for timezone-aware deadline math
    - Zod enum + TypeScript type union pattern (established in Phase 2)
key_files:
  created:
    - src/lib/ambassador/eventTypes.ts
    - src/lib/ambassador/referralCode.ts
    - src/lib/ambassador/reportDeadline.ts
    - src/lib/ambassador/eventTypes.test.ts
    - src/lib/ambassador/referralCode.test.ts
    - src/lib/ambassador/reportDeadline.test.ts
    - src/types/ambassador.test.ts
  modified:
    - src/lib/ambassador/constants.ts
    - src/types/ambassador.ts
decisions:
  - "Used date-fns-tz (already in package.json at v3.2.0) for timezone deadline math instead of native Intl — cleaner API, less DST footgun risk per RESEARCH.md recommendation"
  - "buildCode replaces non-alphanumeric with X BEFORE slicing to prefix — safe for all username shapes including dot-separated handles"
  - "LogEventSchema uses .or(z.literal('')) for link/notes optional fields so empty-string round-trips correctly without rejecting blank form submissions"
metrics:
  duration: "5 minutes"
  completed: "2026-04-23"
  tasks_completed: 4
  files_changed: 9
  insertions: 600
---

# Phase 4 Plan 01: Foundations — Types, Schemas, Constants Summary

**One-liner:** Phase 4 foundation layer — EventTypeSchema Zod enum, 4 new Firestore doc interfaces, LogEventSchema + MonthlyReportSchema validators, referral code generator with O(1) collision checking, and timezone-aware report deadline helpers using date-fns-tz.

## What Was Built

### Task 1: Phase 4 constants + EventTypeSchema
- Appended 8 Phase 4 constants to `src/lib/ambassador/constants.ts` (REFERRAL_CODES_COLLECTION, REFERRALS_COLLECTION, AMBASSADOR_EVENTS_COLLECTION, MONTHLY_REPORTS_COLLECTION, AMBASSADOR_CRON_FLAGS_COLLECTION, REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE_SECONDS, EVENT_EDIT_WINDOW_MS)
- Created `src/lib/ambassador/eventTypes.ts` with `EventTypeSchema` Zod enum (6 D-02 locked values) and `EVENT_TYPE_LABELS` display map
- Commit: `4703a18`

### Task 2: Phase 4 doc interfaces + Zod schemas in ambassador.ts
- Extended `AmbassadorSubdoc` with `referralCode?: string` and `timezone?: string`
- Added 5 new exported interfaces: `ReferralCodeLookup`, `ReferralDoc`, `AmbassadorEventDoc`, `MonthlyReportDoc`, `AmbassadorCronFlagDoc`
- Added 4 new Zod schemas: `LogEventSchema`, `UpdateEventSchema`, `MonthlyReportSchema`, `CronFlagTypeSchema`
- Re-exported all Phase 4 constants from the types barrel
- Commit: `357645a`

### Task 3: referralCode.ts utility
- `buildCode(username)`: strips non-alphanumeric → uppercase → first 5 chars as PREFIX → `{PREFIX}-{4HEX}` random suffix
- `generateUniqueReferralCode(username)`: checks `referral_codes/{code}` top-level doc existence (O(1), no Firestore index per RESEARCH Pitfall 3); retries up to 5 times; throws on exhaustion
- 9 unit tests covering format, edge cases (empty, short, non-alphanumeric, truncation), collision retry, and exhaustion
- Commit: `e342af5`

### Task 4: reportDeadline.ts timezone helpers
- `getDeadlineUTC(year, month, timezone)`: returns UTC ms for last millisecond of given month in IANA timezone (uses date-fns-tz `fromZonedTime`)
- `getAmbassadorMonthKey(timezone, now)`: returns `"YYYY-MM"` for PREVIOUS calendar month — what the REPORT-04 cron flags against
- `getCurrentMonthKey(timezone, now)`: returns `"YYYY-MM"` for current calendar month — used for report doc ID `{uid}_{YYYY-MM}`
- 11 unit tests covering UTC, Asia/Karachi (UTC+5), America/Los_Angeles (DST), leap year February, December wrap
- Commit: `1f21b0b`

## Exported Symbols (for downstream plans)

### `src/lib/ambassador/eventTypes.ts`
```typescript
export const EventTypeSchema   // z.enum(["workshop","blog_post","talk_webinar","community_stream","study_group","other"])
export type EventType           // z.infer<typeof EventTypeSchema>
export const EVENT_TYPE_LABELS  // Record<EventType, string> — UI display labels
```

### `src/lib/ambassador/constants.ts` (Phase 4 additions)
```typescript
export const REFERRAL_CODES_COLLECTION        // "referral_codes"
export const REFERRALS_COLLECTION             // "referrals"
export const AMBASSADOR_EVENTS_COLLECTION     // "ambassador_events"
export const MONTHLY_REPORTS_COLLECTION       // "monthly_reports"
export const AMBASSADOR_CRON_FLAGS_COLLECTION // "ambassador_cron_flags"
export const REFERRAL_COOKIE_NAME             // "cwa_ref"
export const REFERRAL_COOKIE_MAX_AGE_SECONDS  // 2592000 (30 days)
export const EVENT_EDIT_WINDOW_MS             // 2592000000 (30 days in ms)
```

### `src/lib/ambassador/referralCode.ts`
```typescript
export function buildCode(username: string): string
export async function generateUniqueReferralCode(username: string): Promise<string>
```

### `src/lib/ambassador/reportDeadline.ts`
```typescript
export function getDeadlineUTC(year: number, month: number, timezone: string): number
export function getAmbassadorMonthKey(timezone: string, now?: Date): string
export function getCurrentMonthKey(timezone: string, now?: Date): string
```

### `src/types/ambassador.ts` (Phase 4 additions)
```typescript
// New interfaces
export interface ReferralCodeLookup { ambassadorId, uid }
export interface ReferralDoc { ambassadorId, referredUserId, convertedAt, sourceCode }
export interface AmbassadorEventDoc { ambassadorId, cohortId, date, type, attendanceEstimate, link?, notes?, hidden, createdAt, updatedAt }
export interface MonthlyReportDoc { ambassadorId, cohortId, month, whatWorked, whatBlocked, whatNeeded, submittedAt }
export interface AmbassadorCronFlagDoc { ambassadorId, type, period?, flaggedAt, resolved }

// New Zod schemas
export const LogEventSchema      // POST /api/ambassador/events body
export const UpdateEventSchema   // PATCH /api/ambassador/events/[id] body (partial)
export const MonthlyReportSchema // POST /api/ambassador/report body
export const CronFlagTypeSchema  // z.enum(["missing_report","missing_discord_role"])

// Extended AmbassadorSubdoc
// + referralCode?: string  (Phase 4)
// + timezone?: string      (Phase 4)
```

## Test Coverage

| File | Tests | Pass |
|------|-------|------|
| `eventTypes.test.ts` | 9 | 9 |
| `referralCode.test.ts` | 9 | 9 |
| `reportDeadline.test.ts` | 11 | 11 |
| `ambassador.test.ts` (types) | 9 | 9 |
| **Total** | **38** | **38** |

## Deviations from Plan

None — plan executed exactly as written.

The `LogEventSchema` uses `.or(z.literal(""))` for optional `link` and `notes` fields. This matches the plan's action spec verbatim and is consistent with the established `trimmedOptionalUrl` pattern in the file (empty-string = clear field, not an error).

## Known Stubs

None — this is a pure types/utilities plan with no UI rendering or data wiring. All functions are fully implemented and tested.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced in this plan. All additions are pure TypeScript types and utility functions.

## Self-Check: PASSED

- `src/lib/ambassador/eventTypes.ts` — FOUND
- `src/lib/ambassador/referralCode.ts` — FOUND
- `src/lib/ambassador/reportDeadline.ts` — FOUND
- `src/types/ambassador.ts` (extended) — FOUND
- Task 1 commit `4703a18` — FOUND
- Task 2 commit `357645a` — FOUND
- Task 3 commit `e342af5` — FOUND
- Task 4 commit `1f21b0b` — FOUND
- All 38 tests pass
- TypeScript compiles clean (only pre-existing SVG module errors in social-icons unrelated to this plan)
