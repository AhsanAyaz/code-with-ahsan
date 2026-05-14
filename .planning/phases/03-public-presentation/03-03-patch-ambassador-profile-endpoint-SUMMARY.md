---
phase: 03-public-presentation
plan: "03-03"
subsystem: api

tags:
  - typescript
  - firestore
  - ambassador
  - batched-write
  - denormalized-projection

# Dependency graph
requires:
  - phase: 03-public-presentation
    plan: "03-01"
    provides: "AmbassadorPublicFieldsSchema, buildPublicAmbassadorProjection, extractPublicFieldsFromSubdoc, PUBLIC_AMBASSADORS_COLLECTION, AmbassadorSubdoc, CohortPresentationVideoEmbedType"
  - phase: 02-application-subsystem
    provides: "isValidVideoUrl, classifyVideoUrl from src/lib/ambassador/videoUrl.ts; ambassador subdoc at mentorship_profiles/{uid}/ambassador/v1"
provides:
  - "GET /api/ambassador/profile — returns current public-field subset of ambassador subdoc (8 fields, absent keys omitted)"
  - "PATCH /api/ambassador/profile — validates AmbassadorPublicFieldsSchema + video URL, batched write to subdoc + public_ambassadors projection (D-08 path 2)"
  - "Both endpoints feature-flag gated + role-gated (ambassador | alumni-ambassador)"
affects:
  - "03-06-profile-ambassador-public-card-section (GET hydrates form, PATCH persists edits)"
  - "public_ambassadors/{uid} projection stays in sync with subdoc on every PATCH"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FieldValue.delete() for empty-string field clearing on Firestore subdoc update"
    - "Conditional-spread for post-write local state to derive projection without re-reading Firestore"
    - "ctx as unknown as DecodedRoleClaim cast pattern for AuthContext→DecodedRoleClaim structural compatibility"
    - "Batched write (db.batch()) for atomic dual-document write (subdoc + projection)"

key-files:
  created:
    - "src/app/api/ambassador/profile/route.ts"
  modified: []

key-decisions:
  - "Used ctx as unknown as DecodedRoleClaim cast (not direct cast) because AuthContext lacks the [key: string]: unknown index signature required by DecodedRoleClaim — both types structurally agree on roles/role/admin fields, the cast is safe"
  - "Both GET and GET handlers live in the same route.ts file (Next.js App Router convention) — no second endpoint needed"
  - "Absent fields in GET response are OMITTED entirely (not null) so the client form can do { ...EMPTY, ...body } safely"
  - "The post-write local copy of the subdoc (postWrite) avoids a second Firestore read to derive the projection after the batch commits"

requirements-completed:
  - "PRESENT-03"
  - "PRESENT-04"

# Metrics
duration: ~8min
completed: 2026-04-23
---

# Phase 03 Plan 03: PATCH + GET /api/ambassador/profile endpoint Summary

**GET + PATCH endpoint for ambassador public card editing — batched dual-write to subdoc and public_ambassadors projection, video URL classification, FieldValue.delete() field clearing, and role-gated feature-flag gate order.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-23
- **Completed:** 2026-04-23
- **Tasks:** 2 (both completed in single implementation pass — GET + PATCH in same file)
- **Files created:** 1 (`src/app/api/ambassador/profile/route.ts`)
- **Files modified:** 0

## Accomplishments

- Created `src/app/api/ambassador/profile/route.ts` with both `PATCH` and `GET` handlers (335 lines).
- **PATCH handler:**
  - Feature-flag → auth → role gates in correct Pitfall 3 order.
  - Validates body against `AmbassadorPublicFieldsSchema` (from Plan 03-01).
  - Video URL validated with `isValidVideoUrl` + `classifyVideoUrl`; empty-string clears field.
  - Reads current subdoc + profile, builds `subdocUpdate` with `FieldValue.delete()` for cleared fields.
  - Derives post-write subdoc state locally (no second Firestore read) to pass to `buildPublicAmbassadorProjection`.
  - Persists changes atomically via `db.batch()` — `batch.update(ambassadorRef)` + `batch.set(publicRef, projection, { merge: false })`.
- **GET handler:**
  - Identical gate order (feature-flag → auth → role).
  - Returns public-field subset of subdoc with absent keys omitted (not null).
  - Pre-acceptance edge: returns `200 {}` when subdoc doesn't exist.
- `npx tsc --noEmit` clean (pre-existing `social-icons` SVG errors are out of scope).
- `npm run lint` clean.
- All gate-order awk verification checks pass.

## Task Commits

1. **Tasks 1 + 2: Create PATCH + GET /api/ambassador/profile route handler** — `59bc26a` (feat)

Note: Both tasks were implemented in a single file creation pass since the plan specified appending GET below PATCH in the same file.

## Files Created/Modified

- `src/app/api/ambassador/profile/route.ts` (created, 335 lines) — both GET and PATCH handlers with full gate order, video URL validation, batched write, and FieldValue.delete() field clearing.

## Decisions Made

- **D-Runner-01:** `AuthContext` (from `verifyAuth`) is not directly assignable to `DecodedRoleClaim` (from `hasRoleClaim`) because `DecodedRoleClaim` has an index signature `[key: string]: unknown` while `AuthContext` does not. The structural fields (`roles`, `role`, `admin`) are identical. Applied `ctx as unknown as DecodedRoleClaim` cast as a Rule 1 bug fix — the double cast is the TypeScript-blessed way to force structural reassignment when types are compatible but the index signature requirement prevents direct cast.
- **D-Runner-02:** Tasks 1 and 2 were completed in a single implementation pass (both handlers written to the file at creation time) rather than as two separate file-edit operations. The final output is identical to the plan's two-step approach; only the execution sequence differed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `AuthContext` not directly castable to `DecodedRoleClaim`**
- **Found during:** Task 1 (TypeScript compile after initial file creation)
- **Issue:** `hasRoleClaim(ctx, ...)` failed with TS2345 — `AuthContext` lacks `[key: string]: unknown` index signature required by `DecodedRoleClaim`
- **Fix:** Added `import { type DecodedRoleClaim }` from permissions.ts and used `ctx as unknown as DecodedRoleClaim` at both `hasRoleClaim` call sites (PATCH + GET handlers). The structural compatibility is verified: both types share `roles`, `role`, and `admin` fields.
- **Files modified:** `src/app/api/ambassador/profile/route.ts`
- **Commit:** `59bc26a`

## Known Stubs

None — the endpoint writes live Firestore and reads the real ambassador subdoc. No hardcoded empty values or placeholder text.

## Self-Check: PASSED

Verified files exist:
- `src/app/api/ambassador/profile/route.ts` — FOUND (created)

Verified commits exist:
- `59bc26a` (Tasks 1 + 2) — FOUND

---
*Phase: 03-public-presentation*
*Completed: 2026-04-23*
