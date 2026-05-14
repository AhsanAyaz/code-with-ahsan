---
phase: 01-foundation-roles-array-migration
plan: 05
title: Firestore rules — dual-claim read for roles
type: execute
wave: 3
depends_on: [03, 04]
files_modified:
  - firestore.rules
autonomous: true
requirements:
  - ROLE-04
deploy: "#3 (rules flip — enable dual-claim; held until sync-custom-claims verified in prod)"
must_haves:
  truths:
    - "firestore.rules `isAcceptedMentor()` helper reads BOTH legacy `token.role == \"mentor\"` AND new `\"mentor\" in token.roles`"
    - "The updated rule still requires `token.status == \"accepted\"` (behavior preserved)"
    - "The one consumer of `isAcceptedMentor()` at the existing call-site continues to work without modification"
    - "No other rule in firestore.rules is changed"
    - "Rules file still compiles — `firebase deploy --only firestore:rules --dry-run` (or equivalent) succeeds"
  artifacts:
    - path: firestore.rules
      provides: "Dual-claim isAcceptedMentor helper that accepts both legacy and array-shaped role claims during the migration window"
      contains: "\"mentor\" in request.auth.token.roles"
  key_links:
    - from: firestore.rules
      to: "Firebase Auth custom claims (set by scripts/sync-custom-claims.ts)"
      via: "request.auth.token.roles and request.auth.token.role"
      pattern: "request\\.auth\\.token\\.roles"
---

<objective>
Update `firestore.rules` so the `isAcceptedMentor()` helper function evaluates the roles-array claim (`"mentor" in request.auth.token.roles`) alongside the legacy single-role claim (`request.auth.token.role == "mentor"`). This converts the vestigial rule into live defense-in-depth without a big-bang rules flip, and keeps the rules functional for any user whose claims have been synced (roles[]) AND any whose claims are still in the legacy shape — both sides resolve the same truth during the dual-claim window.

Purpose: Implements ROLE-04. Honors D-13 (rules actively enforce, not dormant), D-16 (manual close of dual-claim window — this plan ENTERS the window; final flip to array-only is Plan 10).
Output: One modified rule helper in firestore.rules.
Deploy: This IS Deploy #3 — the rules change. Must be held until `scripts/sync-custom-claims.ts` completes a full pass in prod (see Plan 04 output).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md
@.planning/research/PITFALLS.md
@firestore.rules
</context>

<interfaces>
<!-- Current firestore.rules isAcceptedMentor helper (lines 14-18 from scout) -->

```javascript
function isAcceptedMentor() {
  return request.auth != null
    && request.auth.token.role == "mentor"
    && request.auth.token.status == "accepted";
}
```

<!-- Single current consumer (line 140-ish) — the roadmap create rule calls isAcceptedMentor() with no modification needed -->

```javascript
match /roadmaps/{roadmapId} {
  allow create: if isAcceptedMentor() && /* other conditions */;
  // ...
}
```

