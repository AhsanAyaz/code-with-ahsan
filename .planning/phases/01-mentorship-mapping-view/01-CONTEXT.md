# Phase 1: Mentorship Mapping View - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Display mentor-mentee relationships by enhancing the existing All Mentors and All Mentees tabs with relationship information. Administrators can see which mentees a mentor has, and which mentors a mentee has. Discord management and status changes are Phase 2.

</domain>

<decisions>
## Implementation Decisions

### View Organization
- Two separate sub-tabs: enhance existing "All Mentors" and "All Mentees" tabs with relationship info
- Do NOT create a new tab — enhance existing tabs
- Mentorship relationships shown in expandable sections (click to expand)
- Show all mentors/mentees including those with no relationships (indicate "0 mentees" or "0 mentors")

### Relationship Display
- Show all mentorship statuses: Active, Completed, Pending, Cancelled
- Per mentorship, display: Status badge (color coded), Discord channel link, Start date, Last activity
- Rich card for mentee/mentor info: Avatar, name, role, Discord username, email
- Completed mentorships in separate collapsed section (Active first, then "Completed Mentorships" section)

### Information Density
- Show 3-5 mentees per mentor before "Show X more" link
- Paginated list (10-20 per page with pagination controls)
- Search box to filter by name as you type
- Summary stats header: "X mentors, Y mentees, Z active mentorships"

### Empty & Edge States
- Mentors with no mentees: Badge showing "0 mentees" + "No mentees assigned" message when expanded
- Mentees with multiple mentors: List all mentors equally (no primary/secondary distinction)
- Loading state: Skeleton cards that animate while loading
- Missing Discord channel: Yellow warning indicator "No Discord channel"

### Claude's Discretion
- Exact skeleton card design
- Pagination size (within 10-20 range)
- Exact badge colors for statuses
- Spacing and typography details

</decisions>

<specifics>
## Specific Ideas

- Enhance existing tabs rather than adding new ones — keeps dashboard familiar
- Expandable pattern matches existing "View Full Profile Details" collapse in the current admin page
- Rich cards similar to existing mentor profile cards in the dashboard

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-mentorship-mapping-view*
*Context gathered: 2026-01-23*
