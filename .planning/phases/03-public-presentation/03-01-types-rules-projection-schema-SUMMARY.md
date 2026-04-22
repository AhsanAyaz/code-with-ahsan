---
phase: 03-public-presentation
plan: "03-01"
subsystem: database

tags:
  - typescript
  - zod
  - firestore
  - firestore-rules
  - ambassador
  - denormalized-projection

# Dependency graph
requires:
  - phase: 02-application-subsystem
    provides: "ambassador subdoc shape at mentorship_profiles/{uid}/ambassador/v1 (Phase 2 fields: cohortId, joinedAt, active, strikes, discordMemberId); video URL validators in src/lib/ambassador/videoUrl.ts"
provides:
  - "AmbassadorPublicFieldsSchema Zod schema (PATCH /api/ambassador/profile body)"
  - "trimmedOptionalUrl and trimmedOptionalVideoUrl preprocessing primitives (trim-first + https-only refine)"
  - "AmbassadorSubdoc interface extended with 7 Phase 3 public fields (D-03)"
  - "PublicAmbassadorDoc interface for top-level public_ambassadors/{uid} projection (D-07)"
  - "PUBLIC_AMBASSADORS_COLLECTION constant"
  - "buildPublicAmbassadorProjection helper — single source of truth for the projection payload (D-07/D-08)"
  - "extractPublicFieldsFromSubdoc narrowing helper"
  - "isPublicAmbassadorDoc type guard for /ambassadors loader"
  - "firestore.rules block for public_ambassadors/{uid} — allow read: if true; allow write: if false (Admin SDK only)"
affects:
  - "03-02-acceptance-snapshot-and-projection-write (extends runAcceptanceTransaction with the new helper)"
  - "03-03-patch-ambassador-profile-endpoint (PATCH handler consumes AmbassadorPublicFieldsSchema + helper)"
  - "03-04-badge-canonical-profile-route-redirect (reads projection types)"
  - "03-05-public-ambassadors-listing-page (reads public_ambassadors via type guard, deploys rules)"
  - "03-06-profile-ambassador-public-card-section (posts to PATCH endpoint with schema-validated body)"
  - "Phase 5 alumni transition + 2-strike offboarding (D-12 contract — must update/remove projection)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Preprocess-then-validate Zod pattern for empty-string-as-clear semantics (trim → \"\" → round-trips to FieldValue.delete())"
    - "Conditional-spread write payload builder (`...(v !== undefined && { v })`) to guard against Admin SDK undefined-rejection (feedback_firestore_admin_undefined)"
    - "Denormalized public projection with single-writer (Admin SDK) + public-read Firestore rules"

key-files:
  created:
    - "src/lib/ambassador/publicProjection.ts"
  modified:
    - "src/types/ambassador.ts"
    - "firestore.rules"

key-decisions:
  - "trimmedOptionalUrl uses z.preprocess() to trim-first then refine https-only — NOT z.string().trim().url() — so whitespace-only round-trips to \"\" (intentional clear) AND javascript:/ftp:/data: schemes are rejected at schema boundary (XSS/phishing mitigation)"
  - "cohortPresentationVideoUrl uses a separate trimmedOptionalVideoUrl schema WITHOUT the https-only refine because the PATCH route classifier (isValidVideoUrl + classifyVideoUrl) produces better provider-specific error messages"
  - "publicTagline hard-capped at 120 chars in the schema (single source of truth) per D-05 discretion — no duplicate length validation at the route layer"
  - "PUBLIC_AMBASSADORS_COLLECTION exported as a constant so the two write paths (acceptance.ts + PATCH handler) and the read path (/ambassadors loader) cannot drift on collection name"
  - "buildPublicAmbassadorProjection accepts `updatedAt: unknown` from the caller so the txn path can pass FieldValue.serverTimestamp() and the PATCH path can pass new Date() without the helper importing firebase-admin (side-effect free, unit-testable)"
  - "Firestore rules allow write: if false — Admin SDK bypasses rules; this ensures no client write path can ever seed or mutate the public projection"

patterns-established:
  - "Zod preprocess-before-refine for whitespace-as-clear + scheme-restricted URLs — reuse for any future public-surface URL field"
  - "Conditional-spread pattern for Firestore Admin writes when Admin SDK is not initialized with ignoreUndefinedProperties — project-wide guardrail per MEMORY.md feedback"
  - "Dual-path-safe projection builder: side-effect-free, caller supplies transaction-specific FieldValues, single source of truth for denormalized write shape"

