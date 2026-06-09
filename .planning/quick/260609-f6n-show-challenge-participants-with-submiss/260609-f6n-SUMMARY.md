---
quick_id: 260609-f6n
title: Challenge participants list with submission status + cert contact snapshot
status: complete
date: 2026-06-09
---

# Quick Task 260609-f6n — Summary

Implemented two follow-up asks from Maham on the Monthly Challenge feature:
participants are now shown with their submission status, and contact info for
certificates is captured at join — without a form.

## Decisions
- **No form.** `email` is derivable from the user record / firebase auth;
  `discordUsername` lives on `mentorship_profiles` (so it's present only for users
  in that program). Both are snapshotted onto the participant doc at join.
- **Placement:** a Participants section on the challenge detail page.
- **Privacy:** the public list shows avatar + name + status only. Email/discord are
  stored for admin certificate export — never rendered publicly (verified).

## Changes

### Backend (`9e581c8`)
- `src/types/challenges.ts`: `ChallengeParticipant` gains optional `email` /
  `discordUsername`; new public-safe `ChallengeParticipantStatus`.
- `src/lib/challengeProfiles.ts`: `getChallengeParticipantProfile` now also returns
  `email` and `discordUsername`, consulting `users` → `mentorship_profiles` →
  firebase auth.
- `src/services/ChallengeService.ts`: `normalizeParticipant` returns the new
  fields; `joinChallenge` stores them and strips undefined before the Firestore
  write; new `getChallengeParticipantsWithStatus()` joins participants with
  submissions and returns the public-safe shape (submitted first, then by join time).
- `src/app/api/challenges/[id]/participants/route.ts`: POST passes `email` +
  `discordUsername` into `joinChallenge`.

### UI (`98fd5bf`)
- `src/app/challenges/[id]/page.tsx`: new Participants section — avatar, name, and a
  **Submitted** (success) / **Not submitted** (ghost) badge per participant, with an
  empty state.

## Verification (local)
- `npx tsc --noEmit` clean; `eslint` clean on all changed files.
- E2E against Firebase emulators: user A joins + submits, user B joins only →
  detail page renders one **Submitted** and one **Not submitted** badge; A's
  participant doc carries the `email` snapshot; public page HTML contains no
  `discordUsername` / contact leak.

## Notes / follow-ups
- `userName` falls back to the user's email when they have no `displayName` — a
  pre-existing platform behavior (same as the submissions gallery and leaderboard),
  not introduced here. If public email-as-name is a concern, address it globally.
- Admin-facing certificate export (reading the stored email/discord) is **not** in
  scope here — the data is now captured and ready for it.

## Not pushed
Both feature commits are local on `main`. Nothing pushed.
