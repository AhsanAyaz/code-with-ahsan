# Code With Ahsan - Community Platform

## What This Is

A comprehensive community platform for the "Code With Ahsan" developer community, providing mentorship management, project collaboration, and guided learning pathways. Built with Next.js, Firebase, and Discord integration to enable structured mentorship relationships, team-based project work, and curated learning resources.

## Core Value

Community members can find mentors, collaborate on real projects with structured support, and follow clear learning roadmaps—all within a mentor-led, quality-focused environment that makes contribution easy while maintaining high standards.

## Requirements

### Validated

<!-- v1.0 - Mentorship Admin Dashboard Capabilities -->

- ✓ Admin dashboard with password authentication — v1.0
- ✓ View and manage pending mentor applications (accept/decline) — v1.0
- ✓ View all mentors list with profile details — v1.0
- ✓ View all mentees list with profile details — v1.0
- ✓ Disable/re-enable mentor profiles — v1.0
- ✓ View mentor reviews and ratings — v1.0
- ✓ Discord channel creation for mentorships — v1.0
- ✓ Discord channel archiving on completion — v1.0
- ✓ Discord username lookup and member permissions — v1.0
- ✓ View mentor-mentee mapping (which mentees a mentor has) — v1.0
- ✓ View mentee-mentor mapping (which mentors a mentee has) — v1.0
- ✓ Update Discord username for mentors from admin — v1.0
- ✓ Update Discord username for mentees from admin — v1.0
- ✓ Regenerate Discord channel for a mentorship — v1.0
- ✓ Mark mentorship as completed — v1.0
- ✓ Revert mentorship from completed to active — v1.0
- ✓ Delete mentorship entirely — v1.0
- ✓ Filter profiles via comprehensive filter modal (status, relationships, rating, discord) — v1.0
- ✓ Restore declined mentors (change status to accepted) — v1.0

### Active

<!-- v2.0 - Project Collaboration & Learning Roadmaps -->

- [ ] Mentors can create project proposals with templates
- [ ] Admins can approve projects to move from Proposed to Active
- [ ] Developers can browse public project discovery page
- [ ] Developers can apply to join projects or be invited
- [ ] Discord channels auto-created for approved projects
- [ ] Project teams can share links, resources, and GitHub repos
- [ ] Project lifecycle: Proposed → Active → Completed → Archived
- [ ] Teams submit demos when marking projects complete
- [ ] Mentors can create/edit roadmap content (Markdown)
- [ ] Admins review and approve roadmap changes
- [ ] Roadmaps available for: Web Dev, Frontend (React/Angular), Backend, ML, AI, MCP Servers, AI Agents, Prompt Engineering
- [ ] Public roadmap listing and browsing

### Out of Scope

**v1.0 Exclusions:**
- Bulk operations on multiple mentorships — keep it simple, one at a time
- Discord channel deletion — archives are sufficient, manual cleanup if needed
- Creating new mentorships from admin — users should go through normal request flow
- Editing other profile fields from admin — only Discord username for now

**v2.0 Exclusions:**
- In-app messaging/chat — Discord channels are sufficient
- Roadmap progress tracking per user — focus on content first, tracking later
- Project financial/payment features — keep it community-focused, no monetization
- Video/live streaming for demos — demos as recorded videos/links, not live infrastructure

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

## Current Milestone: v2.0 Community Collaboration & Learning

**Goal:** Enable structured project collaboration and guided learning pathways, making it easy for developers to contribute while maintaining quality through mentor leadership.

**Target features:**
- Project collaboration system with lifecycle management (Proposed → Active → Completed → Archived)
- Discord integration per project with team management
- Project discovery, applications, invitations, and templates
- Demo submission and showcase on project completion
- Learning roadmap creation and management (mentor-authored, admin-approved)
- Roadmap catalog covering key domains: Web Dev, Frontend, Backend, ML, AI, MCP, Agents, Prompt Engineering

## Milestones

| Version | Status | Completed |
|---------|--------|-----------|
| v1.0 | Complete | 2026-01-23 |
| v2.0 | In Progress | — |

---
*Last updated: 2026-02-02 after v2.0 milestone start*