requirements-completed:
  - "PRESENT-01"
  - "PRESENT-02"
  - "PRESENT-03"
  - "PRESENT-04"

# Metrics
duration: 4min
completed: 2026-04-22
---

# Phase 03 Plan 01: Types + Firestore rules + public projection schema Summary

**Data-layer foundation for the ambassador public surface — Zod schema with https-only URL refine, PublicAmbassadorDoc interface, single-source-of-truth projection builder with conditional-spread writes, and public-read/deny-write rules for `public_ambassadors/{uid}`.**

## Performance

- **Duration:** 4m 11s
- **Started:** 2026-04-22T16:33:07Z
- **Completed:** 2026-04-22T16:37:18Z
- **Tasks:** 3
- **Files created:** 1 (`src/lib/ambassador/publicProjection.ts`)
- **Files modified:** 2 (`src/types/ambassador.ts`, `firestore.rules`)

## Accomplishments

- Added 7 Phase-3 public fields to the ambassador subdoc type shape per D-03 (university, city, publicTagline, twitterUrl, githubUrl, personalSiteUrl, cohortPresentationVideoUrl + cohortPresentationVideoEmbedType).
- Shipped `AmbassadorPublicFieldsSchema` with trim-first preprocessing and https-only scheme refine on social URL fields — rejects `javascript:`/`ftp:`/`data:`/`http:` while treating whitespace-only as intentional clear.
- Created `buildPublicAmbassadorProjection` helper with conditional-spread payload construction — guards against the Admin SDK's `undefined`-rejection (feedback_firestore_admin_undefined) without requiring `ignoreUndefinedProperties: true`.
- Added `public_ambassadors/{uid}` Firestore rules block (public read, deny all client writes) — Admin SDK remains the only writer for the denormalized projection.
- `npx tsc --noEmit` clean on the modified files; `npm run lint` clean on both new/modified source files; all 7 behavioural schema probes pass.

## Task Commits

1. **Task 1: Add AmbassadorPublicFields + PublicAmbassadorDoc types + Zod schema** — `518b5fe` (feat)
2. **Task 2: Add buildPublicAmbassadorProjection helper with conditional-spread write payload** — `9ad744f` (feat)
3. **Task 3: Add public_ambassadors Firestore rules block** — `6142ff0` (feat)

## Files Created/Modified

- `src/types/ambassador.ts` (modified) — added `CohortPresentationVideoEmbedTypeSchema`, `trimmedOptionalUrl`, `trimmedOptionalVideoUrl`, `AmbassadorPublicFieldsSchema`, `AmbassadorPublicFieldsInput`, `AmbassadorSubdoc`, `PublicAmbassadorDoc`, `PUBLIC_AMBASSADORS_COLLECTION` — inserted after `VideoEmbedTypeSchema` (line 27), no ordering changes to existing exports.
- `src/lib/ambassador/publicProjection.ts` (created, 137 lines) — `buildPublicAmbassadorProjection`, `extractPublicFieldsFromSubdoc`, `isPublicAmbassadorDoc`; side-effect free (no firebase-admin import); accepts `updatedAt: unknown` so both txn-path (`FieldValue.serverTimestamp()`) and PATCH-path (`new Date()`) callers are supported.
- `firestore.rules` (modified) — added `match /public_ambassadors/{uid}` block after the Phase 2 cohorts rules; brace balance intact (25 = 25); match-statement count grew from 7 to 8.

## Decisions Made

- **D-CLaude-01:** Kept `updatedAt` typed as `unknown` (not `FieldValue | Date`) in the helper args so the helper remains firebase-admin-free and unit-testable. Concrete FieldValue types would have required importing firebase-admin, making the helper load the Admin SDK even in test environments where only the pure shape logic matters.
- **D-Claude-02:** `buildPublicAmbassadorProjection` filters both `undefined` AND empty-string-after-trim to field-absent on the write payload. This differs from the PATCH handler's planned behaviour (where empty-string maps to `FieldValue.delete()` on an existing field) because the helper writes the FULL projection on every call — there are no pre-existing fields to delete; they just don't get written. The PATCH handler (Plan 03-03) remains responsible for explicit field-deletion of the mirrored subdoc.
- **D-Claude-03:** Did NOT add a separate `VideoEmbedType` → `CohortPresentationVideoEmbedType` narrower-type guard. The Phase 2 video classifier returns `"unknown"` which is intentionally excluded from the Phase 3 type; the PATCH route will 400 before reaching the projection builder, so a guard here would be dead code.
- **D-Claude-04:** Chose `typeof v === "string" && v.trim().length > 0` for the `clean` helper rather than the schema's `.trim()` preprocess. The helper input can legitimately come from callers that bypass the schema (acceptance.ts reads application docs directly); the defensive trim prevents field-absent-vs-field-whitespace drift in the projection.

