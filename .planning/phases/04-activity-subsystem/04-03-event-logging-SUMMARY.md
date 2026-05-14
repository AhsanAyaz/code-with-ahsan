---
phase: 04-activity-subsystem
plan: "03"
subsystem: event-logging
tags: [events, api-routes, firestore, tdd, admin, ambassador, client-components]
dependency_graph:
  requires:
    - 04-01-foundations-types-schemas (LogEventSchema, UpdateEventSchema, AmbassadorEventDoc, AMBASSADOR_EVENTS_COLLECTION, EVENT_EDIT_WINDOW_MS, EventType, EVENT_TYPE_LABELS)
  provides:
    - src/app/api/ambassador/events/route.ts (GET own events + POST new event)
    - src/app/api/ambassador/events/[eventId]/route.ts (PATCH/DELETE with 30-day window)
    - src/app/api/ambassador/events/admin/route.ts (admin GET all + PATCH hide/unhide)
    - src/app/ambassadors/report/LogEventForm.tsx (client form component)
    - src/app/ambassadors/report/EventList.tsx (client list component)
    - src/app/admin/ambassadors/cohorts/[cohortId]/events/page.tsx (admin server shell)
    - src/app/admin/ambassadors/cohorts/[cohortId]/events/EventAdminTable.tsx (admin table client)
    - firestore.rules (deny-all client rules for ambassador_events/*)
  affects:
    - Plan 05 (report subsystem) — will compose LogEventForm + EventList on /ambassadors/report/page.tsx
    - Phase 5 (leaderboard) — reads non-hidden events for activity counts
tech_stack:
  added: []
  patterns:
    - TDD (vi.hoisted pattern from Plan 02) for route.test.ts
    - vi.fn<FunctionType>() single-generic syntax for vitest 4.x (avoids TS2558)
    - Server-side 30-day window enforcement (RESEARCH Pitfall 6)
    - loadOwnedEvent helper: ownership check before window check
    - Conditional payload spread for optional fields (Admin SDK undefined rejection)
    - adminHeaders() pattern for admin client-side fetches (ADMIN_TOKEN_KEY from localStorage)
    - force-dynamic server shell + client table pattern (established in Phase 3)
key_files:
  created:
    - src/app/api/ambassador/events/route.ts
    - src/app/api/ambassador/events/[eventId]/route.ts
    - src/app/api/ambassador/events/[eventId]/route.test.ts
    - src/app/api/ambassador/events/admin/route.ts
    - src/app/ambassadors/report/LogEventForm.tsx
    - src/app/ambassadors/report/EventList.tsx
    - src/app/admin/ambassadors/cohorts/[cohortId]/events/page.tsx
    - src/app/admin/ambassadors/cohorts/[cohortId]/events/EventAdminTable.tsx
  modified:
    - firestore.rules
decisions:
  - "vi.fn<FunctionType>() single-generic syntax required for vitest 4.x (vi.fn<Args, Return> is 2-arg form rejected as TS2558 — vitest 4 changed to fn<T extends Procedure>)"
  - "vi.hoisted() for test mock factories — same pattern as Plan 02 referral.test.ts to prevent ReferenceError in hoisted vi.mock() factories"
  - "toDateMs() helper in [eventId]/route.ts normalizes Firestore Timestamp / Date / string → ms for window math (handles all three shapes that can arrive from Firestore)"
  - "loadOwnedEvent() shared helper performs both 404 (not found) and 403 (ownership) checks — PATCH and DELETE share the same code path"
  - "Admin PATCH schema (AdminHidePatchSchema) is route-local — not exported from types/ambassador.ts — because it's admin-only and not reused elsewhere"
metrics:
  duration: "7 minutes"
  completed: "2026-04-23"
  tasks_completed: 6
  files_changed: 9
  insertions: ~900
---

# Phase 4 Plan 03: Event Logging Summary

**One-liner:** Full event logging subsystem — 3 Next.js API routes (ambassador GET/POST, ambassador PATCH/DELETE with server-side 30-day window, admin GET/PATCH hide/unhide), 2 client components (LogEventForm + EventList), admin cohort events page, and Firestore deny-all rules for ambassador_events.

## What Was Built

### Task 1: GET + POST /api/ambassador/events (EVENT-01, EVENT-04)
- GET lists own non-hidden events sorted by date desc — `where("hidden", "==", false)` ensures EVENT-04 compliance
- POST reads cohortId from ambassador subdoc, builds payload with conditional spread for optional link/notes, starts all events with `hidden: false`
- Gate order: `isAmbassadorProgramEnabled()` → `verifyAuth()` → `hasRoleClaim(ambassador)`
- Commit: `55fd7fa`

### Task 2: PATCH + DELETE /api/ambassador/events/[eventId] + 8 unit tests (EVENT-02)
- `loadOwnedEvent()` helper enforces both 404 (not found) and 403 (ownership) in one pass
- Server-side 30-day window: `Date.now() - toDateMs(event.date) > EVENT_EDIT_WINDOW_MS` → 409
- `toDateMs()` normalizes Firestore Timestamp / Date object / ISO string — handles all three shapes
- PATCH uses `UpdateEventSchema` (partial of LogEventSchema) — no `hidden` field exposed
- Empty-string link/notes in PATCH maps to `FieldValue.delete()` (clear semantics)
- 8 unit tests verified: within-window 200, outside-window 409, wrong-owner 403, unauth 401, wrong-role 403, feature-flag-off 404, DELETE within 200, DELETE outside 409
- Deviation: vi.hoisted() used (same as Plan 02) to prevent factory hoisting ReferenceError; vi.fn<FunctionType>() single-generic for vitest 4.x compatibility
- Commit: `b382c14`

### Task 3: GET + PATCH /api/ambassador/events/admin (EVENT-03)
- GET requires `?cohortId=X` (returns 400 when missing), lists ALL events for cohort (no hidden filter — admin sees everything)
- PATCH validates `{ eventId: string; hidden: boolean }` via local `AdminHidePatchSchema`; sets `updatedAt: FieldValue.serverTimestamp()` alongside hidden toggle
- Gate: `isAmbassadorProgramEnabled()` + `requireAdmin(request)` — no ambassador role check
- Commit: `0fa59ca`

### Task 4: LogEventForm + EventList client components (EVENT-01, EVENT-02, EVENT-04)
- `LogEventForm`: `authFetch("/api/ambassador/events", { method: "POST" })`, EVENT_TYPE_LABELS select, toast on success/error, form reset on success, calls `onCreated?.()` for parent refresh
- `EventList`: fetches `/api/ambassador/events` on mount and on `refreshKey` change, `canEdit()` compares `Date.now() - new Date(dateStr) <= EVENT_EDIT_WINDOW_MS`
- Empty state verbatim: "No events logged yet"
- Window-expired message verbatim: "This event can no longer be edited — the 30-day edit window has closed."
- Commit: `1312e99`

### Task 5: Admin cohort events page + EventAdminTable (EVENT-03, EVENT-04)
- Server shell at `/admin/ambassadors/cohorts/[cohortId]/events` with `export const dynamic = "force-dynamic"`
- Back-link: `← All cohorts` pointing to `/admin/ambassadors/cohorts`
- `EventAdminTable`: `adminHeaders()` helper reads `cwa_admin_token` from localStorage; GET via `fetch(...?cohortId=...)` + PATCH via `fetch("/api/ambassador/events/admin", { method: "PATCH" })`
- Hide toggle uses DaisyUI `toggle toggle-error` (per UI-SPEC destructive reservation)
- Commit: `3525f5d`

### Task 6: Firestore rules — deny-all for ambassador_events/* (EVENT-01..EVENT-04)
- Added `match /ambassador_events/{eventId} { allow read: if false; allow write: if false; }`
- Pattern mirrors `referral_codes/*` and `referrals/*` from Plan 02
- Admin SDK in API routes bypasses rules; security is enforced by auth/role/ownership checks
- Commit: `c7ee16a`

## API Endpoints Implemented

| Method | Path | Gate | Description |
|--------|------|------|-------------|
| GET | /api/ambassador/events | feature flag + verifyAuth + hasRoleClaim(ambassador) | List own non-hidden events, sorted date desc |
| POST | /api/ambassador/events | feature flag + verifyAuth + hasRoleClaim(ambassador) + Zod | Log new event; cohortId from subdoc |
| PATCH | /api/ambassador/events/[eventId] | feature flag + verifyAuth + hasRoleClaim(ambassador) + Zod | Edit own event within 30-day window |
| DELETE | /api/ambassador/events/[eventId] | feature flag + verifyAuth + hasRoleClaim(ambassador) | Delete own event within 30-day window |
| GET | /api/ambassador/events/admin | feature flag + requireAdmin | List all cohort events |
| PATCH | /api/ambassador/events/admin | feature flag + requireAdmin + Zod | Toggle hidden flag on an event |

## UI-SPEC Copy Strings Used Verbatim

| String | File | UI-SPEC Reference |
|--------|------|-------------------|
| "Log an event" | LogEventForm.tsx | §Event Logger — card title |
| "Save event" | LogEventForm.tsx | §Event Logger — submit button |
| "Event date" | LogEventForm.tsx | §Event Logger — date field label |
| "Event type" | LogEventForm.tsx | §Event Logger — type field label |
| "Estimated attendance" | LogEventForm.tsx | §Event Logger — attendance field label |
| "Event link (optional)" | LogEventForm.tsx | §Event Logger — link field label |
| "Notes (optional)" | LogEventForm.tsx | §Event Logger — notes field label |
| "No events logged yet" | EventList.tsx | §Event Logger — empty state heading |
| "This event can no longer be edited — the 30-day edit window has closed." | EventList.tsx | §Event Logger — expired window message |

## Test Results

| File | Tests | Pass |
|------|-------|------|
| `src/app/api/ambassador/events/[eventId]/route.test.ts` | 8 | 8 |
| Pre-existing regression (wave 1 + plan 02) | 245 | 245 |
| **Total** | **253** | **253** |

Key test assertions verified:
- "returns 409 when event is older than 30 days (server-side window)" — PASSED
- "returns 403 when uid does not own the event" — PASSED
- "returns 200 when within 30-day window and owns the event" — PASSED
- "returns 401 when unauthenticated" — PASSED

## Threat Model Checkboxes

- [x] **Authentication** — Both ambassador routes use `verifyAuth()` + `hasRoleClaim(ambassador)`. Admin route uses `requireAdmin()`. Covered by unit tests.
- [x] **Authorization — ownership** — `loadOwnedEvent()` checks `data.ambassadorId !== uid` → 403 before any write. Covered by "returns 403 when uid does not own the event" test.
- [x] **Data integrity — edit window** — `Date.now() - eventMs > EVENT_EDIT_WINDOW_MS` checked SERVER-SIDE in both PATCH and DELETE. Client UI hides button but server is the source of truth. Covered by "returns 409 when event is older than 30 days" test.
- [x] **Data integrity — hidden flag** — `UpdateEventSchema` is `LogEventSchema.partial()` which has no `hidden` field. Ambassador PATCH cannot toggle hidden. Verified by grep: `UpdateEventSchema` imported, not `AdminHidePatchSchema`.
- [x] **Firestore rules** — `ambassador_events/{eventId}` has `allow read: if false; allow write: if false`. Verified by grep.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.hoisted() for test mock factories**
- **Found during:** Task 2 GREEN phase — first test run
- **Issue:** Plan's test scaffold used class `NextResponseMock` referenced inside `vi.mock()` factory, which Vitest hoists to the top of the file. The class is not yet initialized when the factory runs, causing `ReferenceError: Cannot access 'NextResponseMock' before initialization`.
- **Fix:** Replaced class mock with an inline object literal in the `vi.mock("next/server")` factory; moved all mock functions to `vi.hoisted()` block. Same pattern applied in Plan 02 Task 2.
- **Files modified:** `src/app/api/ambassador/events/[eventId]/route.test.ts`
- **Commit:** `b382c14`

**2. [Rule 1 - Bug] vi.fn generic syntax for vitest 4.x**
- **Found during:** Task 2 — TypeScript compile check after fixing hoisting
- **Issue:** Initial fix used `vi.fn<Args[], Return>` (two type parameters) which vitest 4.x changed to `vi.fn<T extends Procedure>` (single function type). TypeScript error TS2558: Expected 0-1 type arguments, but got 2.
- **Fix:** Rewrote all `vi.fn` generics to `vi.fn<(args) => ReturnType>()` form (single function type parameter).
- **Files modified:** `src/app/api/ambassador/events/[eventId]/route.test.ts`
- **Commit:** `0fa59ca`

## Known Stubs

None — all components are fully wired to their respective API routes. The `LogEventForm` and `EventList` components are ready to be composed on `/ambassadors/report/page.tsx` in Plan 05 (the report page plan will import and render them). They are not stubs — they contain full form logic, API calls, and empty-state rendering.

## Threat Flags

No new network endpoints beyond what was planned. The six API endpoints are all within the planned scope. No new auth paths, file access patterns, or schema changes at trust boundaries introduced beyond the plan's threat model.

## Self-Check: PASSED

- `src/app/api/ambassador/events/route.ts` — FOUND
- `src/app/api/ambassador/events/[eventId]/route.ts` — FOUND
- `src/app/api/ambassador/events/[eventId]/route.test.ts` — FOUND
- `src/app/api/ambassador/events/admin/route.ts` — FOUND
- `src/app/ambassadors/report/LogEventForm.tsx` — FOUND
- `src/app/ambassadors/report/EventList.tsx` — FOUND
- `src/app/admin/ambassadors/cohorts/[cohortId]/events/page.tsx` — FOUND
- `src/app/admin/ambassadors/cohorts/[cohortId]/events/EventAdminTable.tsx` — FOUND
- `firestore.rules` contains `match /ambassador_events/{eventId}` — FOUND
- Task 1 commit `55fd7fa` — FOUND
- Task 2 commit `b382c14` — FOUND
- Task 3 commit `0fa59ca` — FOUND
- Task 4 commit `1312e99` — FOUND
- Task 5 commit `3525f5d` — FOUND
- Task 6 commit `c7ee16a` — FOUND
- All 8 new tests pass (253 total passing)
- TypeScript compiles clean (only pre-existing SVG module errors in social-icons)
