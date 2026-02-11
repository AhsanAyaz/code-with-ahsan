---
phase: quick-7
plan: 1
subsystem: projects
tags:
  - ui
  - discovery
  - project-detail
  - user-experience
dependency_graph:
  requires: []
  provides:
    - Always-visible Create Project button in discovery header
    - Discord username display in application cards
  affects:
    - src/app/projects/discover/page.tsx
    - src/app/projects/[id]/page.tsx
tech_stack:
  added: []
  patterns:
    - Flex layout for header with button positioning
    - Conditional rendering based on authentication state
key_files:
  created: []
  modified:
    - src/app/projects/discover/page.tsx
    - src/app/projects/[id]/page.tsx
decisions:
  - Move Create Project button to always-visible header position for better discoverability
  - Show Discord username instead of generic username in application cards for consistency with TeamRoster
metrics:
  duration: 2 min
  completed: 2026-02-11
---

# Quick Task 7: Fix Two UI Issues Summary

**One-liner:** Moved Create Project button to discovery page header for always-visible access and fixed application cards to show Discord usernames

## Overview

Fixed two UI issues to improve project creation discoverability and display correct user identity in application cards. The Create Project button is now always visible to authenticated users in the discovery page header, and application cards show Discord usernames instead of generic usernames.

## Tasks Completed

| Task | Description | Files Modified | Commit |
|------|-------------|----------------|--------|
| 1 | Move Create Project button to discovery page header | src/app/projects/discover/page.tsx | 1c458bc |
| 2 | Fix application cards to show discordUsername | src/app/projects/[id]/page.tsx | 9f25ae9 |

## Changes Made

### Task 1: Move Create Project Button to Header

**Problem:** Create Project button was only visible in the empty state when no projects existed. Users couldn't easily create a project when viewing existing projects.

**Solution:**
- Changed header div to flex container with `items-center` and `justify-between`
- Moved Create Project Link button to header, conditionally rendered for authenticated users
- Removed button from empty state, keeping only "No active projects found" message

**Files Modified:**
- `src/app/projects/discover/page.tsx` (lines 143-148, 160-170)

### Task 2: Show Discord Username in Application Cards

**Problem:** Application cards showed generic `username` field instead of Discord identity, inconsistent with how team members are displayed in TeamRoster.

**Solution:**
- Changed conditional check from `app.userProfile?.username` to `app.userProfile?.discordUsername`
- Updated display text to show `@{app.userProfile.discordUsername}`
- Matches the pattern already used in TeamRoster component

**Files Modified:**
- `src/app/projects/[id]/page.tsx` (lines 625-628)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- Build completed successfully with no errors
- Discovery page header contains Create Project button for authenticated users
- Empty state no longer contains Create Project button
- Application cards reference discordUsername field
- Both changes follow existing component patterns in the codebase

## Impact

### User Experience
- Authenticated users can always access project creation from the discovery page
- Application cards show correct Discord identity for applicants
- Consistent username display across project detail page (application cards + team roster)

### Code Quality
- Improved UI consistency with existing patterns
- Better discoverability for key features
- Minimal code changes with clear intent

## Next Steps

None required - both issues resolved and verified.

## Self-Check: PASSED

**Commits verified:**
```bash
git log --oneline | head -2
9f25ae9 feat(quick-7): show discordUsername in application cards
1c458bc feat(quick-7): move Create Project button to discovery page header
```

**Files verified:**
- FOUND: src/app/projects/discover/page.tsx
- FOUND: src/app/projects/[id]/page.tsx

All claimed commits exist and all modified files are present.