## Deviations from Plan

None — plan executed exactly as written. The VERBATIM code blocks in Tasks 1–2 were implemented character-for-character; the Task 3 insertion point and block content match the plan.

One **harness mismatch note** (not a code deviation): the Task 1 acceptance criterion `grep -qE "\\^https://"` does not match any bytes in the file because the TypeScript regex literal `/^https:\/\/\S+$/` escapes the forward slashes — there is no literal `^https://` substring, only `^https:\/\/`. The INTENT of the criterion (https-scheme enforcement exists) is fully satisfied: the verification-level check `grep -q "\^https:"` passes, the behavioural probe confirms `javascript:`/`ftp:`/`http:` are all rejected, and `trimmedOptionalUrl` is present. No code change was made because the plan specified the regex VERBATIM. Recommend the plan-check iteration update the grep criterion to `grep -qE "\\^https:"` (drop trailing `//`) or use `"\\^https:\\\\\\/\\\\\\/"` to match the escaped form.

**Total deviations:** 0 code deviations. 1 harness-criterion note (documented above).
**Impact on plan:** None — all verification pathways (tsc, lint, grep-intent, behavioural probe) confirm the plan outcome.

## Issues Encountered

1. **Worktree was ~3 commits behind main.** The executor's worktree (`agent-a9717854`) was pinned at `aa3a161`, but the Phase 3 plan files were added on main at `8cb6aec` and revised at `6dec4b6`. Resolved by running `git merge main --no-edit` (fast-forward, no conflicts) which brought in the PLAN files, CONTEXT.md, and DISCUSSION-LOG.md. No code conflicts because the executor hadn't touched Phase 3 files yet. Worth noting for future parallel-executor spawns: merge-main-before-read is the safest preflight.
2. **Pre-existing `src/components/social-icons/index.tsx` TS errors** (7 "Cannot find module './*.svg'" errors) surface in `npx tsc --noEmit` but are entirely outside this plan's scope — logged here for awareness but NOT auto-fixed per deviation scope-boundary rule (they pre-date Phase 3 Plan 01 and touch no plan-related files).

## User Setup Required

None — this plan is data-layer plumbing only. The new Firestore rules will not be active until Plan 03-05 Task 4 runs `firebase deploy --only firestore:rules` (blocking deploy checkpoint). Until then, the rules block is just committed source and has no runtime effect.

## Next Phase Readiness

**Wave 1 complete.** Phase 3 Wave 2 (`03-02-acceptance-snapshot-and-projection-write` and `03-03-patch-ambassador-profile-endpoint`) can now run in parallel:
- Plan 03-02 will import `buildPublicAmbassadorProjection` + `PUBLIC_AMBASSADORS_COLLECTION` from this plan's output and call the helper inside `runAcceptanceTransaction` with `FieldValue.serverTimestamp()` for `updatedAt`.
- Plan 03-03 will import `AmbassadorPublicFieldsSchema`, `buildPublicAmbassadorProjection`, and `extractPublicFieldsFromSubdoc` for the PATCH handler, using `new Date()` for `updatedAt` and batching the subdoc+projection write.

No blockers. All types, helpers, and rules are in place for the acceptance-path write (D-08 path 1) and the PATCH-path write (D-08 path 2) to converge on a single projection shape.

## Self-Check: PASSED

Verified files exist:
- `src/types/ambassador.ts` — FOUND (modified)
- `src/lib/ambassador/publicProjection.ts` — FOUND (created)
- `firestore.rules` — FOUND (modified)

Verified commits exist:
- `518b5fe` (Task 1) — FOUND
- `9ad744f` (Task 2) — FOUND
- `6142ff0` (Task 3) — FOUND

---
*Phase: 03-public-presentation*
*Completed: 2026-04-22*
