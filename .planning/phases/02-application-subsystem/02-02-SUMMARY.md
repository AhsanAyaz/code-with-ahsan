---
phase: 02-application-subsystem
plan: "02"
subsystem: validation
tags: [regex, typescript, vitest, tdd, firebase, ambassador]

requires: []
provides:
  - "isValidVideoUrl(url): boolean — regex-only gate for loom/youtube/drive URLs (D-07)"
  - "classifyVideoUrl(url): VideoEmbedType — 'youtube'|'loom'|'drive'|'unknown' for admin embed renderer (D-08)"
  - "extractLoomId/extractDriveFileId/extractYouTubeId — ID extraction helpers for embed URLs"
  - "validateAcademicEmail(email): AcademicEmailResult — two-layer TLD-regex + Hipo snapshot check (D-15)"
  - "Hipo university domains snapshot at src/data/world_universities_and_domains.json (2.2MB, 10k+ domains)"
affects:
  - 02-05-applications-submit-api (calls isValidVideoUrl + validateAcademicEmail before Firestore write)
  - 02-07-apply-wizard-ui (surfaces needsManualVerification soft warning to user)
  - 02-08-admin-review-ui (calls classifyVideoUrl to pick embed renderer)

tech-stack:
  added: []
  patterns:
    - "TDD RED-GREEN cycle: test file committed first (failing), then implementation committed (passing)"
    - "Lazy-singleton pattern for large JSON: readFileSync once into module-level Set<string> (pitfall #6)"
    - "Regex-only URL validation (no server-side fetch per D-07)"
    - "Soft-warning pattern: needsManualVerification=true instead of hard reject (D-15)"

key-files:
  created:
    - src/lib/ambassador/videoUrl.ts
    - src/lib/ambassador/academicEmail.ts
    - src/data/world_universities_and_domains.json
    - src/__tests__/ambassador/videoUrl.test.ts
    - src/__tests__/ambassador/academicEmail.test.ts
  modified: []

key-decisions:
  - "VideoEmbedType defined locally in videoUrl.ts (not imported from @/types/ambassador) — Plan 01 types file runs in parallel Wave 1; local definition prevents blocking; Plan 01 owns the canonical type"
  - "YouTube ID regex uses + (one-or-more) not {6,} — test URLs use 3-char IDs like 'abc'; real YouTube IDs are 11 chars but validator does not enforce length per D-07"
  - "Hipo snapshot SHA-256: e6f1f62da35d9d7275985ae375be950546ee89e61d1157b45cf9a3880fae2dbe (2026-04-22 download)"

patterns-established:
  - "Pattern: Lazy-singleton Hipo lookup — module-level Set<string> initialized on first call, O(1) thereafter"
  - "Pattern: Two-layer academic email — Layer 1 TLD regex (.edu/.ac.cc), Layer 2 Hipo Set lookup"
  - "Pattern: VideoEmbedType classifier — call classifyVideoUrl server-side; render youtube/loom/drive embed in admin UI"

requirements-completed:
  - APPLY-03
  - APPLY-04

duration: 10min
completed: 2026-04-22
---

# Phase 02 Plan 02: Validators (Academic Email + Video URL) Summary

**Regex-only video URL validator (5 exports) and two-layer academic email validator with 2.2MB Hipo snapshot, both TDD-verified with 39 passing assertions**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-22T11:02:00Z
- **Completed:** 2026-04-22T11:05:57Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments

- Video URL validator covers all D-07 patterns (loom/youtube.be/youtube.com/shorts/drive) with subdomain-attack rejection
- Academic email validator implements D-15 soft-warning: `needsManualVerification: true` for unknown TLDs (never hard-blocks)
- Hipo snapshot (2.2MB, 10k+ university domains) bundled as lazy-loaded singleton — no per-call JSON parse
- 39 total test assertions across both validators (30 videoUrl + 9 academicEmail)

## Task Commits

Each task was committed atomically (TDD RED then GREEN):

1. **Task 1 RED: videoUrl tests** - `b085d45` (test)
2. **Task 1 GREEN: videoUrl implementation** - `2664350` (feat)
3. **Task 2 RED: academicEmail tests** - `ad9ecbb` (test)
4. **Task 2 chore: Hipo snapshot** - `43a72d2` (chore)
5. **Task 2 GREEN: academicEmail implementation** - `16ef5b6` (feat)

## Files Created/Modified

- `src/lib/ambassador/videoUrl.ts` — 5 exports: `isValidVideoUrl`, `classifyVideoUrl`, `extractLoomId`, `extractDriveFileId`, `extractYouTubeId` + local `VideoEmbedType`
- `src/lib/ambassador/academicEmail.ts` — `validateAcademicEmail` + `AcademicEmailResult` interface; lazy-loads Hipo snapshot
- `src/data/world_universities_and_domains.json` — Hipo snapshot (2,243,156 bytes), SHA-256: e6f1f62da35d9d7275985ae375be950546ee89e61d1157b45cf9a3880fae2dbe
- `src/__tests__/ambassador/videoUrl.test.ts` — 30 assertions, 4 describe blocks
- `src/__tests__/ambassador/academicEmail.test.ts` — 9 assertions, 1 describe block

