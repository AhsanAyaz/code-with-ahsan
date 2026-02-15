# Roadmap: Code With Ahsan

## Overview

Code With Ahsan is a comprehensive community platform enabling mentorship, project collaboration, and guided learning. This roadmap tracks the journey from initial mentorship admin capabilities (v1.0) to community collaboration features (v2.0) that add mentor-led team projects with Discord integration and curated learning roadmaps.

## Milestones

- ✅ **v1.0 Mentorship Admin Dashboard** - Phases 1-3 (shipped 2026-01-23)
- 🚧 **v2.0 Community Collaboration & Learning** - Phases 4-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 Mentorship Admin Dashboard (Phases 1-3) - SHIPPED 2026-01-23</summary>

### Phase 1: Mentorship Mapping View
**Goal**: Administrators can view complete mentor-mentee relationship mappings
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — API endpoint for mentorship matches with profile joins
- [x] 01-02-PLAN.md — UI enhancement for relationship display in existing tabs

### Phase 2: Discord & Status Management
**Goal**: Administrators can update Discord usernames, regenerate channels, and manage mentorship lifecycle
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — API endpoints for Discord username updates and mentorship status/deletion
- [x] 02-02-PLAN.md — UI for inline Discord editing, status buttons, and delete confirmation

### Phase 3: Declined Mentor Management
**Goal**: Administrators can filter profiles by multiple criteria and restore declined mentors
**Plans**: 1 plan

Plans:
- [x] 03-01-PLAN.md — Filter modal and restore button

</details>

### 🚧 v2.0 Community Collaboration & Learning (In Progress)

**Milestone Goal:** Enable structured project collaboration and guided learning pathways with mentor leadership and quality control.

- [ ] **Phase 4: Foundation & Permissions** - Establish data model and centralized permission system
- [ ] **Phase 5: Projects - Core Lifecycle** - Project proposal, approval, Discord integration, completion workflow
- [ ] **Phase 6: Projects - Team Formation** - Discovery page, applications, invitations, team management
- [ ] **Phase 7: Projects - Demos & Templates** - Demo submission, showcase page, project templates
- [ ] **Phase 8: Roadmaps - Creation & Admin** - Markdown editor, version history, approval workflow
- [ ] **Phase 9: Roadmaps - Discovery & Rendering** - Public catalog, Markdown rendering, author attribution
- [ ] **Phase 10: Integration & Polish** - Dashboard integration, cross-feature links, regression testing

## Phase Details

### Phase 4: Foundation & Permissions
**Goal**: Establish type definitions, Firestore collections, and centralized permission system before implementing any approval workflows.

**Depends on**: Nothing (first phase of v2.0)

**Requirements**: PERM-01, PERM-02, PERM-03, PERM-04, PERM-05, PERM-06, PERM-07, PERM-08

**Success Criteria** (what must be TRUE):
  1. Project and Roadmap types defined in `/types/mentorship.ts` without breaking existing imports
  2. Firestore collections (`projects`, `project_members`, `roadmaps`, `roadmap_versions`) exist with security rules
  3. Centralized permission system at `src/lib/permissions.ts` provides action-based checks (canEditProject, canApproveRoadmap, etc.)
  4. Unit tests cover all role combinations (admin, mentor, mentee) for all permission actions
  5. Firebase emulator validates security rules prevent unauthorized access

**Plans**: 4 plans

Plans:
- [x] 04-01-PLAN.md — Install dependencies, configure Vitest, define Project and Roadmap types
- [x] 04-02-PLAN.md — Create Firestore security rules and input validation utilities
- [x] 04-03-PLAN.md — Build centralized permission system (TDD)
- [x] 04-04-PLAN.md — Test validation utilities and Firestore security rules

---

### Phase 5: Projects - Core Lifecycle
**Goal**: Complete project workflow end-to-end (create -> approve -> Discord channel -> complete -> demo) with activity tracking from day one.

**Depends on**: Phase 4

**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, PROJ-06, PROJ-07, PROJ-08, PROJ-09, DISC-01, DISC-02, DISC-03, DISC-04

**Success Criteria** (what must be TRUE):
  1. Mentor can create project proposal with title, description, tech stack, GitHub repo URL
  2. Admin can view pending proposals in admin dashboard Projects tab
  3. Admin can approve project and Discord channel automatically created with project name
  4. Discord channel includes pinned message with project details and GitHub link
  5. Project creator can mark project as Completed and Discord channel archives automatically
  6. Project tracks lastActivityAt timestamp for stale content detection

**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md — Backend: Discord project channel functions + project API routes (create, list, approve, decline, complete)
- [ ] 05-02-PLAN.md — Frontend: Admin dashboard Projects tab + project creation form

---

### Phase 6: Projects - Team Formation
**Goal**: Enable developers to discover projects, apply to join teams, and allow project creators to manage membership with skill matching guidance.

**Depends on**: Phase 5

