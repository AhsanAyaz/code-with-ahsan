# Project Research Summary

**Project:** Code With Ahsan v2.0 - Project Collaboration & Learning Roadmaps
**Domain:** Developer mentorship platform enhancement
**Researched:** 2026-02-02
**Confidence:** HIGH

## Executive Summary

Code With Ahsan v2.0 extends an existing Next.js 16 + Firebase mentorship platform with two major feature domains: **project collaboration** (mentor-led team projects with Discord integration) and **learning roadmaps** (mentor-authored guides with admin curation). The research reveals that the existing architecture provides 80% of what's needed—Discord integration, admin approval workflows, Markdown rendering, and Firestore patterns can all be reused with minimal modification.

The recommended approach leverages this foundation: extend the existing admin dashboard with new tabs, mirror Discord channel creation patterns for projects, and reuse the Markdown rendering pipeline already built for blog posts. Only two new packages are required: `@octokit/rest` for GitHub integration and `@uiw/react-md-editor` for roadmap authoring. The architecture emphasizes **extension over creation**—add new Firestore collections but reuse existing services, add new admin tabs but maintain unified auth, add new features but preserve existing mentorship workflows.

The critical risks center on **integration complexity** rather than feature complexity. With shared infrastructure (Discord, Firestore, admin dashboard), new features can break existing mentorship flows. The most dangerous pitfalls are: (1) data model mismatches causing complex migrations, (2) Discord channel explosion hitting the 500-channel limit, (3) permission complexity fragmenting across 20+ files, (4) approval workflow bottlenecks slowing project momentum, and (5) stale content accumulation degrading platform quality. These are preventable through centralized permission systems, proactive channel archival, activity tracking from day one, and delegated approval workflows. The research provides a clear "extend, don't rebuild" path with specific integration points, anti-patterns to avoid, and phase-by-phase validation criteria.

## Key Findings

### Recommended Stack

The existing Next.js 16, React 19, Firebase, DaisyUI foundation handles 90% of requirements. The codebase already contains the complete Markdown processing pipeline (react-markdown 10.1.0, remark-gfm 4.0.1, gray-matter 4.0.3, rehype plugins) used for blog posts—this can render roadmap content immediately without any new packages.

**Core technologies (ALREADY AVAILABLE):**
- **react-markdown + remark-gfm**: Markdown rendering — already used for blog, works for roadmaps
- **Firebase Firestore + Admin SDK**: Database — existing patterns extend to projects/roadmaps
- **Discord.ts integration**: Channel management — reuse createMentorshipChannel() pattern
- **Next.js API Routes**: Backend — existing admin routes are templates for new endpoints
- **DaisyUI**: UI components — existing cards, forms, modals reuse for new features

**Core technologies (NEW ADDITIONS):**
- **@octokit/rest (v22.0.1)**: GitHub API client — create repos, manage collaborators (server-side only)
- **@uiw/react-md-editor (v4.0.4)**: Markdown WYSIWYG editor — 4.6 KB gzipped, live preview, toolbar

**Critical version compatibility:** All packages compatible with Next.js 16 + React 19. No version conflicts detected.

### Expected Features

Research identified clear table stakes vs. differentiators, with explicit anti-features to avoid scope creep.

**Must have (table stakes):**
- **Project listing/discovery** — users expect browsable catalog (standard across GitHub, GitLab, Linear)
- **Project status lifecycle** — clear states (Proposed/Active/Completed/Archived) from project management tools
- **Discord channel per project** — platform already uses Discord for mentorships, users expect same
- **Admin approval workflow** — aligns with platform's mentor-led quality control philosophy
- **Roadmap catalog with categories** — browsable learning guides organized by domain (Frontend, Backend, AI, MCP)
- **Markdown content rendering** — industry standard for developer docs (GitHub, GitLab, dev.to)
- **Demo submission on completion** — showcases portfolio culture, validates project outcomes

