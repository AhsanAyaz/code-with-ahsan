# Milestones

## v4.0: Admin Course Creator with YouTube Integration

**Completed:** 2026-03-11
**Phases:** 1 (Phase 1 only)
**Plans:** 2 | **Commits:** 15 | **LOC:** +11,603 / -3,459
**Timeline:** 7 days (2026-03-04 → 2026-03-11)
**Archive:** `.planning/milestones/v4.0-ROADMAP.md`

**Delivered:**
- YouTube chapter-timestamp to MDX pipeline — auto-extracts video chapters and creates course post files
- Admin courses page with full CRUD — list, create, delete, toggle visibility, and reorder courses
- YouTube playlist support — each playlist video becomes a separate course post with its own video URL
- AI-generated SEO descriptions via Gemini for auto-filling course descriptions
- Course visibility and ordering system — toggle visibility and drag-reorder from admin, reflected on public site

---

## v2.0: Community Collaboration & Learning

**Completed:** 2026-03-10
**Phases:** 4-14 (11 phases + Phase 6.1 insert)
**Plans:** 44 | **Commits:** 517 | **LOC:** 46,772 TypeScript
**Timeline:** 36 days (2026-02-02 → 2026-03-10)
**Archive:** `.planning/milestones/v2.0-ROADMAP.md`, `.planning/milestones/v2.0-REQUIREMENTS.md`

**Delivered:**
- Project collaboration system with full lifecycle (Proposed → Active → Completed → Archived) and Discord integration
- Team formation with applications, invitations, skill matching, and member management
- Project templates (Fullstack App, AI Tool, Open Source Library) and demo submission on completion
- Showcase page for completed projects with demo links, tech stack filtering, and completion date sorting
- Learning roadmap authoring with Markdown editor, version history, and admin approval workflow
- Roadmap discovery catalog with domain filtering, difficulty levels, and related mentor recommendations
- Mentor time slots with weekly availability management, mentee booking with double-booking prevention, and Google Calendar integration
- Admin project management with cascade delete, Discord cleanup, and nested route dashboard refactor
- Foundation: centralized permission system (95 test cases), Firestore security rules, input sanitization
- UX improvements: smart navigation routing, dashboard widget redesign, ProfileAvatar unification
- Security: admin token auth on sensitive endpoints, XSS prevention, HTTPS-only URL validation

**Quick Tasks (Post-v2.0):** 41 quick tasks (006-071) covering bug fixes, UI polish, Discord notifications, SEO, Core Web Vitals, cron jobs, and feature refinements.

---

## v1.0: Mentorship Admin Dashboard

**Completed:** 2026-01-23
**Phases:** 1-3
**Archive:** `.planning/milestones/v1.0/`

**Delivered:**
- Mentor-mentee relationship mapping and visualization
- Discord username management for mentors and mentees
- Discord channel regeneration for mentorships
- Mentorship status management (complete, revert, delete)
- Comprehensive profile filtering (status, relationships, rating, discord)
- Declined mentor restoration capability

**Quick Tasks (Post-v1.0):**
1. Fix Discord channel name fallback and timezone handling
2. Assign Discord roles on mentor/mentee signup
3. Add profile preview buttons for admins and mentors
4. Fix admin profile preview for declined mentors
5. Fix search input state sync issue on admin dashboard

---

*Updated: 2026-03-10*
