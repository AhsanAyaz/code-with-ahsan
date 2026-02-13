---
phase: quick-24
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/admin/pending/page.tsx
  - src/app/admin/mentors/page.tsx
  - src/app/admin/mentees/page.tsx
autonomous: true
must_haves:
  truths:
    - "All Mentors page shows mentor-mentee relationship cards with grouped mentorship data from /api/mentorship/admin/matches"
    - "All Mentees page shows mentee-mentor relationship cards with grouped mentorship data from /api/mentorship/admin/matches"
    - "All Mentors/Mentees pages have search (debounced), filter modal (status/relationships/rating/discord), pagination (15 per page), and summary stats"
    - "All Mentors/Mentees pages support inline Discord username editing, mentorship status management (complete/revert/delete/regenerate channel), and reviews modal"
    - "Pending Mentors page shows full profile details with expandable section (bio, CV, major projects), expertise tags, star ratings, inline Discord editing, and disable/re-enable actions"
  artifacts:
    - path: "src/app/admin/mentors/page.tsx"
      provides: "Full All Mentors page with relationship view, filters, search, pagination, inline editing"
    - path: "src/app/admin/mentees/page.tsx"
      provides: "Full All Mentees page with relationship view, filters, search, pagination, inline editing"
    - path: "src/app/admin/pending/page.tsx"
      provides: "Full Pending Mentors page with complete profile details, expandable section, all action buttons"
  key_links:
    - from: "src/app/admin/mentors/page.tsx"
      to: "/api/mentorship/admin/matches?role=mentor"
      via: "fetch in useEffect"
      pattern: "api/mentorship/admin/matches"
    - from: "src/app/admin/mentors/page.tsx"
      to: "/api/mentorship/admin/profiles"
      via: "PUT for Discord edit and status changes"
      pattern: "api/mentorship/admin/profiles"
    - from: "src/app/admin/mentees/page.tsx"
      to: "/api/mentorship/admin/matches?role=mentee"
      via: "fetch in useEffect"
      pattern: "api/mentorship/admin/matches"
    - from: "src/app/admin/pending/page.tsx"
      to: "/api/mentorship/admin/profiles"
      via: "fetch for profiles, PUT for status changes and Discord edit"
      pattern: "api/mentorship/admin/profiles"
---

<objective>
Restore the full admin dashboard functionality for the Pending Mentors, All Mentors, and All Mentees pages that was lost during the Phase 11-01 admin route refactor. The refactor correctly moved from a monolith to separate route pages but oversimplified each page to bare-bones stubs, losing critical features.

Purpose: The admin dashboard is the primary tool for managing the mentorship program. Without filters, relationship views, inline editing, and full profile details, it's unusable for actual administration.

Output: Three fully-functional admin pages restored from the original 3159-line monolith at `git show d6897cd^:src/app/mentorship/admin/page.tsx`, adapted to work as standalone route pages within the existing `/admin/*` layout.
</objective>

<execution_context>
@.planning/quick/24-restore-original-admin-dashboard-functio/24-PLAN.md
</execution_context>

<context>
The original monolith source is accessible via: `git show d6897cd^:src/app/mentorship/admin/page.tsx`

Key reference files already in place:
@src/app/admin/layout.tsx (shared layout with AdminAuthGate + AdminNavigation)
@src/components/admin/AdminAuthGate.tsx (handles auth, exports ADMIN_TOKEN_KEY)
@src/components/admin/AdminNavigation.tsx (tab navigation with streamer mode toggle)
@src/types/admin.ts (ProfileWithDetails, Review, MentorshipWithPartner, GroupedMentorship, MentorshipSummary types)
@src/hooks/useStreamerMode.ts
@src/utils/streamer-mode.ts (getAnonymizedDisplayName, getAnonymizedEmail, getAnonymizedDiscord)

API endpoints (all still exist and functional):
- GET /api/mentorship/admin/profiles?role=mentor|mentee&status=pending
- PUT /api/mentorship/admin/profiles (status changes, Discord username updates)
- GET /api/mentorship/admin/matches?role=mentor|mentee (returns grouped mentorship data with partner profiles)
- GET /api/mentorship/admin/reviews?mentorId=X
- PUT /api/mentorship/admin/sessions (complete/revert mentorship status)
- DELETE /api/mentorship/admin/sessions?id=X
- POST /api/mentorship/admin/sessions/regenerate-channel

The existing layout handles auth gating, navigation, and MentorshipProvider wrapping. Each page just needs to be a "use client" component that renders its content.

NOTE: The Overview page (src/app/admin/page.tsx), Projects page (src/app/admin/projects/page.tsx), and Roadmaps page (src/app/admin/roadmaps/page.tsx) are already complete and should NOT be modified.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Restore All Mentors and All Mentees pages with full relationship view</name>
  <files>
    src/app/admin/mentors/page.tsx
    src/app/admin/mentees/page.tsx
  </files>
  <action>
Replace the current stub implementations with the full functionality from the original monolith. Both pages share nearly identical logic (the only differences are the role parameter and some label text), so extract the pattern once and adapt for each.