**Should have (competitive advantage):**
- **Mentor-led quality control** — unlike open platforms (GitHub), curated projects ensure quality
- **Admin pre-approval** — prevents spam/low-quality content that plagues open platforms
- **Auto-Discord integration** — unlike GitHub Projects, channels created automatically on approval
- **Mentor-authored trust** — roadmaps from vetted mentors vs. crowdsourced content (higher credibility)
- **Version history transparency** — shows when roadmap last updated (trust signal for learners)

**Defer (v2+):**
- **Project templates** — starter structures for repeat creators (add when friction emerges)
- **Roadmap progress tracking** — user state complexity, wait until content library matures
- **Search/filter** — add when catalogs grow (10+ projects, 5+ roadmaps)
- **Project milestones** — not needed for MVP, add if teams struggle with progress visibility

**Anti-features (explicitly excluded):**
- **Real-time collaborative editing** — massive complexity, async workflow sufficient
- **In-app chat/messaging** — duplicates Discord, splits conversation across platforms
- **Project voting/ranking** — popularity ≠ quality, undermines mentor curation
- **Financial/payment features** — changes community dynamics, adds legal complexity
- **Live demo streaming** — infrastructure complexity, use recorded demos instead

### Architecture Approach

The research emphasizes **integration over isolation**—extend existing components rather than creating parallel systems. New features plug into existing admin dashboard, Discord service, Firestore patterns, and auth flows.

**Major components:**

1. **Admin Dashboard Extension** — Add "Projects" and "Roadmaps" tabs to existing `/mentorship/admin/page.tsx` (reuse layout, auth, tab state management)

2. **Discord Service Extension** — Add `createProjectChannel()` and `updateChannelMembers()` functions to existing `/lib/discord.ts` (mirror mentorship patterns, reuse rate limiting)

3. **Firestore Collections (NEW)** — Add `projects`, `project_members`, `roadmaps`, `roadmap_versions` collections (root collections for global discovery, subcollections for version history)

4. **API Route Mirrors** — Create `/api/mentorship/projects/` and `/api/mentorship/roadmaps/` following exact patterns from `/api/mentorship/admin/profiles/` (same auth checks, same JSON shape, same state machine transitions)

5. **Denormalized Profile Data** — Store frequently-accessed profile fields (displayName, photoURL) directly in project/roadmap documents to avoid N+1 queries (follows Firebase best practice for read-heavy workloads)

**Key patterns to follow:**
- **Status State Machine**: Use ALLOWED_TRANSITIONS map (same as mentorship sessions) to prevent invalid status changes
- **Admin Tab Extension**: Extend existing admin page, don't create separate admin routes (unified auth, consistent UX)
- **Discord Category Hierarchy**: Separate categories for "Projects - Active", "Projects - Archived" (isolate channel limits from mentorships)
- **Version History via Subcollections**: Store roadmap versions in `roadmaps/{id}/versions` subcollection (cleaner queries, automatic ordering)
- **Markdown in Storage, URL in Firestore**: Store large content in Firebase Storage, reference URL in Firestore documents (avoid 1MB document limit)

### Critical Pitfalls

The research identified 10 critical pitfalls with specific prevention strategies. Top 5 by impact:

1. **Data Model Mismatch** — Adding new entities (projects, roadmaps) without mapping full relationship graph leads to complex migrations later. **Prevention**: Map entity relationships BEFORE creating collections, document schema decisions in SCHEMA.md, test migrations on dev data.

2. **Discord Channel Explosion** — Combined mentorship + project channels hit 500-channel limit faster than expected. Usability degrades at 200 channels. **Prevention**: Separate category hierarchies, auto-archive channels 30 days after completion, hard limit on active projects (max 25), consider threads for smaller projects.

3. **Permission Complexity Cascade** — Simple roles (mentor/mentee/admin) don't map cleanly to project creator, member, approver. Ad-hoc checks scatter across 20+ files. **Prevention**: Build centralized `src/lib/permissions.ts` with action-based model (`canEditProject(userId, projectId)`), write unit tests covering all role combinations.