**Requirements**: TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05, TEAM-06, TEAM-07, TEAM-08, TEAM-09, DISC-05, DISC-06, DISC-07, DISC-08, DISC-09

**Success Criteria** (what must be TRUE):
  1. Public project discovery page shows all Active projects with tech stack and skill level filters
  2. Developer can apply to join project with application message
  3. Project creator can view applications and approve/decline with feedback
  4. Project creator can invite developer by Discord username or email
  5. Invited developer receives notification and can accept/decline
  6. System shows skill mismatch warning when inviting beginner to advanced project
  7. Team members automatically added to Discord channel with appropriate permissions
  8. Project detail page shows current team roster with roles (Creator, Member)

**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md — Types, skill mismatch helper, Discord member functions, Firestore rules
- [ ] 06-02-PLAN.md — Application and invitation API routes with member removal
- [ ] 06-03-PLAN.md — Discovery page, project detail page, and team management UI

---

### Phase 06.1: Fix project creation permissions - allow any user to create, separate creator from team membership (INSERTED)

**Goal:** Fix critical permission flaw: allow any authenticated user to create projects (not just mentors), separate creator ownership from team membership, and enable creator to optionally join/leave as a team member while retaining owner permissions.
**Depends on:** Phase 6
**Plans:** 2 plans

Plans:
- [ ] 06.1-01-PLAN.md — Fix permission logic, Firestore rules, and tests for any-user project creation
- [ ] 06.1-02-PLAN.md — Creator join/leave endpoints and UI updates (dual-role badge, Join button)

### Phase 7: Projects - Demos & Templates
**Goal**: Enable project showcase with demo submissions and provide reusable templates to accelerate project creation.

**Depends on**: Phase 6

**Requirements**: TMPL-01, TMPL-02, TMPL-03, DEMO-01, DEMO-02, DEMO-03, DEMO-04

**Success Criteria** (what must be TRUE):
  1. System provides project templates (Fullstack App, AI Tool, Open Source Library) with predefined fields
  2. Mentor can customize template fields when creating project
  3. Project creator can submit demo when marking project as Completed (video/presentation URL + description)
  4. Public showcase page displays completed projects with demos
  5. Showcase page filterable by tech stack and completion date

**Plans**: 6 plans

Plans:
- [x] 07-01-PLAN.md — Server-side auth verification (auth infrastructure)
- [x] 07-02-PLAN.md — Frontend auth headers (auth infrastructure)
- [x] 07-03-PLAN.md — Nav link + loading states + remove member fix (UI polish)
- [ ] 07-04-PLAN.md — Project templates system (types, data, creation form selector)
- [ ] 07-05-PLAN.md — Demo submission (type fields, completion modal, display)
- [ ] 07-06-PLAN.md — Showcase page (API, page, cards, filters)

---

### Phase 8: Roadmaps - Creation & Admin
**Goal**: Enable mentors to create Markdown roadmaps with version history and admins to review/approve submissions with sanitization from day one.

**Depends on**: Phase 7

**Requirements**: ROAD-01, ROAD-02, ROAD-03, ROAD-04, ROAD-05, ROAD-06, ROAD-07, ROAD-08, ROAD-09, ROAD-10, ROAD-11, ROAD-12, ROAD-13, ROAD-14

**Success Criteria** (what must be TRUE):
  1. Mentor can create new roadmap with title, domain category (Web Dev, Frontend, Backend, ML, AI, MCP, Agents, Prompt Engineering), difficulty level, estimated hours
  2. Markdown editor provides live preview and toolbar for formatting
  3. Mentor can save roadmap as draft or submit for admin review
  4. Roadmap content stored in Firebase Storage with URL reference in Firestore (avoid 1MB document limit)
  5. Admin can view pending roadmap submissions in admin dashboard Roadmaps tab
  6. Admin can approve roadmap to publish or request changes with feedback
  7. Mentor can edit published roadmap (creates new draft version)
  8. Roadmap stores version history with timestamps and changelog
  9. Markdown content sanitized with rehype-sanitize to prevent XSS attacks

**Plans**: 3 plans

Plans:
- [ ] 08-01-PLAN.md — Backend: Roadmap API routes (create, list, get, submit, approve, decline, edit) + Firebase Storage upload + version history
- [ ] 08-02-PLAN.md — Frontend: Roadmap creation page with @uiw/react-md-editor, dual save/submit buttons, MentorshipProvider layout
- [ ] 08-03-PLAN.md — Frontend: Admin dashboard Roadmaps tab (approve/request-changes) + roadmap edit page with version tracking

---

### Phase 9: Roadmaps - Discovery & Rendering
**Goal**: Public roadmap catalog with Markdown rendering, domain filtering, and author attribution using existing blog rendering pipeline.

**Depends on**: Phase 8

**Requirements**: ROAD-15, ROAD-16, ROAD-17, ROAD-18, ROAD-19