**Extract from `git show d6897cd^:src/app/mentorship/admin/page.tsx` the complete All Mentors/All Mentees tab implementation.** Specifically restore:

**State management:**
- `mentorshipData` (GroupedMentorship[]) - fetched from `/api/mentorship/admin/matches?role=mentor|mentee`
- `mentorshipSummary` (MentorshipSummary) - from same API
- `searchQuery` + `searchInputValue` with `useDebouncedCallback` from "use-debounce" (300ms delay)
- `currentPage` with `pageSize = 15`
- `filters` state: `{ status, mentees, rating, discord }` all defaulting to "all"
- `showFilterModal` boolean
- `editingDiscord` (composite key string), `editingDiscordValue`, `savingDiscord`
- `updatingStatus`, `deletingSession`, `showDeleteModal`, `sessionToDelete`, `regeneratingChannel`
- `showReviewsModal`, `reviewMentor`, `reviews`, `loadingReviews`
- `actionLoading` for status change operations
- `profiles` state for status change operations (fetched alongside mentorship data or separately)

**Data fetching:**
- Fetch mentorship data from `/api/mentorship/admin/matches?role=mentor` (or mentee) on mount
- Fetch profiles from `/api/mentorship/admin/profiles?role=mentor` (or mentee) for status operations

**Handler functions (all from the original monolith):**
- `handleStatusChange(uid, newStatus, reactivateSessions)` - PUT to /api/mentorship/admin/profiles with status update, re-enable sessions option, local state update
- `handleDiscordSave(uid, newUsername)` - PUT to /api/mentorship/admin/profiles with discordUsername, validates format client-side
- `handleSessionStatusChange(sessionId, newStatus)` - PUT to /api/mentorship/admin/sessions
- `handleDeleteMentorship()` - DELETE to /api/mentorship/admin/sessions
- `handleRegenerateChannel(sessionId)` - POST to /api/mentorship/admin/sessions/regenerate-channel
- `handleViewReviews(mentor)` - GET /api/mentorship/admin/reviews?mentorId=X
- Filter logic: `filteredMentorshipData` computed from mentorshipData applying filters (status, relationships, rating, discord, search). Default hides declined unless explicitly filtered.
- Pagination: `paginatedData` sliced from filtered data

**Rendering (from original monolith lines ~1480-2800):**
1. Summary stats header (total mentors, total mentees, active mentorships)
2. Search input (controlled, debounced)
3. Filter button with active count badge + clear button
4. Loading skeletons (3 cards)
5. Empty state with message
6. Relationship cards for each profile showing:
   - Avatar, name, status badge, role badge, active relationship count badge
   - Profile preview link (for mentors: `/mentorship/mentors/{username}?admin=1` in new tab)
   - Restore button for declined mentors
   - Email, inline Discord edit (click to edit with input, Enter to save, Escape to cancel)
   - Star rating with clickable reviews (for mentors)
   - Expandable mentorship sections (Active, Completed, Pending, Cancelled) each showing:
     - Partner avatar, name, email, inline Discord edit for partner
     - Mentorship status badge
     - Discord channel link (or "Regenerate" button if missing, for active mentorships)
     - Date info (requested, approved, last contact, cancelled with reason)
     - Action buttons: Complete (for active), Revert to Active (for completed), Delete (opens confirmation modal)
7. Pagination controls (first, prev, page numbers, next, last)

**Modals (rendered at bottom of component):**
1. Reviews modal - shows mentor's reviews with star ratings and feedback text
2. Filter modal - dropdowns for status (all/accepted/declined/pending/disabled), relationships (all/with/without), rating (all/rated/unrated - mentors only), discord (all/with/without)
3. Delete mentorship confirmation modal

**Import requirements:**
- `use-debounce` (useDebouncedCallback) - already installed
- `date-fns` (format) - already installed
- Types from `@/types/admin` (ProfileWithDetails, Review, MentorshipWithPartner, GroupedMentorship, MentorshipSummary)
- `ADMIN_TOKEN_KEY` from `@/components/admin/AdminAuthGate`
- `useStreamerMode` from `@/hooks/useStreamerMode`
- `getAnonymizedDisplayName`, `getAnonymizedEmail`, `getAnonymizedDiscord` from `@/utils/streamer-mode`
- `useToast` from `@/contexts/ToastContext`
- `Link` from `next/link`

**For the All Mentees page:** Same structure as All Mentors but:
- Fetches with `role=mentee`
- Labels say "mentors" where All Mentors says "mentees" (relationship label)
- No rating filter in filter modal
- No star ratings display
- No profile preview link
- Relationship label changes from "mentees" to "mentors"

**Critical: Use `useStreamerMode` hook** from the shared AdminNavigation context. The original monolith threaded `isStreamerMode` through everything - do the same by calling the hook directly in each page component.

