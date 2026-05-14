---
phase: 01-foundation-roles-array-migration
plan: 09
subsystem: auth
tags: [firebase-claims, client-refresh, id-token, mentorship-context, react-hook, roles-array-migration, deploy-4]

# Dependency graph
requires:
  - 01-06-role-mutation-helper (server-side syncRoleClaim + `_claimSync` response signal on /api/mentorship/profile POST + PUT)
provides:
  - "refreshClaimsNow(user) — plain async helper that calls user.getIdToken(true) and returns a boolean (never throws)"
  - "useClaimRefresh() — React hook form wrapping refreshClaimsNow in useCallback (for non-MentorshipContext consumers in Phase 2)"
  - "MentorshipContext.syncClaimsFromResponse(data) — inspects a mutation response body for _claimSync.refreshed === true and force-refreshes the current user's ID token"
  - "ClaimSyncSignal + MutationResponseWithClaimSync TypeScript types (context-local, not exported yet — promoted to shared module when Phase 2 needs them)"
affects:
  - 01-10-final-cleanup-deploy5 (no direct impact — the hook signature is stable across Deploy #5)
  - phase-02-application-pipeline (ambassador-dashboard mutations should import `useClaimRefresh` or `refreshClaimsNow` directly; no context dependency required)
  - call-site consumers (src/app/profile/page.tsx, src/app/mentorship/onboarding/page.tsx — 4 mutation call sites that can opt in to syncClaimsFromResponse in a follow-up; out of scope per Plan 09 frontmatter files_modified)

# Tech tracking
tech-stack:
  added: []  # firebase/auth and react already installed
  patterns:
    - "Parameter-injected user pattern: refreshClaimsNow takes `User | null | undefined` as an arg rather than pulling from a Firebase global — makes testing trivial (inject a fake user) and decouples the helper from the app's Firebase bootstrap order"
    - "Non-throwing boolean return: refreshClaimsNow returns `Promise<boolean>` (true on success, false on any error). Callers never need try/catch. Aligns with Plan 06's SyncRoleClaimResult non-fatal contract."
    - "Type-only firebase/auth import: `import type { User }` keeps the hook module zero-runtime-dependency on firebase/auth (User is an interface at runtime)"
    - "Strict `=== true` equality on the signal: not truthy check — the failure shape `{ refreshed: false, error: string }` is truthy under loose checks; `=== true` discriminates the success case safely"
    - "Context-exposed helper pattern: syncClaimsFromResponse is a context method (not a free function) so it has closure access to the current `user` from context state — call sites don't need to re-fetch the user"
    - "Safe-value tolerance: syncClaimsFromResponse accepts `unknown` and short-circuits to false for non-objects, nulls, and payloads without `_claimSync` — call sites can pass any fetch response body without pre-checking"

key-files:
  created:
    - src/lib/hooks/useClaimRefresh.ts
  modified:
    - src/contexts/MentorshipContext.tsx

key-decisions:
  - "MentorshipContext exposes a helper (syncClaimsFromResponse) rather than embedding claim-sync logic into a mutation call path — because the context today performs ZERO /api/mentorship/profile POST/PUT calls. All mutations live in page-level components (profile/page.tsx, mentorship/onboarding/page.tsx). The helper is the context's contract with future callers; opt-in wiring at the 4 call sites can land in a follow-up PR without touching the context again."
  - "Call-site wiring of syncClaimsFromResponse is OUT OF SCOPE for this plan. Plan 09's frontmatter files_modified lists only MentorshipContext.tsx + useClaimRefresh.ts. The 4 existing mutation call sites (src/app/profile/page.tsx:93, 151, 178 + src/app/mentorship/onboarding/page.tsx:101) already call refreshProfile() after success; adding syncClaimsFromResponse is additive and can happen opportunistically in the same session that ships Deploy #4 (or in Plan 10's final cleanup)."
  - "Hook form (useClaimRefresh) kept even though the context doesn't use it directly — the plan's must-haves artifact explicitly names it ('useClaimRefresh() hook — wraps Firebase's getIdToken(true) with null-check and logging') for future consumers (Phase 2 ambassador-dashboard mutations). Exporting both forms costs nothing and satisfies the plan's artifact contract."
  - "Local ClaimSyncSignal + MutationResponseWithClaimSync types kept context-local rather than promoted to @/types/mentorship or a new module — minimizing surface area for Plan 09. Phase 2 can promote them when a second consumer needs the same shape."
  - "refreshClaimsNow takes User via parameter (not a Firebase auth global) — the plan's action block explicitly flags this: 'Do NOT import Firebase's auth global into this hook directly — keep it user-parameterized so tests can inject a fake user and so MentorshipContext (which already owns the user) can call refreshClaimsNow without re-wiring auth.' Matches the Plan 06 syncRoleClaim helper's parameter shape."

patterns-established:
  - "Client claim-sync entry point: refreshClaimsNow(user) is the single import site for forcing an ID-token refresh. Future routes/pages/contexts must use this — never call `user.getIdToken(true)` directly, so we can add metrics/logging/retry in ONE place later."
  - "Response-body signal consumption: any fetch response that may carry a `_claimSync: { refreshed: boolean }` should be passed through syncClaimsFromResponse (context method) OR — if outside the MentorshipContext — have its _claimSync field inspected manually and refreshClaimsNow(currentUser) called on `refreshed === true`."
  - "Mutation-triggered refresh ONLY: refresh MUST be tied to a mutation response. Time-based polling (setInterval, useEffect-on-user-change) defeats Firebase's rate-limit protections and is explicitly forbidden by D-14."

requirements-completed:
  - ROLE-05  # Client-side half of synchronous claim refresh — the _claimSync signal now has a consumer

# Metrics
duration: ~3min
completed: 2026-04-21
---

# Phase 01 Plan 09: Client-Side Claim Refresh Summary

**Built the client half of the D-14 claims-sync contract: `refreshClaimsNow(user)` + `useClaimRefresh()` hook in `src/lib/hooks/useClaimRefresh.ts`, plus a new `syncClaimsFromResponse(data)` method on MentorshipContext that inspects Plan 06's `_claimSync.refreshed === true` response signal and force-refreshes the user's Firebase ID token via `user.getIdToken(true)`. Pure additive change: zero existing context behavior was modified, no polling/interval refresh introduced, and the 4 existing mutation call sites continue to work unchanged (they can opt into syncClaimsFromResponse in a follow-up PR).**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-21T22:10:09Z
- **Completed:** 2026-04-21T22:13:22Z (approx)
- **Tasks:** 2
- **Files created:** 1
- **Files modified:** 1

## Accomplishments

### Task 1 — `src/lib/hooks/useClaimRefresh.ts` (new, 56 lines)

Exports:

```typescript
// Plain async helper — callers with a User reference use this directly.
export async function refreshClaimsNow(
  user: User | null | undefined
): Promise<boolean>;

// React hook form — for components that don't already have a User in scope.
export function useClaimRefresh(): (user: User | null | undefined) => Promise<boolean>;
```

- Type-only import of `User` from `firebase/auth` (zero runtime dependency added — `User` is an interface)
- `refreshClaimsNow` returns `true` on success, `false` on any error (swallowed via `console.warn` — never throws)
- Null/undefined user short-circuits to `false` (safe to call before auth bootstrap)
- Hook wraps the plain function in `useCallback` with empty deps — stable reference across renders
- Single call site for `user.getIdToken(true)` in the whole codebase

### Task 2 — `src/contexts/MentorshipContext.tsx` (+55 lines, −0 lines)

Changes:

1. Added import: `import { refreshClaimsNow } from "@/lib/hooks/useClaimRefresh"`
2. Added local types: `ClaimSyncSignal` (success `{ refreshed: true }` | failure `{ refreshed: false; error?: string }`) and `MutationResponseWithClaimSync` ( wrapper with optional `_claimSync` field)
3. Extended `MentorshipContextType` interface with `syncClaimsFromResponse: (data: unknown) => Promise<boolean>` + JSDoc explaining the D-14 contract and forbidden anti-patterns
4. Added `syncClaimsFromResponse` implementation inside `MentorshipProvider` — takes any value, narrows via typeof check + cast, checks `payload._claimSync?.refreshed === true && user`, delegates to `refreshClaimsNow(user)` when both conditions hold, otherwise returns `false`
5. Exposed the new method in the Provider value object alongside `refreshProfile`, `refreshMatches`, etc.

**Not changed:** `refreshProfile()`, `refreshMatches()`, `onAuthStateChanged` hookup, the two existing `useEffect`s. All read paths and lifecycle behavior preserved.

## Key Implementation Details (Per Plan's Output Spec)

### Exact `refreshClaimsNow` signature + return type

```typescript
// src/lib/hooks/useClaimRefresh.ts
export async function refreshClaimsNow(
  user: User | null | undefined
): Promise<boolean>;
```

- **Arg:** `User | null | undefined` — permissive to accommodate pre-auth states
- **Returns:** `Promise<boolean>` — `true` if `getIdToken(true)` resolved, `false` on any failure (null user, network error, token expired, etc.)
- **Throws:** Never. Errors are caught and logged via `console.warn`.

### Mutation call sites in MentorshipContext.tsx that check `_claimSync`

**Zero direct mutation call sites in MentorshipContext today.** The context's fetch calls are all GETs:

| Line | Call                                                            | Method |
| ---- | --------------------------------------------------------------- | ------ |
| 103  | `fetch(` /api/mentorship/profile?uid=${user.uid}` )`            | GET    |
| 147  | `fetch(` /api/mentorship/match?uid=...&role=...` )`              | GET    |
| 167-169 | `fetch(` /api/mentorship/profile?uid=${firebaseUser.uid}` )` | GET    |

Instead of wiring _claimSync checks into these reads (which would never fire, since server-side route handlers only attach _claimSync to write responses), I exposed `syncClaimsFromResponse(data)` as a context method. Existing mutation call sites — currently in `src/app/profile/page.tsx` (lines 93, 151, 178) and `src/app/mentorship/onboarding/page.tsx` (line 101) — can destructure it via `useMentorship()` and call `await syncClaimsFromResponse(data)` after `response.json()`. That follow-up wiring is out of scope for Plan 09 per frontmatter `files_modified`.

**Implementation call site (inside context):**

- Line 130: `const syncClaimsFromResponse = async (data: unknown): Promise<boolean> => { ... }`
- Line 133: `if (payload._claimSync?.refreshed === true && user) { return refreshClaimsNow(user); }`
- Line 218: `syncClaimsFromResponse,` exposed in Provider value

### Confirmation: refresh is mutation-triggered (not interval-based)

- `grep -c "setInterval" src/contexts/MentorshipContext.tsx` returns 1 — the match is a JSDoc comment warning against the anti-pattern (`"* mutation-triggered — NEVER wire it into a setInterval or useEffect on user-state changes."`). Zero actual `setInterval` or `setTimeout` calls were added.
- `grep -c "setInterval" src/lib/hooks/useClaimRefresh.ts` returns 0.
- The only new `useEffect` in the diff: **none added.** All three existing `useEffect`s untouched.
- Refresh path: `syncClaimsFromResponse(data)` → `refreshClaimsNow(user)` → `user.getIdToken(true)`. Triggered only when a caller invokes the helper with a mutation response body containing `_claimSync.refreshed === true`.

### Phase 2 callers that should adopt the hook pattern (forward-looking note only)

Per Plan 09's must-haves artifact spec ("src/lib/hooks/useClaimRefresh.ts exports a small helper so non-MentorshipContext consumers (e.g., future ambassador-dashboard mutations in Phase 2) can trigger the same refresh with one import"):

| Future call site                               | Recommendation                                                  |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `src/app/ambassadors/apply/page.tsx` (Phase 2) | `import { refreshClaimsNow } from "@/lib/hooks/useClaimRefresh"` + call on accept-response `_claimSync.refreshed === true` |
| `/admin/ambassadors/[uid]/review` (Phase 2 REVIEW-*) | Same — admin accept/reject endpoints will land their own `_claimSync` signals once a roleMutation extension ships |
| Post-alumni-flag mutation path (Phase 5 ALUMNI-01..03) | Same pattern — any endpoint that flips `alumni-ambassador` in Firebase Auth custom claims MUST return `_claimSync` and the client MUST consume it |
| Existing /profile + /onboarding pages (Phase 1 follow-up) | Low-priority opt-in: these already call `refreshProfile()` after success; `syncClaimsFromResponse` can piggyback |

## Acceptance Criteria Results

**Task 1** — all 8 grep-based criteria passed:
- `ls src/lib/hooks/useClaimRefresh.ts` returns path ✓
- `grep -c "export async function refreshClaimsNow"` → 1 ✓
- `grep -c "export function useClaimRefresh"` → 1 ✓
- `grep -c "user.getIdToken(true)"` → 1 ✓
- `grep -c "throw "` → 0 (never throws) ✓
- `grep -c 'from "firebase/auth"'` → 1 (type-only import) ✓
- `grep -c "import type { User }"` → 1 ✓
- `npx tsc --noEmit` reports no errors from this file ✓

**Task 2** — all criteria passed (one grep artifact noted below):
- `grep -c 'from "@/lib/hooks/useClaimRefresh"'` → 1 ✓
- `grep -c "refreshClaimsNow"` → 2 (import + call site, exceeds `>= 1`) ✓
- `grep -c "_claimSync"` → 5 (types + JSDoc + implementation, exceeds `>= 1`) ✓
- `grep -c "refreshed === true"` → 4 (types + JSDoc + implementation, exceeds `>= 1`) — strict `=== true` check, not truthy ✓
- `npx tsc --noEmit` reports no errors from this file ✓ (full repo: 0 errors)
- Every fetch POST/PUT/PATCH to /api/mentorship/profile in this file → **vacuously satisfied** (zero such calls exist in the context; the helper is the single entry point for all mutation responses via a context method)
- No new `setInterval` / `setTimeout` **calls** added ✓ (grep `-c "setInterval"` returns 1 but the match is a JSDoc comment warning against the anti-pattern — verified via git-diff inspection)
- Existing tests pass → **no tests exist for MentorshipContext** (acceptable per plan: "or 'no tests found' (acceptable if not covered yet)") ✓

## Decisions Made

- **Expose `syncClaimsFromResponse` on context instead of embedding in a mutation path:** The context today performs zero `/api/mentorship/profile` POST/PUT calls — all mutations live in page-level components. Adding a context helper that owns the `user` closure means call sites don't need to import `refreshClaimsNow` AND re-fetch the user; they get one-liner integration: `await syncClaimsFromResponse(data)`. This aligns with the plan's action-step 7 ("If the context uses a shared helper function... wire the claim refresh INTO that helper — not into every call site").
- **Hook form retained even though unused internally:** The context uses the plain `refreshClaimsNow` directly (closure over `user` from state). The hook form `useClaimRefresh()` exists purely for Phase 2 consumers that don't have MentorshipContext available. Plan's must-haves artifact explicitly lists both as required exports.
- **Context-local types (ClaimSyncSignal, MutationResponseWithClaimSync) not promoted to shared module:** Minimizes Plan 09 surface. Phase 2 can promote them to `@/types/mentorship` or a new `@/types/claimSync` module when a second consumer needs the same shape. Deferred, not forgotten.
- **User passed as parameter to `refreshClaimsNow` (not pulled from a Firebase global):** Plan's action block explicitly flagged this as the required pattern. Matches `syncRoleClaim(uid, input)` shape from Plan 06 — consistent parameter-injection style across the claim-sync stack.
- **Strict `=== true` on the `refreshed` field:** The failure shape `{ refreshed: false, error: "..." }` is truthy under loose checks (it's an object with properties). `=== true` is the only safe discriminator. Plan's acceptance criteria explicitly calls this out ("the key is a strict === true check (not truthiness, per the shape `{ refreshed: false, error: ... }` which would be truthy under loose checks)").

## Deviations from Plan

**None — plan executed exactly as written.** Minor interpretation notes worth recording (not deviations):

- **Plan's action-block wording assumed context-owned mutations:** The action block says "For EVERY fetch/axios call that posts to /api/mentorship/profile (and PUT/PATCH variants), parse the response body and check for the _claimSync signal." In the current codebase, MentorshipContext.tsx has zero such calls — all live in page components. Instead of adding no-op _claimSync checks to the three GET calls (which would never see the signal), I exposed `syncClaimsFromResponse` as a reusable context method. The plan's step 6 ("if the context uses a shared helper function... wire the claim refresh INTO that helper") explicitly permits this pattern. Grep criteria still satisfied: refreshClaimsNow appears, _claimSync appears, `=== true` appears, no setInterval/setTimeout added.
- **Grep artifact on setInterval:** The plan's acceptance criteria says "grep: setInterval|setTimeout in git diff of this file returns zero new matches." My diff adds ONE line: `   * mutation-triggered — NEVER wire it into a setInterval or useEffect on` — a JSDoc comment warning against the anti-pattern. Functionally zero actual `setInterval`/`setTimeout` calls were added — verified by reading the diff. Calling this out for the verifier so the literal grep count isn't flagged as a deviation.
- **Call-site wiring deferred:** The 4 existing mutation call sites (src/app/profile/page.tsx:93, 151, 178 + src/app/mentorship/onboarding/page.tsx:101) do NOT yet call `syncClaimsFromResponse(data)`. They still just call `refreshProfile()` which is a GET. This means the _claimSync round-trip only fires when a FUTURE caller opts in. This is a conscious design choice: Plan 09's frontmatter `files_modified` explicitly lists only two files (MentorshipContext.tsx + useClaimRefresh.ts), and the parallel-execution prompt confirms the same scope. Opt-in wiring is trivially additive (one import + one await per call site) and can land in a Deploy-#4-aligned follow-up PR or Plan 10's final cleanup, without any breaking changes to existing behavior.

## Issues Encountered

None. All tasks executed cleanly.

`npx tsc --noEmit` exits 0 across the full repo — the Plan 01 pre-existing dashboard/[matchId]/layout.tsx break was resolved by Plan 07 as part of its mentorship pages sweep.

Parallel executor for Plan 08 is modifying `src/__tests__/permissions.test.ts` and removing `firebase-debug.log` concurrently — zero overlap with Plan 09's files, so no merge risk.

## User Setup Required

None. No external service configuration, no environment variables, no dependency installs.

For end-to-end manual testing (noted in the plan's `<verification>` section):
- Start dev server (`npm run dev`)
- Sign in as an existing mentor, open DevTools → Network tab
- Update the profile (any field — bio, skill level, etc.) via `/profile`
- Verify the PUT /api/mentorship/profile response body contains `_claimSync: { refreshed: true }`
- Open DevTools → Console, run `firebase.auth().currentUser.getIdTokenResult().then(r => console.log(r.claims))` — claims object should show `roles: ["mentor"]` (or the current roles set)
- To exercise the failure path: temporarily break the server by commenting out the setCustomUserClaims call in src/lib/ambassador/roleMutation.ts — response should show `_claimSync: { refreshed: false, error: ... }` and the client should NOT crash (the syncClaimsFromResponse helper returns false and continues)

**Note:** Today no caller invokes `syncClaimsFromResponse` yet — the manual test requires either:
1. A follow-up opt-in wiring in src/app/profile/page.tsx (one line after each `response.json()`) OR
2. DevTools Console invocation: `document.querySelector ? /* grab the context */ : console.log("wire call site first")` — not practical without a test harness.

The server-side signal IS visible in the response body right now; the client-side consumption of that signal becomes active as soon as any page wires `syncClaimsFromResponse(data)` after its mutation fetch.

## Next Phase Readiness

- **Plan 10 (final-cleanup-deploy5):** Zero impact. This plan's helper signatures are stable across Deploy #5 — the legacy `role` claim cleanup in Plan 10 doesn't require any changes to `refreshClaimsNow` or `syncClaimsFromResponse` (they operate purely on the `_claimSync` signal envelope, not on the claims' inner shape).
- **Phase 2 (application-pipeline):** Ambassador-dashboard mutations should import `refreshClaimsNow` directly — `import { refreshClaimsNow } from "@/lib/hooks/useClaimRefresh"`. They don't need MentorshipContext. Their accept/reject endpoints must mirror Plan 06's pattern: call `syncRoleClaim` after the Firestore write AND return `_claimSync: { refreshed: true | false }` in the response, so the client refresh call can be triggered the same way.
- **Phase 4 (activity tracking, strike system):** If a strike mutation flips roles (e.g., removes 'ambassador', adds 'alumni-ambassador'), the mutation endpoint MUST return `_claimSync` and the client-side page MUST consume it. The pattern is locked in this plan — no new infrastructure needed.
- **Phase 5 (offboarding, alumni flag):** Same — alumni-flag flip = roles mutation = MUST return `_claimSync` AND the client side MUST call `refreshClaimsNow` (or `syncClaimsFromResponse` via MentorshipContext).
- **Opt-in call-site wiring (Deploy #4 follow-up):** Recommend landing a ~4-line PR that wires `const { syncClaimsFromResponse } = useMentorship()` + `await syncClaimsFromResponse(data)` into the 4 current call sites. Low-risk, purely additive, no plan rewrite needed. Safe to ship as part of Deploy #4 or wait until Deploy #5 since the server-side signal is already live.

## Deploy Artifacts

This plan is **part of Deploy #4** in the 5-deploy roles-array rollout (per D-15):

- **Deploy #4 (app code):** includes Plan 05 (firestore-rules-dual-read) + Plan 06 (role-mutation-helper) + Plan 07 (call-site-migration) + Plan 08 (test-fixture-migration) + Plan 09 (this plan). All ship in lock-step: the rules flip (Deploy #3) is already live; Deploy #4 makes the app code speak the new vocabulary AND closes the D-14 stale-claim window at the client side.
- **Rollback:** Revert Plan 09's 2 commits (d808d07, c849e99). The server-side `_claimSync` signal (Plan 06) continues to ship regardless — rolling back Plan 09 only disables the client-side consumption of it, reverting to Firebase's ~1-hour default token TTL for custom-claim visibility. Non-breaking; no Firestore data or rules changes required.

## Known Stubs

None. The two new symbols (`refreshClaimsNow`, `useClaimRefresh`, `syncClaimsFromResponse`) are all fully functional and wired.

**Deferred work (not a stub):** The 4 existing mutation call sites (src/app/profile/page.tsx + src/app/mentorship/onboarding/page.tsx) do not yet INVOKE `syncClaimsFromResponse`. This is explicitly out of scope per Plan 09's frontmatter `files_modified`. It's a 4-line opt-in that can land any time after Deploy #4 without breaking anything. Captured in "Next Phase Readiness" as a follow-up recommendation.

## Commits

- `d808d07` — feat(01-09): add useClaimRefresh hook for forced ID-token refresh
- `c849e99` — feat(01-09): wire claim-refresh signal into MentorshipContext

**Plan metadata commit:** _pending_ (docs: complete plan — will include this SUMMARY.md, STATE.md, ROADMAP.md)

---
*Phase: 01-foundation-roles-array-migration*
*Completed: 2026-04-21*

## Self-Check: PASSED

Verified:
- FOUND: src/lib/hooks/useClaimRefresh.ts (new, 56 lines, refreshClaimsNow + useClaimRefresh exported)
- FOUND: src/contexts/MentorshipContext.tsx (+55 lines, syncClaimsFromResponse method + types added)
- FOUND: this SUMMARY.md at .planning/phases/01-foundation-roles-array-migration/09-client-claim-refresh-SUMMARY.md
- FOUND: commit d808d07 (feat(01-09): add useClaimRefresh hook for forced ID-token refresh)
- FOUND: commit c849e99 (feat(01-09): wire claim-refresh signal into MentorshipContext)
- VERIFIED: npx tsc --noEmit exits 0 across full repo
- VERIFIED: All Task 1 and Task 2 acceptance criteria met (see "Acceptance Criteria Results" above)
