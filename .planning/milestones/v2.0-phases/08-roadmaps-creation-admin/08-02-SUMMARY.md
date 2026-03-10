---
phase: 08-roadmaps-creation-admin
plan: 02
subsystem: roadmaps
tags: [frontend, ui, markdown-editor, forms]
dependency_graph:
  requires: [08-01]
  provides: [roadmap-creation-ui]
  affects: [mentorship-dashboard]
tech_stack:
  added: ["@uiw/react-md-editor"]
  patterns: [controlled-forms, useActionState, dual-submit-buttons, dynamic-imports]
key_files:
  created:
    - src/app/roadmaps/layout.tsx
    - src/app/roadmaps/new/page.tsx
  modified:
    - package.json
    - package-lock.json
decisions:
  - "Renamed dynamic import to dynamicImport to avoid naming conflict with export const dynamic"
  - "Used controlled form state instead of FormData for consistent pattern with projects"
  - "Dual action buttons share form submit but use onClick state to determine draft vs submit"
  - "Submit for Review makes two API calls: POST /api/roadmaps then PUT with action=submit"
metrics:
  duration_seconds: 186
  duration_readable: "3 minutes"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
  commits: 2
  completed_at: "2026-02-11T20:31:21Z"
---

# Phase 08 Plan 02: Roadmap Creation Page with Markdown Editor Summary

**One-liner:** Created roadmap creation form with @uiw/react-md-editor for live Markdown preview, dual-action submission (draft/review), and mentor-only access control.

## What Was Built

Implemented the roadmap creation interface at `/roadmaps/new` with a full-featured Markdown editor, form validation, and dual submission flow for mentors to create learning roadmaps.

### Task 1: Install @uiw/react-md-editor and create roadmaps layout
- **Duration:** ~1 minute
- **Commit:** 976206d
- **Files:**
  - ✓ Installed `@uiw/react-md-editor@4.0.11` package
  - ✓ Created `src/app/roadmaps/layout.tsx` with MentorshipProvider wrapper
- **Purpose:** Set up Markdown editing infrastructure and context provider for all roadmap routes

### Task 2: Create roadmap creation page with Markdown editor
- **Duration:** ~2 minutes
- **Commit:** 80d47b4
- **Files:**
  - ✓ Created `src/app/roadmaps/new/page.tsx` (472 lines)
- **Features implemented:**
  - Form fields: title (3-100 chars), description (optional, 500 chars), domain category, difficulty, estimated hours (optional, 1-1000)
  - @uiw/react-md-editor with 500px height, live preview mode, GitHub Flavored Markdown support
  - Dynamic import with `ssr: false` to prevent SSR issues
  - Dual action buttons: "Save as Draft" and "Submit for Review"
  - Draft flow: POST /api/roadmaps with status "draft"
  - Submit flow: POST /api/roadmaps then PUT /api/roadmaps/[id] with action "submit" to transition to "pending"
  - Auth gate: Only accepted mentors can access form
  - Client-side validation with field-level errors
  - Loading states with conditional button text
  - Success state with navigation options (Dashboard / Create Another)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed naming conflict with dynamic import**
- **Found during:** Task 2 build verification
- **Issue:** Build error - "the name `dynamic` is defined multiple times" because I imported `dynamic` from 'next/dynamic' and also exported `export const dynamic = 'force-dynamic'`
- **Fix:** Renamed the import to `dynamicImport` to avoid conflict: `import dynamicImport from "next/dynamic"`
- **Files modified:** src/app/roadmaps/new/page.tsx
- **Commit:** 80d47b4 (included in Task 2 commit)

## Verification Results