4. **Approval Workflow Bottlenecks** — Admin-only approval works for 5 mentor applications/week, breaks at 20+ project proposals/week. **Prevention**: Implement tiered approval (senior mentors can approve), set 48-hour SLA with auto-approval fallback, track time-to-approval metrics.

5. **Stale Content Accumulation** — 40% of projects abandoned within 30 days, roadmaps become outdated. Platform fills with zombie content. **Prevention**: Track `lastActivityAt` timestamp, auto-flag projects with no activity for 30 days, send "still working?" notification at 45 days, auto-archive at 60 days with no response.

**Additional critical pitfalls:**
- **Integration Regression**: New features break existing mentorship due to shared infrastructure (Discord, Firestore batching)
- **Notification Fatigue**: Projects generate 10+ notifications/day per user, causing mass disabling
- **Markdown Content Security**: Unsanitized mentor-submitted Markdown creates XSS vulnerabilities
- **Team Formation Mismatch**: No skill matching leads to beginner joining advanced project (40% project failure rate)
- **Scope Creep**: "Just one more feature" turns projects into full Jira clone (3x development time)

## Implications for Roadmap

Based on research, the roadmap should prioritize **foundation before features** and **complete one domain before starting the next**. The existing architecture provides reusable services, so the initial phases focus on extending (not rebuilding) infrastructure.

### Suggested Phase Structure

**Phase 1: Foundation & Permissions**
- **Rationale**: Build centralized permission system before implementing any approval workflows. Retrofitting permissions after scattering checks across 20 files is multi-week refactor.
- **Delivers**: Type definitions for Project/Roadmap, centralized permissions.ts with canEditProject/canApproveRoadmap functions, extended admin auth checks
- **Addresses**: Permission Complexity Cascade pitfall, Data Model Mismatch pitfall
- **Validation**: Unit tests covering all role combinations pass, security rules validated in Firebase emulator

**Phase 2: Projects - Core Lifecycle**
- **Rationale**: Build complete project workflow end-to-end (create → approve → Discord channel → complete) before adding roadmaps. Validates integration patterns work.
- **Delivers**: Project creation, admin approval tab, Discord channel creation, project status lifecycle, demo submission
- **Uses**: @octokit/rest for GitHub integration, existing discord.ts patterns, new projects collection
- **Addresses**: Discord Channel Explosion (separate categories), Approval Bottleneck (tiered approval), Stale Content (activity tracking from day one)
- **Validation**: Create 10 test projects, verify category batching, measure time-to-approval <48 hours

**Phase 3: Projects - Discovery & Team Formation**
- **Rationale**: Public discovery and team mechanics after core workflow works. Builds on validated approval patterns.
- **Delivers**: Project browse page, project detail view, developer applications, team member management
- **Implements**: Denormalized profile data pattern, skill level indicators, team role badges
- **Addresses**: Team Formation Mismatch (skill warnings), UX pitfalls (onboarding, feedback on decline)
- **Validation**: Test skill mismatch warning, verify N+1 query avoided through denormalization

**Phase 4: Roadmaps - Creation & Admin Review**
- **Rationale**: Roadmaps build on validated patterns from projects. Storage integration is new complexity, so build data flow before public discovery.
- **Delivers**: Roadmap creation with Markdown editor, Firebase Storage integration, version history, admin approval workflow
- **Uses**: @uiw/react-md-editor for authoring, rehype-sanitize for security, existing react-markdown for rendering
- **Addresses**: Markdown Content Security (sanitization from day one), Stale Content (track updatedAt timestamps)
- **Validation**: Security test suite with malicious Markdown samples, version history works correctly

**Phase 5: Roadmaps - Discovery & Rendering**
- **Rationale**: Public-facing features after content creation and approval workflows are solid.
- **Delivers**: Roadmap catalog with domain categories, roadmap viewer with Markdown rendering, version history viewer, author attribution
- **Implements**: Storage retrieval pattern, Markdown rendering pipeline (reuse from blog)
- **Addresses**: UX pitfalls (show last updated timestamp, author trust signals)
- **Validation**: Roadmap rendering matches blog rendering, large content loads efficiently

