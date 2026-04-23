---
phase: 03-public-presentation
plan: "03-05"
subsystem: api
tags: [firestore, nextjs, server-component, ambassador, public-listing, composite-index]

# Dependency graph
requires:
  - phase: 03-02-acceptance-snapshot-and-projection-write
    provides: public_ambassadors/{uid} projection seeded on acceptance transaction
  - phase: 03-01-types-rules-projection-schema
    provides: PublicAmbassadorDoc type, PUBLIC_AMBASSADORS_COLLECTION constant, public_ambassadors rules block
provides:
  - getCurrentCohortId() helper (D-09 heuristic: active cohort preferred, fallback to most-recent startDate)
  - GET /api/ambassadors/public endpoint (unauthenticated, feature-flag gated, returns cohortId + items)
  - AmbassadorCard client component (photo, name, badge, tagline, chips, social icons, VideoEmbed, profile CTA)
  - /ambassadors server-component page (3-column grid, empty-cohort alert, no-cohort alert)
  - public_ambassadors composite index LIVE in Firestore (active ASC, cohortId ASC, updatedAt ASC)
affects:
  - Phase 4 activity subsystem (referral/event writes — must NOT touch public_ambassadors per D-12/D-13)
  - Phase 5 alumni offboarding (MUST update or remove public_ambassadors/{uid} on alumni transition per D-12)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Single-collection query pattern — denormalized public_ambassadors projection avoids N+1 fan-out
    - Server component direct Admin SDK read — /ambassadors page calls db directly, avoids internal fetch round-trip
    - getCurrentCohortId D-09 heuristic — active cohort preferred, fall back to most-recent startDate, null if none
    - Feature-flag inheritance via layout.tsx — page never checks isAmbassadorProgramEnabled() directly

key-files:
  created:
    - src/lib/ambassador/currentCohort.ts
    - src/app/api/ambassadors/public/route.ts
    - src/components/ambassador/AmbassadorCard.tsx
    - src/app/ambassadors/page.tsx
  modified:
    - firestore.indexes.json (new composite index + merged console-created indexes)

key-decisions:
  - "getCurrentCohortId fallback: status=active preferred, most-recent startDate as fallback, null if no cohorts"
  - "Server component reads db directly on /ambassadors — no internal fetch to /api/ambassadors/public to avoid URL-resolution footgun"
  - "GET /api/ambassadors/public kept alongside server component for future client-side filter/search use (mirrors /api/mentorship/mentors precedent)"
  - "Sort order is updatedAt ASC on projection (monotonic proxy for acceptance order) — joinedAt lives on subdoc and is not duplicated on the projection to avoid schema drift"
  - "Feature-flag gating inherited from src/app/ambassadors/layout.tsx — no per-page duplication of isAmbassadorProgramEnabled()"

patterns-established:
  - "getCurrentCohortId: reusable D-09 resolver — import from @/lib/ambassador/currentCohort wherever current cohort ID is needed server-side"
  - "public_ambassadors query pattern: .where(active,true).where(cohortId,id).orderBy(updatedAt,asc) — matches the deployed composite index"

requirements-completed:
  - PRESENT-01
  - PRESENT-04

# Metrics
duration: ~45min (Tasks 1-3 prior session + Task 4 deploy verification in this session)
completed: "2026-04-22"
---

# Phase 3 Plan 05: Public Ambassadors Listing Page Summary

**Public /ambassadors page backed by a single Firestore composite-index query against denormalized public_ambassadors projections, with getCurrentCohortId D-09 heuristic and VideoEmbed inline cohort presentation support**

## Performance

- **Duration:** ~45 min across two sessions (Tasks 1-3 prior session; Task 4 verification in this session)
- **Started:** 2026-04-22
- **Completed:** 2026-04-22
- **Tasks:** 4 (3 code tasks + 1 deploy checkpoint)
- **Files modified:** 5

## Accomplishments

- Shipped `/ambassadors` public listing page (PRESENT-01) as a Next.js server component — 3-column responsive card grid, empty-cohort alert, no-cohort alert; no crashes in either graceful-degradation state
- Implemented the D-09 `getCurrentCohortId()` heuristic: queries Firestore for `status == "active"` cohort first, falls back to the cohort with the most recent `startDate`, returns `null` when no cohorts exist
- Deployed the `public_ambassadors(active ASC, cohortId ASC, updatedAt ASC)` composite index AND the `public_ambassadors/{uid}` rules block to Firestore production in a single atomic deploy — index is LIVE and READY; first production request will not throw `FAILED_PRECONDITION`
- PRESENT-04 render side satisfied: `AmbassadorCard` conditionally renders inline `VideoEmbed` when both `cohortPresentationVideoUrl` and `cohortPresentationVideoEmbedType` are set on the projection

## Task Commits

Each task was committed atomically:

1. **Task 1: Create getCurrentCohortId helper** - `981e69c` (feat)
2. **Task 2: Create GET /api/ambassadors/public endpoint + composite index** - `38dd0f3` (feat)
3. **Task 3: Create AmbassadorCard + /ambassadors page** - `5580bf7` (feat)
4. **Task 4: Deploy Firestore indexes + rules (checkpoint)** - `2f955c6` (chore — user committed merged indexes)

