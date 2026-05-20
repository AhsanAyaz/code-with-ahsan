---
phase: tools-event-email-blasts
plan: "02"
title: Ghost Admin API client for fetching email-blast drafts
subsystem: ghost
tags: [ghost, admin-api, email-blast, sdk, types]
dependency_graph:
  requires: []
  provides: [ghost/admin.ts, EmailBlastDraft interface, listEmailBlastDrafts, getDraftHtml]
  affects: [plan-04-blast-ui, plan-05-send-api]
tech_stack:
  added: ["@tryghost/admin-api@1.14.9"]
  patterns: [lazy-init singleton, non-throwing API wrappers, type declaration shim]
key_files:
  created:
    - src/lib/ghost/admin.ts
    - src/lib/ghost/__tests__/admin.test.ts
    - src/types/tryghost-admin-api.d.ts
  modified:
    - .env.example
    - package.json
    - package-lock.json
decisions:
  - "Used class-based vi.mock factory (not vi.fn().mockImplementation) — Vitest requires newable constructors for SDK classes"
  - "Added type declaration shim because @tryghost/admin-api ships no TypeScript types (no types/typings in package.json)"
  - "Ghost internal tag #email-blast maps to hash-email-blast in filter strings; status:draft added to exclude published posts"
metrics:
  duration: ~8 minutes
  completed: 2026-05-20T20:07:59Z
  tasks_completed: 6
  files_changed: 6
---

# Phase tools-event-email-blasts Plan 02: Ghost Admin API Client Summary

Ghost Admin API client that lists draft posts tagged with `#email-blast` and fetches their rendered HTML, providing the data layer for the admin email-blast UI (Plan 04) and send API (Plan 05).

## What Was Built

- **`src/lib/ghost/admin.ts`** — Library module exporting:
  - `getGhostAdmin()` — Lazy-init singleton returning a `GhostAdminAPI` instance (or null if `GHOST_ADMIN_API_KEY` unset). Reads optional `GHOST_ADMIN_URL` with fallback to `https://blog.codewithahsan.dev`.
  - `listEmailBlastDrafts()` — Browses posts with filter `tag:hash-email-blast+status:draft`, limit 50, returns `EmailBlastDraft[]`. Returns `[]` on missing key or error.
  - `getDraftHtml(postId)` — Reads a single post by ID with HTML format. Returns `EmailBlastDraft | null`. Returns `null` on 404 or error.
  - `EmailBlastDraft` interface — `{ id, title, html, status, updatedAt, url }`.

- **`src/types/tryghost-admin-api.d.ts`** — Minimal type declaration shim covering `GhostAdminAPI` constructor and `posts.browse`/`posts.read` methods.

- **`src/lib/ghost/__tests__/admin.test.ts`** — 5 Vitest tests covering: missing API key, happy-path browse, SDK error → empty array, happy-path read, SDK error → null.

- **`.env.example`** — Added Ghost Admin section documenting `GHOST_ADMIN_API_KEY` (format `<id>:<secret>`) and optional `GHOST_ADMIN_URL`.

## Verification

- `npm ls @tryghost/admin-api` — `@tryghost/admin-api@1.14.9` installed.
- `npx tsc --noEmit` — passes with zero errors.
- `npx vitest run src/lib/ghost` — 5/5 tests pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Vitest class mock required proper constructor function**
- **Found during:** Task 4 (tests)
- **Issue:** Initial test used `vi.fn().mockImplementation(() => ({ posts: ... }))` — Vitest warns that arrow functions cannot be used as constructors (`is not a constructor`). 4 of 5 tests failed.
- **Fix:** Replaced mock factory with an inline `class MockGhostAdminAPI` inside `vi.mock()` factory, which satisfies `new GhostAdminAPI(...)` call in production code.
- **Files modified:** `src/lib/ghost/__tests__/admin.test.ts`
- **Commit:** 9bc05ea (same task commit)

## Known Stubs

None — this plan only creates a library module. No UI components or data rendering paths.

## Threat Flags

None — this module performs server-side read-only calls to the Ghost Admin API over HTTPS using a secret key stored in environment variables. No new network endpoints are exposed by this plan.

## Self-Check: PASSED

- [x] `src/lib/ghost/admin.ts` exists
- [x] `src/lib/ghost/__tests__/admin.test.ts` exists
- [x] `src/types/tryghost-admin-api.d.ts` exists
- [x] `.env.example` updated with Ghost Admin section
- [x] Commit 9bc05ea exists
