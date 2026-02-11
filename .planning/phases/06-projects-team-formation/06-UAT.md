---
status: testing
phase: 06-projects-team-formation
source: 06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-PLAN.md (manual session)
started: 2026-02-11T12:00:00Z
updated: 2026-02-11T12:00:00Z
---

## Current Test

number: 7
name: Creator Sees Pending Applications + Badge
expected: |
  As the project creator, visit /projects/my. Project cards show a badge like "N pending" for projects with pending applications. Click through to /projects/[id] — a "Pending Applications" section shows applicant info, their message, and Approve/Decline buttons.
awaiting: user response

## Tests

### 1. Discover Projects Page
expected: Visit /projects/discover. Active projects display in a responsive grid. Each card shows project title, truncated description, tech stack badges, difficulty badge (color-coded), and creator name/avatar. Cards link to /projects/[id].
result: pass

### 2. Search and Filter Projects
expected: On /projects/discover — type in the search box and projects filter by name/description in real-time. Select a difficulty level from the dropdown and only matching projects show. Click tech stack badge toggles and only projects with that tech appear. Filters combine (search + difficulty + tech).
result: pass

### 3. Project Detail Page
expected: Click a project card. /projects/[id] loads showing: project title, status badge, difficulty badge, full description, tech stack badges, GitHub repo link (if set), and team roster section. Creator info displayed.
result: pass
fixed: "Added status badge colors, empty tech stack message, and invitation deletion on accept (commit 951888b)"

### 4. Team Roster with Discord Usernames
expected: Team roster section shows creator first with "Creator" badge, then members with "Member" badge. Each person shows avatar, display name, and their Discord username (not the platform @username derived from email).
result: pass

### 5. Apply to Join Project
expected: As a non-creator user on a project detail page, an "Apply to Join" section appears with a textarea for application message (required, 10-500 chars). Submit the application. On success, the form is replaced by the application status (e.g., "Your application is pending"). Submitting again returns 409 / "already applied".
result: pass

### 4. Team Roster with Discord Usernames
expected: Team roster section shows creator first with "Creator" badge, then members with "Member" badge. Each person shows avatar, display name, and their Discord username (not the platform @username derived from email).
result: [pending]

### 5. Apply to Join Project
expected: As a non-creator user on a project detail page, an "Apply to Join" section appears with a textarea for application message (required, 10-500 chars). Submit the application. On success, the form is replaced by the application status (e.g., "Your application is pending"). Submitting again returns 409 / "already applied".
result: [pending]

### 6. Skill Mismatch Warning
expected: When a beginner-level user applies to an advanced project, a warning banner appears above the application form indicating the skill gap. It's advisory (non-blocking) — the user can still submit.
result: pass
fixed: "Added explicit skillLevel field, settings UI, and migrated to use explicit level instead of role inference (commit 07c2cfa). Migration script created to update existing profiles."

### 7. Creator Sees Pending Applications + Badge
expected: As the project creator, visit /projects/my. Project cards show a badge like "N pending" for projects with pending applications. Click through to /projects/[id] — a "Pending Applications" section shows applicant info, their message, and Approve/Decline buttons.
result: [pending]

### 8. Approve Application (Roster + Discord)
expected: Creator clicks Approve on a pending application. The applicant appears in the team roster. In Discord: (a) the new member is added to the project channel, (b) a welcome message appears in the channel tagging the member (e.g., "@username has joined the project!"), (c) the member receives a DM with the project title and link.
result: [pending]

### 9. Decline Application (Feedback + Discord DM)
expected: Creator clicks Decline on a pending application (optionally providing feedback). The application status updates to "declined". The applicant receives a Discord DM informing them their application was declined (with feedback if provided).
result: [pending]

### 10. Invite User by Discord Username
expected: As creator, in the invitation section, enter a Discord username and send invitation. The invited user receives a Discord DM with a link to the project. The invitation appears in the "Sent Invitations" list with the user's Discord username and "pending" status.
result: [pending]

### 11. Accept Invitation (Roster + Discord)
expected: As the invited user, visit the project detail page. An invitation card appears with Accept/Decline buttons. Click Accept. The user is added to the team roster. In Discord: (a) added to the project channel, (b) tagged welcome message in channel, (c) DM confirming they've joined with project link.
result: [pending]

### 12. Leave Project (Discord Message)
expected: As a team member (not creator), a "Leave Project" option is available. Click it. The member is removed from the team roster. In Discord: a departure message appears in the channel tagging the member (e.g., "@username has left the project"), then the member is removed from the channel.
result: [pending]

### 13. Remove Member (Discord Message)
expected: As creator, click the remove button (X) next to a team member in the roster. The member is removed. In Discord: a removal message appears in the channel tagging the removed member (e.g., "@username has been removed from the project"), then the member is removed from the channel.
result: [pending]

## Summary

total: 13
passed: 6
issues: 0
pending: 7
skipped: 0

## Gaps

[all issues fixed during testing]

## Future Enhancements

- Difficulty badge should include "Difficulty:" prefix or tooltip for clarity (cosmetic)
