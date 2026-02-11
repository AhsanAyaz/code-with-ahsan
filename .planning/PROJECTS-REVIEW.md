# Projects Feature Review: Agent Team Report

**Date:** 2026-02-09
**Branch:** `feature/v2.0-collaboration-roadmaps`
**Reviewers:** UX Expert, Software Architect, Product Owner, Marketing Manager

---

## Critical Issues Summary

### Broken Features
1. **Invitation API mismatch** -- Frontend sends `emailOrDiscord`, API expects `email`/`discordUsername` as separate fields. Invitations are non-functional.
   - Files: `src/app/projects/[id]/page.tsx:189`, `src/app/api/projects/[id]/invitations/route.ts:13`
2. **Skill mismatch always undefined** -- `userSkillLevel` hardcoded to `undefined` on line 526 of detail page. The entire `skillMatch.ts` system never fires real warnings.

### Security Vulnerabilities
3. **Client-trusted UIDs** -- All API routes accept `creatorId`/`userId`/`requestorId` from request body without verifying against Firebase ID token. No `auth().verifyIdToken()` call anywhere.
4. **No admin verification** -- Approve/decline endpoints accept `adminId` from body without server-side admin check. Comment says "admin auth handled by frontend."

### Unenforced Business Rules
5. **`maxTeamSize` never checked** -- Field stored and displayed but never compared to member count during approval/acceptance. Projects can have unlimited members.
6. **`difficulty` not validated** -- API accepts any string despite TypeScript union type.
7. **`techStack` not normalized** -- "React", "react", "ReactJS" are all different filter values.

### Data Loss
8. **Declined projects permanently deleted** -- `projectRef.delete()` on decline. No audit trail, no resubmission possible.

### Missing Features (Consensus P0)
9. **No nav link to Projects** -- Discovery page unreachable from site navigation.
10. **No "My Projects" view** -- Users can't see projects they've joined.
11. **Members can't leave projects** -- No self-removal endpoint.
12. **Decline notification is a TODO** -- `sendDirectMessage` exists but isn't called.
13. **No email/in-app notifications** -- Entire application lifecycle is silent.

---

## Feature Completeness Grades (Product Owner)

| Area | Grade | Key Gap |
|------|-------|---------|
| Project Creation | B+ | No templates, no editing after creation |
| Admin Approval | B- | Decline deletes, DM is TODO |
| Application System | A- | No capacity enforcement |
| Invitation System | A- | API mismatch bug (broken) |
| Team Management | C+ | No leave, no transfer, no capacity |
| Discovery Page | B+ | No sort, no pagination, no "open spots" |
| Discord Integration | A | Excellent non-blocking pattern |
| Permissions System | A | Clean, centralized, tested |

---

## Unified Priority Matrix

### Tier 1: Ship Blockers (Before v2.0 Launch)

| # | Item | Agent | Effort |
|---|------|-------|--------|
| 1 | Fix invitation API mismatch (`emailOrDiscord` vs `email`/`discordUsername`) | UX/Arch | 1 hour |
| 2 | Implement server-side token verification (`verifyIdToken`) in all API routes | Architect | 4-6 hours |
| 3 | Enforce `maxTeamSize` in approval/acceptance + add `memberCount` field | Architect | 2-3 hours |
| 4 | Add "Projects" to site navigation (`headerNavLinks.js`) | Marketing | 5 min |
| 5 | Wire up decline notification DM (replace TODO with `sendDirectMessage`) | Product | 30 min |
| 6 | Soft-delete declined projects (change `delete()` to `update({status: "declined"})`) | Product | 1 hour |
| 7 | Fix skill mismatch prop (pass actual user skill level, not `undefined`) | UX | 30 min |
| 8 | Member self-removal ("leave project") endpoint | UX/Product | 2-3 hours |
| 9 | "My Projects" view (API filter + UI) | UX/Product | 4-6 hours |
| 10 | Make discovery/detail pages publicly readable (remove auth for viewing) | Marketing | 2-4 hours |
| 11 | Replace all `alert()`/`confirm()` with DaisyUI modals/toasts (8+ instances) | UX | 2-3 hours |
| 12 | Add `generateMetadata` for Open Graph tags on project pages | Marketing | 1-2 hours |

### Tier 2: Post-Launch Essentials (Weeks 1-4)

