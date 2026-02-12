# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** Community members can find mentors, collaborate on real projects with structured support, and follow clear learning roadmaps—all within a mentor-led, quality-focused environment.
**Current milestone:** v2.0 Community Collaboration & Learning

## Current Position

Milestone: v2.0
Phase: 09 of 10 (Roadmaps - Discovery & Rendering)
Plan: 2 of 2
Status: Complete - Phase 09 finished
Last activity: 2026-02-12 - Completed quick task 19: Fix roadmap notifications and admin delete functionality

Progress: [████████████████████] 100% (26/26 total plans complete across current phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 26 (v1.0: 5, v2.0: 21)
- Average duration: ~15 min
- Total execution time: ~6 hours 47 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 2 | 178 min | 89 min |
| 02 | 2 | ~60 min | ~30 min |
| 03 | 1 | 2 min | 2 min |
| 04 | 4 | 10 min | 2.5 min |
| 05 | 2 | 132 min | 66 min |
| 06 | 2 | 9 min | 4.5 min |
| 06.1 | 2 | 5 min | 2.5 min |
| 07 | 6 | 14 min | 2.3 min |
| 08 | 3 | 14 min | 4.7 min |
| 09 | 2 | 5 min | 2.5 min |

**Recent Trend:**
- Last 5 plans: 08-02 (3min), 08-03 (9min), 09-01 (2min), 09-02 (3min)
- Trend: Phase 09 complete - Roadmap discovery (catalog + detail page) with Markdown rendering

*Updated after each plan completion*
| Phase 08 P01 | 2 | 2 tasks | 3 files |
| Phase 08 P02 | 3 | 2 tasks | 4 files |
| Phase 08 P03 | 9 | 2 tasks | 2 files |
| Phase 09 P01 | 115 | 2 tasks | 3 files |
| Phase 09-roadmaps-discovery-rendering P02 | 3 | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Decision | Phase | Context |
|----------|-------|---------|
| Extend existing admin tabs vs new tab | v1.0 | Extended All Mentors/Mentees tabs - reuse layout, consistent UX |
| Filter modal vs toggle for declined | v1.0 | Comprehensive filter modal - better UX, prevents pagination issues |
| State machine for status transitions | v1.0 | ALLOWED_TRANSITIONS map prevents invalid status changes |
| Composite keys for edit state | v1.0 | Prevents multi-instance edit jumps when same user in multiple cards |
| Batch fetching (30-item chunks) | v1.0 | Firestore 'in' query limit workaround |
| Phase structure follows research | v2.0 | Foundation → Projects (Core → Team → Demo) → Roadmaps (Create → Discover) → Integration |
| Denormalized profile subset pattern | 04-01 | creatorProfile contains {displayName, photoURL, username} for efficient list rendering |
| Composite ProjectMember key | 04-01 | ProjectMember.id is {projectId}_{userId} composite key |
| Security rules helper functions | 04-02 | isSignedIn(), isAdmin(), isAcceptedMentor() reduce duplication in Firestore rules |
| Two sanitization functions | 04-02 | sanitizeMarkdown (HTML) and sanitizeMarkdownRaw (Markdown storage) for flexibility |
| Strict HTTPS for GitHub URLs | 04-02 | Require https:// protocol only, reject http:// for security |
| Immutable version history | 04-02 | Roadmap versions subcollection has no update/delete for audit trail |
| Synchronous permission functions | 04-03 | All context provided by caller, no async DB lookups - simpler and faster |
| PermissionUser subset interface | 04-03 | Decouples permission logic from full MentorshipProfile structure |
| Admin detection via boolean flag | 04-03 | Permission system accepts isAdmin input (maps to Firebase custom claim) |
| Generic helper for owner-or-admin | 04-03 | canOwnerOrAdminAccess reduces duplication across edit/manage functions |
| Firebase emulator tests optional | 04-04 | Security rules tests skip gracefully when emulator unavailable for flexible CI |
| Separated validation vs emulator tests | 04-04 | Validation tests (no deps) vs security tests (require emulator) for CI flexibility |
| Discord project category batching | 05-01 | Projects use same batching pattern as mentorship (45 channels per category) |
| Non-blocking Discord failures | 05-01 | Project status transitions proceed even if Discord channel creation/archival fails |
| Creator-only completion | 05-01 | Only project creator can complete projects (not admin) - ownership model |
| Denormalized creator profile in projects | 05-01 | Project documents include {displayName, photoURL, username} subset |
| Projects tab in admin dashboard | 05-02 | Follows existing tab pattern for consistency (overview, pending, all-mentors, all-mentees, projects) |
| Decline reason required | 05-02 | Admin must provide reason when declining project proposals for documentation |
| Declined projects deleted | 05-02 | Declined projects removed from database (not marked as declined) for cleaner admin view |
| React 19 useActionState for forms | 05-02 | Modern form handling with pending states and error handling |
| MentorshipProvider layout pattern | 05-02 | Feature-specific layouts wrap routes needing auth context to avoid prerender errors |
| Project submission guidelines | 05-02 | Collapsible info section with best practices to improve proposal quality |
| Composite application/invitation keys | 06-01 | IDs use {projectId}_{userId} pattern to prevent duplicates and enable efficient lookups |
| Three-tier skill hierarchy | 06-01 | Beginner/intermediate/advanced mapped to 1/2/3 for numeric gap calculation in mismatch warnings |
| Non-blocking Discord member operations | 06-01 | addMemberToChannel/removeMemberFromChannel return boolean, log errors but don't throw |
| Batch writes for atomicity | 06-02 | Approval/acceptance uses Firestore batch for application+member+project updates |
| Discord DM on invitation | 06-02 | Invitations send Discord DM with project link for proactive notification |
| userId filter for applications | 06-02 | GET applications supports userId param to check if user already applied |
- [Phase 06.1]: canOwnerOrAdminAccess now checks isAuthenticated(user) && isOwner instead of isAcceptedMentor && isOwner
- [Phase 06.1]: Project creation permission changed from mentor-only to any authenticated user
- [Phase 06.1-02]: Creator join endpoint is creator-only (not for general member join via applications)
- [Phase 06.1-02]: Creator-members can leave but retain ownership permissions (lose Discord access only)
- [Phase 06.1-02]: TeamRoster always shows creator separately, never as part of members list
- [Phase 06.1-02]: Dual-role badge uses middot separator: 'Creator · Member' vs outline 'Creator'
- [Phase 06.1-02]: Create Project button shown to all authenticated users (removed mentor-only restriction)
- [Phase 07-01]: Auth verification at route level (not middleware) for flexibility with public endpoints
- [Phase 07-01]: Auth verification at route level (not middleware) for flexibility with public endpoints
- [Phase 07-05]: Demo fields optional on project completion (demoUrl and demoDescription)
- [Phase 07-05]: HTTPS-only validation for demo URLs (any HTTPS platform accepted)
- [Phase 07-05]: 1000 character limit on demo descriptions
- [Phase 07-06]: No URL param syncing for showcase filters - browse experience vs search destination
- [Phase 07-06]: Sort by completion date instead of difficulty - all completed projects are proven
- [Phase 08-01]: Store Markdown content in Firebase Storage (not Firestore) for unlimited size
- [Phase 08-01]: Edit action always creates new version and resets status to draft for re-approval
- [Phase 08-03]: Edit page is owner-only (not admin editable) - admin workflow is approve/request-changes
- [Phase 08-03]: Feedback field handled via type cast in UI - optional Firestore field, not in base Roadmap type
- [Phase 08-03]: Request Changes requires minimum 10 character feedback for actionable admin input
- [Phase 09-02]: Simplified mentor card UI for roadmap context (not full MentorCard with request functionality)
- [Phase 09-02]: Fuzzy case-insensitive domain matching for related mentors (maps domain values to readable labels)
- [Phase 09-02]: Limited related mentors to top 3 for focused recommendations
- [Phase 09-01]: No URL param syncing for filters - browse experience vs search destination (per Phase 07-06 pattern)

### Roadmap Evolution

- Phase 6.1 inserted after Phase 6: Fix project creation permissions - allow any user to create, separate creator from team membership (URGENT)
  - Planning complete: 2026-02-11 (2 plans in 2 waves)
  - Verification: PASSED after 1 revision iteration
  - Ready for execution
- Phase 11 added: Admin Project Management: View all projects and delete with cascade cleanup

### Pending Todos

None yet.

### Workflow Notes

**Quick task + PR workflow:**
For GitHub issue fixes, use `/gsd:quick` to plan and execute, then:
1. Checkout `main`, pull latest, create a `fix/<issue>-<slug>` branch
2. Cherry-pick the implementation commits (not docs commits) onto the new branch
3. `git rebase main`
4. Push and `gh pr create --base main` with "Closes #NNN" in the body
5. Update STATE.md with the quick task record

### Blockers/Concerns

**Phase 4 Complete:**
- ✅ Firestore security rules prevent permission escalation (PERM-01 through PERM-04 enforced and tested)
- ✅ Type definitions extended without breaking existing mentorship imports
- ✅ Permission system enforces all PERM requirements with 50 test cases
- ✅ Comprehensive test coverage: 25 validation tests + 20 security rules tests + 50 permission tests

**Phase 5 Complete:**
- ✅ Discord project channel management following mentorship patterns (category batching, rate limiting)
- ✅ POST /api/projects creates projects with validation and permission checks
- ✅ GET /api/projects lists projects with status/creator filters
- ✅ PUT /api/projects/[id] handles approve (Discord channel + pin), decline (reason), complete (archive)
- ✅ Admin dashboard Projects tab with approve/decline workflow
- ✅ Project creation form at /projects/new with React 19 useActionState
- ✅ Create Project button in mentor dashboard for discoverability
- ✅ Project submission guidelines for quality control
- ✅ lastActivityAt tracking on all project mutations

**Phase 6 Plan 1 Complete:**
- ✅ ProjectApplication and ProjectInvitation types with composite keys
- ✅ Skill mismatch detection with 3-tier hierarchy (beginner/intermediate/advanced)
- ✅ Discord member permission management (add/remove from channels)
- ✅ Firestore security rules for applications and invitations
- ✅ lodash.debounce installed for future search UI

**Phase 6 Plan 2 Complete:**
- ✅ GET /api/projects/[id] returns single project data
- ✅ POST /api/projects/[id]/applications with canApplyToProject permission check
- ✅ GET /api/projects/[id]/applications with userId filter for checking user's application status
- ✅ PUT /api/projects/[id]/applications/[userId] approve/decline with batch writes
- ✅ POST /api/projects/[id]/invitations with Discord DM notification to invited user
- ✅ GET /api/projects/[id]/invitations lists pending invitations
- ✅ PUT /api/projects/[id]/invitations/[userId] accept/decline with batch writes
- ✅ GET /api/projects/[id]/members returns team roster sorted by join date
- ✅ DELETE /api/projects/[id]/members/[memberId] with canManageProjectMembers permission
- ✅ All endpoints use composite keys for duplicate prevention
- ✅ Batch writes ensure atomicity for approval/acceptance flows
- ✅ Discord operations are non-blocking (API succeeds even if Discord fails)
- Discord category limit monitoring system required before scale (currently tracking in concerns)
- Rate limiting on Discord API handled by existing fetchWithRateLimit, but volume testing needed
- Project discovery/browsing page needed for users to find active projects (separate from creation flow)

**Phase 6.1 Complete (2026-02-11):**
- ✅ Research identified root cause: canCreateProject checks isAcceptedMentor() instead of isAuthenticated()
- ✅ Secondary bug found: canOwnerOrAdminAccess requires mentor role, would block non-mentor creators
- ✅ 2 plans executed in 2 waves (permissions fix + join/leave endpoints + UI)
- ✅ Plan 1: Updated permission system (2 min, 3 files, 14 tests)
- ✅ Plan 2: Creator join/leave endpoints and UI updates (3 min, 6 files, 2 endpoints)
- ✅ All 7 user requirements satisfied
- ✅ Public discovery filtering verified (ProjectCard shows creator only, not team members)
- ✅ Creator can join/leave while retaining ownership permissions
- ✅ Any authenticated user can create projects (removed mentor-only restriction)

**Phase 8 Complete (2026-02-11):**
- ✅ Backend API routes for roadmap CRUD with Firebase Storage integration (3 routes, 5 actions)
- ✅ Roadmap creation form with @uiw/react-md-editor and live preview
- ✅ Admin dashboard Roadmaps tab with approve/request-changes workflow
- ✅ Roadmap edit page with version tracking and changelog
- ✅ All Markdown content sanitized server-side with sanitizeMarkdownRaw
- ✅ Version history stored in subcollections with immutable audit trail
- ✅ MentorshipProvider layout pattern for auth context without prerender errors

**Phase 9 Complete (2026-02-11):**
- ✅ Roadmap catalog page with domain and difficulty filters (2 min, 3 files)
- ✅ Roadmap detail page with Markdown rendering and syntax highlighting (3 min, 2 files)
- ✅ MarkdownRenderer component using react-markdown, remarkGfm, and rehypePrism
- ✅ Related mentors discovery with fuzzy domain matching (top 3 recommendations)
- ✅ Simplified mentor cards linking to full profiles
- ✅ Client Component pattern for data fetching from roadmap APIs
- ✅ All TypeScript compilation and builds successful

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix Discord channel name fallback and timezone handling | 2026-01-30 | 43536a6 | [001-fix-discord-channel-name-and-timezone](./quick/001-fix-discord-channel-name-and-timezone/) |
| 002 | Assign Discord roles on mentor/mentee signup | 2026-01-30 | f8e3b26 | [002-assign-discord-roles-on-signup](./quick/002-assign-discord-roles-on-signup/) |
| 003 | Add profile preview buttons for admins and mentors | 2026-02-01 | 365c4fd | [003-add-profile-preview-buttons-1-add-a-prof](./quick/003-add-profile-preview-buttons-1-add-a-prof/) |
| 004 | Fix admin profile preview for declined mentors | 2026-02-01 | 6e6ffec | [004-fix-admin-profile-preview-for-declined-m](./quick/004-fix-admin-profile-preview-for-declined-m/) |
| 005 | Fix search input state sync issue on admin dashboard | 2026-02-01 | 8e6b4b6 | [005-fix-search-input-state-sync-issue-on-adm](./quick/005-fix-search-input-state-sync-issue-on-adm/) |
| 006 | Add pending application count badge to ProjectCard | 2026-02-10 | aa5165f | [006-add-pending-application-count-badge-to-p](./quick/6-add-pending-application-count-badge-to-p/) |
| 007 | Fix two UI issues: (1) Discovery page should always show Create Project button (not just in empty state), add it to header next to title. (2) Team roster should display discordUsername instead of username for members. | 2026-02-11 | 180b857 | [007-fix-two-ui-issues-1-discovery-page-shoul](./quick/7-fix-two-ui-issues-1-discovery-page-shoul/) |
| 008 | Improve project detail page UX: separate creator section, add share button, show X/Y team capacity | 2026-02-11 | 5bcfe62 | [008-improve-project-detail-page-ux-1-separat](./quick/8-improve-project-detail-page-ux-1-separat/) |
| 009 | Show project invitations in My Projects page | 2026-02-11 | 850e962 | [009-show-project-invitations-in-my-projects-](./quick/9-show-project-invitations-in-my-projects-/) |
| 010 | Auto-close Community dropdown when clicking menu items, add emojis to Projects/My Projects | 2026-02-11 | 41f7c94 | [010-auto-close-community-dropdown-when-click](./quick/10-auto-close-community-dropdown-when-click/) |
| 011 | Move settings page from /mentorship/settings to /profile and add Profile link to ProfileMenu | 2026-02-11 | 803ac06 | [011-move-settings-to-profile-route-and-add-p](./quick/11-move-settings-to-profile-route-and-add-p/) |
| 012 | Improve ProfileMenu: move My Projects from Community dropdown, add chevron indicator, upgrade styling | 2026-02-11 | ea07ebb | [012-improve-profilemenu-add-my-projects-link](./quick/12-improve-profilemenu-add-my-projects-link/) |
| 013 | Add visible chevron to profile avatar and darken dropdown backgrounds | 2026-02-11 | 6bdfe93 | [013-add-visible-chevron-to-profile-avatar-an](./quick/13-add-visible-chevron-to-profile-avatar-an/) |
| 014 | Send Discord notification to moderators when new project is submitted | 2026-02-11 | a366056 | [014-when-a-new-project-is-submitted-for-revi](./quick/14-when-a-new-project-is-submitted-for-revi/) |
| 015 | Show creator in team roster when joined as member | 2026-02-11 | b2a564f | [015-when-the-creator-joins-the-team-as-a-mem](./quick/15-when-the-creator-joins-the-team-as-a-mem/) |
| 016 | Fix Discord access revocation for project members | 2026-02-11 | a96c872 | [016-when-the-creator-removed-a-member-the-me](./quick/16-when-the-creator-removed-a-member-the-me/) |
| 017 | Fix Discord channel access removal logging and error handling | 2026-02-11 | 6f19dd5 | [017-fix-discord-channel-access-removal-when-](./quick/17-fix-discord-channel-access-removal-when-/) |
| 018 | Implement Discord notifications for roadmap events | 2026-02-12 | d4f9428 | [018-implement-discord-notifications-for-road](./quick/18-implement-discord-notifications-for-road/) |
| 019 | Fix roadmap notifications: add direct link to moderator messages, add admin delete functionality, and verify creator DM notifications work | 2026-02-12 | 994f554 | [019-fix-roadmap-notifications-add-direct-lin](./quick/19-fix-roadmap-notifications-add-direct-lin/) |

## Session Continuity

Last session: 2026-02-11
Stopped at: Completed Phase 09 Plan 02: Roadmap detail page with Markdown rendering and related mentors (Phase 09 Complete)
Resume file: None

---
*Updated: 2026-02-11 after completing Phase 09 Plan 02*