<!-- Firestore security rules syntax note: `"x" in list` checks membership in a List. -->
<!-- `request.auth.token.roles` is the CUSTOM CLAIM set by scripts/sync-custom-claims.ts -->
<!-- and by the roleMutation helper in Plan 06. -->
</interfaces>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Update isAcceptedMentor() in firestore.rules to dual-read token.role and token.roles</name>
  <files>firestore.rules</files>
  <read_first>
    - firestore.rules (read the full file — especially lines 1-25 for the helper functions block and line 140-ish for the one consumer)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §decisions D-13 + D-16
    - .planning/research/PITFALLS.md §Pitfall 1 (rules-vs-app deploy race) — this plan's output is the rules-side half of the dual-read bridge
    - .planning/research/ARCHITECTURE.md §3.2 (5-deploy sequence — this plan is Deploy #3, must not ship before sync-custom-claims completes)
  </read_first>
  <action>
    Edit `firestore.rules` and update ONLY the `isAcceptedMentor()` helper function. Do NOT touch any other function, match, or allow rule.

    Locate the current helper (around lines 14-18):
    ```javascript
    function isAcceptedMentor() {
      return request.auth != null
        && request.auth.token.role == "mentor"
        && request.auth.token.status == "accepted";
    }
    ```

    Replace with the dual-claim version:
    ```javascript
    function isAcceptedMentor() {
      // Dual-claim window (per D-13, D-16 in 01-CONTEXT.md, ROLE-04).
      // Accept either the legacy single-role claim OR the new roles-array claim.
      // The array-side is the post-migration authority (set by scripts/sync-custom-claims.ts
      // and by the roleMutation helper on every profile write).
      // The legacy-side is a fallback for users whose ID token predates the claims sync
      // (token TTL ~1 hour; after that the new claim is present).
      // Plan 10 / Deploy #5 drops the legacy arm after explicit "all clear" verification.
      return request.auth != null
        && (
          request.auth.token.role == "mentor"
          || ("roles" in request.auth.token && "mentor" in request.auth.token.roles)
        )
        && request.auth.token.status == "accepted";
    }
    ```

    Why the nested `"roles" in request.auth.token &&` check: Firestore rules evaluate `"mentor" in request.auth.token.roles` as an ERROR (not `false`) when `roles` is not present on the token. The `in` operator on an unset map field throws. The existence guard MUST come first via `"roles" in request.auth.token &&` (short-circuits). Without this, any user whose ID token has not yet refreshed to carry the new claim would see permission-denied errors during the dual-claim window — exactly the UX failure D-14 calls out.

    Do NOT change:
    - The `request.auth != null` preamble (null safety)
    - The `request.auth.token.status == "accepted"` condition (behavior preserved)
    - Any other rule in the file
    - The order of AND/OR (match the patched shape exactly)

    Do NOT remove the legacy `token.role == "mentor"` arm — that removal is Plan 10 (Deploy #5) after the manual "all clear" verification closes the dual-claim window per D-16.
  </action>
  <verify>
    <automated>grep -c '"mentor" in request.auth.token.roles' firestore.rules ; grep -c 'request.auth.token.role == "mentor"' firestore.rules ; grep -c 'request.auth.token.status == "accepted"' firestore.rules</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c '"mentor" in request.auth.token.roles' firestore.rules` returns `1` (new array-claim arm present)
    - `grep -c 'request.auth.token.role == "mentor"' firestore.rules` returns `1` (legacy arm preserved during dual-claim window)
    - `grep -c '"roles" in request.auth.token' firestore.rules` returns `1` (existence guard present — prevents error on unset field)
    - `grep -c 'request.auth.token.status == "accepted"' firestore.rules` returns `1` (status check preserved)
    - `grep -c "function isAcceptedMentor()" firestore.rules` returns `1` (signature preserved; no renamed or new helper)
    - `git diff --stat firestore.rules` shows only the isAcceptedMentor body changed (line count delta is small, single region)
    - If firebase CLI is available locally: `firebase deploy --only firestore:rules --dry-run 2>&amp;1 | tail -5` exits 0 (rules compile). If not available, run the Firebase rules validator via the Firestore Emulator Suite: `npx firebase emulators:exec --only firestore "echo ok" 2>&amp;1 | grep -Ei "rules|compiled" | head -5` prints a success-shaped line.
    - No other rule's text changes: `git diff firestore.rules | grep -E "^[+-]" | grep -v isAcceptedMentor | grep -v "request.auth.token.role" | grep -v "roles" | grep -v "^+++ " | grep -v "^--- "` returns no lines OR only trivial whitespace lines.
  </acceptance_criteria>
  <done>
    firestore.rules isAcceptedMentor() now reads both token.role (legacy) and token.roles (array), with a proper existence guard. Status == "accepted" behavior preserved. No other rule changed.
  </done>
</task>

</tasks>

<verification>
- Rules compile: `firebase deploy --only firestore:rules --dry-run` (or emulator equivalent) exits 0.
- The one consumer of `isAcceptedMentor()` (the roadmap create rule around line 140) is unchanged and still compiles.
- Manual test in Firestore emulator with two users:
  - User A: custom claim `{ role: "mentor", status: "accepted" }` (legacy shape) — isAcceptedMentor() returns true.
  - User B: custom claim `{ roles: ["mentor"], status: "accepted" }` (new shape) — isAcceptedMentor() returns true.
  - User C: custom claim `{ roles: [], status: "accepted" }` (empty roles after migration) — isAcceptedMentor() returns false.
</verification>

<success_criteria>
- [x] firestore.rules isAcceptedMentor() dual-reads role and roles claims
- [x] Existence guard `"roles" in request.auth.token` prevents errors when roles claim is unset
- [x] Legacy single-role arm preserved (removed only in Plan 10 / Deploy #5)
- [x] No other rule changed
- [x] Rules file compiles clean
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-roles-array-migration/01-05-SUMMARY.md` documenting:
- The exact final body of the patched isAcceptedMentor() helper
- Confirmation that the existence guard is present (and why — cite the "in throws on unset field" behavior)
- The git diff stat showing only isAcceptedMentor changed
- The deploy ordering note — this plan MUST ship AFTER scripts/sync-custom-claims.ts completes a full prod run
</output>
