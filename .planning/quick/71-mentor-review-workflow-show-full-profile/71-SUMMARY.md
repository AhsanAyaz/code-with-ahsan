---
phase: quick-71
plan: 01
subsystem: mentorship-admin
tags: [admin, mentor-review, discord-notifications, profile-management]
dependency_graph:
  requires: []
  provides: [changes_requested_status, mentor_resubmit_flow, admin_full_profile_view]
  affects: [mentorship_profiles, admin_pending_page, mentor_profile_page]
tech_stack:
  added: []
  patterns: [fire-and-forget-discord-dm, parallel-fetch-merge, prompt-based-feedback]
key_files:
  created: []
  modified:
    - src/types/mentorship.ts
    - src/lib/permissions.ts
    - src/lib/discord.ts
    - src/app/api/mentorship/admin/profiles/route.ts
    - src/app/api/mentorship/profile/route.ts
    - src/app/admin/pending/page.tsx
    - src/app/profile/page.tsx
decisions:
  - "changes_requested as new status union member (not separate field) for consistency with existing status workflow"
  - "Feedback minimum 10 characters matching roadmap request-changes pattern"
  - "Parallel fetch of pending + changes_requested profiles rather than status filter removal"
metrics:
  duration: 5m
  completed: "2026-03-08"
---

# Quick Task 71: Mentor Review Workflow - Show Full Profile Summary

Enhanced admin mentor review with full profile details, Request Changes action with Discord DM, and mentor resubmission flow.

## One-liner

Admin pending page shows all mentor profile fields, supports "Request Changes" with Discord DM notification, and mentors can resubmit after updating their profile.

## What Was Done

### Task 1: Backend - Status, Discord DM, and API Support (c88fcc0)
- Added `changes_requested` to MentorshipProfile status union type and PermissionUser
- Added `changesFeedback` and `changesFeedbackAt` fields to MentorshipProfile
- Created `sendMentorChangesRequestedNotification()` in discord.ts following existing notification patterns
- Updated admin profiles API to accept `changes_requested` status with feedback validation (min 10 chars)
- Updated profile API PUT handler to support `resubmit: true` flag that resets status from changes_requested to pending

### Task 2: Admin Pending Page UI Enhancement (058e376)
- Expanded "View Full Profile Details" collapse to show all profile fields: Discord username (with validation badge), LinkedIn, bio, major projects, CV, skill level, expertise, max mentees, availability days, public profile, username, registration date
- Added "Request Changes" button alongside Accept/Decline for pending and changes_requested profiles
- Added `handleRequestChanges()` with prompt-based feedback collection and Discord DM notification
- Added `changes_requested` status badge with warning styling
- Fetches both pending and changes_requested profiles in parallel

### Task 3: Mentor Profile Page Changes Banner (3bb13ce)
- Added warning alert banner when profile status is changes_requested, showing admin feedback
- Added "Resubmit Application for Review" button after the profile form
- handleResubmit calls profile API with resubmit flag to reset status to pending

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed PermissionUser type mismatch**
- **Found during:** Task 1
- **Issue:** Adding changes_requested to MentorshipProfile broke PermissionUser which had its own narrower status union
- **Fix:** Updated PermissionUser status type in src/lib/permissions.ts to include changes_requested
- **Files modified:** src/lib/permissions.ts
- **Commit:** c88fcc0

## Verification

- TypeScript compilation: PASSED (no errors)
- Build: PASSED (all pages built successfully)
- All 3 tasks completed and committed individually

## Self-Check: PASSED

All 7 modified files exist. All 3 commit hashes verified.
