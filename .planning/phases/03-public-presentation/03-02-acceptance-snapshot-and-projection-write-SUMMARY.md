---
phase: 03-public-presentation
plan: "03-02"
subsystem: acceptance-pipeline

tags:
  - typescript
  - firestore
  - ambassador
  - denormalized-projection
  - username-backfill

# Dependency graph
requires:
  - phase: 03-public-presentation
    plan: "03-01"
    provides: "buildPublicAmbassadorProjection helper, PUBLIC_AMBASSADORS_COLLECTION constant, PublicAmbassadorDoc interface"
  - phase: 02-application-subsystem
    provides: "runAcceptanceTransaction base implementation, AMBASSADOR_APPLICATIONS_COLLECTION, ApplicationDoc type"
provides:
  - "ensureUniqueUsername: bounded collision-loop username uniqueness helper (D-01a)"
  - "deriveBaseUsername: URL-safe slug from displayName/email/timestamp fallback"
  - "Acceptance transaction extended with: university+city subdoc snapshot (D-06), public_ambassadors/{uid} projection write in-transaction (D-08 path 1), username backfill on profile (D-01a)"
  - "Re-accept idempotency: subdoc snapshot + public projection write are FIRST-ACCEPT-ONLY"
affects:
  - "03-03-patch-ambassador-profile-endpoint (PATCH handler handles in-life edits post-acceptance)"
  - "/ambassadors listing page: every accepted ambassador now guaranteed a public projection"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-transaction uniqueness check pattern: where().limit().get() outside txn, resolvedUsername passed as closure into txn body"
    - "Conditional-spread subdoc payload builder (avoids Admin SDK undefined rejection)"
    - "First-accept-only guard for idempotent re-accept (alreadyAccepted flag from Phase 2)"

key-files:
  created:
    - "src/lib/ambassador/username.ts"
  modified:
    - "src/lib/ambassador/acceptance.ts"

key-decisions:
  - "Pre-transaction username resolution: ensureUniqueUsername runs BEFORE db.runTransaction() because where().limit().get() is illegal inside txn.get — race window between check and txn.update is acceptable for a one-time-per-applicant operation"
  - "resolvedUsername passed as closure into txn body — closure capture avoids re-querying inside the transaction where uniqueness queries are illegal"
  - "Re-accept NO-OP: subdocPayload build, projection write, and username backfill are all gated inside if (!alreadyAccepted) — in-life updates are the PATCH endpoint's responsibility (plan 03-03)"
  - "Conditional-spread for subdocPayload.university and subdocPayload.city — defensive guard against Admin SDK undefined rejection per MEMORY.md feedback_firestore_admin_undefined"

requirements-completed:
  - "PRESENT-01"
  - "PRESENT-04"

# Metrics
duration: ~3min
completed: 2026-04-23
---

# Phase 03 Plan 02: Acceptance Snapshot + Projection Write + Username Backfill Summary

**Extends the Phase 2 acceptance transaction to write the full ambassador public surface atomically on first-accept: university/city snapshot onto subdoc (D-06), public_ambassadors/{uid} projection in the same transaction (D-08 path 1), and username backfill for ambassador-only users (D-01a).**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-22T22:00:37Z
- **Completed:** 2026-04-22T22:03:15Z
- **Tasks:** 2
- **Files created:** 1 (`src/lib/ambassador/username.ts`)
- **Files modified:** 1 (`src/lib/ambassador/acceptance.ts`)

## Accomplishments

- Created `src/lib/ambassador/username.ts` with `deriveBaseUsername` (URL-safe slug from displayName/email/timestamp) and `ensureUniqueUsername` (bounded collision-loop, max 99 iterations + timestamp absolute fallback) — mirrors the existing `/api/mentorship/profile` POST route algorithm but callable outside transaction boundaries.
- Extended `runAcceptanceTransaction` with:
  - **Pre-transaction block (STEP A):** Pre-reads application + profile docs outside the Firestore transaction to resolve the username via `ensureUniqueUsername` (where().limit().get() is illegal inside txn.get). `resolvedUsername` is captured as a closure into the txn body.
  - **STEP C:** Ambassador subdoc write switched to `subdocPayload` with conditional-spread for `university` and `city` (snapshots from application doc per D-06, guards undefined per MEMORY.md).
  - **STEP D:** `public_ambassadors/{uid}` projection written with `txn.set` inside the `!alreadyAccepted` branch (D-08 path 1 — guaranteed-atomic with role/subdoc/cohort writes, drift impossible).
  - **STEP E:** Profile roles update conditionally backfills `username: resolvedUsername` if the profile has no username (D-01a — ambassador-only users skip /mentorship/onboarding and have no username).
