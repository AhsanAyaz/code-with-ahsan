---
phase: quick-9
plan: 1
subsystem: project-collaboration
tags: [invitations, my-projects, ui, api]
dependency_graph:
  requires: []
  provides:
    - user-invitation-management
    - centralized-invitation-view
  affects:
    - my-projects-page
    - invitation-workflow
tech_stack:
  added:
    - authFetch for authenticated API calls
  patterns:
    - Batch fetching for project enrichment
    - Toast notifications for user feedback
    - Badge count for pending items
key_files:
  created:
    - src/app/api/projects/invitations/my/route.ts
  modified:
    - src/app/projects/my/page.tsx
decisions:
  - "Fetch invitation count on mount regardless of active tab for immediate badge display"
  - "Batch-fetch project documents for efficient enrichment of invitation data"
  - "Accept action removes invitation from database (same as existing pattern)"
  - "Decline action marks invitation as declined but keeps record (same as existing pattern)"
  - "Empty state redirects to Discover Projects for user engagement"
metrics:
  duration: 3
  tasks: 2
  files: 2
  lines_added: 326
  lines_removed: 3
  completed: 2026-02-11T11:28:23Z
---

# Quick Task 9: Show Project Invitations in My Projects

**One-liner:** Added Invitations tab to My Projects page with centralized view of all pending invitations, accept/decline actions, and real-time count badge.

## Context

Users could only see project invitations when visiting a specific project detail page. This made invitations easy to miss and required users to navigate to individual projects to discover they had been invited.

## What Was Built

### 1. API Endpoint: GET /api/projects/invitations/my

**File:** `src/app/api/projects/invitations/my/route.ts`

- Returns all pending invitations for authenticated user
- Enriches invitations with project summary data (title, difficulty, tech stack, creator profile, team capacity)
- Uses batch fetching pattern for efficient Firestore queries
- Returns 401 for unauthenticated requests
- Follows existing error handling patterns

**Response Shape:**
```json
{
  "invitations": [
    {
      "id": "projectId_userId",
      "projectId": "...",
      "userId": "...",
      "invitedBy": "...",
      "status": "pending",
      "createdAt": "2026-02-11T...",
      "project": {
        "id": "...",
        "title": "...",
        "difficulty": "intermediate",
        "techStack": ["React", "Node"],
        "creatorProfile": { ... },
        "maxTeamSize": 4,
        "memberCount": 2
      }
    }
  ]
}
```

### 2. My Projects UI Updates

**File:** `src/app/projects/my/page.tsx`

**Added Third Tab:**
- "Invitations" tab alongside "Created" and "Joined"
- Badge showing count of pending invitations (only visible when count > 0)
- Badge updates dynamically when invitations accepted/declined

**Invitation Cards:**
- Project title (linked to project detail page)
- Difficulty badge (color-coded: beginner/green, intermediate/yellow, advanced/red)
- Tech stack badges (first 4 shown, +N for overflow)
- Creator name and avatar
- Team capacity display: "X / Y members"
- Accept button (green, adds user to team)
- Decline button (ghost style, marks invitation declined)
- Loading spinners on action buttons during API calls

**Empty State:**
- "No pending invitations" message
- Link to Discover Projects page

**Toast Notifications:**
- Success: "Invitation accepted! You've joined the project."
- Success: "Invitation declined."
- Error: Shows specific error message from API

**Data Fetching:**
- Invitation count fetched on mount (enables badge display immediately)
- Invitations data reused when tab clicked (no re-fetch needed)
- Accept/decline actions update local state optimistically (remove from list immediately)

## Technical Implementation

**Patterns Used:**
1. **authFetch** for authenticated API calls (attaches Firebase ID token)
2. **Batch fetching** in API route (db.getAll for multiple project documents)
3. **Optimistic UI updates** (remove invitation from list before API completes)
4. **Toast feedback** (success/error messages for user actions)
5. **Badge count** (pending item indicator on tab)

**State Management:**
- `invitations`: Array of enriched invitation objects
- `invitationCount`: Badge count (updates on accept/decline)
- `actionLoadingId`: Tracks which invitation button is loading
- `toasts`: Array of toast messages for feedback

**Type Safety:**
- Created `InvitationWithProject` interface extending `ProjectInvitation` with optional enriched project data
- Reused existing `ProjectDifficulty`, `ProjectInvitation` types from `@/types/mentorship`

## User Experience

**Before:**
- Users had to visit individual project pages to discover invitations
- No centralized location to manage all pending invitations
- Easy to miss invitations entirely

**After:**
- All pending invitations visible in one place
- Badge count on tab alerts users to pending invitations
- Accept/decline actions available without leaving My Projects page
- Accepted invitations immediately appear in "Joined" tab
- Rich project context shown for each invitation (difficulty, tech stack, team size)

## Verification

1. Navigate to `/projects/my` as authenticated user
2. Three tabs visible: Created, Joined, Invitations
3. If user has pending invitations, badge count appears on Invitations tab
4. Click Invitations tab - invitation cards display with project details
5. Accept invitation:
   - Success toast appears
   - Card removed from list
   - Badge count decrements
   - Project appears in Joined tab
6. Decline invitation:
   - Success toast appears
   - Card removed from list
   - Badge count decrements
7. With no invitations - empty state message and link to Discover Projects

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

**Created (1 file, 76 lines):**
- `src/app/api/projects/invitations/my/route.ts` - API endpoint for fetching user's invitations

**Modified (1 file, +250/-3 lines):**
- `src/app/projects/my/page.tsx` - Added Invitations tab with accept/decline actions

## Commits

1. **1c16353** - `feat(quick-9): add GET /api/projects/invitations/my endpoint`
   - New API route returning pending invitations with enriched project data
   - Batch fetching for efficient Firestore queries
   - 76 lines added

2. **850e962** - `feat(quick-9): add Invitations tab to My Projects page`
   - Third tab with count badge
   - Invitation cards with project context
   - Accept/decline actions with toast feedback
   - 250 lines added, 3 lines removed

## Self-Check

### Files Exist
```bash
✓ src/app/api/projects/invitations/my/route.ts
✓ src/app/projects/my/page.tsx
```

### Commits Exist
```bash
✓ 1c16353 (Task 1: API endpoint)
✓ 850e962 (Task 2: UI updates)
```

### Build Status
```bash
✓ No TypeScript errors
✓ No build errors
```

## Self-Check: PASSED

All files created, all commits exist, no build errors.
