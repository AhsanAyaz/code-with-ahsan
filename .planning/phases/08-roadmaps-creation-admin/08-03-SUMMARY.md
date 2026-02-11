---
phase: 08-roadmaps-creation-admin
plan: 03
subsystem: roadmaps
tags: [admin-ui, roadmap-editing, approval-workflow, mdeditor, version-tracking]
dependencies:
  requires:
    - "08-01": "Roadmap CRUD API with Storage Integration"
  provides:
    - "Admin Roadmaps tab for reviewing/approving submissions"
    - "Roadmap edit page for mentor updates with version tracking"
  affects:
    - "Admin dashboard": "Added Roadmaps tab"
    - "Roadmap lifecycle": "Edit workflow with version increments"
tech_stack:
  added: []
  patterns:
    - "Admin tab pattern (follows Projects tab structure)"
    - "Feedback modal with minimum character validation"
    - "Edit page with form pre-population from API"
    - "Dynamic MDEditor import to prevent SSR issues"
key_files:
  created:
    - "src/app/roadmaps/[id]/edit/page.tsx"
  modified:
    - "src/app/mentorship/admin/page.tsx"
decisions:
  - decision: "Edit page is owner-only (not admin editable)"
    rationale: "Admin workflow is approve/request-changes, not direct editing"
    phase: "08-03"
  - decision: "Feedback field handled via type cast in UI"
    rationale: "Feedback is optional Firestore field, not in base Roadmap type"
    phase: "08-03"
  - decision: "Request Changes requires minimum 10 character feedback"
    rationale: "Ensures actionable admin feedback for mentor improvements"
    phase: "08-03"
metrics:
  duration_minutes: 9
  tasks_completed: 2
  files_created: 1
  files_modified: 1
  commits: 2
  completed_at: "2026-02-11"
---

# Phase 08 Plan 03: Admin Roadmaps Tab & Edit Page Summary

**One-liner:** Admin dashboard Roadmaps tab with approve/request-changes workflow, and edit page with MDEditor for versioned roadmap updates

## Overview

Added the Roadmaps tab to the admin dashboard following the exact pattern of the Projects tab. The tab displays pending roadmap submissions with approve and request changes actions. Also created the roadmap edit page at `/roadmaps/[id]/edit` that loads existing content, allows modifications, and creates a new version while resetting status to draft for re-approval.

Together with Plans 01 (API) and 02 (creation form), this completes the full roadmap lifecycle: create → submit → admin review (approve/request changes) → edit (if needed) → re-submit.

## Tasks Completed

### Task 1: Add Roadmaps Tab to Admin Dashboard
**Commit:** `7957d04`

Extended the existing admin dashboard to add a "Roadmaps" tab following the exact pattern used for the "Projects" tab.

**Changes:**
- Extended `TabType` union to include `"roadmaps"`
- Added roadmap state variables (`roadmaps`, `loadingRoadmaps`, `roadmapActionLoading`, `feedbackRoadmapId`, `feedbackText`)
- Added `fetchRoadmaps` useEffect that fetches `GET /api/roadmaps?status=pending` when roadmaps tab is active
- Implemented three handler functions:
  - `handleApproveRoadmap`: Calls `PUT /api/roadmaps/[id]` with `action: "approve"`, removes from list on success
  - `handleRequestChangesRoadmap`: Opens feedback modal
  - `confirmRequestChanges`: Validates 10+ character feedback, calls `PUT /api/roadmaps/[id]` with `action: "request-changes"` and feedback
- Added Roadmaps tab button in tab bar
- Added roadmaps tab content with card-based display showing:
  - Title, description (truncated to 200 chars)
  - Author (from `creatorProfile.displayName`)
  - Domain (badge)
  - Difficulty (color-coded badge: beginner=green, intermediate=yellow, advanced=red)
  - Estimated hours
  - Version number
  - Submission date
  - Approve button (green)
  - Request Changes button (yellow/warning)
- Added Roadmap Feedback Modal for request changes action:
  - Textarea with character counter
  - Minimum 10 character validation
  - Cancel and Send Feedback buttons
  - Modal closes on backdrop click
