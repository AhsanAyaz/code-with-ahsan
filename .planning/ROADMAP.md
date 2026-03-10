# Roadmap: Code With Ahsan

## Overview

Code With Ahsan is a comprehensive community platform enabling mentorship, project collaboration, and guided learning.

## Milestones

- ✅ **v1.0 Mentorship Admin Dashboard** — Phases 1-3 (shipped 2026-01-23)
- ✅ **v2.0 Community Collaboration & Learning** — Phases 4-14 (shipped 2026-03-10)
- 🚧 **v3.0 Brand Identity & Site Restructure** — Phases 15-18 (in progress)

## Phases

<details>
<summary>✅ v1.0 Mentorship Admin Dashboard (Phases 1-3) — SHIPPED 2026-01-23</summary>

- [x] Phase 1: Mentorship Mapping View (2/2 plans) — completed 2026-01-23
- [x] Phase 2: Discord & Status Management (2/2 plans) — completed 2026-01-23
- [x] Phase 3: Declined Mentor Management (1/1 plan) — completed 2026-01-23

</details>

<details>
<summary>✅ v2.0 Community Collaboration & Learning (Phases 4-14) — SHIPPED 2026-03-10</summary>

- [x] Phase 4: Foundation & Permissions (4/4 plans) — completed 2026-02-02
- [x] Phase 5: Projects - Core Lifecycle (2/2 plans) — completed 2026-02-02
- [x] Phase 6: Projects - Team Formation (3/3 plans) — completed 2026-02-11
- [x] Phase 6.1: Fix Project Creation Permissions (2/2 plans) — completed 2026-02-11
- [x] Phase 7: Projects - Demos & Templates (6/6 plans) — completed 2026-02-11
- [x] Phase 8: Roadmaps - Creation & Admin (3/3 plans) — completed 2026-02-11
- [x] Phase 9: Roadmaps - Discovery & Rendering (2/2 plans) — completed 2026-02-11
- [x] Phase 10: Integration & Polish (5/5 plans) — completed 2026-02-15
- [x] Phase 11: Admin Project Management (3/3 plans) — completed 2026-02-12
- [x] Phase 12: Mentor Time Slots (6/6 plans) — completed 2026-02-14
- [x] Phase 13: UX Review (1/1 plan) — completed 2026-02-15
- [x] Phase 14: Audit Gap Closure (2/2 plans) — completed 2026-03-10

</details>

### 🚧 v3.0 Brand Identity & Site Restructure (In Progress)

**Milestone Goal:** Transform the site from a personal brand page with hidden community features into a community-first platform with founder credibility, clear navigation, and a recruiter-ready portfolio page.

- [x] **Phase 15: Stats API & Navigation** - Backend stats API and flat top-level navigation restructure (completed 2026-03-10)
- [x] **Phase 16: Homepage Redesign** - Community-first hero, pillars, live stats, and social proof (completed 2026-03-10)
- [ ] **Phase 17: Portfolio Page** - Recruiter-ready `/about` page with bio, books, courses, and work history
- [ ] **Phase 18: Mentorship & Community Pages** - Refocus mentorship landing and repurpose community page

## Phase Details

### Phase 15: Stats API & Navigation
**Goal**: Site-wide infrastructure is ready — stats are available from an API and navigation surfaces community sections at the top level
**Depends on**: Phase 14 (v2.0 complete)
**Requirements**: STATS-01, STATS-02, STATS-03, NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):
  1. A visitor can hit the stats API endpoint and receive live counts for mentors, mentees, active mentorships, completed mentorships, and average rating
  2. Social reach numbers (YouTube, Instagram, etc.) are served from config, not hardcoded — updating them requires no code change
  3. Stats are cached so repeated homepage loads do not each trigger fresh Firestore reads
  4. Every page shows a flat top-level nav with Mentorship, Projects, Roadmaps, Courses, Books, Blog, About as direct links
  5. Mobile nav mirrors the flat desktop structure with community sections promoted
**Plans**: 2 plans

Plans:
- [x] 15-01-PLAN.md — Public stats API with caching and social reach config
- [x] 15-02-PLAN.md — Navigation restructure (flat top-level links, More dropdown, active highlighting)

