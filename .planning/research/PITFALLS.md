# Pitfalls Research

**Domain:** Adding Project Collaboration & Learning Roadmap Features to Existing Mentorship Platform
**Researched:** 2026-02-02
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Data Model Mismatch - Adding New Entities to Existing Schema

**What goes wrong:**
When adding project and roadmap features to an existing Firestore schema designed for mentorship, teams often create new collections without considering how they integrate with the existing MentorshipProfile and MentorshipMatch types. This leads to denormalized data, orphaned records, and complex join operations that break down at scale.

**Why it happens:**
The existing data model conflates mentor-mentee relationships with user profiles. Projects introduce a third relationship type (project teams), and roadmaps introduce content ownership. Developers jump into creating new collections without mapping the full relationship graph, assuming they can refactor later. As one analysis notes: "use your own software early, match your data model to your mental model, and refactor before you accumulate data you'll need to migrate."

**How to avoid:**
- Map the full entity relationship diagram BEFORE creating Firestore collections
- Decide early: Are projects owned by mentors, or are they standalone entities that mentors propose?
- Decide early: Do roadmaps belong to individual mentors, or are they community resources?
- Test migrations on development data before ANY users create projects/roadmaps
- Document schema decisions in a SCHEMA.md file that explains the relationship model

**Warning signs:**
- API routes require 3+ Firestore queries to assemble a single project view
- "Find all projects for this mentor" requires scanning the entire projects collection
- Changes to MentorshipProfile don't automatically cascade to related projects
- Migration scripts fail on production data but pass on small test datasets

**Phase to address:**
Phase 4 (Data Model & Foundation) - This is the foundation decision that affects all subsequent phases. Get it wrong here and you'll be rewriting the entire system in Phase 8.

---

### Pitfall 2: Discord Channel Explosion - Unmanaged Channel Growth

**What goes wrong:**
With one Discord channel per active project plus one per active mentorship, channel count explodes. Discord has a 500 channel limit per server, but usability degrades far earlier. The existing monthly category system (e.g., "Mentorship Jan 2026") works for mentorships but doesn't scale when adding dozens of project channels simultaneously.

**Why it happens:**
The current discord.ts implementation uses monthly categories for mentorships, which assumes a steady trickle of new channels. Projects launch in batches, creating 10-20 channels at once. Teams don't plan for the combined total of mentorship + project channels. According to Discord management research, "poorly structured channels contribute to information silos where crucial information becomes buried and difficult to locate, as well as cognitive overload where users are overwhelmed by the sheer number of channels."

**How to avoid:**
- Implement separate category hierarchies: "Mentorship YYYY-MM" vs "Projects - Active" vs "Projects - Archived"
- Auto-archive project channels 30 days after completion (not just rename with "archived-" prefix)
- Set a hard limit on active projects (e.g., max 25 active projects at once)
- Create a Discord audit dashboard showing channel count by category with trend alerts
- Consider Discord threads for smaller projects instead of full channels

**Warning signs:**
- Total channel count approaches 200 (usability starts degrading)
- New users report "can't find my project channel"
- Category channel counts hit 45+ (near the 50-per-category Discord limit)
- Scrolling the channel list takes more than 2 seconds
- Old project channels remain active months after completion

**Phase to address:**
Phase 5 (Project Lifecycle Core) - When implementing createProjectChannel(), include the archival strategy from day one. Retrofitting archival to 100+ existing channels is painful.

---

### Pitfall 3: Permission Complexity Cascade - Role-Based Access for Multiple Workflows

**What goes wrong:**
The existing system has simple roles: mentor, mentee, admin. Adding projects introduces new permission dimensions: project creator, project member, project approver. Adding roadmaps introduces: roadmap author, roadmap reviewer, roadmap approver. These don't map cleanly to mentor/mentee roles. Teams create ad-hoc permission checks scattered across API routes, leading to inconsistent enforcement and security gaps.

**Why it happens:**
Each feature starts with simple permission logic ("only the mentor who created this project can edit it"), but edge cases accumulate: What if a mentor leaves? Can co-mentors edit projects? Can mentees propose projects? Teams patch permission checks into individual API routes instead of centralizing authorization logic. Research shows that "approval workflows can become complex, especially in large organizations with multiple levels of approval and various compliance requirements," and "manual approval processes can be time-consuming and prone to errors, leading to delays and potential security gaps."