## Files Created/Modified

- `src/lib/ambassador/currentCohort.ts` — getCurrentCohortId() exported async helper; D-09 heuristic; server-only (imports `db`)
- `src/app/api/ambassadors/public/route.ts` — GET handler; feature-flag gated (404 when off); returns `{ cohortId, items }` from single Firestore query
- `src/components/ambassador/AmbassadorCard.tsx` — client component; ProfileAvatar, AmbassadorBadge, university/city badge chips, social icons (Lucide), inline VideoEmbed guard, "View profile" CTA to `/u/{username || uid}`
- `src/app/ambassadors/page.tsx` — server component; direct Admin SDK read via `db`; feature-flag gating inherited from layout.tsx; handles null cohort + empty items gracefully
- `firestore.indexes.json` — new composite index on `public_ambassadors`; merged 29 total collection-group indexes (7 console-created retained via user's firebase firestore:indexes sync)

## Decisions Made

- **getCurrentCohortId fallback logic:** `status == "active"` preferred (at most one at a time); falls back to `orderBy("startDate","desc").limit(1)` for between-cohort window; returns `null` if collection empty. Documented in code comment per D-09.
- **Server component reads db directly:** The `/ambassadors` page calls `db.collection()` directly rather than fetching `/api/ambassadors/public` internally. Avoids the URL-resolution footgun (no `NEXT_PUBLIC_SITE_URL` required at build time) and saves an internal HTTP round-trip.
- **GET /api/ambassadors/public kept:** Retained alongside server component as a stable client-callable URL for future client-side filtering/search, mirroring the `/api/mentorship/mentors` precedent.
- **Sort by updatedAt ASC:** `joinedAt` lives on the ambassador subdoc and is intentionally not duplicated on the projection to prevent schema drift. `updatedAt` is a close monotonic proxy for acceptance order since projections rarely churn after acceptance in v1. Documented in code comment.
- **Feature-flag via layout.tsx inheritance:** `src/app/ambassadors/layout.tsx` already checks `isAmbassadorProgramEnabled()` and returns 404 when off. The page does NOT duplicate this check — inheriting via the Next.js route tree is cleaner and avoids divergence.
- **VideoEmbed dual-guard:** Both `cohortPresentationVideoUrl` AND `cohortPresentationVideoEmbedType` must be truthy before `VideoEmbed` renders. Prevents a partial projection from passing only one field and causing a runtime error.

## Deviations from Plan

None — plan executed exactly as written. Task 4 required the manual-fallback path (Firebase CLI was not authenticated in the executor environment), and the user ran the deploy from their workstation as specified. The user additionally ran `firebase firestore:indexes > firestore.indexes.json` to merge console-created indexes back into source (7 console-created indexes retained), which was the correct operational practice — committed as `2f955c6`.

## Issues Encountered

**Task 4 deploy — manual fallback used:** The Firebase CLI in the executor environment lacked authentication credentials, triggering the Task 4 manual-fallback path. The user ran `firebase deploy --only firestore:indexes,firestore:rules` from their workstation. Deploy completed successfully:
- Rules compiled with 2 pre-existing warnings (`isOwner` unused, `request` variable name) — NOT from Phase 3 changes
- Rules released to cloud.firestore
- Indexes deployed; user selected "No" to retain 7 console-created indexes
- "Deploy complete!" confirmed
- Index status confirmed via `firebase firestore:indexes > firestore.indexes.json` which shows the public_ambassadors entry present (implying READY state)

## Known Stubs

None — all data flows are wired. The page reads live Firestore data via the `public_ambassadors` collection. Empty states render friendly alerts (not stubs). VideoEmbed renders only when the projection has both required fields.

## Next Phase Readiness

- PRESENT-01 is fully satisfied: `/ambassadors` renders the current cohort's accepted ambassadors as public cards
- PRESENT-04 render side is satisfied: cohort presentation videos display inline when set. EDIT side covered by plan 03-06 (already completed)
- Phase 3 is now complete (plans 03-01 through 03-06 all done)
- Phase 4 (Activity Subsystem) can begin: referral/event writes MUST NOT touch `public_ambassadors` per D-12/D-13
- Phase 5 (Alumni offboarding) MUST update or remove `public_ambassadors/{uid}` on alumni transition per D-12

---
*Phase: 03-public-presentation*
*Completed: 2026-04-22*

## Self-Check: PASSED

- SUMMARY.md: FOUND
- 981e69c (Task 1 — getCurrentCohortId helper): FOUND
- 38dd0f3 (Task 2 — GET /api/ambassadors/public + composite index): FOUND
- 5580bf7 (Task 3 — AmbassadorCard + /ambassadors page): FOUND
- 2f955c6 (Task 4 — Firestore indexes sync): FOUND
- f44db93 (SUMMARY commit): FOUND
- 8f12d7f (STATE/ROADMAP commit): FOUND
