# Code With Ahsan - Community Platform

## What This Is

A comprehensive community platform for the "Code With Ahsan" developer community, providing mentorship management, project collaboration, learning roadmaps, and mentor booking. Built with Next.js, Firebase, and Discord integration to enable structured mentorship relationships, team-based project work, curated learning resources, and scheduled mentoring sessions with Google Calendar integration.

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

<!-- v2.0 - Project Collaboration & Learning Roadmaps -->

- ✓ Project lifecycle: Proposed → Active → Completed → Archived — v2.0
- ✓ Project templates (Fullstack App, AI Tool, Open Source Library) — v2.0
- ✓ Team formation with applications, invitations, and skill matching — v2.0
- ✓ Discord channels auto-created for approved projects — v2.0
- ✓ Demo submission and showcase page for completed projects — v2.0
- ✓ Learning roadmaps with Markdown editor and version history — v2.0
- ✓ Roadmap catalog with domain filtering and mentor attribution — v2.0
- ✓ Admin approval workflows for projects and roadmaps — v2.0
- ✓ Mentor time slot availability with weekly scheduling — v2.0
- ✓ Mentee booking with double-booking prevention — v2.0
- ✓ Google Calendar integration for bookings — v2.0
- ✓ Centralized permission system (60 requirements, 95 test cases) — v2.0
- ✓ Admin project management with cascade delete — v2.0

### Validated

<!-- v3.0 - Brand Identity & Site Restructure -->

- ✓ Community-first homepage redesign — v3.0
- ✓ Navigation overhaul (flatten dropdown, promote key sections) — v3.0
- ✓ Portfolio/founder page (`/about` redesign) — v3.0
- ✓ `/community` page rethink (repurposed as Get Involved hub) — v3.0
- ✓ Mentorship landing page refocus (removed community entry role) — v3.0
- ✓ Social proof API (live stats for homepage) — v3.0

<!-- v4.0 - Admin Course Creator with YouTube Integration -->

- ✓ Admin course list with CRUD operations — v4.0
- ✓ YouTube video chapter extraction for auto-generating course posts — v4.0
- ✓ YouTube playlist support with per-video URLs — v4.0
- ✓ Course visibility toggle and reorder from admin — v4.0
- ✓ AI-generated SEO course descriptions via Gemini — v4.0
- ✓ Course card 3-column layout with black background thumbnails — v4.0

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
- Real-time collaborative editing — async workflow sufficient
- Agile project management (milestones/sprints) — simple status lifecycle sufficient
- Mobile app — web-first approach, defer to v3+

## Context

**Current State (post-v2.0):**
- 46,772 lines TypeScript/TSX across 568 files
- Tech stack: Next.js 16, React 19, Firebase (Firestore + Storage), DaisyUI, Discord API, Google Calendar API
- 15 phases completed, 44 plans executed, 41 quick tasks shipped
- 60 v2.0 requirements all verified complete
- Deployed on Vercel

**Infrastructure:**
- Admin dashboard at `/mentorship/admin/*` with nested route architecture
- Discord integration for mentorships, projects, and notifications
- Google Calendar OAuth for mentor booking calendar sync
- Firebase Storage for roadmap Markdown content
- Centralized permission system at `src/lib/permissions.ts`
- GitHub Actions cron jobs for mentor reminders and inactivity checks

## Constraints

- **Tech Stack**: Must use existing Next.js 16, React 19, Firebase, DaisyUI patterns
- **UI Consistency**: Follow existing admin dashboard styling and component patterns
- **Discord Integration**: Use existing `src/lib/discord.ts` functions for channel operations
- **No New Dependencies**: Work within existing package ecosystem (exceptions require justification)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Extend existing tabs vs new tab | Show relationships inline with profiles | ✓ Extended All Mentors/Mentees tabs |
| Filter modal vs toggle for declined | Toggle showed declined on page 3, modal shows only filtered | ✓ Comprehensive filter modal |
| Inline Discord username editing | Simpler than modal for single field | ✓ Inline edit with validation |
| Composite keys for edit state | Prevents jumps when same user in multiple cards | ✓ `${profileId}-${mentorshipId}` |
| State machine for status transitions | Prevents invalid status changes | ✓ ALLOWED_TRANSITIONS map |
| Batch fetching (30-item chunks) | Firestore 'in' query limit workaround | ✓ Chunked batch queries |
| Denormalized profile subset pattern | Efficient list rendering without joins | ✓ creatorProfile in projects, bookings |
| Synchronous permission functions | No async DB lookups, simpler and faster | ✓ All context provided by caller |
| Firebase Storage for Markdown | Avoid Firestore 1MB document limit | ✓ URL reference in Firestore |
| Immutable version history | Audit trail integrity | ✓ No update/delete on roadmap versions |
| Non-blocking Discord failures | API succeeds even if Discord down | ✓ Log errors, don't throw |
| Auth at route level (not middleware) | Flexibility with public endpoints | ✓ Token verification per route |
| AES-256-GCM for Calendar tokens | Secure refresh token storage | ✓ GOOGLE_CALENDAR_ENCRYPTION_KEY env var |
| Firestore transactions for bookings | Atomic double-booking prevention | ✓ 409 Conflict on race condition |
| Display times in viewer timezone | Prevents user confusion | ✓ Browser timezone + label |
| Admin nested routes | Proper URL navigation vs client tabs | ✓ /admin/* route architecture |
| Any user can create projects | Mentor-only was too restrictive | ✓ Changed in Phase 6.1 |
| GitHub Actions for cron jobs | Vercel cron unreliable, standalone scripts | ✓ Firebase Admin direct init |
| Firestore session auth for course routes | Consistency with other admin routes | ✓ Replaced env var check after UAT |
| Single chapter per YouTube course | Matches angular-in-90ish-minutes pattern | ✓ chapterOrder 0, posts from timestamps |
| Gemini for course descriptions | Auto-generate SEO-optimized text | ✓ gemini-flash-latest via @google/genai |
| visibilityOrder for course ordering | Simple numeric ordering in MDX frontmatter | ✓ Higher value = first in list |

## Current State (post-v4.0)

**Shipped:** v4.0 Admin Course Creator with YouTube Integration (2026-03-11)

The platform now includes a local admin tool for course management:
- Admin courses page at `/admin/courses` — list, create, delete, toggle visibility, reorder
- YouTube video/playlist integration — auto-extracts chapter timestamps into MDX course posts
- AI-generated SEO descriptions via Gemini API
- Course visibility and ordering reflected on public `/courses` page
- 3-column course card layout with centered thumbnails on black backgrounds

## Milestones

| Version | Status | Completed |
|---------|--------|-----------|
| v1.0 | Complete | 2026-01-23 |
| v2.0 | Complete | 2026-03-10 |
| v3.0 | Complete | 2026-03-10 |
| v4.0 | Complete | 2026-03-11 |

---
*Last updated: 2026-03-11 after v4.0 milestone completion*
