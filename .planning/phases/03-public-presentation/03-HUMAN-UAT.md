---
status: passed
phase: 03-public-presentation
source: [03-VERIFICATION.md]
started: 2026-04-22T23:50:00Z
updated: 2026-04-23T00:00:00Z
---

## Current Test

[all tests passed]

## Tests

### 1. /ambassadors page renders real ambassador cards
expected: Responsive grid of AmbassadorCard components — each showing profile photo, display name, Ambassador badge pill, publicTagline (if set), university/city badges (if set), social link icons (if set), "View profile" button. No email address, Discord handle, or private application video URL visible anywhere on the page.
context: With FEATURE_AMBASSADOR_PROGRAM enabled and at least one accepted ambassador in an active cohort, visit `/ambassadors` while logged out.
requirement: PRESENT-01
result: passed

### 2. Ambassador badge renders on canonical profile page
expected: Blue "Ambassador" badge with Award icon appears in the header row beneath the display name. If `roles` contains `"alumni-ambassador"` instead, a gray "Alumni Ambassador" badge with GraduationCap icon appears.
context: Visit `/u/{username}` for a user whose `roles` array contains `"ambassador"` (or `"alumni-ambassador"`).
requirement: PRESENT-02, PRESENT-03
result: passed

### 3. /mentorship/mentors/{username} 308-redirects to /u/{username}
expected: HTTP 308 response from `/mentorship/mentors/{username}`, followed by the browser loading `/u/{username}`. Query strings on the original URL are preserved.
context: Open browser DevTools Network tab, navigate to `/mentorship/mentors/ahsan` (or any ambassador username).
requirement: PRESENT-02 (canonical route)
result: passed

### 4. Acceptance atomically writes public projection
expected: The newly accepted ambassador appears on the `/ambassadors` page within the SSR refresh (no deploy required). Their photo, name, and university/city (from the application doc snapshot) should appear even before they edit their profile.
context: Accept a pending ambassador application in the admin panel, immediately visit `/ambassadors`.
requirement: PRESENT-01 (+ Phase 2 acceptance integration)
result: passed

### 5. Profile editor save behavior (post-fix)
expected: (a) After clicking "Save public card", the form retains the entered values — no reset. "Save" button disables (form === initial) after PATCH response hydrates. (b) After hard-reload, values persist via GET.
context: On `/profile` as an ambassador, enter values in university, city, publicTagline, and a Twitter URL, then click "Save public card". This is the post-fix validation of commit 6bbc85a.
requirement: PRESENT-04 (editor UX)
result: passed

### 6. Video URL inline preview
expected: An inline video preview renders immediately below the input before clicking "Save" — for YouTube, Loom, and Google Drive URLs. Unknown providers show no preview.
context: On `/profile` as an ambassador, paste a YouTube URL (e.g. `https://www.youtube.com/watch?v=dQw4w9WgXcQ`) into the "Cohort presentation video URL" field.
requirement: PRESENT-04 (edit side)
result: passed

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
