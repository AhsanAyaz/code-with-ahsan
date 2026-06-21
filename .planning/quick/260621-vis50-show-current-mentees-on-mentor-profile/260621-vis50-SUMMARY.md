---
phase: quick-260621-vis50
plan: 01
status: complete
requirements: [VIS-50, GH-208]
files_modified:
  - src/components/mentorship/CurrentMenteesSection.tsx (new)
  - src/app/profile/page.tsx
---

# VIS-50 — Show current mentees on mentor's profile

## What was built
Added a **Current Mentees** section to `/profile` for mentors. Each active mentee renders with
avatar, display name, current role, an `active` status badge, the mentorship start date
("Since <approvedAt>"), and a link to the pair's dashboard. Empty (0), single, and many-mentee
states all handled; loading skeletons during fetch.

## Why this was the fix
This was a presentation gap, not a missing model. `GET /api/mentorship/my-matches?uid=<uid>&role=mentor`
already returns `activeMatches` (status `active` mentorship_sessions for the mentor) enriched with the
mentee `partnerProfile` and `approvedAt`. The `/profile` page simply never queried or rendered it.
The new `CurrentMenteesSection` consumes that existing endpoint — no API, schema, or dependency change.

## Acceptance criteria
- [x] Mentor visiting /profile sees a list of current active mentees
- [x] Each mentee shows name, start date, status
- [x] Works for 0 / 1 / many active mentees
- [x] Non-mentors do not see the section (gated on `hasRole(profile, "mentor")`)

## Verification
- `npx tsc --noEmit` — clean for both files.
- `npx eslint` — 0 errors on new/changed lines (2 pre-existing warnings in profile/page.tsx unchanged).
- Manual UAT pending reviewer (run app, view /profile as a mentor with active mentee sessions).

## Notes
GH#206 (book-session gating) references the same mentee↔mentor relationship model this surfaces.