### Phase 16: Homepage Redesign
**Goal**: Visitors land on a page that communicates community identity, shows real activity, and directs them to the right pillar
**Depends on**: Phase 15
**Requirements**: HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, HOME-06, HOME-07
**Success Criteria** (what must be TRUE):
  1. A first-time visitor sees a community-named hero with a tagline and a clear join CTA — no personal branding in the hero
  2. Visitor can see all five community pillars (Mentorship, Projects, Roadmaps, Courses, Books) with descriptions and working links
  3. Visitor sees live community stats on the page (mentor count, mentee count, active and completed mentorships, average rating) pulled from the Phase 15 API
  4. Visitor sees Ahsan's founder credibility section (photo, GDE badge, brief community-founder bio) positioned below the community content
  5. Visitor sees a newsletter signup section and a community FAQ section on the page
**Plans**: 2 plans

Plans:
- [x] 16-01-PLAN.md — Community hero, pillars grid, and live stats components
- [x] 16-02-PLAN.md — Social reach bar, founder credibility, and homepage assembly

### Phase 17: Portfolio Page
**Goal**: Recruiters and collaborators can learn about Ahsan's professional background, output, and contact options all from `/about`
**Depends on**: Phase 15
**Requirements**: PORT-01, PORT-02, PORT-03, PORT-04, PORT-05, PORT-06, PORT-07, PORT-08
**Success Criteria** (what must be TRUE):
  1. Visitor can read a professional bio with Ahsan's photo and GDE badge on `/about`
  2. Visitor can see published books with covers, descriptions, and purchase links
  3. Visitor can see courses with descriptions and enrollment links
  4. Visitor can see open-source community projects Ahsan has authored
  5. Visitor can see professional work history, mentee/student testimonials, a contact/hire section, and social media links with follower counts
**Plans**: 2 plans

Plans:
- [ ] 17-01-PLAN.md — Portfolio data files and static-data components (bio, books, work history, testimonials, contact)
- [ ] 17-02-PLAN.md — Dynamic components (courses, open-source, social links) and page assembly

### Phase 18: Mentorship & Community Pages
**Goal**: Mentorship page converts visitors who want a mentor or to become one; community page serves as a clear get-involved hub
**Depends on**: Phase 15
**Requirements**: MENT-01, MENT-02, MENT-03, MENT-04, COMM-01, COMM-02, COMM-03
**Success Criteria** (what must be TRUE):
  1. Mentorship page hero focuses on finding or becoming a mentor — not joining the broader community
  2. Visitor can see how the mentorship program works (steps or process overview) on the mentorship page
  3. Visitor can browse mentors with search and filters from the mentorship landing page
  4. `/community` page presents clear onramps to Discord, mentorship, projects, and roadmaps with community stats visible
  5. Discord channel directory is accessible from the community page as secondary (not hero) content
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Mentorship Mapping | v1.0 | 2/2 | Complete | 2026-01-23 |
| 2. Discord & Status | v1.0 | 2/2 | Complete | 2026-01-23 |
| 3. Declined Mentors | v1.0 | 1/1 | Complete | 2026-01-23 |
| 4. Foundation | v2.0 | 4/4 | Complete | 2026-02-02 |
| 5. Projects Core | v2.0 | 2/2 | Complete | 2026-02-02 |
| 6. Projects Team | v2.0 | 3/3 | Complete | 2026-02-11 |
| 6.1 Projects Permissions | v2.0 | 2/2 | Complete | 2026-02-11 |
| 7. Projects Demo | v2.0 | 6/6 | Complete | 2026-02-11 |
| 8. Roadmaps Create | v2.0 | 3/3 | Complete | 2026-02-11 |
| 9. Roadmaps Discover | v2.0 | 2/2 | Complete | 2026-02-11 |
| 10. Integration | v2.0 | 5/5 | Complete | 2026-02-15 |
| 11. Admin Projects | v2.0 | 3/3 | Complete | 2026-02-12 |
| 12. Time Slots | v2.0 | 6/6 | Complete | 2026-02-14 |
| 13. UX Review | v2.0 | 1/1 | Complete | 2026-02-15 |
| 14. Audit Gap Closure | v2.0 | 2/2 | Complete | 2026-03-10 |
| 15. Stats API & Navigation | v3.0 | 2/2 | Complete | 2026-03-10 |
| 16. Homepage Redesign | v3.0 | 2/2 | Complete | 2026-03-10 |
| 17. Portfolio Page | 1/2 | In Progress|  | - |
| 18. Mentorship & Community Pages | v3.0 | 0/TBD | Not started | - |

---
*Last updated: 2026-03-10 after Phase 17 planning*