**How to avoid:**
- Create a centralized permission system in a new `src/lib/permissions.ts` file
- Define permission rules declaratively, not scattered across API routes
- Use an action-based model: `canEditProject(userId, projectId)`, `canApproveRoadmap(userId, roadmapId)`
- Document all permission transitions in a state machine diagram
- Implement permission checks at the API route level AND the UI level (hide buttons users can't use)
- Write permission unit tests covering all role combinations

**Warning signs:**
- Permission checks duplicated across multiple API routes
- "Works in development but fails in production" permission bugs
- Users report seeing buttons they can't actually use
- API routes return 200 OK but silently fail to update (missing permission check)
- New feature requires changing permission logic in 5+ files

**Phase to address:**
Phase 4 (Data Model & Foundation) - Build the permission system before implementing any approval workflows. Retrofitting centralized permissions after scattering checks across 20 API routes is a multi-week refactor.

---

### Pitfall 4: Approval Workflow Bottlenecks - Admin-Only Review Gates

**What goes wrong:**
When all project proposals and roadmap submissions require admin approval, the admin becomes a bottleneck. Projects sit in "Proposed" state for days, killing momentum. Roadmap updates take weeks to go live, making the content stale. Community engagement drops as contributors wait indefinitely for approval.

**Why it happens:**
Teams copy the existing mentor approval workflow (admin-only) without considering volume differences. Mentor applications are ~5/week; project proposals could be 20+/week. Research confirms: "lengthy approval chains create work about work and introduce decision ambiguity," and "without a clear workflow, reviewers may miss deadlines or review outdated versions of content, which results in wasted time, duplicated work, and a higher risk of errors."

**How to avoid:**
- Implement tiered approval: Senior mentors can approve projects without admin review
- Set SLA targets: Proposals auto-approved after 48 hours if no admin action
- Create approval dashboard showing pending queue with age indicators
- Send notification to multiple approvers, not just one admin
- Consider auto-approval for trusted mentors (based on successful project history)
- Track "time to approval" metrics to identify bottlenecks

**Warning signs:**
- Average approval time exceeds 72 hours
- Pending queue grows faster than approval rate
- Contributors ask "when will my submission be reviewed?" in Discord
- Approved content is already outdated by the time it goes live
- Admin reports spending 2+ hours/day just reviewing submissions

**Phase to address:**
Phase 6 (Project Workflow) and Phase 8 (Roadmap Management) - Design the approval workflow with delegation from the start. Changing from "admin-only" to "delegated approvers" after launch requires schema changes and permission rewrites.

---

### Pitfall 5: Stale Content Accumulation - No Lifecycle Management

**What goes wrong:**
Projects start with enthusiasm but 40% are abandoned within 30 days. Roadmaps become outdated as technology changes. The platform fills with zombie content: projects in "Active" state with no activity for months, roadmaps referencing deprecated libraries, broken GitHub links. New users browse the project list and see mostly dead projects, killing trust.

**Why it happens:**
Teams focus on creation workflows (propose project, submit roadmap) but ignore maintenance and cleanup. There's no automated detection of inactivity, no nudges to update content, no expiration policies. Research emphasizes: "policy-driven lifecycle management ensures that data is retained according to its relevance rather than by default and reduces the risk created by carrying forgotten or outdated information," and "metadata such as creation date, last access date, ownership, and activity levels can immediately reveal security risks, duplication, orphaned content and stale data."

**How to avoid:**
- Track lastActivityAt timestamp on projects (updates when team posts links or GitHub activity)
- Auto-flag projects with no activity for 30 days as "At Risk"
- Send "still working on this?" notification at 45 days
- Auto-archive projects with no response after 60 days
- For roadmaps: Add "Last Updated" and "Reviewed On" timestamps visible on content
- Create a monthly "content health" report showing stale content stats
- Implement a "Report Outdated Content" button for community flagging

**Warning signs:**
- More than 30% of "Active" projects have no activity in 30+ days
- Roadmaps reference library versions from 2+ years ago
- Users report finding broken links in roadmap content
- Project completion rate below 40%
- No visibility into which content is actually being used

**Phase to address:**
Phase 5 (Project Lifecycle Core) for projects, Phase 8 (Roadmap Management) for roadmaps - Build activity tracking and auto-flagging from day one. Trying to retroactively determine "when was this last used?" for 100 existing projects is impossible without historical data.

---

### Pitfall 6: Integration Regression - New Features Breaking Existing Mentorship

**What goes wrong:**
Adding project and roadmap features causes subtle regressions in the existing mentorship system. Discord channel creation starts failing because the category limit is hit. Firestore queries slow down because new collections create index conflicts. API routes time out because batch fetching logic doesn't account for new relationship types.

**Why it happens:**
The codebase has shared infrastructure (discord.ts, Firestore batching in admin routes). New features add load to these systems without testing integration impact. Changes to shared types (MentorshipProfile) break existing API contracts. As integration research notes: "In distributed systems, adding new features to existing code can be really challenging; not only do developers have to understand the impact their changes might have on various other services and apps, but they often also risk introducing bugs and odd behaviour," and "software integrations can break for a number of reasons, including when an API response comes back in an unexpected format or an API can change in a backwards-incompatible way."

**How to avoid:**
- Write integration tests for existing mentorship workflows BEFORE starting new features
- Run these tests after every phase to catch regressions early
- Load test Discord channel creation with combined mentorship + project volume
- Monitor Firestore query performance and set alerts for slow queries
- Use feature flags to deploy new features gradually (10% rollout, then 50%, then 100%)
- Maintain backward compatibility for shared types - never change existing fields, only add new ones

**Warning signs:**
- Existing tests start failing in unrelated features
- Mentorship channel creation worked yesterday, fails today
- API route response times increase after deploying project features
- Firestore costs spike unexpectedly
- Users report "my mentorship dashboard is broken"

**Phase to address:**
ALL PHASES - This is a continuous concern. Set up integration test suite in Phase 4, run after each subsequent phase.

---

### Pitfall 7: Notification Fatigue - Over-Alerting on Every Action

**What goes wrong:**
Projects generate notifications for every action: proposal created, proposal approved, member joined, member invited, link shared, GitHub repo added, demo submitted, project completed. Roadmaps add more: draft created, changes submitted, review requested, approved, published. Users receive 10+ notifications per day. They disable notifications, then miss important updates like "your project was approved."

**Why it happens:**
Each feature developer adds notifications for their workflow without considering the cumulative burden. There's no central notification policy, no batching, no user preferences. Research reveals stark numbers: "users who receive more than 10 notifications per hour often stop engaging, with response rates dropping by 52%," "push notification open rates have dropped by 31% since 2020," and "between 61% and 78% of people, depending on generation, delete apps that send them too many unnecessary notifications."

**How to avoid:**
- Create a notification policy document BEFORE implementing any notifications
- Batch notifications: One daily digest instead of 10 individual alerts
- Let users configure notification preferences per feature (projects, roadmaps, mentorship)
- Prioritize notifications: Critical (approval needed), Important (invited to project), Low (link shared)
- Use in-app notification center instead of email/Discord DM for low-priority updates
- Track notification metrics: open rate, disable rate, response rate

**Warning signs:**
- Notification open rate below 20%
- Users complaining about "too many emails"
- Spike in users disabling Discord DMs from bot
- Low engagement with notifications despite high send volume
- Support requests asking "how do I turn off notifications?"

**Phase to address:**
Phase 6 (Project Workflow) - Design notification strategy before implementing first notification. Changing from "notify everything" to "batched digests" requires rewriting notification infrastructure.

---

### Pitfall 8: Team Formation Mismatch - No Skill Matching for Projects

**What goes wrong:**
Projects allow mentors to invite any mentee, or mentees to apply to any project, without considering skill level match. A beginner React learner joins an advanced AI agent project. A senior developer joins a "learn basics" project and dominates. Team dynamics break down, projects fail, participants have bad experiences.

**Why it happens:**
The existing mentorship system relies on manual mentor-mentee matching with human judgment. Projects need automated matching at scale. Teams assume "mentors will invite the right people" but mentors don't have visibility into mentee skill levels beyond basic profile info. Research confirms: "the most common error is assigning people based on organizational politics or availability rather than fit, with projects failing when team members lack necessary skills," and "skill mismatches reduce team productivity, lower morale, and affect overall project outcomes since low-skilled individuals need more supervision."

**How to avoid:**
- Add skill level indicators to projects: "Beginner Friendly", "Intermediate", "Advanced"
- Display mentee skill tags on project invite screen (pull from mentorship profile)
- Show warning when inviting mismatched skill levels: "This project is marked Advanced but this mentee's profile shows beginner skills in React"
- Let project creators set prerequisites: "Must have completed X roadmap"
- Track project completion rates by skill match quality - surface this data to improve matching

**Warning signs:**
- Project completion rate below 40%
- Team members report "this project wasn't what I expected"
- High dropout rate from projects (>30% of team members leave before completion)
- Project creators complain about team member skill gaps
- No data on why projects fail

**Phase to address:**
Phase 7 (Team Formation) - Build skill matching into the invite/apply workflow from the start. Adding skill checks after 50 projects already have mismatched teams doesn't help those teams.

---

### Pitfall 9: Scope Creep in Collaboration Tools - Building Slack/Notion Clones

**What goes wrong:**
Teams start adding "just one more feature" to projects: in-app chat (we have Discord), file storage (we have GitHub), task boards (we have project goals). The project feature becomes a full project management suite, taking 3x longer to build and never reaching the quality of dedicated tools.

**Why it happens:**
Feature requests accumulate: "Can we add comments on demos?" "Can we track tasks?" "Can we vote on project ideas?" Each seems reasonable in isolation. There's no clear boundary between "collaboration features" and "out of scope." Research shows: "feature creep is the gradual addition of unnecessary features, often at the expense of time, budget, and user experience," and "over half of all projects experience scope creep."

**How to avoid:**
- Define the boundary clearly in requirements: "Projects are for team coordination and showcase. Use Discord for communication, GitHub for code."
- Create an "Anti-Features" section in PROJECT.md listing what you WON'T build
- Review every feature request against the question: "Does a better tool already exist for this?"
- Set a feature freeze deadline for v2.0 - anything after that waits for v3.0
- Track development velocity - if Phase 6 takes 2x longer than planned, you've scope creeped

**Warning signs:**
- Phase estimates double or triple
- "Just one more small feature" requests every week
- Features being built that duplicate existing tools (Discord, GitHub)
- Development velocity slowing as complexity increases
- Core features incomplete but nice-to-have features being added

**Phase to address:**
Phase 1 (Planning) - Lock the scope boundary in requirements. Enforce ruthlessly throughout development.

---

### Pitfall 10: Markdown Content Security - Unsanitized User Input

**What goes wrong:**
Roadmaps allow mentors to write Markdown content. Without sanitization, malicious mentors inject XSS attacks, phishing links, or script tags. Legitimate mentors accidentally break rendering with malformed Markdown. The platform serves vulnerable content to all users browsing roadmaps.

**Why it happens:**
Teams trust mentors because they're "approved users" and skip input sanitization. Markdown parsers are complex - many have XSS vulnerabilities in edge cases. The existing system doesn't handle user-generated content beyond text fields. Research shows: "platforms scaling AI content production beyond 100 pieces per month struggle with quality degradation stemming from varying outputs, inconsistent strategies, and insufficient quality checkpoints."

**How to avoid:**
- Use a hardened Markdown parser with HTML sanitization (e.g., remark + rehype-sanitize)
- Never render raw HTML from Markdown content
- Implement a preview step in roadmap editing showing exactly what will be rendered
- Add automated checks for suspicious patterns: `<script>`, `javascript:`, `data:` URLs
- Store both raw Markdown and sanitized HTML - serve HTML, allow editing raw Markdown
- Run security linter on all Markdown content during approval workflow

**Warning signs:**
- Roadmap content contains `<script>` tags in database
- Preview rendering different from final rendering
- Users report "suspicious links" in roadmaps
- No sanitization library in package.json
- Markdown content stored without validation

**Phase to address:**
Phase 8 (Roadmap Management) - Implement sanitization BEFORE allowing first roadmap submission. Fixing XSS vulnerabilities after malicious content is already in production requires emergency response.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Reuse existing MentorshipProfile type for project ownership | Faster development, no new schema | Can't distinguish project permissions from mentorship permissions, breaks when non-mentors need projects | Never - create ProjectMember type from day one |
| Admin-only approval for all workflows | Simple permission model, single review point | Admin bottleneck, slow approval times, doesn't scale | Only for MVP with <10 projects/week |
| No activity tracking on projects | Simpler data model, fewer Firestore writes | Can't detect abandoned projects, no data for health metrics | Never - timestamps are cheap, historical data is impossible to recreate |
| Store Discord channel IDs but not category IDs | Minimal schema fields | Can't analyze channel distribution, harder to debug category limits | Never - storing category ID costs nothing, missing it complicates debugging |
| Skip markdown sanitization in MVP | Ship faster, trust approved mentors | XSS vulnerabilities, security incidents, emergency patches | Never - sanitization libraries take 30 minutes to add, security breaches take weeks to fix |
| Use email notifications instead of building notification center | Faster than building UI | No central notification log, can't batch, users disable emails | Acceptable for MVP, but plan migration to notification center in v2.1 |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Discord (channels) | Create all project channels in same category as mentorship channels | Use separate category hierarchy - "Projects - Active", "Projects - Archived" to isolate channel limits |
| Discord (permissions) | Assume all project members have Discord accounts | Check for null discordUsername before creating channels, show "Add Discord username to join project channel" UI fallback |
| Discord (rate limits) | Batch create 20 project channels at once | Use existing fetchWithRateLimit utility, add 100ms delay between channel creations in loops |
| Firestore (queries) | Query projects collection without indexes | Add composite indexes for common queries: (status, createdAt), (mentorId, status), (teamMembers, status) |
| Firestore (batching) | Extend existing 30-item batch logic to projects | Projects + mentorships can exceed limits - implement separate batching for each entity type |
| GitHub (repo links) | Store raw GitHub URLs without validation | Validate URL format, extract owner/repo, check repo exists via GitHub API (optional but recommended) |
| Markdown rendering | Use first Markdown library found on npm | Use remark + rehype ecosystem - battle-tested, extensible, security-focused |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all projects in one query | Browse projects page takes 5+ seconds | Implement pagination (10 projects per page), add indexes on sort fields | >100 active projects |
| Denormalizing team member names into project document | Project documents exceed 1MB Firestore limit | Store only team member IDs, fetch names separately (already done for mentorship profiles) | >50 team members per project |
| Re-fetching project details on every Discord channel message | Discord message send latency 2+ seconds | Cache project metadata in memory with 5-minute TTL | >200 active projects |
| Scanning all roadmaps to find "latest updated" | Roadmap list page timeout after 30 seconds | Maintain a "recently updated" index, limit query to last 90 days | >50 roadmaps |
| Loading full Markdown content for roadmap list | Roadmap browse page 10MB+ transfer | Store summary/excerpt separately, load full content only on detail page | >20 roadmaps with 5000+ word content each |
| Batch fetching all project team members on project list | Firestore reads spike to 1000+/page load | Fetch team count only for list view, fetch full member details only on project detail page | >30 projects with 5+ team members each |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting mentor-submitted Markdown without sanitization | XSS attacks, phishing links embedded in roadmaps | Use remark-rehype with rehype-sanitize, whitelist allowed HTML tags |
| Allowing any user to approve projects | Malicious users approve spam projects, quality control lost | Implement role-based approval - only admins and senior mentors can approve |
| Exposing Discord channel IDs in public API responses | Attackers enumerate channel IDs, attempt unauthorized access | Include channel IDs only in authenticated endpoints, require userId match for access |
| No rate limiting on project creation | User creates 100+ spam projects in minutes | Implement rate limit: 3 projects per mentor per week, requires admin approval for more |
| Storing raw GitHub personal access tokens for repo integration | Token leakage compromises user GitHub accounts | Use OAuth flow with minimal scopes (public repo read only), never store tokens in Firestore |
| Allowing HTML in project descriptions | Script injection, defacement | Sanitize all user input - use plain text or Markdown-only for descriptions |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No onboarding for project creation | Mentors create low-quality proposals, high rejection rate | Add project template with examples, inline help text, preview step before submission |
| Hiding pending projects from creator | Mentor submits project, sees nothing, thinks it failed | Show pending projects with "Awaiting Approval" badge, estimated approval time |
| No feedback on why project was declined | Mentor has no idea what went wrong, won't try again | Require decline reason (dropdown + text), show in project history |
| Roadmap authoring uses raw Markdown textarea | Non-technical mentors intimidated, high abandonment | Add Markdown toolbar (bold, italic, links, code blocks), live preview panel |
| Project team member roles not visible | Team members don't know who leads the project | Show role badges: "Creator", "Co-Lead", "Member" on team list |
| No indication of project activity level | Users can't tell if project is active or abandoned | Show "Last Activity" timestamp, activity indicator (Active, At Risk, Stale) |
| Discord channel link appears only after approval | Mentor approved, refreshes page 5 times looking for channel | Show real-time notification "Your project was approved! Discord channel created" with link |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Project creation:** Often missing duplicate detection - verify two mentors can't create identically named projects
- [ ] **Discord channel creation:** Often missing category full handling - verify graceful fallback when category hits 50-channel limit
- [ ] **Approval workflow:** Often missing "already approved" check - verify can't approve same project twice
- [ ] **Roadmap editing:** Often missing concurrent edit detection - verify two admins editing same roadmap don't overwrite each other
- [ ] **Project completion:** Often missing team consensus - verify all team members confirm completion, not just creator
- [ ] **Team invitations:** Often missing duplicate invite prevention - verify can't invite same user twice to same project
- [ ] **Content cleanup:** Often missing cascade deletion - verify archiving project also archives Discord channel
- [ ] **Permission checks:** Often missing ownership transfer - verify what happens when project creator's mentor profile is disabled
- [ ] **Notification preferences:** Often missing unsubscribe functionality - verify users can opt out without disabling account
- [ ] **Activity tracking:** Often missing bulk update handling - verify lastActivityAt updates correctly when batch operations occur

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Data model mismatch discovered after 50 projects exist | HIGH | 1. Design new schema with proper relationships 2. Write migration script with rollback 3. Test on staging with production snapshot 4. Migrate during low-traffic window 5. Monitor for issues 48 hours |
| Discord channel limit reached (500 channels) | MEDIUM | 1. Audit all channels, identify unused ones 2. Archive channels for completed projects >90 days old 3. Create second Discord server for overflow (Projects Server) 4. Update bot to create channels on appropriate server |
| Permission system scattered across 20 files | HIGH | 1. Audit all permission checks, document current behavior 2. Build centralized permissions.ts with tests 3. Replace one API route at a time 4. Run regression tests after each replacement 5. Deploy incrementally |
| Notification fatigue causing 60% disable rate | MEDIUM | 1. Audit all notification triggers, categorize by priority 2. Implement batching for low-priority notifications 3. Add notification preference UI 4. Re-enable for users who disabled (with opt-in prompt) |
| 100+ stale projects cluttering browse page | LOW | 1. Create activity detection script 2. Flag projects with no activity >60 days 3. Email creators asking for update 4. Auto-archive after 90 days no response 5. Add "Show Archived" filter |
| XSS vulnerability in roadmap content | CRITICAL | 1. Immediately disable roadmap feature 2. Add rehype-sanitize to Markdown pipeline 3. Run sanitization script on all existing roadmaps 4. Security audit all sanitized content 5. Re-enable with announcement |
| Admin approval bottleneck (200+ pending projects) | MEDIUM | 1. Identify trusted senior mentors 2. Grant approval permissions 3. Batch approve low-risk projects 4. Implement auto-approval for subsequent projects from successful creators |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Data Model Mismatch | Phase 4 (Data Model & Foundation) | Run queries for "all projects by mentor" and "all team members for project" - must complete in <500ms |
| Discord Channel Explosion | Phase 5 (Project Lifecycle Core) | Create 10 test projects, verify category batching works, check channel count doesn't exceed 45/category |
| Permission Complexity Cascade | Phase 4 (Data Model & Foundation) | Write unit tests for all permission combinations - 30+ test cases covering all roles and actions |
| Approval Workflow Bottlenecks | Phase 6 (Project Workflow) | Measure time-to-approval for test projects, verify SLA <48 hours, test delegated approval |
| Stale Content Accumulation | Phase 5 (Project Lifecycle) & Phase 8 (Roadmaps) | Create test project, wait 60 days (time-travel in tests), verify auto-flagging triggers |
| Integration Regression | ALL PHASES (continuous) | Run full mentorship test suite after each phase - all existing features must pass |
| Notification Fatigue | Phase 6 (Project Workflow) | Track notification count per user per day - must not exceed 5 without explicit user preference |
| Team Formation Mismatch | Phase 7 (Team Formation) | Test skill mismatch warning - verify UI shows warning when inviting beginner to advanced project |
| Scope Creep | Phase 1 (Planning) | Review requirements every 2 weeks - any new features must be explicitly approved and scoped |
| Markdown Content Security | Phase 8 (Roadmap Management) | Run security test suite with malicious Markdown samples - all must be sanitized safely |

## Sources

**Collaboration Features:**
- [Team Collaboration Mistakes to Avoid](https://www.atlassian.com/work-management/project-collaboration/collaborative-culture/team-collaboration)
- [Project Collaboration: Top Tips](https://monday.com/blog/project-management/project-collaboration/)
- [Confluence Alternative Platforms 2026](https://monday.com/blog/project-management/confluence-alternative/)

**Discord Management:**
- [How to Organize Discord Channels](https://www.clrn.org/how-to-organize-discord-channels/)
- [Ultimate Guide to Discord Community Management](https://www.commonroom.io/resources/ultimate-guide-to-discord-community-management/)
- [Discord's Channel Limit & Server Caps](https://www.metacrm.inc/blog/full-guide-to-discord-s-channel-limit-overall-server-caps)

**Content Workflow:**
- [5 Outdated Content Workflow Habits 2026](https://www.podcastvideos.com/articles/outdated-content-workflows-2026/)
- [Content Workflow Guide 2026](https://planable.io/blog/content-workflow/)
- [Content Approvals Simplified](https://www.cloudcampaign.com/smm-tips/content-approval)

**Lifecycle Management:**
- [Project Lifecycle Phases 2026](https://monday.com/blog/project-management/project-lifecycle-getting-chaos-control/)
- [Unstructured Data Management](https://www.cio.com/article/4117484/why-cios-need-a-new-approach-to-unstructured-data-management.html)

**Permission & Approval:**
- [Approval Process Guide 2026](https://kissflow.com/workflow/approval-process/)
- [Role-Based Access Control Best Practices 2026](https://www.techprescient.com/blogs/role-based-access-control-best-practices/)
- [RBAC System Design](https://www.nocobase.com/en/blog/how-to-design-rbac-role-based-access-control-system)

**Integration & Compatibility:**
- [Software Integration Challenges 2026](https://www.merge.dev/blog/software-integration-challenges)
- [Beyond API Compatibility: Breaking Changes](https://www.infoq.com/articles/breaking-changes-are-broken-semver/)
- [Ensuring Backward Compatibility](https://medium.com/ula-engineering/ensuring-backwards-compatibility-in-your-applications-5107591e9968)

**Scope Management:**
- [Feature Creep: What Causes It](https://www.shopify.com/partners/blog/feature-creep)
- [Understanding Scope Creep](https://bigpicture.one/blog/scope-creep/)
- [Impact of Scope Creep](https://www.dartai.com/blog/how-scope-creep-affect-project-success)

**Database Design:**
- [Database Schema Design Mistake 2026](https://astgl.com/p/database-schema-design-mistake-that)
- [10 Common Database Design Mistakes](https://chartdb.io/blog/common-database-design-mistakes)
- [Common DB Schema Change Mistakes](https://postgres.ai/blog/20220525-common-db-schema-change-mistakes)

**Notification Management:**
- [App Push Notification Best Practices 2026](https://appbot.co/blog/app-push-notifications-2026-best-practices/)
- [Understanding Alert Fatigue](https://www.suprsend.com/post/alert-fatigue)
- [Instagram Notification Ranking Framework](https://www.infoq.com/news/2025/09/instagram-notification-ranking/)

**Team Formation:**
- [Project Team Framework 2026](https://monday.com/blog/project-management/project-team/)
- [Avoiding Skills Mismatch](https://www.testgorilla.com/blog/avoiding-skills-mismatch/)
- [What is Skills Mismatch](https://www.wecreateproblems.com/blog/skills-mismatch)

**Quality Control:**
- [AI Content Quality Control 2026](https://koanthic.com/en/ai-content-quality-control-complete-guide-for-2026-2/)
- [Content Review and Approval Best Practices](https://zipboard.co/blog/collaboration/content-review-and-approval-best-practices-tools-automation/)
- [Quality Control in Content Automation](https://aicontentfy.com/en/blog/quality-control-in-content-automation-best-practices-for-error-free-content)

---
*Pitfalls research for: Adding Project Collaboration & Learning Roadmap Features to Existing Mentorship Platform*
*Researched: 2026-02-02*