| # | Item | Agent |
|---|------|-------|
| 13 | Stale project detection + auto-archival (Cloud Function, 30/45/60 day policy) | Architect/Product |
| 14 | Ownership transfer mechanism | Product |
| 15 | Transactional email notifications (application lifecycle) | Marketing |
| 16 | API pagination (cursor-based for Firestore) | Architect |
| 17 | "Open spots" indicator on ProjectCard (X/Y members) | UX |
| 18 | Project edit endpoint (PATCH) -- creators can't fix typos | Product |
| 19 | Admin queue pagination + notifications for new submissions | Product |
| 20 | Validate `difficulty` against enum values at API level | Architect |
| 21 | Add Zod schemas for all request body validation | Architect |
| 22 | Display pending invitations list to creator (data fetched but never rendered) | UX |

### Tier 3: Growth Features (Weeks 5-12)

| # | Item | Agent |
|---|------|-------|
| 23 | Project showcase for completed projects (Phase 7) | Product/Marketing |
| 24 | Mentee project proposals (with mentor sponsor model) | Product |
| 25 | Community health metrics dashboard | Product |
| 26 | Trusted mentor auto-approval | Product |
| 27 | Weekly project digest email | Marketing |
| 28 | Move Discord operations to background queue (Cloud Functions) | Architect |
| 29 | Server-side search (Algolia/Typesense) | Architect |
| 30 | Project rating/feedback system after completion | Product |
| 31 | Gamification badges ("First Project", "Team Player", etc.) | Product |
| 32 | Replace `/projects` placeholder page with completed project showcase | Marketing |

### Tier 4: Engagement & Scale (Weeks 12+)

| # | Item | Agent |
|---|------|-------|
| 33 | `mentorship_profiles` -> `profiles` rename (dedicated migration) | All |
| 34 | `MentorshipContext` -> `AppContext` rename | Architect |
| 35 | Real-time updates via Firestore `onSnapshot` | Architect |
| 36 | Portfolio section on member profiles | Marketing |
| 37 | Structured data (JSON-LD) on project pages | Marketing |
| 38 | Course-to-project cross-links | Marketing |
| 39 | Denormalization refresh job (fan out profile changes) | Architect |
| 40 | Invitation TTL (auto-expire after 14 days) | Architect |

---

## Stale Project Policy (Product Owner + Architect Consensus)

| Day | Action |
|-----|--------|
| 30 | Warning DM to creator via Discord |
| 45 | Second warning + notice in project Discord channel |
| 60 | Auto-archive project; Discord channel read-only |
| 90 | Offer ownership transfer; if no takers, archive |

Implementation: Cloud Function on daily Cloud Scheduler cron.

---

## Team Management Rules (Product Owner)

| Role | Max as Creator | Max as Member | Total |
|------|---------------|---------------|-------|
| Mentor | 3 | 2 | 5 |
| Mentee | 0 | 3 | 3 |

- Members can leave at any time (creator cannot leave without transferring ownership)
- Ownership transfer requires new owner to be a mentor-member
- Creator departure triggers 14-day grace period for ownership transfer

---

## `mentorship_profiles` -> `profiles` Rename

**Consensus: Yes, rename. But not now.**

- 23 source files + 25 planning/script files affected
- Requires Firestore data migration (no native rename)
- Zero user-facing value, high regression risk
- Do as dedicated migration PR after v2.0 ships

Migration strategy:
1. Dual-write to both collections
2. Offline data migration script
3. Switch reads to `profiles`
4. Remove old collection references

Also rename: `MentorshipContext` -> `AppContext`, `MentorshipProvider` -> `AppProvider`

---

## Brand & Navigation (Marketing Manager)

- Add "Projects" to header nav or Community dropdown
- Update `siteMetadata.description` to reflect mentorship + collaboration
- Update homepage Features grid to include Mentorship and Projects
- Replace placeholder `/projects` page with completed project showcase
- Enable public reads for project pages (SEO + organic growth)
- Unique value proposition: "The only developer community where you learn from expert mentors and build real projects together"

---

## Community Health Metrics to Track (Product Owner)

| Metric | Target |
|--------|--------|
| Project Completion Rate | > 60% |
| Time to First Member | < 7 days |
| Application Approval Rate | 40-70% |
| Average Project Duration | 4-8 weeks |
| Stale Project Rate | < 15% |
| Creator Retention (2+ projects) | > 30% |
| Mentee Cross-Project Participation | > 20% |

---

*Generated by 4-agent review team on 2026-02-09. Full individual reports available in task output logs.*
