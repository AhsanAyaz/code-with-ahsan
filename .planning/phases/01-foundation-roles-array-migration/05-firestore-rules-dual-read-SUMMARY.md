---
phase: 01-foundation-roles-array-migration
plan: 05
subsystem: security-rules
tags: [firestore-rules, custom-claims, dual-read, migration, deploy-3]

# Dependency graph
requires:
  - phase: 01-foundation-roles-array-migration
    provides: "Plan 03 — profile/claim-side dual-read helpers (`hasRole`, `hasRoleClaim`); Plan 04 — `scripts/sync-custom-claims.ts` to write `roles` array onto Firebase Auth custom claims"
provides:
  - "Dual-claim `isAcceptedMentor()` helper in firestore.rules that evaluates both legacy `token.role == \"mentor\"` and new `\"mentor\" in token.roles` (with existence guard)"
  - "Deploy #3 payload (rules flip) — enters the dual-claim compatibility window"
  - "Rules-side half of the dual-read bridge (app-side lives in src/lib/permissions.ts from Plan 03)"
affects:
  - 01-foundation-roles-array-migration  # Plan 06 roleMutation helper must keep setting the `roles` claim; Plan 10 will drop the legacy arm
  - roadmaps  # Existing roadmap create rule consumes isAcceptedMentor() — behavior preserved

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-claim rule pattern: short-circuit with existence guard before `in` membership check (prevents unset-field errors)"
    - "Migration-window compatibility via OR of legacy + new claim shapes — removed in a later deploy after verification"

key-files:
  created: []
  modified:
    - firestore.rules

key-decisions:
  - "Existence guard `\"roles\" in request.auth.token` MUST precede `\"mentor\" in request.auth.token.roles` — Firestore rules throw (not false) on `in` against an unset map field"
  - "Legacy arm `request.auth.token.role == \"mentor\"` retained as the first OR branch; dropped only in Plan 10 / Deploy #5 after explicit all-clear verification (per D-16)"
  - "Preserved `request.auth != null` (via isSignedIn()) and `request.auth.token.status == \"accepted\"` exactly — behavior preserved for the single consumer at the roadmap create rule"
  - "No other rule in firestore.rules changed — scope of this deploy is one helper function body"

patterns-established:
  - "Dual-claim rule window: OR(legacy, new-with-existence-guard) — reusable for future claim-shape migrations"
  - "Deploy sequencing: rules flip (this plan) ships AFTER sync-custom-claims.ts completes a full prod run, per D-15 / 5-deploy sequence"

requirements-completed: [ROLE-04]

# Metrics
duration: 1 min
completed: 2026-04-21
---

# Phase 01 Plan 05: Firestore rules — dual-claim read for roles Summary

