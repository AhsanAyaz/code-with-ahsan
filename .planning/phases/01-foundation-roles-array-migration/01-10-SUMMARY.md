---
phase: 01-foundation-roles-array-migration
plan: "10"
title: "Final cleanup — drop legacy role field, flip rules to array-only (Deploy #5)"
subsystem: roles-migration
tags: [roles, cleanup, deploy5, firestore-rules, permissions, migration]
dependency_graph:
  requires: [01-01, 01-02, 01-03, 01-04, 01-05, 01-06, 01-07, 01-08, 01-09]
  provides: [phase-01-complete, roles-array-sole-source-of-truth]
  affects: [firestore.rules, src/lib/mentorship/embedBio.ts, src/app/api/mentorship/profile/route.ts, scripts/drop-legacy-role-field.ts]
tech_stack:
  added: []
  patterns: [roles-array-only, FieldValue.delete-for-Firestore, destructure-and-drop-for-auth-claims]
key_files:
  created: []
  modified:
    - src/lib/mentorship/embedBio.ts
    - src/app/api/mentorship/profile/route.ts
    - scripts/__tests__/embed-mentor-bios.test.ts
    - scripts/drop-legacy-role-field.ts
    - package.json
decisions:
  - "shouldEmbedMentor and isMentor check use roles array exclusively (no ternary fallback)"
  - "drop-legacy-role-field.ts uses hasOwnProperty.call for field-presence check (not 'in' operator)"
  - "post-merge manual steps documented in SUMMARY — deploy ordering is critical"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-20"
  tasks_completed: 3
  files_changed: 5
---

# Phase 01 Plan 10: Final cleanup — drop legacy role field, flip rules to array-only (Deploy #5) Summary

Phase 01 cleanup of the roles-array migration dual-claim window. Strips the last legacy `role` dual-read fallbacks from production code, confirms all prior-plan changes are in place, and documents the manual Deploy #5 cutover steps.

## Task 0 — Human Verification Checkpoint (PASSED)

All five dual-claim close gates verified by the orchestrator on 2026-05-20:

| Gate | Description | Result | Evidence |
|------|-------------|--------|----------|
| 1 | ≥2 weeks since Deploy #3 (rules dual-read) | PASS | Deploy #3 = commit a971ce8, shipped 2026-04-21; 29 days elapsed at gate time |
| 2 | Zero PERMISSION_DENIED in Vercel logs (14d window) | PASS | Zero matches across PERMISSION_DENIED, denied, PERMISSION, FirebaseError, Firestore, status 403/500, level=error; retention confirmed 14d+ |
| 3 | `migrate-roles-to-array.ts --dry-run` → "Would update: 0" | PASS | 412 docs scanned, 0 would update |
| 4 | `sync-custom-claims.ts --dry-run` → "Would update: 0" | PASS | 412 scanned, 412 already in sync (1 admin mismatch fixed by live run prior to checkpoint) |
| 5 | Zero legacy `.role ===` reads outside exception files | PASS | grep returned only the two documented dual-read fallbacks at profile/route.ts:321 and embedBio.ts:25 — now removed by this plan |

## Task 1 — Strip dual-read fallbacks from embedBio + profile route

**Commit: 4637874**

**Files changed:**
- `src/lib/mentorship/embedBio.ts` — `shouldEmbedMentor()` dual-read ternary removed; function now reads only `profile.roles` array
- `src/app/api/mentorship/profile/route.ts` — `isMentor` check at line 318 simplified to `(postUpdate.roles as string[] | undefined ?? []).includes("mentor")` (dual-read ternary removed)
- `scripts/__tests__/embed-mentor-bios.test.ts` — all five `shouldEmbedMentor` test fixtures migrated from `{role: "mentor", ...}` to `{roles: ["mentor"], ...}`

**Pre-existing clean state confirmed (no changes needed):**
- `src/types/mentorship.ts`: `MentorshipRole` already deleted, `role?` already removed from `MentorshipProfile`
- `src/lib/permissions.ts`: `PermissionUser.role` already removed; `roles: Role[]` required; all six helpers already array-only
- `src/__tests__/permissions.test.ts`: fixtures already roles-array shape (no `role:` fields on `PermissionUser` objects)

**Symbols deleted from Gate-5 sites:**
- 1 ternary dual-read fallback in `embedBio.ts` (`Array.isArray(...) ? ... : profile.role === "mentor"`)
- 1 ternary dual-read fallback in `profile/route.ts` (`Array.isArray(...) ? ... : postUpdate.role === "mentor"`)
- 5 legacy `role:` fixture fields in `embed-mentor-bios.test.ts`

