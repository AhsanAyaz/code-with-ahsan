---
quick_id: 260621-lli
slug: vis-51-show-current-mentees-section-on-m
description: VIS-51 Show current mentees on mentor's profile
date: 2026-06-21
status: complete
commit: 966c15e
---

# Quick Task 260621-lli — Summary

## What changed

Mentors visiting `/profile` now see a **Current Mentees** section listing their
active mentees. Previously the page only showed profile-edit forms, calendar,
availability, and bookings — no mentee list (VIS-51 / GH#208).

## Implementation

- **New:** `src/components/mentorship/CurrentMenteesCard.tsx` — client component,
  prop `{ userId }`. Fetches `GET /api/mentorship/my-matches?uid=&role=mentor`,
  reads `activeMatches`. Each mentee row renders `ProfileAvatar`, display name,
  optional current role, "Mentoring since {approvedAt}" start date, and an
  "Active" badge, linking to `/mentorship/dashboard/{matchId}`. Includes a
  loading skeleton and a 0-mentees empty state.
- **Edited:** `src/app/profile/page.tsx` — imports the card and renders it for
  mentors (`hasRole(profile, "mentor")`) above the Time Slot Availability
  section.

No API changes — the existing endpoint already returns name, start date
(`approvedAt`), and status, and is the same source `/mentorship/my-matches` uses.

## Acceptance criteria

- [x] Mentor on `/profile` sees a list of current active mentees
- [x] Mentee row shows name, start date, status
- [x] Handles 0 / 1 / many mentees (empty state + count badge + list)

## Verification

- `npx tsc --noEmit` — no errors in changed files
- `npx biome check` on both files — exit 0
- Logic mirrors the proven `/mentorship/my-matches` page (same endpoint/fields)

## Follow-up

- GH#206 (book-session gating) references the mentee-mentor relationship model;
  unblocked by this since the relationship is now surfaced on the profile.
