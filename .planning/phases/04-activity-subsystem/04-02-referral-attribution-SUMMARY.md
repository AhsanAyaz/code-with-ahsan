---
phase: 04-activity-subsystem
plan: "02"
subsystem: referral-attribution
tags: [referral, cookie, middleware, firestore-rules, tdd, attribution]
dependency_graph:
  requires:
    - 04-01-foundations-types-schemas (REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE_SECONDS, REFERRAL_CODES_COLLECTION, REFERRALS_COLLECTION, generateUniqueReferralCode, ReferralCodeLookup)
  provides:
    - src/middleware.ts (Next.js Edge middleware: sets cwa_ref cookie on ?ref=CODE visits)
    - src/lib/ambassador/referral.ts (consumeReferral: server-side attribution with guards)
    - src/lib/ambassador/acceptance.ts (extended: generates referral code at acceptance, writes lookup doc atomically)
    - src/app/api/mentorship/profile/route.ts (extended: consumes cwa_ref cookie on first profile POST)
    - firestore.rules (deny-all client rules for referrals/* and referral_codes/*)
  affects:
    - All Phase 5 plans that read referral counts for the leaderboard
tech_stack:
  added: []
  patterns:
    - Next.js Edge middleware with cookie set (HttpOnly, SameSite=Lax, 30d max-age)
    - TDD red-green for Tasks 1 and 2
    - vi.hoisted() for Vitest factory-hoisting mock isolation
    - Pre-transaction referral code generation (outside txn; where().limit().get() illegal in txn)
    - Atomic in-transaction lookup doc write (referral_codes/{code} + ambassador subdoc)
    - Never-throw server helper pattern (consumeReferral wraps all in try/catch)
    - Cookie clear on outgoing NextResponse (synchronous await before return)
key_files:
  created:
    - src/middleware.ts
    - src/middleware.test.ts
    - src/lib/ambassador/referral.ts
    - src/lib/ambassador/referral.test.ts
  modified:
    - src/lib/ambassador/acceptance.ts
    - src/app/api/mentorship/profile/route.ts
    - firestore.rules
decisions:
  - "vi.hoisted() used in referral.test.ts to share mock functions between vi.mock() factory and test body — standard Vitest pattern for factory hoisting; plain variable references cause ReferenceError at runtime"
  - "referralConsumed flag pattern in profile POST: cookie cleared on response regardless of attribution result — prevents endless retry on same user if attribution fails for any reason"
  - "resolvedReferralCode generated pre-transaction (outside db.runTransaction) per the same pattern as resolvedUsername in ensureUniqueUsername — where().limit().get() queries are illegal inside txn.get; the txn write makes generation+lookup-doc atomic"
metrics:
  duration: "5 minutes"
  completed: "2026-04-23"
  tasks_completed: 5
  files_changed: 7
  insertions: ~380
---

# Phase 4 Plan 02: Referral Attribution Summary

**One-liner:** Full referral attribution pipeline — HttpOnly cookie setter in Next.js Edge middleware, server-side code generation at acceptance with atomic Firestore lookup doc, REF-04 self/double-attribution guards in consumeReferral, first-profile-POST cookie consumption with cookie clear on response, and deny-all Firestore rules for both referral collections.

## What Was Built

### Task 1: src/middleware.ts + src/middleware.test.ts (REF-02)
- Created `src/middleware.ts`: Next.js Edge middleware that reads `?ref=CODE`, skips if empty/whitespace or if `cwa_ref` cookie already exists, otherwise sets `cwa_ref` with `HttpOnly: true`, `SameSite: lax`, `path: /`, `maxAge: 2592000`, `secure` in production
- Matcher excludes `/api/`, `_next/static`, `_next/image`, `favicon.ico`
- Created `src/middleware.test.ts`: 6 Vitest tests using `vi.mock("next/server")` mock pattern
- Commit: `614cc8a`

### Task 2: src/lib/ambassador/referral.ts + referral.test.ts (REF-03, REF-04)
- Created `src/lib/ambassador/referral.ts`: `consumeReferral(referredUserId, refCode)` — resolves code→ambassadorId via O(1) top-level lookup, enforces self-attribution guard (`ambassadorId === referredUserId`), enforces double-attribution guard (`where("referredUserId", "==", uid).limit(1).get()`), writes `referrals/{autoId}` doc with `ambassadorId`, `referredUserId`, `convertedAt` (serverTimestamp), `sourceCode`
- Returns `ConsumeReferralResult` — never throws (full try/catch)
- Created `src/lib/ambassador/referral.test.ts`: 5 Vitest tests using `vi.hoisted()` for factory-hoisted mock isolation
- Commit: `c28d153`

### Task 3: Extended runAcceptanceTransaction (REF-01)
- Added imports for `generateUniqueReferralCode` and `REFERRAL_CODES_COLLECTION` to `acceptance.ts`
- Added `resolvedReferralCode = await generateUniqueReferralCode(resolvedUsername)` in the pre-transaction block (mirrors the `ensureUniqueUsername` pattern)
- Added `referralCode: resolvedReferralCode` to `subdocPayload` (first-accept only via `if (!alreadyAccepted)` guard)
- Added `txn.set(refCodeRef, { ambassadorId, uid })` inside transaction for atomic commit of subdoc + lookup doc
- Extended `AcceptanceResult` `ok: true` branch with optional `referralCode?: string`
- Added `...(alreadyAccepted ? {} : { referralCode: resolvedReferralCode })` to return value
- Commit: `ba8c789`

### Task 4: Extended POST /api/mentorship/profile (REF-03)
- Added imports for `consumeReferral` and `REFERRAL_COOKIE_NAME`
- After profile write and claim sync, reads `request.cookies.get(REFERRAL_COOKIE_NAME)?.value`
- Synchronously awaits `consumeReferral(uid, refCode)` — NOT fire-and-forget
- Logs attribution success/skip with ambassador, user, code, referralId
- Sets `referralConsumed = true` regardless of attribution result
- Wraps final `NextResponse.json(...)` in a variable; calls `response.cookies.delete(REFERRAL_COOKIE_NAME)` when `referralConsumed`
- Commit: `9b67613`

### Task 5: Firestore rules (REF-01..REF-05)
- Added `match /referral_codes/{code}` with `allow read: if false; allow write: if false`
- Added `match /referrals/{referralId}` with `allow read: if false; allow write: if false`
- Both blocks include comments referencing which server files write them and why Admin SDK bypasses these rules
- Commit: `03b4330`

## Test Coverage

| File | Tests | Pass |
|------|-------|------|
| `src/middleware.test.ts` | 6 | 6 |
| `src/lib/ambassador/referral.test.ts` | 5 | 5 |
| `src/lib/ambassador/referralCode.test.ts` (wave 1) | 9 | 9 |
| `src/lib/ambassador/reportDeadline.test.ts` (wave 1) | 11 | 11 |
| **Total (this plan + wave 1 regression)** | **31** | **31** |

## Threat Model Checkboxes

- [x] **HttpOnly flag** — `httpOnly: true` set on cookie in `src/middleware.ts` line 34; client JS cannot read or tamper (HIGH severity per threat model)
- [x] **Self-attribution guard** — `ambassadorId === referredUserId` check in `consumeReferral`; covered by "returns self_attribution when ambassadorId equals referredUserId" test
- [x] **Double-attribution guard** — `where("referredUserId", "==", uid).limit(1).get()` pre-write query in `consumeReferral`; covered by "returns already_attributed when existing referral doc found" test
- [x] **Firestore rules denial** — `allow read: if false; allow write: if false` on both `referral_codes/*` and `referrals/*`; verified by grep returning 2 matches

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vi.mock factory hoisting in referral.test.ts**
- **Found during:** Task 2 GREEN phase
- **Issue:** Plan's test scaffold used top-level `const collectionFn = vi.fn(...)` and referenced it inside `vi.mock()` factory — Vitest hoists `vi.mock()` to top of file, so `collectionFn` is not yet initialized when the factory runs, causing `ReferenceError: Cannot access 'collectionFn' before initialization`
- **Fix:** Used `vi.hoisted()` to create all mock functions in a hoisted block accessible to both the factory and the test body
- **Files modified:** `src/lib/ambassador/referral.test.ts`
- **Commit:** `c28d153`

## Known Stubs

None — all implemented functionality is fully wired. The referral pipeline is end-to-end: cookie set on visit → cookie read on profile POST → consumeReferral writes Firestore doc → cookie cleared on response.

## Threat Flags

No new network endpoints introduced beyond what was planned. The middleware runs on unauthenticated requests (by design — per threat model §Authentication). No new trust boundary surfaces.

## Self-Check: PASSED

- `src/middleware.ts` — FOUND
- `src/middleware.test.ts` — FOUND
- `src/lib/ambassador/referral.ts` — FOUND
- `src/lib/ambassador/referral.test.ts` — FOUND
- `src/lib/ambassador/acceptance.ts` contains `generateUniqueReferralCode` import — FOUND
- `src/app/api/mentorship/profile/route.ts` contains `consumeReferral` import — FOUND
- `firestore.rules` contains `match /referral_codes/{code}` — FOUND
- `firestore.rules` contains `match /referrals/{referralId}` — FOUND
- Task 1 commit `614cc8a` — FOUND
- Task 2 commit `c28d153` — FOUND
- Task 3 commit `ba8c789` — FOUND
- Task 4 commit `9b67613` — FOUND
- Task 5 commit `03b4330` — FOUND
- All 31 tests pass (6 middleware + 5 referral + 9 referralCode + 11 reportDeadline)
- TypeScript compiles clean (only pre-existing SVG module errors in social-icons unrelated to this plan)
