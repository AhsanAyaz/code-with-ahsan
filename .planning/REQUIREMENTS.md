# Requirements: Code With Ahsan v2.0

**Defined:** 2026-02-02
**Core Value:** Community members can find mentors, collaborate on real projects with structured support, and follow clear learning roadmaps—all within a mentor-led, quality-focused environment.

## v2.0 Requirements

Requirements for v2.0 milestone: Project Collaboration & Learning Roadmaps.

### Project Lifecycle

- [ ] **PROJ-01**: Mentor can create new project proposal with title, description, and template selection
- [ ] **PROJ-02**: Admin can view pending project proposals in admin dashboard
- [ ] **PROJ-03**: Admin can approve project proposal to move it from Proposed to Active status
- [ ] **PROJ-04**: Admin can decline project proposal with reason
- [ ] **PROJ-05**: Discord channel automatically created when project moves to Active status
- [ ] **PROJ-06**: Project creator can mark project as Completed
- [ ] **PROJ-07**: Admin can archive completed projects
- [ ] **PROJ-08**: Project data includes GitHub repo URL field
- [ ] **PROJ-09**: Project stores tech stack tags for filtering

### Project Templates

- [ ] **TMPL-01**: System provides project templates (Fullstack App, AI Tool, Open Source Library)
- [ ] **TMPL-02**: Template includes predefined fields (tech stack, estimated timeline, required skills)
- [ ] **TMPL-03**: Mentor can customize template fields when creating project

### Team Formation

- [ ] **TEAM-01**: Developer can browse public project discovery page showing Active projects
- [ ] **TEAM-02**: Developer can apply to join an Active project with application message
- [ ] **TEAM-03**: Project creator can view pending applications for their project
- [ ] **TEAM-04**: Project creator can approve application to add developer to team
- [ ] **TEAM-05**: Project creator can decline application with optional feedback
- [ ] **TEAM-06**: Project creator can invite specific developer by Discord username or email
- [ ] **TEAM-07**: Invited developer receives notification and can accept or decline
- [ ] **TEAM-08**: Project detail page shows current team members with roles
- [ ] **TEAM-09**: Project creator can remove team member from project

### Discord Integration

- [ ] **DISC-01**: Discord channel created with project name as channel name
- [ ] **DISC-02**: All team members automatically added to Discord channel with appropriate permissions
- [ ] **DISC-03**: Discord channel includes pinned message with project details and GitHub link
- [ ] **DISC-04**: Discord channel archived when project marked as Completed

### Demo & Showcase

- [ ] **DEMO-01**: Project creator can submit demo when marking project as Completed
- [ ] **DEMO-02**: Demo submission includes video/presentation URL and description
- [ ] **DEMO-03**: Public showcase page displays completed projects with demos
- [ ] **DEMO-04**: Showcase page filterable by tech stack and completion date

### Project Discovery

- [ ] **DISC-05**: Public project discovery page shows all Active projects
- [ ] **DISC-06**: Discovery page filterable by tech stack tags and skill level
- [ ] **DISC-07**: Discovery page searchable by project name and description
- [ ] **DISC-08**: Project detail page shows full project information and team roster
- [ ] **DISC-09**: Project detail page shows application status for current user

### Roadmap Creation

- [ ] **ROAD-01**: Mentor can create new roadmap with title, domain category, and Markdown content
- [ ] **ROAD-02**: Roadmap creation uses Markdown editor with preview
- [ ] **ROAD-03**: Mentor can save roadmap as draft (not published)
- [ ] **ROAD-04**: Mentor can submit draft roadmap for admin review
- [ ] **ROAD-05**: Admin can view pending roadmap submissions in admin dashboard
- [ ] **ROAD-06**: Admin can approve roadmap to publish it
- [ ] **ROAD-07**: Admin can request changes to roadmap with feedback
- [ ] **ROAD-08**: Mentor can edit published roadmap (creates new draft version)
- [ ] **ROAD-09**: Roadmap stores version history with timestamps