- Updated fetch profiles useEffect to skip roadmaps tab (along with overview and projects)

**Files Modified:**
- `src/app/mentorship/admin/page.tsx` (+240 lines)

### Task 2: Create Roadmap Edit Page
**Commit:** `2bad22c`

Created `/roadmaps/[id]/edit` page for editing existing roadmaps with version tracking.

**Changes:**
- Created edit page component following creation form pattern
- Used same `DOMAIN_OPTIONS` and `DIFFICULTY_OPTIONS` constants
- Implemented roadmap fetch on mount via `GET /api/roadmaps/[id]`
- Pre-populated form fields from loaded roadmap data:
  - Title, description, domain, difficulty, estimatedHours, content (MDEditor)
- Added controlled form state for all fields
- Implemented `editRoadmapAction` with validation:
  - Title: 3-100 characters
  - Content: minimum 50 characters
  - Estimated hours: 0-1000
  - Change description: max 200 characters
  - Calls `PUT /api/roadmaps/[id]` with `action: "edit"` and all form data
- Permission check: owner-only edit access (not admin)
- Display admin feedback banner if present (using type cast for optional field)
- Success state shows:
  - Updated version number
  - Message that roadmap returned to draft status for re-review
  - Links to return to roadmaps or edit again
- Loading state: spinner while fetching roadmap
- Error states: display errors with back link
- Form structure:
  - Title (required)
  - Description (optional, 500 chars)
  - Domain (required, dropdown)
  - Difficulty (required, dropdown)
  - Estimated Hours (optional, number input)
  - Roadmap Content (required, MDEditor with 400px height)
  - Change Description (optional, textarea, 200 char limit)
  - Save Changes button (primary)
  - Cancel button (ghost, links back)
- Dynamic import of MDEditor to prevent SSR issues

**Files Created:**
- `src/app/roadmaps/[id]/edit/page.tsx` (531 lines)

## Deviations from Plan

None - plan executed exactly as written.

## Verification

1. TypeScript compilation: `npx tsc --noEmit` passed with no errors
2. Production build: `npm run build` succeeded
3. Admin dashboard shows 6 tabs: Overview, Pending Mentors, All Mentors, All Mentees, Projects, Roadmaps
4. Roadmaps tab fetches and displays pending roadmap submissions
5. Approve button calls `PUT /api/roadmaps/[id]` with action "approve"
6. Request Changes opens feedback modal, validates 10+ characters, sends `PUT` with action "request-changes"
7. `/roadmaps/[id]/edit` loads existing roadmap content into MDEditor
8. Edit page validates all fields and calls `PUT /api/roadmaps/[id]` with action "edit"
9. Both admin actions and edit page use `authFetch` for authenticated requests
10. Edit creates new version (version number increments) and resets status to draft

## Success Criteria

- [x] Admin can view pending roadmap submissions in the Roadmaps tab
- [x] Admin can approve roadmaps to publish them
- [x] Admin can request changes with mandatory feedback (min 10 chars)
- [x] Mentor can edit published or draft roadmaps at `/roadmaps/[id]/edit`
- [x] Edit creates a new version with incremented version number
- [x] Edit resets roadmap status to draft for re-review
- [x] Admin feedback displayed to mentor on edit page
- [x] All permission checks enforced (admin for approve/decline, owner for edit)

## Next Steps

1. **Plan 08-04 (if exists):** Roadmap discovery/browsing page for users to find and follow roadmaps
2. **Integration:** Test full roadmap lifecycle end-to-end (create → submit → admin review → edit → re-submit → approve)
3. **User notifications:** Consider adding notifications when roadmap is approved or changes requested

## Self-Check

**Files Created:**
- [x] `src/app/roadmaps/[id]/edit/page.tsx` exists

**Files Modified:**
- [x] `src/app/mentorship/admin/page.tsx` modified

**Commits:**
- [x] `7957d04`: Task 1 - Add Roadmaps tab to admin dashboard
- [x] `2bad22c`: Task 2 - Create roadmap edit page

## Self-Check: PASSED

All files exist, all commits are present, and the implementation matches the plan specifications.