**Critical: Read admin token from localStorage** using `ADMIN_TOKEN_KEY` for API calls that need it (status changes, Discord edits). The original monolith used this pattern throughout.
  </action>
  <verify>
    Run `npx tsc --noEmit` to verify TypeScript compilation.
    Run `npm run build` to verify build succeeds.
    Verify the mentors page imports and uses all required types from @/types/admin.
    Verify the mentees page follows the same pattern with role=mentee.
  </verify>
  <done>
    All Mentors page at /admin/mentors shows relationship cards with mentorship data, search, filters, pagination, inline Discord editing, mentorship status management, and reviews modal.
    All Mentees page at /admin/mentees shows relationship cards with mentorship data, search, filters, pagination, inline Discord editing, and mentorship status management.
    Both pages use streamer mode anonymization and admin token authentication for API calls.
  </done>
</task>

<task type="auto">
  <name>Task 2: Restore Pending Mentors page with full profile details and actions</name>
  <files>
    src/app/admin/pending/page.tsx
  </files>
  <action>
Replace the current simplified Pending Mentors page with the full implementation from the original monolith. The current page only shows name, email, expertise text, and basic approve/decline buttons with `prompt()` for decline reason.

**Extract from `git show d6897cd^:src/app/mentorship/admin/page.tsx` the complete Pending Mentors tab implementation** (lines ~1230-1490 in the original).

**State management:**
- `profiles` (ProfileWithDetails[]) - fetched from `/api/mentorship/admin/profiles?role=mentor&status=pending`
- `actionLoading` (string | null) - tracks which profile action is in progress
- `editingDiscord`, `editingDiscordValue`, `savingDiscord` - for inline Discord editing
- `showReviewsModal`, `reviewMentor`, `reviews`, `loadingReviews` - for reviews modal

**Handler functions:**
- `handleStatusChange(uid, newStatus, reactivateSessions)` - same as Task 1 but when on pending tab, removes profile from list after accept/decline
- `handleDiscordSave(uid, newUsername)` - same Discord edit handler
- `handleViewReviews(mentor)` - same reviews handler

**Rendering - Full profile cards (NOT the simplified stubs):**
Each pending mentor card must show:
1. Large avatar (w-16 h-16) with ring decoration
2. Name + status badge + role badge
3. Email
4. Current role text
5. Expertise tags (badge-primary badge-sm for each skill)
6. Star rating display (if rated) - clickable to open reviews modal, shows stars + count
7. Action buttons row:
   - Accept (btn-success) - calls handleStatusChange(uid, "accepted")
   - Decline (btn-error) - calls handleStatusChange(uid, "declined")
   - Disable (btn-warning) - for non-pending/non-disabled statuses
   - Re-enable (btn-success) - for disabled status
   - Re-enable N Session(s) (btn-info) - for accepted with disabledSessionsCount > 0
8. Expandable "View Full Profile Details" collapse section containing:
   - Bio
   - CV/Resume link (opens in new tab)
   - Major Projects & Experience (whitespace-pre-wrap)
   - Career Goals (for mentees)
   - Registration date
9. Empty state with icon when no pending mentors

**Modals:**
- Reviews modal (same as in Task 1 - shows all reviews for a mentor)

**Use the same imports and patterns as Task 1.** The pending page needs inline Discord editing and reviews modal just like the mentor/mentee pages.

**Critical: The current page uses `prompt()` for decline reason** which is poor UX. The original monolith calls `handleStatusChange(uid, "declined")` which does NOT prompt for a reason - it just changes status. Keep this original behavior (the API handles the status change without requiring a reason for decline via this endpoint, unlike the project decline which requires a reason).

**Streamer mode:** Apply `getAnonymizedDisplayName`, `getAnonymizedEmail` throughout, using the `useStreamerMode` hook.
  </action>
  <verify>
    Run `npx tsc --noEmit` to verify TypeScript compilation.
    Run `npm run build` to verify build succeeds.
    Verify the pending page has the expandable profile details collapse section.
    Verify inline Discord editing is present (editingDiscord state with input/save/cancel).
  </verify>
  <done>
    Pending Mentors page at /admin/pending shows full profile cards with avatar, expertise tags, star ratings, expandable profile details (bio, CV, major projects), all action buttons (accept/decline/disable/re-enable), inline Discord editing, and reviews modal.
    The page properly removes profiles from the list after accept/decline actions.
  </done>
</task>

</tasks>

<verification>
- `npm run build` succeeds with no TypeScript errors
- All three pages (/admin/pending, /admin/mentors, /admin/mentees) render without errors
- The /admin/page.tsx (Overview), /admin/projects/page.tsx, and /admin/roadmaps/page.tsx remain untouched
- Admin layout (AdminAuthGate + AdminNavigation) continues to work as the shared wrapper
- All API endpoints used match the existing routes in src/app/api/mentorship/admin/
</verification>

<success_criteria>
1. All Mentors page has: relationship cards, search, filter modal, pagination, inline Discord edit, mentorship management, reviews modal, profile preview links, restore button for declined
2. All Mentees page has: relationship cards, search, filter modal, pagination, inline Discord edit, mentorship management
3. Pending Mentors page has: full profile cards with expandable details, expertise tags, star ratings, all action buttons (accept/decline/disable/re-enable/re-enable sessions), inline Discord edit, reviews modal
4. All pages use streamer mode anonymization
5. All pages use admin token authentication from localStorage
6. Build passes with no TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/24-restore-original-admin-dashboard-functio/24-SUMMARY.md`
</output>
