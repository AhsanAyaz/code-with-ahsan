---
phase: quick-058
plan: "01"
subsystem: mentorship
tags: [linkedin, mentor-profile, registration-form, public-profile, ui]
dependency_graph:
  requires: []
  provides: [linkedin-url-on-mentor-profile]
  affects: [mentor-registration, mentor-public-profile, mentor-api]
tech_stack:
  added: []
  patterns: [optional-field-propagation, conditional-rendering]
key_files:
  created: []
  modified:
    - src/types/mentorship.ts
    - src/app/api/mentorship/mentors/[username]/route.ts
    - src/app/profile/page.tsx
    - src/components/mentorship/MentorRegistrationForm.tsx
    - src/app/mentorship/mentors/[username]/MentorProfileClient.tsx
decisions:
  - "linkedinUrl added as optional field to MentorshipProfile and PublicMentor; MentorProfileDetails inherits it automatically via extends"
  - "LinkedIn input placed below CV/Max Mentees grid (full width, not inside the two-column grid) for clean layout"
  - "LinkedIn link rendered between currentRole and Stats in profile header for natural visual grouping"
metrics:
  duration: "~2 min"
  completed: "2026-02-18"
  tasks_completed: 3
  files_modified: 5
---

# Quick Task 58: Show LinkedIn Profile Link on Mentor Profile Summary

**One-liner:** Added optional `linkedinUrl` field to mentor profiles — collected in the registration/edit form, persisted via Firestore, exposed by the public API, and rendered as a clickable LinkedIn icon link in the mentor profile header.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add linkedinUrl to types and wire through data layer | 38b224e | mentorship.ts, route.ts, profile/page.tsx |
| 2 | Add LinkedIn URL input to MentorRegistrationForm | 3b2b05f | MentorRegistrationForm.tsx |
| 3 | Display LinkedIn link on mentor public profile page | 9aa8bff | MentorProfileClient.tsx |

## What Was Built

### Type Layer (Task 1)
- `linkedinUrl?: string` added to `MentorshipProfile` after `cvUrl` with JSDoc comment
- `linkedinUrl?: string` added to `PublicMentor` (after `isAtCapacity`); `MentorProfileDetails` inherits it automatically via `extends PublicMentor`
- API route (`/api/mentorship/mentors/[username]`) includes `linkedinUrl: profileData.linkedinUrl` in the returned mentor object
- Profile page `mentorInitialData` includes `linkedinUrl: profile.linkedinUrl || ""`

### Form (Task 2)
- `linkedinUrl?: string` added to `MentorRegistrationFormProps.initialData` interface
- `linkedinUrl` state initialized from `initialData?.linkedinUrl || ""`
- `linkedinUrl: linkedinUrl.trim()` included in the `onSubmit` payload
- Full-width LinkedIn URL input field placed after the CV/Max Mentees two-column grid with "Optional" label-alt and helper text "Shown publicly on your mentor profile"

### Display (Task 3)
- Conditional `<a>` tag in MentorProfileClient.tsx profile header info block
- Positioned between `currentRole` paragraph and the Stats flex row
- Renders only when `mentor.linkedinUrl` is truthy
- `target="_blank" rel="noopener noreferrer"` for security
- Includes inline LinkedIn SVG icon + "LinkedIn Profile" label text
- Styled with `text-primary hover:underline` for visual consistency

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

### Files Exist
- src/types/mentorship.ts: FOUND
- src/app/api/mentorship/mentors/[username]/route.ts: FOUND
- src/app/profile/page.tsx: FOUND
- src/components/mentorship/MentorRegistrationForm.tsx: FOUND
- src/app/mentorship/mentors/[username]/MentorProfileClient.tsx: FOUND

### Commits Exist
- 38b224e: FOUND
- 3b2b05f: FOUND
- 9aa8bff: FOUND

## Self-Check: PASSED
