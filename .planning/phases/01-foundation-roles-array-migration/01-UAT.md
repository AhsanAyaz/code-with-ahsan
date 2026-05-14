---
status: passed
phase: 01-foundation-roles-array-migration
source:
  - 01-types-zod-role-schema-SUMMARY.md
  - 02-feature-flag-helper-SUMMARY.md
  - 03-permission-helpers-SUMMARY.md
  - 04-migration-scripts-SUMMARY.md
  - 05-firestore-rules-dual-read-SUMMARY.md
  - 06-role-mutation-helper-SUMMARY.md
  - 07-call-site-migration-SUMMARY.md
  - 08-test-fixture-migration-SUMMARY.md
  - 09-client-claim-refresh-SUMMARY.md
started: 2026-04-21T22:00:00Z
updated: 2026-04-22T01:00:00Z
completed: 2026-04-22T01:00:00Z
---

## Current Test

number: 11
name: Sync Claims Script Dry Run (Read-Only)
expected: |
  Run `npm run sync-claims:dry-run`. Script scans users, prints intended claim writes (`roles`, `role`, `admin`), reports `scanned / already-in-sync / no-auth-user / would-update / errors`. No actual writes. (Skip if no local admin creds.)
result: pass

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Run `npm run dev` fresh. Server boots without errors. Visit the homepage — it loads with no console/server errors. No stack traces mentioning `roles`, `permissions`, `features`, or `syncRoleClaim` in the terminal.
result: pass
note: Unrelated dev-env issue surfaced — seeded data (project `demo-codewithahsan`) not visible on `npm run dev` likely because `.env.local` has a different `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. Not a Phase 1 regression; pre-existing env config issue.

### 2. Ambassador Routes 404 With Flag Off
expected: With `FEATURE_AMBASSADOR_PROGRAM` unset (or set to anything other than "true") in `.env.local`, visit `/ambassadors`, `/ambassadors/apply`, `/ambassadors/dashboard`, `/admin/ambassadors`. All four routes return a 404 / "Not Found" page.
result: pass

### 3. Header & Footer Hide "Ambassadors" With Flag Off
expected: With flag off, the site header does NOT show an "Ambassadors" nav link.
result: pass
note: User confirmed "when adding the second flag, I see Ambassadors in Nav" — implying it's hidden without the flag.

### 4. Header & Footer Show "Ambassadors" With Flags On (revised)
expected: Set both `FEATURE_AMBASSADOR_PROGRAM=true` and `NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM=true` in `.env.local`, restart the dev server. Header shows "Ambassadors" between Roadmaps and Courses. Routes themselves will still 404 because no `page.tsx` exists under `src/app/ambassadors/` yet (future phase).
result: pass
note: Nav link appears when both flags set. Route 404 with flag on is expected — pages are future-phase work. Revised from original Test 4 which incorrectly expected routes to be reachable.

### 5. Profile Page Role-Gated UI Still Works
expected: Log in as a mentor (or switch a test account's role to mentor in Firestore). Visit `/profile`. Mentor-only UI sections render correctly — same behavior as before the migration. Now log in as a mentee and repeat; mentee-only sections render, mentor-only do not.
result: pass
note: User added the missing `NEXT_PUBLIC_FIREBASE_PROJECT_ID` env var that was causing the earlier "no mentors" issue. Profile role-gating works.

### 6. Mentorship Browse & My-Matches Still Work
expected: Visit `/mentorship/browse` — the correct list of mentors/mentees renders, role-filtered URL queries (e.g., `?role=mentor`) still filter correctly. Visit `/mentorship/my-matches` while logged in — your matches list renders identically to before the migration.
result: pass

### 7. Admin Mentor/Mentee Pages Still Work
expected: Log in as an admin. Visit `/admin/mentors` and `/admin/mentees`. Each page lists the correct users with the correct role badges ("🎯 Mentor" / "🚀 Mentee"). `/admin/pending` shows pending mentorship applications as before.
result: pass

### 8. Roadmaps Mentor-Only Controls
expected: Visit `/roadmaps` as a mentee — the "Create Roadmap" control is hidden (or disabled) just like before. Log out and log in as a mentor — the "Create Roadmap" control appears. Visit `/roadmaps/new` and `/roadmaps/my` — access rules match the pre-migration behavior.
result: pass

### 9. Profile Mutation Triggers Claim Sync
expected: Log in, visit `/profile`, edit a field (e.g., bio) and save. The network tab shows the response JSON includes `_claimSync: { refreshed: true }` (or `{ refreshed: false }` with an error string if Firebase-admin failed). Server logs show no uncaught exceptions in `syncRoleClaim`. Page continues to function normally — no UI regression.
result: pass
note: Response returned `_claimSync: { refreshed: false }` with a missing-credentials error — expected in local dev without Firebase Admin SDK creds. Page worked normally and bio was saved. Graceful degradation confirmed.

### 10. Migration Script Dry Run (Read-Only)
expected: Run `npm run migrate-roles:dry-run`. Script connects to Firestore with local service-account credentials, scans mentorship_profiles, and prints an intent report: `scanned / already-migrated / would-update / errors`. No actual writes occur. Non-zero exit only on error. (Skip this test if you don't have admin Firestore creds locally — mark "skip, no local creds".)
result: pass
note: Fixed dotenv loading (scripts used dotenv/config which skips .env.local) and private_key normalization (JSON blob stored with literal \\n). Report: 379 scanned, 0 already-migrated, 379 would-update, 0 errors.

### 11. Sync Claims Script Dry Run (Read-Only)
expected: Run `npm run sync-claims:dry-run`. Script scans users, prints intended claim writes (`roles`, `role`, `admin`), reports `scanned / already-in-sync / no-auth-user / would-update / errors`. No actual writes. (Skip if no local admin creds.)
result: pass
note: 379 scanned, 379 would-update, 0 errors. Same private_key fix applied as Test 10.

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