**Deviations:**
- [Rule 1 — Bug] `scripts/__tests__/embed-mentor-bios.test.ts` fixtures used legacy `{role: "mentor"}` shape — 2 tests were failing after the dual-read removal. Auto-fixed by migrating all 5 fixture objects to `{roles: ["mentor"]}`.

## Task 2 — Firestore rules + legacy claim writes (pre-confirmed)

**No code changes needed.** All three targets were already clean from prior plans:

| File | Expected change | Actual state |
|------|-----------------|--------------|
| `firestore.rules` | Drop `token.role == "mentor"` arm; keep existence guard | Already array-only (from Plan 05 / Deploy #3, commit a971ce8) |
| `scripts/sync-custom-claims.ts` | Drop `role: roles[0] ?? null` claim write; use destructure-and-drop | Already clean (from Plan 04; uses `{ role: _legacyRole, ...preserved }` pattern) |
| `src/lib/ambassador/roleMutation.ts` | Drop `role: input.roles[0]` claim write; use destructure-and-drop | Already clean (from Plan 06; same destructure-and-drop pattern) |

**Final `isAcceptedMentor()` body in firestore.rules:**
```javascript
function isAcceptedMentor() {
  return isSignedIn() &&
         "roles" in request.auth.token &&
         "mentor" in request.auth.token.roles &&
         request.auth.token.status == "accepted";
}
```

## Task 3 — drop-legacy-role-field.ts refinements

**Commit: 2583156**

**Files changed:**
- `scripts/drop-legacy-role-field.ts` — field-presence check updated from `"role" in data` to `Object.prototype.hasOwnProperty.call(data, "role")` (matches acceptance criteria; distinguishes absent field from inherited prototype property)
- `package.json` — added `"drop-legacy-role:limit-10"` npm script alongside the existing dry-run and apply variants (mirrors `migrate-roles:limit-10` and `sync-claims:limit-10` pattern)

**Acceptance criteria verification:**
```
FieldValue.delete() in drop script:        1  (Firestore doc deletion — valid for docs, NOT claims)
destructure-drop ({ role: _legacyRole }):  1  (custom claims — ONLY valid pattern for key removal)
hasOwnProperty.call(data, "role"):         1  (existence check)
drop-legacy-role:dry-run in package.json: 1
drop-legacy-role in package.json:         3  (dry-run, apply, limit-10 all match grep)
drop-legacy-role:limit-10 in package.json:1
```

## Acceptance Criteria — Final State

| Criterion | Expected | Actual |
|-----------|----------|--------|
| `MentorshipRole` in `src/types/mentorship.ts` | 0 | 0 |
| `MentorshipRole` anywhere in `src/` | 0 | 0 |
| dual-read `??` in `permissions.ts` | 0 | 0 |
| dual-claim `??` in `permissions.ts` | 0 | 0 |
| `profile.role ===` fallback in `embedBio.ts` | 0 | 0 |
| `postUpdate.role ===` fallback in `profile/route.ts` | 0 | 0 |
| `request.auth.token.role == "mentor"` in `firestore.rules` | 0 | 0 |
| `"mentor" in request.auth.token.roles` in `firestore.rules` | 1 | 1 |
| `"roles" in request.auth.token` in `firestore.rules` | 1 | 1 |
| `role: roles[0]` in `sync-custom-claims.ts` | 0 | 0 |
| `role: _legacyRole` (destructure-drop) in `sync-custom-claims.ts` | 1 | 1 |
| `FieldValue.delete` in `sync-custom-claims.ts` | 0 | 0 |
| `role: _legacyRole` (destructure-drop) in `roleMutation.ts` | 1 | 1 |
| `FieldValue.delete` in `roleMutation.ts` | 0 | 0 |
| `scripts/drop-legacy-role-field.ts` exists | yes | yes |
| `FieldValue.delete()` in drop script | 1 | 1 |
| `role: _legacyRole` (destructure-drop) in drop script | 1 | 1 |
| `hasOwnProperty.call(data, "role")` in drop script | 1 | 1 |
| `"drop-legacy-role:dry-run"` in package.json | 1 | 1 |
| `"drop-legacy-role:limit-10"` in package.json | 1 | 1 |
| `npx tsc --noEmit` errors (excluding pre-existing SVG imports) | 0 | 0 |
| `npm test` passing (excl. emulator-dependent firestore.test.ts) | 309+ | 309 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] embed-mentor-bios.test.ts fixtures used legacy role shape**
- **Found during:** Task 1 — after stripping dual-read from `shouldEmbedMentor()`, 2 tests immediately failed
- **Issue:** `scripts/__tests__/embed-mentor-bios.test.ts` had 5 test calls with `{ role: "mentor", ... }` objects — the legacy single-string field that no longer falls back in the stripped code
- **Fix:** Migrated all 5 fixture objects to `{ roles: ["mentor"], ... }` (roles-array shape)
- **Files modified:** `scripts/__tests__/embed-mentor-bios.test.ts`
- **Commit:** 4637874

