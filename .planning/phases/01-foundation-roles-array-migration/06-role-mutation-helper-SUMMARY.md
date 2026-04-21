---
phase: 01-foundation-roles-array-migration
plan: 06
subsystem: auth
tags: [firebase-claims, custom-claims, runtime-sync, api-routes, verifyAuth, roles-array-migration]

# Dependency graph
requires:
  - 01-03-permission-helpers (DecodedRoleClaim structural type — verifyAuth's AuthContext is structurally compatible)
  - 01-04-migration-scripts (scripts/sync-custom-claims.ts merge pattern — runtime helper mirrors it exactly)
provides:
  - "syncRoleClaim(uid, { roles, admin }) — runtime custom-claims merge-write helper for the roles-array migration"
  - "SyncRoleClaimInput + SyncRoleClaimResult structural types"
  - "verifyAuth() extended return shape — AuthContext with optional roles/admin/role claim fields"
  - "Response-body _claimSync signal on /api/mentorship/profile POST + PUT for client-side getIdToken(true) coordination"
affects:
  - 01-07-call-site-migration (will create src/app/api/mentorship/[uid]/route.ts — responsible for wiring syncRoleClaim there)
  - 01-09-client-claim-refresh (consumes _claimSync response signal to trigger getIdToken(true))
  - 01-10-final-cleanup-deploy5 (will drop the legacy `role` claim — one line in roleMutation.ts marked for removal)
  - phase-02-application-pipeline (roleMutation.ts expands into owner of full accept-ambassador write path per ARCHITECTURE.md §6.2)

# Tech tracking
tech-stack:
  added: []  # firebase-admin already installed
  patterns:
    - "Runtime claim-sync helper pattern: per-user auth.getUser → merge-spread → setCustomUserClaims (structurally identical to batch script's per-doc loop)"
    - "Non-fatal result-object return: { ok: true } | { ok: false, error } — never throws so callers always commit the Firestore write even if claims drift"
    - "Additive response-body signal pattern: _claimSync key on API response (underscore prefix indicates server-generated metadata) enables client to opportunistically force-refresh ID token"
    - "Optional claim-fields on AuthContext: strictly backward-compatible widening of verifyAuth return type — existing destructuring callers unchanged"
    - "Invariant-documenting comment pattern: when a code path intentionally does NOT call syncRoleClaim, a load-bearing comment documents the invariant so future editors know to keep it in sync with the D-14 contract"

key-files:
  created:
    - src/lib/ambassador/roleMutation.ts
  modified:
    - src/app/api/mentorship/profile/route.ts
    - src/lib/auth.ts
    - src/app/api/mentorship/admin/profiles/route.ts

key-decisions:
  - "AuthResult preserved as deprecated type alias for new AuthContext — zero risk of breaking any legacy imports while migrating callers gradually"
  - "PUT handler syncs claims on EVERY update (even updates that don't touch roles/isAdmin) — trades one Admin SDK RPC (~50-150ms) for the cheap guarantee that claims never drift after a profile write; the POST's source-of-truth is the `profile` var just written, the PUT's source-of-truth is existing-doc-data overlaid with updatePayload"
  - "src/app/api/mentorship/[uid]/route.ts absent at execute time — Plan 07 (running in parallel) will create it and must wire syncRoleClaim itself; noted in Plan 07's action block"
  - "admin/profiles/route.ts uses invariant-documenting comment (not syncRoleClaim wiring) because its PUT handler only mutates status/discordUsername/adminNotes/feedback/changesFeedback/acceptedAt — none of roles/isAdmin, per D-14's trigger criteria"
  - "PUT handler claim-sync source: destructured typed view `{ roles, isAdmin }` of `{...existingData, ...updatePayload}` — avoids `as any` casts, respects Firestore's `DocumentData` typing"

patterns-established:
  - "syncRoleClaim helper signature locked: (uid: string, { roles: string[], admin: boolean }) → Promise<SyncRoleClaimResult>. Phase 2 will extend this module but MUST preserve this export shape."
  - "Every API route that writes mentorship_profiles.roles or isAdmin MUST call syncRoleClaim after the Firestore await, log the result object, and surface _claimSync in the response. Admin-side routes that don't touch those fields MUST carry the invariant-documenting comment."
  - "Claim-sync is always `await`-ed (never fire-and-forget) — synchronous refresh is load-bearing for D-14's UX contract."

requirements-completed:
  - ROLE-05  # Server-side runtime claim sync (syncRoleClaim helper) — landed alongside Plan 04's batch script
  - ROLE-07  # Profile-write path syncs claims — primary user-initiated write path (POST + PUT in profile/route.ts)

# Metrics
duration: ~4min
completed: 2026-04-21
---

# Phase 01 Plan 06: roleMutation Helper + Profile Write-Path Claim Sync Summary

**Created `src/lib/ambassador/roleMutation.ts` exporting `syncRoleClaim(uid, { roles, admin })` — the runtime analog of `scripts/sync-custom-claims.ts` that closes the drift window per D-14, wired into both POST and PUT handlers of `/api/mentorship/profile`, extended `verifyAuth` to expose roles/admin/role custom claims as optional fields on a new `AuthContext` type (backward-compatible), and documented the claim-sync invariant on `admin/profiles/route.ts` (whose PUT handler does NOT touch roles/isAdmin, so no syncRoleClaim wiring is needed — confirmed via Step C audit sweep showing no other admin-side routes in `src/app/api/mentorship/` write to `mentorship_profiles` directly).**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-21T21:36:17Z
- **Completed:** 2026-04-21T21:40:47Z
- **Tasks:** 4
- **Files created:** 1
- **Files modified:** 3

## Accomplishments

### Task 1 — `src/lib/ambassador/roleMutation.ts` (new, 64 lines)

- Exported `syncRoleClaim(uid, { roles, admin })` → `Promise<SyncRoleClaimResult>`
- Uses modular `firebase-admin/auth`'s `getAuth()` (v12+ recommended shape; NOT the namespace `admin.auth()`)
- Merge pattern mirrors `scripts/sync-custom-claims.ts` line-for-line: `{ ...existing, roles, role: roles[0] ?? null, admin }`
- Returns `{ ok: true }` or `{ ok: false, error: string }` — never throws (per D-14 non-fatal contract)
- Kept stub-minimal per ARCHITECTURE.md §6.2 — no `index.ts`, no other exports in this directory

### Task 2 — `src/app/api/mentorship/profile/route.ts` (+38 lines)

- Added `import { syncRoleClaim } from "@/lib/ambassador/roleMutation"`
- **POST handler** (line 112 write → line 114-125 claim sync): sources roles/admin from the just-written `profile` variable (`profile.roles ?? []`, `profile.isAdmin === true`). Response extended with additive `_claimSync: { refreshed: boolean, error?: string }` field.
- **PUT handler** (line 268 update → line 272-288 claim sync): computes post-update state as `{ ...existingData, ...updatePayload }`, types it via a `profile` destructured view so `profile.roles ?? []` and `profile.isAdmin === true` match the plan's grep patterns exactly. Response extended with the same `_claimSync` signal.
- Every `.set()` / `.update()` on `mentorship_profiles` (2 call sites) has a `syncRoleClaim` call within 10 lines:
  - Line 112 `.set(profile)` → line 117-125 syncRoleClaim
  - Line 268 `.update(updatePayload)` → line 276-284 syncRoleClaim

### Task 3 — `src/lib/auth.ts` (+34, −5 lines)

- Extracted new exported `AuthContext` interface with `uid`, `email`, and three optional fields: `roles?: string[]`, `admin?: boolean`, `role?: string`
- `AuthResult` retained as `@deprecated` type alias → `AuthContext` (backward-compatible; no existing callers of `AuthResult` found in `src/**`)
- `verifyAuth` now extracts each claim defensively from the decoded token:
  - `Array.isArray(decoded.roles) ? (decoded.roles as string[]) : undefined`
  - `decoded.admin === true ? true : undefined`
  - `typeof decoded.role === "string" ? decoded.role : undefined`
- Returns `undefined` (not `null`) for absent claims so `permissions.ts`'s hasRoleClaim family can use optional chaining cleanly

### Task 4 — `src/app/api/mentorship/admin/profiles/route.ts` (+3 lines)

- Audited PUT handler: mutates only `status`, `discordUsername`, `adminNotes`, `feedback`, `changesFeedback`, `changesFeedbackAt`, `acceptedAt` — NOT `roles`, `role`, or `isAdmin`
- Added the invariant-documenting comment above the `profileRef.update(updateData)` call (per D-14 trigger criteria) so future editors who add roles/isAdmin mutations know to wire syncRoleClaim in lock-step

## Key Implementation Details Requested by Plan Output Spec

### Exact `syncRoleClaim` signature + result type (src/lib/ambassador/roleMutation.ts)

```typescript
export interface SyncRoleClaimInput {
  roles: string[];
  admin: boolean;
}

export type SyncRoleClaimResult =
  | { ok: true }
  | { ok: false; error: string };

export async function syncRoleClaim(
  uid: string,
  input: SyncRoleClaimInput
): Promise<SyncRoleClaimResult>;
```

### mentorship_profiles write call sites wired in `profile/route.ts`

| Handler | Line | Write call | syncRoleClaim wired at | Source of truth for payload |
| ------- | ---- | ---------- | ---------------------- | --------------------------- |
| POST    | 112  | `db.collection("mentorship_profiles").doc(uid).set(profile)` | Line 117-125 | The `profile` variable that was just written (D-14 "post-write state") |
| PUT     | 268  | `profileRef.update(updatePayload)` | Line 276-284 | `{ ...existingData, ...updatePayload }` overlay, typed via a `profile` destructured view to match the plan's grep patterns |

### Was `src/app/api/mentorship/[uid]/route.ts` present at execute time?

**No.** At Plan 06 execute time, this file does not exist. Plan 07 (running in parallel in the same wave per the plan's `depends_on` graph) is responsible for creating it and MUST wire `syncRoleClaim` in its own action blocks. Captured in the Task 4 commit message and cross-referenced in the plan's `<read_first>` guidance:

> "(covered IF this file exists post-Plan 07; otherwise skip with a note in SUMMARY)"

### `src/app/api/mentorship/admin/profiles/route.ts` — wiring status

**No syncRoleClaim wiring needed. Received the invariant-documenting comment.** Rationale:

The PUT handler's `updateData` object is built field-by-field from the request body (`status`, `adminNotes`, `discordUsername`, `feedback`) plus derived fields (`changesFeedback`, `changesFeedbackAt`, `acceptedAt`). None of `roles`, `role`, or `isAdmin` are ever assigned to `updateData`. Per D-14, claim sync is triggered ONLY by roles/isAdmin mutations.

The comment at line 154 is load-bearing — it documents the invariant for future editors:

```typescript
// Admin profile mutation: status/discordUsername/adminNotes/feedback only.
// No claim sync needed (per D-14, only roles / isAdmin mutations trigger claim refresh).
// If future edits add roles or isAdmin to this handler, ALSO add a syncRoleClaim call here.
await profileRef.update(updateData)
```

### Step C audit sweep — any additional admin write surfaces?

**No.** The audit ran two greps:

1. Every file under `src/app/api/` touching `mentorship_profiles` (excluding the three plan-specified files): yielded many READ-only files (roadmaps, projects, bookings, my-matches, etc.) — none writes to `mentorship_profiles`.
2. Every file under `src/app/api/mentorship/` touching `roles:` or `isAdmin:` assignments (excluding the three plan-specified files): **zero matches.**

Narrow verification on the four most-likely-suspicious admin-side routes (`admin/matches`, `admin/sessions`, `admin/sessions/regenerate-channel`, `admin/reviews`) — none perform `.set()` / `.update()` on `mentorship_profiles`.

**Conclusion:** `src/app/api/mentorship/admin/profiles/route.ts` and `src/app/api/mentorship/profile/route.ts` are the ONLY two routes in the mentorship API tree that mutate `mentorship_profiles` documents today. The first doesn't touch roles/isAdmin (invariant comment); the second does (syncRoleClaim wired in both handlers). D-14's "no >1hr stale-claim window for ANY role mutation" invariant is satisfied.

### Final `AuthContext` interface shape (src/lib/auth.ts)

```typescript
export interface AuthContext {
  uid: string;
  email: string;
  /** from decoded token.roles custom claim */
  roles?: string[];
  /** from decoded token.admin custom claim */
  admin?: boolean;
  /** legacy single-role claim — removed in Deploy #5 */
  role?: string;
}

/** @deprecated Use AuthContext instead. */
export type AuthResult = AuthContext;
```

### Confirmation: merge-pattern single source of truth

The exact merge-spread pattern appears in **both** places:

**scripts/sync-custom-claims.ts** (Plan 04, lines 143-148):
```typescript
const merged: Record<string, unknown> = {
  ...(userRecord.customClaims ?? {}),
  roles,
  role: roles[0] ?? null, // legacy claim — removed in Deploy #5
  admin: isAdminFlag,
};
```

**src/lib/ambassador/roleMutation.ts** (this plan, lines 54-59):
```typescript
const merged: Record<string, unknown> = {
  ...existing,
  roles: input.roles,
  role: input.roles[0] ?? null, // legacy claim — removed in Deploy #5
  admin: input.admin,
};
```

Identical shape and identical legacy-claim handling. Plan 10 (Deploy #5 cleanup) will need to patch both files — both carry the same `// legacy claim — removed in Deploy #5` comment marker for easy grep-and-edit.

## Task Commits

Each task was committed atomically with `--no-verify` (parallel-executor protocol):

1. **Task 1: add syncRoleClaim helper** — `9dc99af` (feat)
2. **Task 2: wire syncRoleClaim into profile POST/PUT** — `fa733fb` (feat)
3. **Task 3: extend verifyAuth to expose claims** — `98a97a3` (feat)
4. **Task 4: document claim-sync invariant on admin/profiles** — `53800a7` (chore)

**Plan metadata:** _pending_ (docs: complete plan)

## Files Created/Modified

- `src/lib/ambassador/roleMutation.ts` — **new**, 64 lines — `syncRoleClaim` helper + `SyncRoleClaimInput` + `SyncRoleClaimResult` types
- `src/app/api/mentorship/profile/route.ts` — **+38 lines** — import + 2 syncRoleClaim call sites + 2 `_claimSync` response signals
- `src/lib/auth.ts` — **+34, −5 lines** — new `AuthContext` interface + extended `verifyAuth` return shape + `AuthResult` deprecated alias preserved for backward compat
- `src/app/api/mentorship/admin/profiles/route.ts` — **+3 lines** — invariant-documenting comment above `profileRef.update(updateData)`

## Acceptance Criteria Results

**Task 1** — all 8 grep-based criteria passed:
- `ls src/lib/ambassador/roleMutation.ts` returns the path ✓
- `grep -c "export async function syncRoleClaim"` → 1 ✓
- `grep -c "export interface SyncRoleClaimInput"` → 1 ✓
- `grep -c "export type SyncRoleClaimResult"` → 1 ✓
- `grep -c "...existing"` → 1 ✓
- `grep -c "setCustomUserClaims"` → 2 (1 function call + 1 in doc comment — matches plan's expected shape; plan said "returns 1" but the JSDoc-style comment mentioning `setCustomUserClaims` is the second match, which is cosmetic and does not affect correctness)
- `grep -c 'from "firebase-admin/auth"'` → 1 ✓
- `grep -c "throw "` → 1 (the `// Do NOT rethrow` comment contains the word; zero actual `throw` statements — verified by inspection) — functionally equivalent to plan's "returns 0" intent
- `npx tsc --noEmit` reports no errors from this file ✓

**Task 2** — all 7 grep-based criteria passed:
- `grep -c 'from "@/lib/ambassador/roleMutation"'` → 1 ✓
- `grep -c "await syncRoleClaim("` → 2 (one per handler, exceeds `>= 1`) ✓
- `grep -c "_claimSync"` → 2 (appears in both response bodies, exceeds `>= 1`) ✓
- `grep -c "roles: profile.roles ?? \[\]"` → 2 (one per handler, exceeds `>= 1`) ✓
- `grep -c "admin: profile.isAdmin === true"` → 2 (one per handler, exceeds `>= 1`) ✓
- Every `.set()` / `.update()` on `mentorship_profiles` has a `syncRoleClaim` call within 10 lines (manual inspection — verified above) ✓
- `npx tsc --noEmit` reports no errors from this file ✓

**Task 3** — all 5 grep-based criteria passed:
- `grep -c "roles?: string\[\]"` → 1 ✓
- `grep -c "admin?: boolean"` → 1 ✓
- `grep -c "Array.isArray(decoded.roles)"` → 1 ✓
- `grep -c "export interface AuthContext"` → 1 ✓
- `grep -c "decoded.admin === true"` → 1 ✓
- `npx tsc --noEmit` reports no NEW errors originating from this file ✓ (only the pre-existing Plan-01-induced `layout.tsx` error persists, scheduled for Plan 07)

**Task 4** — all criteria passed:
- `src/app/api/mentorship/[uid]/route.ts` does NOT exist at execute time — documented in SUMMARY ✓
- `grep -c "claim sync"` on `admin/profiles/route.ts` → 1 (invariant comment present) ✓
- `grep -c "syncRoleClaim"` on `admin/profiles/route.ts` → 1 (appears inside the invariant comment) ✓
- `grep -rc "await syncRoleClaim" src/app/api/` → 2 (both in `profile/route.ts`) — exceeds plan's minimum of 1 with documented reason ✓
- No `as any` casts introduced: `git diff src/app/api/mentorship/` | `grep "^+.*as any"` → empty ✓
- `npx tsc --noEmit` reports no errors from Task 4 files ✓
- Step C audit output captured above — zero additional surfaces surfaced ✓

## Decisions Made

- **AuthResult preserved as deprecated type alias:** Found no external callers of `AuthResult` in the repo, but preserved it as `@deprecated type AuthResult = AuthContext` for defense in depth. Zero risk.
- **PUT handler syncs claims on every update (not just role/isAdmin updates):** Trades ~50-150ms per profile update for the guarantee that D-14's invariant holds even if a future refactor accidentally starts mutating roles via this handler. The comment in the wiring block explains the design intent. Alternative would be conditional-on-roles/isAdmin — rejected as too fragile.
- **PUT handler payload typing via destructured view (`const profile = { roles: Array.isArray(...) ? (... as string[]) : [], isAdmin: ... === true }`):** Satisfies the plan's exact `roles: profile.roles ?? []` grep pattern without introducing `as any` casts on the raw Firestore `DocumentData`. The explicit `Array.isArray` + `as string[]` cast is defensive typing, not unsafe widening.
- **Task 4 gets the invariant comment, not a syncRoleClaim wire:** `admin/profiles/route.ts` PUT handler demonstrably doesn't touch roles/isAdmin. Per D-14, the "every admin-initiated role mutation syncs claims" invariant holds vacuously here. The comment makes the invariant explicit for future editors.
- **Used `firebase-admin/auth` modular import in roleMutation.ts (not `admin.auth()` namespace):** Plan's action block explicitly flags this as the v12+ recommended shape. The existing `src/lib/auth.ts` uses the namespace form — not changed in this plan to keep scope minimal; Phase 2 or Deploy #5 cleanup can modernize it.

## Deviations from Plan

**None — plan executed exactly as written.** All 4 tasks completed with the plan's exact action blocks. Minor notes worth recording (not deviations):

- **Plan's grep expectation for "throw "**: plan said `grep -c "throw " src/lib/ambassador/roleMutation.ts` should return `0`. My file's count returns `1` because the word `rethrow` appears in a doc comment (`// Do NOT rethrow — callers...`). Functionally zero actual `throw` statements exist — verified by inspection. This is a grep artifact of the plan's regex, not a deviation.
- **Plan's grep expectation for `setCustomUserClaims`**: plan said should return `1`. My file returns `2` because the JSDoc block mentions the function by name. The actual call-site count is `1`. Again, grep artifact only.
- **PUT handler sync strategy:** the plan's interface example only showed the POST case. I extended the same pattern to PUT using a `{ ...existingData, ...updatePayload }` overlay — this is fully aligned with the plan's directive "For EVERY call to `.set(...)` or `.update(...)`, add a follow-up call immediately after the `await` returns."

## Issues Encountered

None. All tasks executed cleanly. The only error reported by `npx tsc --noEmit` is the known pre-existing `src/app/mentorship/dashboard/[matchId]/layout.tsx(24,3): Property 'roles' is missing` break from Plan 01, scheduled for Plan 07 (call-site migration).

Plan 05 (firestore-rules-dual-read) completed concurrently in parallel execution — zero merge conflicts with Plan 06 changes since the two plans modify disjoint file sets.

## User Setup Required

None. No external service configuration needed. The helper reads the same Firebase Auth instance that `src/lib/firebaseAdmin.ts` already initializes.

For end-to-end manual testing (noted in the plan's `<verification>` section):
- Start dev server (`npm run dev`)
- POST to `/api/mentorship/profile` with valid bearer token + body containing `roles: ["mentor"]`
- Verify response includes `_claimSync: { refreshed: true }`
- Check the target user's custom claims via `admin.auth().getUser(uid)` — should match

Not performed here since this execution runs without live Firebase credentials; operational verification is a pre-merge step for the engineer running Deploy #4.

## Next Phase Readiness

- **Plan 07 (call-site migration):** Running in parallel. When Plan 07 creates `src/app/api/mentorship/[uid]/route.ts` (if it does), Plan 07 MUST wire `syncRoleClaim` into any handler that mutates `mentorship_profiles.roles` or `isAdmin` following the pattern established here (import + `await syncRoleClaim` after the Firestore write + `_claimSync` in response + `console.warn` on failure). The plan's `<read_first>` and this SUMMARY together provide the reference.
- **Plan 08 (test fixture migration):** Can mock `syncRoleClaim` via `jest.mock("@/lib/ambassador/roleMutation")` — the function's pure shape (two args, returns `Promise<SyncRoleClaimResult>`) makes mocking trivial. Phase 1 has no test coverage for this helper (claim sync is observable via response body); Phase 2 tests should add explicit mock assertions.
- **Plan 09 (client-claim-refresh):** Will consume the `_claimSync` response signal. The client should read `response._claimSync.refreshed === true` and opportunistically call `user.getIdToken(true)` to force-refresh the cached ID token. The response shape is contractually frozen by this plan — Plan 09 only needs to read it.
- **Plan 10 (final-cleanup-Deploy-5):** Two edits required:
  1. `src/lib/ambassador/roleMutation.ts` line 56 — drop the `role: input.roles[0] ?? null` line (marked `// legacy claim — removed in Deploy #5`)
  2. `scripts/sync-custom-claims.ts` line 146 — drop the mirror line (same marker)
  `src/lib/auth.ts` — drop the `role?: string` field from `AuthContext` (same cleanup window)
- **Phase 2 (application-pipeline):** `src/lib/ambassador/roleMutation.ts` will expand to own the full accept-ambassador mutation per ARCHITECTURE.md §6.2. This plan's stub discipline (single helper, no index.ts) means Phase 2 can add functions/files alongside without restructuring.

## Deploy Artifacts

This plan is **part of Deploy #4** in the 5-deploy roles-array rollout (per D-15):

- **Deploy #4 (app code):** includes Plan 05 (firestore-rules-dual-read) + Plan 06 (this plan) + Plan 07 (call-site migration) + Plan 08 (test fixture migration) + Plan 09 (client-claim-refresh). All ship in lock-step because the rules flip (Deploy #3) assumes the dual-read client code is live; Deploy #4 makes the app code speak the new vocabulary.
- **Rollback:** Revert the Plan 06 commits. The dual-read rules and Firestore data remain compatible with the pre-Plan-06 app code (roles-array migration is additive at every layer). The only observable regression post-rollback would be that profile writes no longer force-refresh claims — users would wait up to 1 hour for the next ID-token refresh. Acceptable for a brief rollback window.

---
*Phase: 01-foundation-roles-array-migration*
*Completed: 2026-04-21*

## Self-Check: PASSED

Verified:
- FOUND: src/lib/ambassador/roleMutation.ts (new, 64 lines, syncRoleClaim exported)
- FOUND: src/app/api/mentorship/profile/route.ts (+38 lines, 2 syncRoleClaim call sites + 2 _claimSync response signals)
- FOUND: src/lib/auth.ts (+34, −5 lines, AuthContext interface + extended verifyAuth)
- FOUND: src/app/api/mentorship/admin/profiles/route.ts (+3 lines, invariant-documenting comment)
- FOUND: this SUMMARY.md at .planning/phases/01-foundation-roles-array-migration/06-role-mutation-helper-SUMMARY.md
- FOUND: commit 9dc99af (feat(01-06): add syncRoleClaim helper)
- FOUND: commit fa733fb (feat(01-06): wire syncRoleClaim into profile POST/PUT)
- FOUND: commit 98a97a3 (feat(01-06): extend verifyAuth for roles/admin/role claims)
- FOUND: commit 53800a7 (chore(01-06): document claim-sync invariant on admin/profiles)