## Exported Functions (signatures)

### videoUrl.ts

```typescript
export type VideoEmbedType = "youtube" | "loom" | "drive" | "unknown"; // local; Plan 01 owns canonical
export function isValidVideoUrl(url: string): boolean
export function classifyVideoUrl(url: string): VideoEmbedType
export function extractLoomId(url: string): string | null
export function extractDriveFileId(url: string): string | null
export function extractYouTubeId(url: string): string | null
```

### academicEmail.ts

```typescript
export interface AcademicEmailResult {
  syntaxValid: boolean;
  academicTldMatch: boolean;
  hipoMatch: boolean;
  needsManualVerification: boolean;  // D-15: soft warning, never hard reject
  normalizedDomain: string | null;
}
export function validateAcademicEmail(email: string): AcademicEmailResult
```

## Regex Patterns (for downstream test authors)

| Constant | Pattern |
|---|---|
| `LOOM_SHARE_REGEX` | `/^https:\/\/(?:www\.)?loom\.com\/share\/([A-Za-z0-9]+)/` |
| `YOUTUBE_WATCH_REGEX` | `/^https:\/\/(?:www\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([A-Za-z0-9_-]+)/` |
| `YOUTUBE_SHORT_REGEX` | `/^https:\/\/youtu\.be\/([A-Za-z0-9_-]+)/` |
| `YOUTUBE_SHORTS_REGEX` | `/^https:\/\/(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]+)/` |
| `DRIVE_FILE_REGEX` | `/^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/` |
| `ACADEMIC_TLD_REGEX` | `/\.edu(\.[a-z]{2})?$\|\.ac\.[a-z]{2}$/i` |

## Decisions Made

- **VideoEmbedType defined locally:** Plan 01 (types/ambassador.ts) runs in parallel Wave 1 and hasn't yet created the canonical `VideoEmbedType`. Local definition prevents blocking; the type is identical. Plan 01 comment left in videoUrl.ts for future migration.
- **YouTube regex uses `+` not `{6,}`:** Test URLs in the spec use 3-char IDs ("abc"). D-07 specifies format-only validation; ID length enforcement is not in scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] YouTube ID regex minimum length caused test failures**
- **Found during:** Task 1 GREEN run
- **Issue:** Initial implementation used `{6,}` minimum for YouTube video IDs. Spec test cases use short IDs like "abc" (3 chars). Tests for `youtu.be/abc` and `youtube.com/watch?v=abc` failed.
- **Fix:** Changed `{6,}` → `+` in `YOUTUBE_WATCH_REGEX` and `YOUTUBE_SHORT_REGEX`. Kept `{3,}` → `+` in `YOUTUBE_SHORTS_REGEX` for consistency.
- **Files modified:** `src/lib/ambassador/videoUrl.ts`
- **Verification:** All 30 videoUrl tests pass
- **Committed in:** `2664350` (Task 1 GREEN commit)

**2. [Rule 2 - Missing] VideoEmbedType defined locally instead of importing from @/types/ambassador**
- **Found during:** Task 1 implementation
- **Issue:** `src/types/ambassador.ts` doesn't exist yet (Plan 01 creates it in parallel Wave 1). Import would cause a TypeScript error.
- **Fix:** Defined `VideoEmbedType` inline in `videoUrl.ts` with a comment indicating the migration path once Plan 01 lands.
- **Files modified:** `src/lib/ambassador/videoUrl.ts`
- **Verification:** TypeScript compiles without errors (excluding pre-existing social-icons SVG errors)
- **Committed in:** `2664350` (Task 1 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing import)
**Impact on plan:** Both fixes necessary for tests to pass and compilation to succeed. No scope creep.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None — no external service configuration required. The Hipo snapshot is bundled in the repo.

## Next Phase Readiness

- **Plan 05 (submit API)** can immediately call `isValidVideoUrl(url)` and `validateAcademicEmail(email)` before Firestore write
- **Plan 07 (wizard UI)** can read `needsManualVerification` to show the "upload student ID instead" soft-warning
- **Plan 08 (admin review UI)** can call `classifyVideoUrl(url)` to pick the correct embed renderer
- **Blocker:** When Plan 01 lands `src/types/ambassador.ts`, migrate `videoUrl.ts` import from local type to `import type { VideoEmbedType } from "@/types/ambassador"` — one-line change

---
*Phase: 02-application-subsystem*
*Completed: 2026-04-22*