### Pre-existing non-blocking failures

- `src/__tests__/security-rules/firestore.test.ts` — requires `firebase emulators:exec` environment; fails locally without emulator. Pre-existing; unrelated to this plan's changes. Run via `npm run test:rules` with emulators running.

## POST-MERGE ACTION ITEMS (Deploy #5)

**These steps MUST be performed manually from the main checkout AFTER merging the worktree branch:**

### Step 1 — Deploy the app (Vercel)
```bash
# Push/merge to main → Vercel CI auto-deploys
# The app now writes only { roles, admin } claims — no legacy `role` key
```

### Step 2 — Deploy Firestore rules
```bash
firebase deploy --only firestore:rules
```
Wait 30-60 seconds for rule propagation after this command completes.

**WHY THE ORDER MATTERS:** The app must deploy BEFORE the rules flip. If rules flip first while the app still writes legacy-only claims, users without an `roles` array claim will be locked out by `isAcceptedMentor()`.

### Step 3 — Run the one-shot legacy cleanup script
```bash
# First, dry-run to confirm expected scope:
npm run drop-legacy-role:dry-run

# Expected output (all docs already clean from prior migration runs):
# Scanned: ~412
# Firestore updated: 0 (all docs had role field removed by migrate-roles-to-array.ts already)
# OR up to 412 if Firestore docs still have the field
# Claims updated: 0 (all claims already stripped by sync-custom-claims.ts live run)

# If dry-run confirms scope, apply:
npm run drop-legacy-role
```

Record the `Scanned`, `Firestore updated`, `Claims updated`, and `Errors` counts in a follow-up note. Expected: 0 errors.

### Post-cleanup verification
```bash
# Confirm zero legacy references remain:
git grep "MentorshipRole|profile\.role|token\.role == " -- src/
# Expected: empty output

# Spot-check 5-10 Firestore docs in Firebase Console:
# - Open mentorship_profiles collection
# - Confirm no `role` field on documents
# - Confirm auth custom claims have no `role` key (Firebase Console → Authentication → Users → [user] → Custom Claims)
```

## Phase Complete

**Phase 01 Foundation — Roles Array Migration complete.**

The full 5-deploy sequence is committed:
- Deploy #1 (Plan 01): `roles: Role[]` field added to `MentorshipProfile`
- Deploy #2 (Plans 02-03): `PermissionUser.roles` + six helpers with dual-read
- Deploy #2.5 (Plan 04): `sync-custom-claims.ts` backfill script run in prod
- Deploy #3 (Plan 05): `firestore.rules` dual-claim bridge added
- Deploy #4 (Plans 06-09): call-site migration, test fixtures, claim refresh
- Deploy #5 (Plan 10, this plan): dual-read bridge removed, rules flipped to array-only, cleanup script ready

**v6.0 Phase 2 (Application Subsystem) may now commence.**

After the post-merge Deploy #5 manual steps complete and `npm run drop-legacy-role:dry-run` reports "Firestore updated: 0 / Claims updated: 0", the migration is fully closed.

## Self-Check: PASSED

- `src/lib/mentorship/embedBio.ts` modified — confirmed at `/Users/amu1o5/personal/code-with-ahsan/.claude/worktrees/agent-a7aebf52/src/lib/mentorship/embedBio.ts`
- `src/app/api/mentorship/profile/route.ts` modified — confirmed
- `scripts/__tests__/embed-mentor-bios.test.ts` modified — confirmed
- `scripts/drop-legacy-role-field.ts` modified — confirmed
- `package.json` modified — confirmed
- Commit 4637874 exists — confirmed (`git log --oneline -5` shows it)
- Commit 2583156 exists — confirmed
- All acceptance criteria checks pass (see table above)
- 309 tests pass; 0 regressions introduced