All success criteria satisfied:

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Build succeeds | ✓ | npm run build completed without errors |
| @uiw/react-md-editor installed | ✓ | Package listed in package.json dependencies |
| MDEditor loaded with ssr: false | ✓ | Dynamic import with { ssr: false } config |
| Form has dual action buttons | ✓ | "Save as Draft" and "Submit for Review" buttons present |
| Save as Draft creates draft roadmap | ✓ | POST /api/roadmaps without follow-up submit call |
| Submit for Review submits roadmap | ✓ | POST /api/roadmaps then PUT with action: "submit" |
| Auth gate for accepted mentors | ✓ | Checks profile.role === "mentor" && profile.status === "accepted" |
| MentorshipProvider wraps routes | ✓ | src/app/roadmaps/layout.tsx provides context |
| Form validates required fields | ✓ | Client-side validation with fieldErrors display |
| Loading states prevent double submit | ✓ | isPending disables buttons, shows loading spinners |
| Success state provides next steps | ✓ | Alert with Dashboard/Create Another options |

## Technical Implementation

### Form Architecture
- **Pattern:** React 19 `useActionState` hook for form handling (same pattern as projects/new)
- **State management:** Controlled inputs with individual useState for each field
- **Validation:** Client-side validation in form action before API call
- **Error handling:** Field-level errors (fieldErrors) and global errors (error)

### Dual Submission Flow
```typescript
// onClick sets submitAction state ("draft" | "submit")
// Form action reads submitAction to determine flow

if (submitAction === "submit") {
  // 1. Create roadmap (status: draft)
  const response = await authFetch("/api/roadmaps", { method: "POST", ... });
  // 2. Submit for review (status: draft → pending)
  const submitResponse = await authFetch(`/api/roadmaps/${roadmapId}`, {
    method: "PUT",
    body: JSON.stringify({ action: "submit" })
  });
}
```

### Markdown Editor Configuration
- **Package:** @uiw/react-md-editor v4.0.11
- **SSR handling:** Dynamic import with `ssr: false` to prevent Next.js prerender errors
- **Preview mode:** `preview="live"` for side-by-side editing
- **Height:** 500px for comfortable editing experience
- **Color mode:** `data-color-mode="light"` for consistent styling
- **Character counter:** Shows real-time content length

### Auth Gate Logic
1. Loading state → Show spinner
2. No user → Show "Please sign in" alert with dashboard link
3. Not accepted mentor → Show "Only accepted mentors can create roadmaps" error
4. Accepted mentor → Show form

## Integration Points

### API Endpoints Used
- `POST /api/roadmaps` - Creates draft roadmap, returns { id }
- `PUT /api/roadmaps/[id]` - Updates roadmap status (action: "submit" transitions draft → pending)

### Context Dependencies
- `useMentorship()` from MentorshipContext - Provides user, profile, loading state
- `useRouter()` from next/navigation - Handles navigation after success
- `authFetch()` from lib/apiClient - Authenticated API requests

### Type Dependencies
- `RoadmapDomain` - Domain category enum (web-dev, frontend, backend, ml, ai, mcp, agents, prompt-engineering)
- `ProjectDifficulty` - Difficulty level enum (beginner, intermediate, advanced)
- Reuses ProjectDifficulty for roadmaps to maintain consistency with project creation

## Outstanding Work

None. Plan executed completely as specified.

## Next Steps

From ROADMAP.md Phase 08 sequence:
- **Next plan:** 08-03 - Roadmap Admin Management (approve/decline roadmaps, version history, bulk operations)
- **Integration needed:** Add "Create Roadmap" button to mentor dashboard for discoverability
- **Future phases:**
  - Phase 09: Roadmap Discovery & Browsing (public listing, filtering, search)
  - Phase 10: Integration (mentor profiles show roadmaps, projects link to roadmaps)

## Self-Check: PASSED

**Files created:**
- ✓ FOUND: src/app/roadmaps/layout.tsx
- ✓ FOUND: src/app/roadmaps/new/page.tsx

**Commits exist:**
- ✓ FOUND: 976206d (Task 1: install @uiw/react-md-editor and create roadmaps layout)
- ✓ FOUND: 80d47b4 (Task 2: create roadmap creation page with Markdown editor)

**Build verification:**
- ✓ npm run build completed successfully
- ✓ No TypeScript errors
- ✓ No SSR errors
- ✓ /roadmaps/new route appears in build output

All claims verified. Plan execution complete.
