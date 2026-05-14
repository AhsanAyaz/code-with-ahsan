---
phase: 02-application-subsystem
plan: "04"
subsystem: api
tags: [firestore, nextjs, ambassador, cohorts, admin]

# Dependency graph
requires:
  - phase: 02-01-types-zod-feature-foundations
    provides: CohortCreateSchema, CohortPatchSchema, CohortDoc, CohortStatus from src/types/ambassador.ts
  - phase: 02-03-firestore-rules-email-templates
    provides: cohorts/ Firestore security rules (allow read: isSignedIn; allow write: isAdmin)
provides:
  - src/lib/ambassador/adminAuth.ts — shared requireAdmin() returning { ok: true; uid } | { ok: false; status; error }
  - GET /api/ambassador/cohorts — open-scope list (no auth) + all-scope list (admin-only)
  - POST /api/ambassador/cohorts — admin-only cohort creation (COHORT-01)
  - GET /api/ambassador/cohorts/[cohortId] — admin-only detail with acceptedAmbassadorCount (COHORT-03)
  - PATCH /api/ambassador/cohorts/[cohortId] — toggle applicationWindowOpen (COHORT-02) + update name/status/maxSize
  - /admin/ambassadors/cohorts admin panel UI — create, toggle, status-change, link to applications
affects:
  - "02-05 (applications submit API reads open cohorts)"
  - "02-06 (accept/decline API imports requireAdmin + uses admin.uid as reviewedBy)"
  - "02-07 (apply wizard fetches /api/ambassador/cohorts?scope=open)"
  - "02-08 (admin review UI inherits admin auth pattern)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "requireAdmin discriminated-union return shape: { ok: true; uid } | { ok: false; status; error } — Plans 05/06/08 consume this"
    - "Admin uid synthesised from session token prefix (admin:token12) — stable per-session audit identifier without real Firebase uid"
    - "featureGate() helper at top of each API file — single function called from all handlers"
    - "Shared adminHeaders() helper in UI client — reads ADMIN_TOKEN_KEY from localStorage"

key-files:
  created:
    - src/lib/ambassador/adminAuth.ts
    - src/app/api/ambassador/cohorts/route.ts
    - src/app/api/ambassador/cohorts/[cohortId]/route.ts
    - src/app/admin/ambassadors/cohorts/page.tsx
  modified: []

key-decisions:
  - "requireAdmin returns { ok: true; uid: string } discriminated union — uid is synthesised admin:token12 prefix (NOT real Firebase uid). Plan 06 uses admin.uid as reviewedBy audit field on application docs."
  - "featureGate() extracted to shared helper per-file — prevents Pitfall 3 (RESEARCH.md): all handlers return 404 when FEATURE_AMBASSADOR_PROGRAM is off"
  - "GET /cohorts supports scope=open (no auth) and scope=all (admin-only) — apply wizard (Plan 07) calls open scope, admin panel calls all scope"
  - "acceptedAmbassadorCount in detail endpoint queries applications collection directly — denormalized acceptedCount on cohort doc is source of truth for display; live count in detail is for admin accuracy (COHORT-03)"

patterns-established:
  - "requireAdmin pattern: import from @/lib/ambassador/adminAuth, check admin.ok, return admin.status on failure, use admin.uid for audit"
  - "Admin UI client pattern: adminHeaders() reads ADMIN_TOKEN_KEY from localStorage, Content-Type + x-admin-token sent on every request"

requirements-completed:
  - COHORT-01
  - COHORT-02
  - COHORT-03

# Metrics
duration: 6min
completed: 2026-04-22
---

# Phase 02 Plan 04: Cohort API + Admin Panel Summary

**Cohort CRUD API (GET/POST list, GET/PATCH detail) with shared requireAdmin() helper returning { ok: true; uid } discriminated union, plus DaisyUI admin panel for creating cohorts, toggling application windows, and managing status**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-22T11:11:37Z
- **Completed:** 2026-04-22T11:17:07Z
- **Tasks:** 3
- **Files modified:** 4 created

## Accomplishments

