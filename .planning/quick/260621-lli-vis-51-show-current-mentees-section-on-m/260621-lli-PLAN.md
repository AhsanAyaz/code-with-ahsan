---
quick_id: 260621-lli
slug: vis-51-show-current-mentees-section-on-m
description: VIS-51 Show current mentees on mentor's profile
date: 2026-06-21
status: planned
---

# Quick Task 260621-lli: Show current mentees on mentor's /profile

## Context

Paperclip issue VIS-51 (GH#208). Mentors visiting `/profile` cannot see their
current active mentees. The data already exists — `GET /api/mentorship/my-matches?uid=&role=mentor`
returns `activeMatches[]` with `partnerProfile` (the mentee) and `approvedAt`.
`/mentorship/my-matches` already renders this, but `/profile` has no mentee list.

## Acceptance Criteria (from issue)

- Mentor on `/profile` sees a list of their current active mentees
- Each mentee shows name, start date, status
- Works for mentors with 0, 1, or many active mentees

## Tasks

### Task 1 — Add CurrentMenteesCard component
- **files:** `src/components/mentorship/CurrentMenteesCard.tsx` (new)
- **action:** Client component. Props `{ userId: string }`. Fetch
  `/api/mentorship/my-matches?uid=${userId}&role=mentor`, read `activeMatches`.
  Render a card "🎓 Current Mentees" with a count badge. For each mentee row:
  `ProfileAvatar` (photoURL/displayName), name, "Mentoring since {approvedAt}"
  start date, and an "Active" success badge. Link each row to
  `/mentorship/dashboard/{match.id}`. Loading skeleton; empty state for 0
  mentees with a link to `/mentorship/my-matches`.
- **verify:** `npx tsc --noEmit` passes for the new file; component renders
  with 0 and N matches.
- **done:** Component exists, typed, reuses `MatchWithProfile` + `ProfileAvatar`.

### Task 2 — Wire card into /profile for mentors
- **files:** `src/app/profile/page.tsx`
- **action:** Import `CurrentMenteesCard`. Render it for mentors
  (`hasRole(profile, "mentor")`) above the Time Slot Availability section,
  passing `userId={profile.uid}`.
- **verify:** `npm run check` (Biome) + `npx tsc --noEmit` clean.
- **done:** Mentors see the mentees card on `/profile`; mentees do not.

## Out of scope
- No API changes (endpoint already returns required data).
- No pending/completed lists (issue asks for active mentees only).