**Phase 6: Dashboard Integration & Cross-Feature Links**
- **Rationale**: Integration after individual features work. Cross-linking adds value without blocking core functionality.
- **Delivers**: "My Projects" section in dashboard, "My Roadmaps" section for mentors, cross-links (projects → recommended roadmaps)
- **Addresses**: Integration Regression (run full mentorship test suite after integration)
- **Validation**: All existing mentorship features pass regression tests, navigation flows work

### Phase Ordering Rationale

- **Foundation first**: Permission system and type definitions prevent technical debt. Building scattered permission checks early creates multi-week refactor later.
- **Complete projects before roadmaps**: Projects share more integration surface (Discord, approval workflow, team dynamics). Validating integration patterns with projects reduces risk when adding roadmaps.
- **Core workflows before discovery**: Approval workflow must work before opening features to users. Building discovery pages first creates unusable features waiting for backend.
- **Security built-in**: Markdown sanitization, permission checks, activity tracking added during initial implementation. Retrofitting security after launch requires emergency response.
- **Integration last**: Cross-feature linking happens after features are stable. Prevents cascade failures where one broken feature breaks others.

### Research Flags

**Phases likely needing deeper research during planning:**

- **Phase 2 (Discord integration)**: Verify monthly category strategy scales with combined mentorship + project channels. May need custom category management research.
- **Phase 4 (Storage patterns)**: Firebase Storage with Firestore coordination for version history needs architecture research. Multiple concurrent edits could create version conflicts.

**Phases with standard patterns (skip research-phase):**

- **Phase 1 (Permissions)**: Well-documented RBAC patterns, similar to existing admin auth
- **Phase 3 (Discovery)**: Standard list/detail pages, existing mentorship browse patterns apply
- **Phase 5 (Markdown rendering)**: Already working in blog, zero new research needed
- **Phase 6 (Integration)**: Extension of existing dashboard, no new patterns

### Technical Debt to Avoid

Based on pitfall research, these shortcuts are NEVER acceptable:

- **Reusing MentorshipProfile type for project ownership**: Creates permission confusion, breaks when non-mentors need projects. Always create ProjectMember type from day one.
- **Skipping markdown sanitization in MVP**: XSS vulnerabilities require emergency patches. Sanitization libraries take 30 minutes to add, security breaches take weeks to fix.
- **No activity tracking on projects**: Historical data is impossible to recreate. Timestamps are cheap, stale content detection is essential for quality.
- **Storing markdown content directly in Firestore documents**: 1MB document limit breaks large roadmaps. Always use Firebase Storage with URL reference.

These shortcuts ARE acceptable temporarily:

- **Admin-only approval for all workflows**: Simple permission model works for MVP with <10 projects/week. Plan migration to delegated approvers in v2.1 when volume increases.
- **Email notifications instead of in-app notification center**: Faster than building UI. Plan migration when notification volume exceeds 5/user/day.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing packages cover 90% of needs. Only 2 new packages required, both actively maintained and widely adopted. Zero version conflicts detected. |
| Features | MEDIUM | Feature research based on established platforms (GitHub Projects, roadmap.sh, DevPost) but Code With Ahsan has unique mentor-led model. MVP definition clear, but competitive features may need validation. |
| Architecture | HIGH | Existing codebase analyzed directly. Integration points identified with specific function/file references. Reuse patterns proven in production (Discord, admin dashboard, Markdown rendering). |
| Pitfalls | HIGH | 10 critical pitfalls identified from 2026-current sources covering collaboration platforms, Discord management, content workflows, and integration challenges. Prevention strategies validated against best practices. |

**Overall confidence: HIGH**

The research provides actionable implementation guidance with minimal uncertainty. Stack recommendations are backed by package analysis and version compatibility checks. Architecture approach is grounded in existing codebase patterns. Pitfalls are documented with specific prevention strategies and phase-by-phase validation criteria.

### Gaps to Address

