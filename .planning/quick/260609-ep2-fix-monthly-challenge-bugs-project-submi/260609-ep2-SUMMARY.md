---
quick_id: 260609-ep2
title: Fix monthly challenge bugs (submission, participate button, dates)
status: complete
date: 2026-06-09
---

# Quick Task 260609-ep2 — Summary

Fixed three bugs in the recently shipped Monthly Challenge feature, reported via
Telegram with screenshots. All root-caused by reading the code and verified locally
against the Firebase emulators.

## Fixes

### Bug 1 — "Failed to submit project" (500)
`createSubmission` (`src/services/ChallengeService.ts`) wrote `demoUrl: undefined`
to Firestore when the optional Demo URL was left blank. The Admin SDK rejects
undefined values (no `ignoreUndefinedProperties`), throwing a 500. Now `demoUrl`
is deleted from the payload when undefined, mirroring the existing `userAvatar`
handling.

### Bug 2 — Participate button ignored joined state
Neither `ChallengeCard.tsx` (list/spotlight) nor `ParticipateButton.tsx` (detail
page) checked participation. Both now fetch `GET /participants` on mount and, when
the user has joined, render the button **disabled** with label **"Joined"**. Local
state also flips to joined immediately after a successful join.

### Bug 3 — Start date off by one + edits not persisting
`dateInputToIso` (`src/components/admin/ChallengeForm.tsx`) parsed the date input in
the admin's local timezone, so an admin ahead of UTC (e.g. PKT) stored the previous
calendar day (Jun 1 → May 31) and re-saves kept re-applying the shift. Fixed by
parsing the input as UTC midnight (`Z`), and formatting both display sites
(`formatChallengeDateRange` in `src/lib/challenges.ts`, admin list in
`src/app/admin/challenges/page.tsx`) with `timeZone: "UTC"` so the calendar day is
stable for every viewer.

## Files changed
- `src/services/ChallengeService.ts`
- `src/components/admin/ChallengeForm.tsx`
- `src/lib/challenges.ts`
- `src/app/admin/challenges/page.tsx`
- `src/components/challenges/ChallengeCard.tsx`
- `src/components/challenges/ParticipateButton.tsx`

## Commits
- `2a5f618` fix(challenges): drop undefined demoUrl before Firestore write
- `9752851` fix(challenges): treat challenge dates as UTC to stop off-by-one
- `3a96467` fix(challenges): make Participate buttons reflect joined state

## Verification (local)
- `npx tsc --noEmit` — clean
- `eslint` on all 6 changed files — clean
- Date fix: node simulation in `TZ=Asia/Karachi` — OLD reproduced Jun 1 → May 31;
  NEW yields Jun 1 everywhere (storage, edit prefill, display); end date stays Jun 30.
- E2E against Firebase emulators (seeded active challenge + auth-emulator user):
  - GET participants before join → `joined:false`; after join → `joined:true` (Bug 2)
  - POST submission with **blank Demo URL** → **201** (Bug 1, was 500)

## Follow-up for the admin
The existing June 2026 challenge still has the shifted date stored. Open it in
Admin → Edit → set the correct start date → Save once; it will now persist
correctly. The display fix alone does not retro-correct already-bad stored data.

## Not pushed
Three fix commits are local on `main` only. Nothing pushed — pending your local
click-through and go-ahead.
