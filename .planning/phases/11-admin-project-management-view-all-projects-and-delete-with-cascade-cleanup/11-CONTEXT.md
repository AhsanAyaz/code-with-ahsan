# Phase 11: Admin Project Management - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin interface for viewing all projects in the system with comprehensive management capabilities and cascade delete functionality. Includes refactoring the admin dashboard from client-side tabs to nested routes for proper URL navigation, lazy loading, and shareable URLs.

**Scope:** Admin project management (view all + delete with cascade cleanup) AND admin dashboard route refactor (infrastructure needed for proper implementation).

**Out of scope:** Project editing, status changes, and other admin actions (already handled in existing phases).

</domain>

<decisions>
## Implementation Decisions

### Admin Dashboard Refactor (Infrastructure)

**Problem:** Current admin dashboard uses client-side tabs causing: reload lands on first tab, all queries run on mount, no shareable URLs, no lazy loading.

**Solution:** Refactor to nested routes with proper Next.js routing.

- **Route structure:** `/admin/*` (new top-level)
  - `/admin` → Overview/dashboard home
  - `/admin/mentors` → All Mentors management
  - `/admin/mentees` → All Mentees management
  - `/admin/projects` → All Projects management (this phase's main feature)
  - Additional routes for other admin sections
- **Shared layout elements:**
  - Admin header/banner (clear indicator of admin mode)
  - Navigation menu (persistent across all admin routes)
  - Stats summary bar (quick stats: pending mentors, active projects, etc.)
  - Breadcrumbs (show current location: Admin > Projects > View All)
- **Data loading:** Route-level data fetching
  - Each route fetches its own data on mount
  - No shared cache/state between routes
  - Clean separation of concerns

### Projects List View

- **Organization:** All projects in one list with filters
  - Single unified view (not separate tabs by status)
  - Comprehensive filtering to narrow down results
- **Filtering capabilities:**
  - Status filter (Pending, Active, Completed, Declined)
  - Creator filter (filter by who created the project)
  - Date range filter (by creation date or activity date)
  - Search by title/description (text search across projects)
- **Card information display:**
  - Basic info: title, creator, status
  - Team size and capacity (current members / max team size)
  - Activity timestamps (created date, last activity, completion date)
  - Application/invitation counts (pending applications, sent invitations)
- **Delete action presentation:** Actions dropdown menu
  - Delete hidden in dropdown alongside other actions (view, edit if applicable)
  - Not a direct delete button on each card (safety through indirection)

### Delete Confirmation & Safety

- **Dialog information to show:**
  - Project details (title, creator, status, team size)
  - Impact summary (X members will lose access, Y applications will be deleted, etc.)
  - Warning about irreversibility (explicit message that action cannot be undone)
  - Discord channel note (mention that Discord channel will be deleted)
- **Delete restrictions:** Allow but require reason
  - Admin can delete any project (no technical restrictions)
  - Must provide a reason when deleting (audit trail and transparency)
  - Reason is logged and potentially shown to affected users
- **Post-deletion feedback:** Toast + confirmation modal
  - Initial success toast notification
  - Then show confirmation modal detailing what was cleaned up
  - Modal shows: X members notified, Discord channel deleted, Y applications removed, etc.

### Cascade Cleanup Scope

- **Related data to delete:**
  - Project members records (all `project_members` entries for this project)
  - Applications & invitations (all pending/declined applications and invitations)
  - Team roster data (clear denormalized team data in project document)
  - Activity logs (delete or mark as deleted any activity/audit logs)
- **Discord channel handling:** Delete the channel completely
  - Permanent removal of Discord channel and all messages
  - Not archive, not keep with removed permissions
  - Complete cleanup
- **Member notification:** Discord DM to all members
  - Send DM to every team member (creator + all members)
  - Message includes: project was deleted by admin, admin's reason, apology/explanation
  - Proactive notification for transparency
- **Failure handling:** All or nothing (atomic operation)
  - If any cleanup step fails, roll back entire deletion
  - Firestore batch or transaction for database operations
  - Discord operations tested first, then database operations
  - Project only marked as deleted if ALL steps succeed

### Claude's Discretion

- **Confirmation pattern:** Single vs two-step vs type-to-confirm
  - Choose based on risk level and UX patterns
  - Consider: impact summary complexity, admin confidence, irreversibility
- **Navigation UI design:** Sidebar vs route-based tabs vs top nav
  - Choose based on modern admin dashboard patterns
  - Consider: screen real estate, scalability, user familiarity
- **Error handling details:** Specific error messages and retry logic
- **Loading states:** Skeletons, spinners, progress indicators
- **Empty states:** What to show when filters return no results

</decisions>

<specifics>
## Specific Ideas

**Route refactor motivation:**
- Current tab approach breaks on reload (always lands on first tab)
- All tabs load at once (unnecessary queries)
- No shareable URLs for specific admin views
- This phase provides the opportunity to fix the foundation

**Delete transparency:**
- User emphasized importance of notifying ALL affected members
- Admin must provide reason (accountability and audit trail)
- Show detailed cleanup confirmation (build trust in the system)

**Atomic cleanup:**
- All or nothing approach chosen for data integrity
- Prevents partial/corrupted state where project is gone but data remains
- Discord operations are typically the risky part (test those first)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. The admin route refactor was included because it's necessary infrastructure for the Projects management feature to work correctly.

</deferred>

---

*Phase: 11-admin-project-management-view-all-projects-and-delete-with-cascade-cleanup*
*Context gathered: 2026-02-12*