**Gap: Discord category scaling strategy**
- **Issue**: Monthly categories work for mentorships (gradual growth), but projects may launch in batches (10-20 at once). Unclear if "Projects - Active" category hits 50-channel limit.
- **Resolution**: Implement channel count monitoring in Phase 2. If active projects approach 40, implement secondary category strategy (Projects - Active A, Projects - Active B).

**Gap: Skill matching algorithm specificity**
- **Issue**: Research identifies skill mismatch as critical pitfall, but doesn't specify HOW to match skills (string matching on profile fields? structured skill taxonomy?).
- **Resolution**: Start simple in Phase 3 with manual skill level indicators (Beginner/Intermediate/Advanced) and warning UI. Defer algorithmic matching to v2.x when patterns emerge.

**Gap: Concurrent roadmap editing conflict resolution**
- **Issue**: Two mentors editing same roadmap simultaneously could overwrite changes. Research mentions version history but not conflict detection.
- **Resolution**: Phase 4 implements optimistic locking (check version number before save, reject if version changed). Show "This roadmap was updated while you were editing" error with diff view.

**Gap: Notification batching strategy**
- **Issue**: Research warns about notification fatigue but doesn't specify batching approach (daily digest? real-time for critical, batched for low-priority?).
- **Resolution**: Phase 6 implements simple priority system: Critical (approval needed) = immediate, Important (invited to project) = 15-min batch, Low (link shared) = daily digest. Measure open rates, adjust in v2.1.

## Sources

### Primary (HIGH confidence)

**Stack Research:**
- [@octokit/rest npm package](https://www.npmjs.com/package/@octokit/rest) — Latest version, installation, actively maintained (updated 3 months ago)
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) — Official repo, usage guide, security best practices
- [@uiw/react-md-editor npm](https://www.npmjs.com/package/@uiw/react-md-editor) — 4.6 KB gzipped, TypeScript support
- [Firebase Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices) — Official guidelines for data modeling
- [Choose a Data Structure - Firestore](https://firebase.google.com/docs/firestore/manage-data/structure-data) — Subcollections vs references

**Architecture Research:**
- [Integrate Firebase with Next.js | Firebase Codelabs](https://firebase.google.com/codelabs/firebase-nextjs) — Official integration guide
- [Firestore Data Model | Firebase](https://firebase.google.com/docs/firestore/data-model) — Document structure, collections, subcollections
- [Get Started with Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started) — Permission patterns
- [Versioned Documents with Firestore | GitHub Gist](https://gist.github.com/ydnar/8e4a51f7d1ce42e9bb4ae53ba049de4a) — Version history implementation pattern

### Secondary (MEDIUM confidence)

**Feature Research:**
- [roadmap.sh](https://roadmap.sh/) — Developer roadmap platform, community patterns
- [GitHub Projects](https://github.com/features/issues) — Project collaboration features
- [DeveloperWeek 2026 Hackathon](https://developerweek-2026-hackathon.devpost.com/) — Team formation patterns
- [Software development collaboration tools 2026](https://monday.com/blog/rnd/software-development-collaboration-tools/) — Industry comparison

**Pitfall Research:**
- [Discord's Channel Limit & Server Caps](https://www.metacrm.inc/blog/full-guide-to-discord-s-channel-limit-overall-server-caps) — 500-channel limit, usability degradation
- [Alert Fatigue](https://www.suprsend.com/post/alert-fatigue) — 52% drop in response rates with 10+ notifications/hour
- [Database Schema Design Mistakes](https://chartdb.io/blog/common-database-design-mistakes) — Migration pitfalls
- [Feature Creep: What Causes It](https://www.shopify.com/partners/blog/feature-creep) — Over 50% of projects experience scope creep

### Tertiary (LOW confidence)

- [hackathon.camp team matching](https://www.hackathon.camp/product/team-matching) — AI-powered skill matching (specific to hackathons, may not apply to continuous projects)
- [TidyCord - Discord Management](https://tidycord.de/) — Third-party tool features (not official Discord guidance)

---
*Research completed: 2026-02-02*
*Ready for roadmap: yes*