- Shared `src/lib/ambassador/adminAuth.ts` helper with `requireAdmin()` returning a discriminated union (`{ ok: true; uid: string } | { ok: false; status; error }`) — Plans 05, 06, and 08 consume this shape; Plan 06 reads `admin.uid` as `reviewedBy` on application docs
- Cohort collection API (`GET` open/all scopes, `POST` create) at `/api/ambassador/cohorts` with full feature-flag gating, Zod validation, and 201/400/401 response shapes
- Cohort detail API (`GET` detail + `acceptedAmbassadorCount`, `PATCH` toggle window/update) at `/api/ambassador/cohorts/[cohortId]`
- Admin panel page at `/admin/ambassadors/cohorts` (261 lines, DaisyUI table + create modal + toggle + status dropdown, link-through to Plan 08 application list)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared admin-auth helper + cohort collection API (GET list + POST create)** - `cc1cf2a` (feat)
2. **Task 2: Create cohort detail API (GET single + PATCH update)** - `963bbc5` (feat)
3. **Task 3: Build admin cohort panel UI at /admin/ambassadors/cohorts** - `47de884` (feat)

## Files Created/Modified

- `src/lib/ambassador/adminAuth.ts` — shared admin session validator; `isValidAdminToken`, `getAdminToken`, `requireAdmin` exports; uid synthesised as `admin:` + first 12 chars of session token
- `src/app/api/ambassador/cohorts/route.ts` — GET (open=upcoming+windowOpen, all=admin) + POST (admin-only create, CohortCreateSchema, 201/400/401)
- `src/app/api/ambassador/cohorts/[cohortId]/route.ts` — GET (admin + acceptedAmbassadorCount from applications query) + PATCH (admin, CohortPatchSchema, toggle applicationWindowOpen)
- `src/app/admin/ambassadors/cohorts/page.tsx` — client component; DaisyUI table (Name/Start/End/Size/Status/Window/Ambassadors/Actions), create-cohort modal, toggle window, change status, link to Plan 08 review page

## Decisions Made

- `requireAdmin` returns discriminated union not boolean — downstream Plans 05/06/08 can destructure `admin.uid` directly for audit fields without each plan inventing its own identifier scheme
- Admin uid synthesised as `admin:${token.slice(0, 12)}` because legacy admin auth is password-based; no Firebase uid is linked to an admin session doc
- `featureGate()` helper extracted per-file — all handlers return 404 when `FEATURE_AMBASSADOR_PROGRAM=false` (Pitfall 3 from RESEARCH.md)
- GET cohorts supports `?scope=open` (no auth required, returns upcoming+windowOpen) and `?scope=all` (admin-only) — Plan 07 apply wizard uses open scope without requiring admin credentials

## Deviations from Plan

None — plan executed exactly as written. The worktree needed to fast-forward merge from `main` to pick up Wave 1 (Plans 02-01 through 02-03) dependencies; this is normal parallel-execution worktree initialization, not a plan deviation.

## Issues Encountered

The worktree branch was behind `main` at execution start — Wave 1 files (`src/types/ambassador.ts`, `src/lib/ambassador/constants.ts`, etc.) existed in `main` but not in the worktree. A fast-forward merge was required before tasks could proceed. No code conflicts occurred.

## User Setup Required

None — no external service configuration required beyond what Wave 1 established.

## Next Phase Readiness

- `requireAdmin()` is ready for Plans 05, 06, 08 to import from `@/lib/ambassador/adminAuth`
- Plan 06 (accept/decline) reads `admin.uid` from the discriminated union for `reviewedBy`
- Plan 07 (apply wizard) can call `GET /api/ambassador/cohorts?scope=open` without admin credentials to fetch available cohorts
- Plan 08 (admin review UI) can navigate to `/admin/ambassadors?cohort={id}` from the cohorts panel (link already in place)

## Known Stubs

None — all endpoints return real Firestore data; no hardcoded placeholders.

## Self-Check: PASSED

- `src/lib/ambassador/adminAuth.ts` — FOUND
- `src/app/api/ambassador/cohorts/route.ts` — FOUND
- `src/app/api/ambassador/cohorts/[cohortId]/route.ts` — FOUND
- `src/app/admin/ambassadors/cohorts/page.tsx` — FOUND
- Commit `cc1cf2a` — FOUND
- Commit `963bbc5` — FOUND
- Commit `47de884` — FOUND

---
*Phase: 02-application-subsystem*
*Completed: 2026-04-22*