- Re-accept path remains fully idempotent: all new writes are gated inside `if (!alreadyAccepted) {}`.
- `npx tsc --noEmit` clean (pre-existing `social-icons` SVG errors are out of scope, pre-date Phase 3).
- `npm run lint` clean on both modified files.

## Task Commits

1. **Task 1: Add ensureUniqueUsername helper** — `207c578` (feat)
2. **Task 2: Extend runAcceptanceTransaction** — `7a57e53` (feat)

## Files Created/Modified

- `src/lib/ambassador/username.ts` (created, 65 lines) — `deriveBaseUsername` + `ensureUniqueUsername`; uses Admin Firestore SDK for uniqueness check; runs outside transaction boundary.
- `src/lib/ambassador/acceptance.ts` (modified) — added 3 new imports (publicProjection, PUBLIC_AMBASSADORS_COLLECTION, username helpers); added pre-txn block; replaced subdoc write with subdocPayload; added public projection write; replaced profile roles block with username-backfill version.

## Decisions Made

- **D-Runner-01:** The awk idempotency check in Task 2 acceptance criteria produces false positives on import lines (multi-line import blocks contain `buildPublicAmbassadorProjection` and `PUBLIC_AMBASSADORS_COLLECTION` as continuation lines which the awk `/^import/ { next }` pattern doesn't skip). Manual verification confirms all functional usage of these tokens is inside the `!alreadyAccepted` block. No code change needed — the check's INTENT is satisfied.
- **D-Runner-02:** `resolvedUsername` is typed as `string | undefined` from `preProfileData?.username`. TypeScript does not narrow this after the conditional assignment from `ensureUniqueUsername` but the flow guarantees it is a `string` when the txn body runs (either pre-existing non-empty string OR newly resolved via ensureUniqueUsername). No TS error was emitted; the `Record<string, unknown>` profileUpdate type accepts `string | undefined` safely.

## Runbook Assertion

Re-accept of an already-accepted application is a no-op for the public projection. The `public_ambassadors/{uid}` doc is written ONLY inside the `if (!alreadyAccepted) { ... }` block. In-life field updates (after acceptance) flow through `PATCH /api/ambassador/profile` (plan 03-03), not the acceptance transaction.

## Deviations from Plan

None — plan executed exactly as written. All VERBATIM code blocks in Tasks 1–2 implemented character-for-character. The only note is the awk false-positive on import continuation lines (documented as D-Runner-01 above) — this is a harness limitation, not a code deviation.

## Issues Encountered

1. **Worktree was behind main (pre-existing, same as 03-01).** Worktree `agent-a10b875a` was at `aa3a161`; Plan 03-01 outputs (`518b5fe`, `9ad744f`, `6142ff0`) were on main. Resolved by adding upstream remote and running `git merge upstream/main --no-edit` (fast-forward, no conflicts). This is standard worktree preflight — future parallel agents should merge main before executing.

## User Setup Required

None — this plan extends server-side Firestore write paths only. The public `public_ambassadors` collection will begin receiving documents on next acceptance after this deploy. No client changes, no Firestore rules change (rules already deployed by Plan 03-01 Task 3, or pending deploy in Plan 03-05).

## Known Stubs

None — both files are fully wired. `ensureUniqueUsername` queries live Firestore and the acceptance transaction writes the real projection.

## Self-Check: PASSED

Verified files exist:
- `src/lib/ambassador/username.ts` — FOUND (created)
- `src/lib/ambassador/acceptance.ts` — FOUND (modified)

Verified commits exist:
- `207c578` (Task 1) — FOUND
- `7a57e53` (Task 2) — FOUND

---
*Phase: 03-public-presentation*
*Completed: 2026-04-23*