### Roadmap Organization

- [ ] **ROAD-10**: Roadmap has domain category (Web Dev, Frontend, Backend, ML, AI, MCP Servers, AI Agents, Prompt Engineering)
- [ ] **ROAD-11**: Roadmap has difficulty level indicator (Beginner, Intermediate, Advanced)
- [ ] **ROAD-12**: Roadmap has estimated completion time
- [ ] **ROAD-13**: Roadmap displays author attribution (mentor profile link)
- [ ] **ROAD-14**: Roadmap shows last updated timestamp

### Roadmap Discovery

- [ ] **ROAD-15**: Public roadmap catalog page lists all published roadmaps
- [ ] **ROAD-16**: Catalog filterable by domain category and difficulty level
- [ ] **ROAD-17**: Catalog searchable by title and description
- [ ] **ROAD-18**: Roadmap detail page renders Markdown content with syntax highlighting
- [ ] **ROAD-19**: Roadmap detail page shows related mentors who teach that domain

### Admin Dashboard Integration

- [ ] **ADMIN-01**: Admin dashboard has new "Projects" tab showing all projects by status
- [ ] **ADMIN-02**: Admin dashboard has new "Roadmaps" tab showing all roadmaps by status
- [ ] **ADMIN-03**: Admin dashboard shows pending approvals count for projects and roadmaps
- [ ] **ADMIN-04**: Admin can filter projects by status, tech stack, and mentor
- [ ] **ADMIN-05**: Admin can filter roadmaps by status, domain, and author

### Permissions & Security

- [ ] **PERM-01**: Only accepted mentors can create projects
- [ ] **PERM-02**: Only accepted mentors can create roadmaps
- [ ] **PERM-03**: Only admins can approve projects and roadmaps
- [ ] **PERM-04**: Only project creator and admins can manage team membership
- [ ] **PERM-05**: Roadmap Markdown content sanitized to prevent XSS attacks
- [ ] **PERM-06**: GitHub repo URLs validated before saving
- [ ] **PERM-07**: Only authenticated users can apply to projects
- [ ] **PERM-08**: Project creator cannot apply to their own project

## Future Requirements

Deferred to post-v2.0 releases. Tracked but not in current roadmap.

### User Progress Tracking

- **PROG-01**: User can mark progress on roadmap sections
- **PROG-02**: User profile shows roadmap completion status
- **PROG-03**: Roadmap shows number of users currently following it

### Advanced Collaboration

- **COLLAB-01**: Project can have multiple project leads (co-creators)
- **COLLAB-02**: Team members can propose changes to project description
- **COLLAB-03**: Project activity feed shows recent updates and milestones

### Notifications

- **NOTIF-01**: User receives notification when application approved/declined
- **NOTIF-02**: Project creator receives notification for new applications
- **NOTIF-03**: Mentor receives notification when roadmap approved/rejected
- **NOTIF-04**: User receives notification when invited to project

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time collaborative editing | High complexity, WebSocket infrastructure, conflict resolution issues - async workflow sufficient |
| In-app messaging/chat | Discord already integrated - avoid splitting conversations across platforms |
| Roadmap progress tracking per user | Defer to v3 - focus on content quality first, tracking later |
| Project voting/ranking | Popularity ≠ quality - mentor curation is the quality bar |
| Live demo streaming | Infrastructure complexity, high failure risk - recorded demos sufficient |
| Agile project management (milestones/sprints) | Overkill for community projects - simple status lifecycle sufficient |
| Financial/payment features | Keep community-focused, no monetization |
| Video conferencing integration | Discord handles synchronous communication |
| Mobile app | Web-first approach, defer mobile native to v3+ |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (To be populated by roadmapper) | | |

**Coverage:**
- v2.0 requirements: 60 total
- Mapped to phases: (pending roadmap)
- Unmapped: (pending roadmap)

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after initial definition*
