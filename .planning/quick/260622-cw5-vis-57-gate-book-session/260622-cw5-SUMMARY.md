---
quick_id: 260622-cw5
slug: vis-57-gate-book-session
description: "VIS-57 — Disable Book a Session for non-mentees on mentor profile + email mentor on booking"
date: 2026-06-22
status: complete
branch: feat/vis-57-gate-book-session
---

# VIS-57 — Disable "Book a Session" for non-mentees + email mentor on booking — Summary

GitHub: https://github.com/AhsanAyaz/code-with-ahsan/issues/206

Gated all "Book a Session" entry points to active mentees of the mentor (client + server),
blocked the booking page for non-active-mentees, and added a non-blocking mentor email
notification on every booking (confirmed and pending_approval).

## Tasks completed

### Task 1 — Gate Book-a-Session controls on mentor profile (client)
- `MentorProfileClient.tsx`: added derived `const canBook = requestStatus === "active"` plus a
  shared `bookGateTooltip` string. `requestStatus === "active"` is exactly "viewer is an active
  mentee of this mentor".
- Both existing entry points to `/mentorship/book/${mentor.uid}` now render the working `<Link>`
  when `canBook`, and a DaisyUI `btn btn-primary btn-disabled` (disabled) wrapped in a
  `<span className="tooltip" data-tip=...>` when not. The cards/styling are unchanged otherwise.

### Task 2 — Guard booking page (client) + server enforcement
- `book/[mentorId]/page.tsx`: fetches `GET /api/mentorship/mentee-requests?menteeId=${user.uid}`,
  derives `isActiveMentee` (a request with `mentorId === mentorId` && `status === "active"`), shows
  the spinner while the check loads, and renders a friendly blocking state ("You're not an active
  mentee of this mentor" + links to the mentor profile / browse mentors) instead of `<TimeSlotPicker>`
  when not an active mentee.
- `bookings/route.ts` (POST): added `hasActiveMentorshipSession(mentorId, menteeId)` helper
  (mirrors `findMentorshipSessionInfo` shape — `mentorship_sessions` where mentorId/menteeId match
  and `status == "active"`, `limit(1)`). After fetching the mentee profile and before creating the
  booking, returns `403` with
  `"You must be an active mentee of this mentor to book a session."` when no active session exists.

### Task 3 — Email the mentor on booking
- `email.ts`: added `export async function sendBookingConfirmationEmail({...})` following the
  existing exported-function patterns (uses `sendEmail`, `wrapEmailHtml`, shared `emailStyles`).
  Params: mentor `{ displayName, email }`, `menteeName`, `formattedDate`, `formattedTime`,
  `tzAbbr`, `durationMinutes` (default 30), optional `sessionTypeLabel`, and `pendingApproval`.
  - `pendingApproval: false` → subject `📅 New Session Booked by <mentee>`, confirms details + dashboard link.
  - `pendingApproval: true` → subject `📋 Booking Approval Requested by <mentee>`, asks to approve/decline from dashboard.
- `bookings/route.ts` (POST): imports `sendBookingConfirmationEmail` and sends it non-blocking
  (mirrors the Discord `.catch(...)` style — never throws/blocks the response) after the booking is
  created and after the Discord block. Date/time are computed independently in the mentor's timezone
  so the email is sent even when Discord isn't configured. `pendingApproval` = `bookingStatus === "pending_approval"`.

## Files changed

- `src/app/mentorship/mentors/[username]/MentorProfileClient.tsx`
- `src/app/mentorship/book/[mentorId]/page.tsx`
- `src/app/api/mentorship/bookings/route.ts`
- `src/lib/email.ts`

## Commits

| Task | SHA | Message |
| ---- | --- | ------- |
| 1 | `1b644fcfbda0346a8ab528e5392c62ff81421b48` | feat(mentorship): gate Book-a-Session controls to active mentees on mentor profile |
| 2 | `ca20f91410126e32c65d0cd9094962c8b1aa0dfe` | feat(mentorship): block non-active-mentees from booking (page guard + 403 server enforcement) |
| 3 | `31af5871dbd340f7f6be5e73e9f014a725021ef7` | feat(mentorship): email mentor on booking (confirmed + pending approval) |

All commits carry the trailer `Co-Authored-By: Paperclip <noreply@paperclip.ing>`.

## Deviations

- **[Rule 1 — bug fix]** ESLint `react-hooks/set-state-in-effect` flagged a synchronous
  `setMenteeCheckLoading(false)` in the new book-page effect. Restructured the effect to gate on
  the existing `loading` flag and resolve the unauthenticated case asynchronously
  (`Promise.resolve().then(...)`), eliminating the cascading-render error. This touched
  `book/[mentorId]/page.tsx`, which was committed with Task 3.

## Verification

- **`npx tsc --noEmit`** → `TSC_EXIT=0` (clean, no errors) after all changes.
- **`npx eslint <changed files>`**: the only remaining findings are pre-existing and out of scope
  (not authored by this task):
  - `book/[mentorId]/page.tsx:18` — `useState<any>(null)` for `mentor` (present in baseline HEAD~2).
  - `bookings/route.ts:394-395` — `menteeTimezone` unused + `any` casts inside the existing Discord block.
  The new code introduced no new lint errors; the set-state-in-effect error from the new effect was fixed (see Deviations).

## Out of scope (unchanged)

- No changes to approval/decline/cancel email flows beyond the new booking email.
- No new env vars (Resend already configured).
- Pre-existing `any`/unused-var lint in untouched lines left as-is.

## Self-Check: PASSED

- All 4 changed files exist on disk.
- All 3 commit SHAs present in `git log` on `feat/vis-57-gate-book-session`.
- tsc exit 0.