**Success Criteria** (what must be TRUE):
  1. Public roadmap catalog page lists all published roadmaps with domain categories
  2. Catalog filterable by domain category and difficulty level
  3. Catalog searchable by title and description
  4. Roadmap detail page renders Markdown content with syntax highlighting (reuse blog rendering)
  5. Roadmap detail page shows author attribution with mentor profile link
  6. Roadmap shows last updated timestamp and version history viewer
  7. Roadmap detail page shows related mentors who teach that domain

**Plans**: 2 plans

Plans:
- [ ] 09-01-PLAN.md — Roadmap catalog with filters and search (RoadmapCard, RoadmapFilters, catalog page)
- [ ] 09-02-PLAN.md — Roadmap detail page with Markdown rendering and related mentors

---

### Phase 10: Integration & Polish
**Goal**: Integrate projects and roadmaps into user dashboard, add cross-feature links, and run regression tests to ensure existing mentorship features remain intact.

**Depends on**: Phase 9

**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05

**Success Criteria** (what must be TRUE):
  1. User dashboard shows "My Projects" section with active and completed projects
  2. Mentor dashboard shows "My Roadmaps" section with draft and published roadmaps
  3. Admin dashboard overview shows pending approvals count for projects and roadmaps
  4. Project detail page shows "Recommended Roadmaps" based on tech stack
  5. Roadmap detail page shows "Related Projects" using this roadmap's tech stack
  6. All existing mentorship features pass regression test suite (Discord channels, profile management, status transitions)
  7. Navigation flows work correctly between mentorship, projects, and roadmaps

**Plans**: TBD

Plans:
- [ ] 10-01: Dashboard integration (My Projects, My Roadmaps)
- [ ] 10-02: Cross-feature links and recommendations
- [ ] 10-03: Regression testing and polish

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Mentorship Mapping | v1.0 | 2/2 | Complete | 2026-01-23 |
| 2. Discord & Status | v1.0 | 2/2 | Complete | 2026-01-23 |
| 3. Declined Mentors | v1.0 | 1/1 | Complete | 2026-01-23 |
| 4. Foundation | v2.0 | 4/4 | Complete | 2026-02-02 |
| 5. Projects Core | v2.0 | 2/2 | Complete | 2026-02-02 |
| 6. Projects Team | v2.0 | 3/3 | Complete | 2026-02-11 |
| 7. Projects Demo | v2.0 | 3/6 | In progress | - |
| 8. Roadmaps Create | v2.0 | 3/3 | Complete | 2026-02-11 |
| 9. Roadmaps Discover | v2.0 | 0/2 | Not started | - |
| 10. Integration | v2.0 | 0/3 | Not started | - |

### Phase 11: Admin Project Management: View all projects and delete with cascade cleanup

**Goal:** Admin interface for viewing all projects with comprehensive management capabilities, cascade delete with Discord cleanup and member notifications, and admin dashboard refactor from client-side tabs to nested routes for proper URL navigation.
**Depends on:** Phase 10
**Plans:** 3 plans

Plans:
- [ ] 11-01-PLAN.md — Admin dashboard route refactor: layout, auth gate, navigation, and migrate existing tabs to /admin/* routes
- [ ] 11-02-PLAN.md — Admin projects API: enriched listing endpoint with filters and atomic cascade delete endpoint
- [ ] 11-03-PLAN.md — Projects management page: filter UI, project cards, two-step delete confirmation, and post-deletion summary

### Phase 12: Mentor Time Slots: Weekly availability management, mentee booking, rescheduling, Google Calendar integration

**Goal:** Mentors can define weekly time slot availability with timezone support, mentees can browse and book 30-minute sessions with atomic double-booking prevention, bookings auto-create Google Calendar events with Google Meet links, and cancellations trigger Discord DM notifications and calendar event cleanup.
**Depends on:** Phase 11
**Plans:** 6 plans

Plans:
- [ ] 12-01-PLAN.md — Types, availability calculation library, and mentor availability API
- [ ] 12-02-PLAN.md — Time slots query API and bookings API with Firestore transaction double-booking prevention and Discord DMs
- [ ] 12-03-PLAN.md — Google Calendar OAuth library, token encryption, event create/delete, and auth callback routes
- [ ] 12-04-PLAN.md — Mentor availability UI (weekly schedule editor, override dates, calendar connect) on profile page
- [ ] 12-05-PLAN.md — Mentee booking UI (time slot picker, bookings list) and booking page route
- [ ] 12-06-PLAN.md — Calendar integration wiring into booking flows and end-to-end verification

### Phase 13: Mentor & Mentee Dashboard UX Review

**Goal:** Review the UI/UX of the mentor & mentee dashboard, analyze current state, suggest navigation/experience improvements, and evaluate against 2026 UX standards.
**Depends on:** Phase 12
**Plans:** TBD

Plans:
- [x] 13-01-PLAN.md — UX analysis, screenshots, improvement proposal, and dashboard redesign implementation

---
*Last updated: 2026-02-15 after Phase 13 completion*
