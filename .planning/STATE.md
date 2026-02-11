# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** Community members can find mentors, collaborate on real projects with structured support, and follow clear learning roadmaps—all within a mentor-led, quality-focused environment.
**Current milestone:** v2.0 Community Collaboration & Learning

## Current Position

Milestone: v2.0
Phase: 6.1 of 10 (Fix Project Creation Permissions)
Plan: 1 of 2
Status: In progress
Last activity: 2026-02-11 — Completed 06.1-01-PLAN.md (Fix Project Creation Permissions)

Progress: [███████████░░] 93% (14/15 total plans complete across current phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 14 (v1.0: 5, v2.0: 9)
- Average duration: ~25 min
- Total execution time: ~6 hours 11 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 2 | 178 min | 89 min |
| 02 | 2 | ~60 min | ~30 min |
| 03 | 1 | 2 min | 2 min |
| 04 | 4 | 10 min | 2.5 min |
| 05 | 2 | 132 min | 66 min |
| 06 | 2 | 9 min | 4.5 min |
| 06.1 | 1 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 05-02 (129min), 06-01 (6min), 06-02 (3min), 06.1-01 (2min)
- Trend: Permission/rule fixes extremely fast (2min with comprehensive tests)

*Updated after each plan completion*

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

### Roadmap Evolution

- Phase 6.1 inserted after Phase 6: Fix project creation permissions - allow any user to create, separate creator from team membership (URGENT)
  - Planning complete: 2026-02-11 (2 plans in 2 waves)
  - Verification: PASSED after 1 revision iteration
  - Ready for execution

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

**Phase 6.1 Planning Complete (2026-02-11):**
- ✅ Research identified root cause: canCreateProject checks isAcceptedMentor() instead of isAuthenticated()
- ✅ Secondary bug found: canOwnerOrAdminAccess requires mentor role, would block non-mentor creators
- ✅ 2 plans created in 2 waves (permissions fix + join/leave endpoints + UI)
- ✅ Plan verification passed after 1 revision iteration
- ✅ All 7 user requirements covered
- ✅ Public discovery filtering verified (ProjectCard shows creator only, not team members)
- 🔜 Ready for execution: /gsd:execute-phase 06.1

**Phase 8 Readiness:**
- Firebase Storage integration pattern for Markdown content needs architecture research (version conflicts with concurrent edits)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix Discord channel name fallback and timezone handling | 2026-01-30 | 43536a6 | [001-fix-discord-channel-name-and-timezone](./quick/001-fix-discord-channel-name-and-timezone/) |
| 002 | Assign Discord roles on mentor/mentee signup | 2026-01-30 | f8e3b26 | [002-assign-discord-roles-on-signup](./quick/002-assign-discord-roles-on-signup/) |
| 003 | Add profile preview buttons for admins and mentors | 2026-02-01 | 365c4fd | [003-add-profile-preview-buttons-1-add-a-prof](./quick/003-add-profile-preview-buttons-1-add-a-prof/) |
| 004 | Fix admin profile preview for declined mentors | 2026-02-01 | 6e6ffec | [004-fix-admin-profile-preview-for-declined-m](./quick/004-fix-admin-profile-preview-for-declined-m/) |
| 005 | Fix search input state sync issue on admin dashboard | 2026-02-01 | 8e6b4b6 | [005-fix-search-input-state-sync-issue-on-adm](./quick/005-fix-search-input-state-sync-issue-on-adm/) |
| 006 | Add pending application count badge to ProjectCard | 2026-02-10 | aa5165f | [006-add-pending-application-count-badge-to-p](./quick/6-add-pending-application-count-badge-to-p/) |

## Session Continuity

Last session: 2026-02-11 11:28
Stopped at: Completed 06.1-01-PLAN.md (Fix Project Creation Permissions)
Resume file: None (ready to continue Phase 06.1 Plan 2)

---
*Updated: 2026-02-11 after completing 06.1-01-PLAN.md*