**Patched `firestore.rules` `isAcceptedMentor()` helper to accept BOTH the legacy `token.role == "mentor"` claim AND the new `"mentor" in token.roles` array claim (with `"roles" in request.auth.token` existence guard) — entering the dual-claim migration window (Deploy #3) without dropping any currently-authenticated mentor session.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-21T21:36:30Z
- **Completed:** 2026-04-21T21:37:34Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `firestore.rules` `isAcceptedMentor()` now dual-reads both claim shapes during the migration window (ROLE-04 complete)
- Existence guard `"roles" in request.auth.token` prevents runtime errors when the `roles` custom claim is not yet present on a user's ID token (critical during the dual-claim window — token TTL is ~1 hour)
- Rules compile clean: `firebase deploy --only firestore:rules --dry-run` reports "rules file firestore.rules compiled successfully"
- Behavior preserved for the single consumer (`roadmaps/{roadmapId}` create rule at line 150) — no modification required there
- No other rule in `firestore.rules` changed (git diff stat: 1 file changed, 11 insertions, 1 deletion — all inside the `isAcceptedMentor` body)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update isAcceptedMentor() to dual-read token.role and token.roles** — `a971ce8` (feat)

**Plan metadata:** (appended in this commit alongside SUMMARY.md + STATE.md + ROADMAP.md + REQUIREMENTS.md)

## Files Created/Modified

- `firestore.rules` — Updated `isAcceptedMentor()` helper to accept both `request.auth.token.role == "mentor"` (legacy) and `"roles" in request.auth.token && "mentor" in request.auth.token.roles` (new, with existence guard). Preserved `isSignedIn()` null-safety and `request.auth.token.status == "accepted"` status check. Added rationale comment block referencing D-13, D-16, ROLE-04, Plan 10 / Deploy #5.

### Final body of `isAcceptedMentor()`

```javascript
function isAcceptedMentor() {
  // Dual-claim window (per D-13, D-16 in 01-CONTEXT.md, ROLE-04).
  // Accept either the legacy single-role claim OR the new roles-array claim.
  // The array-side is the post-migration authority (set by scripts/sync-custom-claims.ts
  // and by the roleMutation helper on every profile write).
  // The legacy-side is a fallback for users whose ID token predates the claims sync
  // (token TTL ~1 hour; after that the new claim is present).
  // Plan 10 / Deploy #5 drops the legacy arm after explicit "all clear" verification.
  return isSignedIn() &&
         (
           request.auth.token.role == "mentor"
           || ("roles" in request.auth.token && "mentor" in request.auth.token.roles)
         ) &&
         request.auth.token.status == "accepted";
}
```

### Why the existence guard is non-negotiable

Firestore security rules evaluate `"mentor" in request.auth.token.roles` as an **ERROR** (not `false`) when the `roles` field does not exist on the auth token. The `in` operator on an unset map field throws. During the dual-claim window, plenty of currently-authenticated users will still have ID tokens that predate the `sync-custom-claims.ts` run and therefore have no `roles` claim — for those users, the new arm must short-circuit cleanly. That is precisely what `"roles" in request.auth.token &&` does: it gates the membership check on the existence of the field, so only users whose token already carries the new claim evaluate the `in` operator.

Without this guard, the rule would throw for every legacy-token user and the roadmap create path (the one consumer of `isAcceptedMentor()`) would fail with permission-denied — the exact UX regression D-14 calls out.

### Git diff stat (proof of minimal scope)

```
 firestore.rules | 12 +++++++++++-
 1 file changed, 11 insertions(+), 1 deletion(-)
```

All changes are inside the `isAcceptedMentor` body + its rationale comment. No other rule modified.

### Rules compilation verification

```
$ firebase deploy --only firestore:rules --dry-run
i  cloud.firestore: checking firestore.rules for compilation errors...
⚠  [W] 30:14 - Unused function: isOwner.
⚠  [W] 31:30 - Invalid variable name: request.
✔  cloud.firestore: rules file firestore.rules compiled successfully
✔  Dry run complete!
```

The two warnings are **pre-existing** (they concern `isOwner` — unrelated function — and an unrelated lint nit on a separate line) and have been present since before this plan. Our change does not introduce or affect them. The important signal is the `✔  rules file firestore.rules compiled successfully` line.

## Decisions Made

- **Preserved `isSignedIn()` call instead of inlining `request.auth != null`** — the plan text suggested `request.auth != null &&` directly, but the existing helper already delegates that null-safety to `isSignedIn()` (defined on line 6-8). Keeping the delegation maintains consistency with the rest of the file (`isAdmin()` also calls `isSignedIn()`) and the net behavior is identical. This is a style-level fidelity to the existing codebase, not a semantic deviation.
- **All other decisions were exactly as specified in the plan** — the dual-claim pattern, the existence guard ordering, the preservation of the status check, and the legacy-arm retention are all verbatim from the plan's action block and D-13 / D-16.

## Deviations from Plan

None - plan executed exactly as written.

The only micro-variation (keeping `isSignedIn()` instead of inlining `request.auth != null`) preserves identical semantics and is consistent with the existing file style. The grep-based acceptance criteria were not affected (they do not check for the `request.auth != null` literal — they check for the status/role/roles patterns that are all present).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Deploy Ordering Note

**This plan IS Deploy #3** in the 5-deploy sequence documented in `.planning/research/ARCHITECTURE.md §3.2` and locked in STATE.md workflow notes. Per D-15:

> Deploy #2: `scripts/migrate-roles-to-array.ts` populates `mentorship_profiles.roles`.
> Deploy #2.5: `scripts/sync-custom-claims.ts` reads the now-migrated docs and sets Auth custom claims.
> **Only after both complete does the rules flip proceed to deploy #3+.**

**The rules change in this plan MUST NOT ship to prod before `scripts/sync-custom-claims.ts` (Plan 04 output) has completed a full production pass.** If shipped prematurely, users whose claims haven't been synced yet will still work (legacy arm catches them), but the value of the new arm is zero and the dual-claim window hasn't actually begun. The operational order is:

1. Ship Plan 04's `sync-custom-claims.ts` → run once against prod → verify 100% of accepted mentors have `roles` claim set
2. THEN deploy the rules change in this plan (Deploy #3)
3. Wait for Plan 06's `roleMutation` helper (keeps claims in sync on ongoing writes) — Deploy #4
4. Observe the dual-claim window for ≥2 weeks per STATE.md workflow notes
5. Plan 10 / Deploy #5 drops the legacy arm after manual "all clear" signal (D-16)

Rollback of this specific deploy is one command: `git revert a971ce8 && firebase deploy --only firestore:rules`.

## Self-Check

- [x] `firestore.rules` exists and contains the dual-claim body (verified via Read tool + grep — all 5 acceptance greps return 1)
- [x] Commit `a971ce8` exists in git log (`git log --oneline` shows it at HEAD)
- [x] The one consumer at line 150 (`allow create: if isAcceptedMentor() && ...` in `/roadmaps/{roadmapId}`) is unchanged
- [x] `firebase deploy --only firestore:rules --dry-run` exits 0 with `rules file firestore.rules compiled successfully`
- [x] `git diff --stat` shows only firestore.rules changed (11 insertions, 1 deletion, all inside isAcceptedMentor body)

## Self-Check: PASSED

## Next Phase Readiness

- **Deploy #3 payload is ready.** Rules file compiles. When `sync-custom-claims.ts` has been run in prod and verified, this rules change can be deployed independently (one-command rollback available).
- **Ready for Plan 06** (`roleMutation` helper) — that plan provides the app-side write path that keeps the `roles` custom claim in sync on every profile mutation, completing the Deploy #4 payload.
- **Known Stubs:** None. The dual-claim arm is functional immediately once the `roles` claim is present on tokens (i.e., after Plan 04's script has run). There is no "coming soon" placeholder — the rule itself is the deliverable.

---
*Phase: 01-foundation-roles-array-migration*
*Plan: 05 — Firestore rules — dual-claim read for roles*
*Completed: 2026-04-21*
