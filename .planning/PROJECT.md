# Mentorship Admin Dashboard - Mentor/Mentee Mapping

## What This Is

An extension to the existing mentorship admin dashboard that enables administrators to view and manage mentor-mentee relationships, update Discord usernames, regenerate Discord channels, and control mentorship status. Built on top of the existing Next.js + Firebase mentorship system with Discord integration.

## Core Value

Administrators can see the complete picture of who is mentoring whom, and take action on mentorships (update Discord info, mark complete, restore, delete) without direct database access.

## Requirements

### Validated

<!-- Existing capabilities from current codebase -->

- ✓ Admin dashboard with password authentication — existing
- ✓ View and manage pending mentor applications (accept/decline) — existing
- ✓ View all mentors list with profile details — existing
- ✓ View all mentees list with profile details — existing
- ✓ Disable/re-enable mentor profiles — existing
- ✓ View mentor reviews and ratings — existing
- ✓ Discord channel creation for mentorships — existing
- ✓ Discord channel archiving on completion — existing
- ✓ Discord username lookup and member permissions — existing

### Active

<!-- v1.0 Complete - All capabilities delivered -->

- [x] View mentor-mentee mapping (which mentees a mentor has)
- [x] View mentee-mentor mapping (which mentors a mentee has)
- [x] Update Discord username for mentors from admin
- [x] Update Discord username for mentees from admin
- [x] Regenerate Discord channel for a mentorship
- [x] Mark mentorship as completed
- [x] Revert mentorship from completed to active
- [x] Delete mentorship entirely
- [x] Filter profiles via comprehensive filter modal (status, relationships, rating, discord)
- [x] Restore declined mentors (change status to accepted)

### Out of Scope

- Bulk operations on multiple mentorships — keep it simple, one at a time
- Discord channel deletion — archives are sufficient, manual cleanup if needed
- Creating new mentorships from admin — users should go through normal request flow
- Editing other profile fields from admin — only Discord username for now

## Context

**Existing Infrastructure:**
- Admin dashboard at `src/app/mentorship/admin/page.tsx`
- Discord integration in `src/lib/discord.ts` with channel creation, archiving, unarchiving
- Mentorship types in `src/types/mentorship.ts` (MentorshipMatch, MentorshipProfile)
- API routes at `src/app/api/mentorship/admin/` for profiles, stats, reviews
- Firebase Firestore for data persistence

**Current Dashboard Tabs:**
- Overview (stats, alerts)
- Pending Mentors
- All Mentors
- All Mentees

**Data Model:**
- MentorshipProfile: has `discordUsername`, `status` (pending/accepted/declined/disabled)
- MentorshipMatch: links mentor and mentee with `status` (pending/active/declined/completed/cancelled), stores `discordChannelId` and `discordChannelUrl`

## Constraints

- **Tech Stack**: Must use existing Next.js 16, React 19, Firebase, DaisyUI patterns
- **UI Consistency**: Follow existing admin dashboard styling and component patterns
- **Discord Integration**: Use existing `src/lib/discord.ts` functions for channel operations
- **No New Dependencies**: Work within existing package ecosystem

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Extend existing tabs vs new tab | Show relationships inline with profiles | ✓ Extended All Mentors/Mentees tabs |
| Filter modal vs toggle for declined | Toggle showed declined on page 3, modal shows only filtered | ✓ Comprehensive filter modal |
| Inline Discord username editing | Simpler than modal for single field | ✓ Inline edit with validation |
| Composite keys for edit state | Prevents jumps when same user in multiple cards | ✓ `${profileId}-${mentorshipId}` |
| State machine for status transitions | Prevents invalid status changes | ✓ ALLOWED_TRANSITIONS map |
| Batch fetching (30-item chunks) | Firestore 'in' query limit workaround | ✓ Chunked batch queries |

## Milestones

| Version | Status | Completed |
|---------|--------|-----------|
| v1.0 | Complete | 2026-01-23 |

---
*Last updated: 2026-01-23 after v1.0 milestone completion*
