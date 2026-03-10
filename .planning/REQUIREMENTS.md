# Requirements: Code With Ahsan

**Defined:** 2026-03-10
**Core Value:** Community members can find mentors, collaborate on real projects with structured support, and follow clear learning roadmaps—all within a mentor-led, quality-focused environment.

## v3.0 Requirements

Requirements for Brand Identity & Site Restructure milestone.

### Homepage

- [x] **HOME-01**: Visitor sees community-first hero section with community name, tagline, and join CTA (not personal branding)
- [x] **HOME-02**: Visitor sees community pillars grid (Mentorship, Projects, Roadmaps, Courses, Books) with descriptions and links
- [x] **HOME-03**: Visitor sees live social proof stats (Discord members, mentors, mentees, active mentorships, completed mentorships, avg rating)
- [x] **HOME-04**: Visitor sees founder credibility section (Ahsan's photo, GDE badge, brief intro as community founder — not a resume)
- [x] **HOME-05**: Visitor sees social reach bar (YouTube, Instagram, Facebook, LinkedIn, GitHub, X follower counts)
- [x] **HOME-06**: Visitor sees newsletter signup section
- [x] **HOME-07**: Visitor sees FAQ section about the community

### Navigation

- [x] **NAV-01**: Visitor sees flat top-level nav items: Mentorship, Projects, Roadmaps, Courses, Books, Blog, About
- [x] **NAV-02**: Secondary items (Events, Logic Buddy, Discord) are accessible via a "More" dropdown or footer
- [x] **NAV-03**: Mobile nav reflects the same flat structure with community sections promoted
- [x] **NAV-04**: Active nav item is visually highlighted based on current route

### Portfolio

- [x] **PORT-01**: Visitor can view Ahsan's professional bio with photo and GDE badge on `/about` page
- [x] **PORT-02**: Visitor can see Ahsan's published books with covers, descriptions, and purchase links
- [x] **PORT-03**: Visitor can see Ahsan's courses with descriptions and enrollment links
- [x] **PORT-04**: Visitor can see Ahsan's open-source projects from the community
- [x] **PORT-05**: Visitor can see Ahsan's work history / professional experience
- [x] **PORT-06**: Visitor can see testimonials from mentees, students, or colleagues
- [x] **PORT-07**: Visitor can see a contact/hire section with professional inquiry options
- [x] **PORT-08**: Visitor can see Ahsan's social media links and follower counts

### Mentorship Landing

- [ ] **MENT-01**: Mentorship page hero focuses on "find a mentor" / "become a mentor" — not community entry
- [ ] **MENT-02**: Mentorship page shows how the program works (steps/process)
- [ ] **MENT-03**: Mentorship page shows mentor browsing with search and filters (existing, repositioned)
- [ ] **MENT-04**: Mentorship page shows mentorship stats (mentors, active mentorships, completed, avg rating)

### Community Page

- [ ] **COMM-01**: `/community` page serves as a "Get Involved" page with clear onramps (Discord, mentorship, projects, roadmaps)
- [ ] **COMM-02**: `/community` page shows community stats and social proof
- [ ] **COMM-03**: `/community` page retains Discord channel directory (reorganized as secondary content)

### Stats API

- [x] **STATS-01**: API endpoint returns live community stats (mentor count, mentee count, active mentorships, completed mentorships, avg rating)
- [x] **STATS-02**: API endpoint returns social reach numbers (configurable, not hardcoded follower counts that need code changes)
- [x] **STATS-03**: Stats are cached to avoid excessive Firestore reads on every homepage load

## Future Requirements

### Testimonials System

- **TEST-01**: Mentees can submit testimonials after mentorship completion
- **TEST-02**: Admin can approve/reject testimonials before they appear publicly

### Enhanced Social Proof

- **SOCL-01**: Homepage shows recent project completions as activity feed
- **SOCL-02**: Homepage shows recent mentorship completions

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full visual redesign (new theme/colors) | Problem is information architecture, not visual design — keep existing DaisyUI theme |
| Animated landing page / complex interactions | Keep it simple, content-focused — avoid performance overhead |
| CMS for homepage content | Static content is fine for now, CMS adds complexity |
| Auto-fetching social follower counts via APIs | API rate limits, auth complexity — use configurable values |
| Mobile app | Web-first approach, defer to v4+ |
| Blog migration to platform | External blog works fine, no need to move |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HOME-01 | Phase 16 | Complete |
| HOME-02 | Phase 16 | Complete |
| HOME-03 | Phase 16 | Complete |
| HOME-04 | Phase 16 | Complete |
| HOME-05 | Phase 16 | Complete |
| HOME-06 | Phase 16 | Complete |
| HOME-07 | Phase 16 | Complete |
| NAV-01 | Phase 15 | Complete |
| NAV-02 | Phase 15 | Complete |
| NAV-03 | Phase 15 | Complete |
| NAV-04 | Phase 15 | Complete |
| PORT-01 | Phase 17 | Complete |
| PORT-02 | Phase 17 | Complete |
| PORT-03 | Phase 17 | Complete |
| PORT-04 | Phase 17 | Complete |
| PORT-05 | Phase 17 | Complete |
| PORT-06 | Phase 17 | Complete |
| PORT-07 | Phase 17 | Complete |
| PORT-08 | Phase 17 | Complete |
| MENT-01 | Phase 18 | Pending |
| MENT-02 | Phase 18 | Pending |
| MENT-03 | Phase 18 | Pending |
| MENT-04 | Phase 18 | Pending |
| COMM-01 | Phase 18 | Pending |
| COMM-02 | Phase 18 | Pending |
| COMM-03 | Phase 18 | Pending |
| STATS-01 | Phase 15 | Complete |
| STATS-02 | Phase 15 | Complete |
| STATS-03 | Phase 15 | Complete |

**Coverage:**
- v3.0 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 after v3.0 roadmap creation*
