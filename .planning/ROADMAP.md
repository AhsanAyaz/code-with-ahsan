# Roadmap: Code With Ahsan

## Overview

Code With Ahsan is a comprehensive community platform enabling mentorship, project collaboration, and guided learning.

## Milestones

- [x] **v1.0 Mentorship Admin Dashboard** — Phases 1-3 (shipped 2026-01-23)
- [x] **v2.0 Community Collaboration & Learning** — Phases 4-14 (shipped 2026-03-10)
- [x] **v3.0 Brand Identity & Site Restructure** — Phases 15-18 (shipped 2026-03-10)
- [x] **v4.0 Admin Course Creator with YouTube Integration** — Phase 1 (shipped 2026-03-11)
- [x] **v5.0 CWA Promptathon 2026** — Phase 1 (shipped 2026-04-21)
- [ ] **v6.0 Student Ambassador Program** — Phases 1-5 (in progress, started 2026-04-21)

## Phases

<details>
<summary>v1.0 Mentorship Admin Dashboard (Phases 1-3) — SHIPPED 2026-01-23</summary>

- [x] Phase 1: Mentorship Mapping View (2/2 plans) — completed 2026-01-23
- [x] Phase 2: Discord & Status Management (2/2 plans) — completed 2026-01-23
- [x] Phase 3: Declined Mentor Management (1/1 plan) — completed 2026-01-23

</details>

<details>
<summary>v2.0 Community Collaboration & Learning (Phases 4-14) — SHIPPED 2026-03-10</summary>

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

<details>
<summary>v3.0 Brand Identity & Site Restructure (Phases 15-18) — SHIPPED 2026-03-10</summary>

- [x] Phase 15: Stats API & Navigation (2/2 plans) — completed 2026-03-10
- [x] Phase 16: Homepage Redesign (2/2 plans) — completed 2026-03-10
- [x] Phase 17: Portfolio Page (2/2 plans) — completed 2026-03-10
- [x] Phase 18: Mentorship & Community Pages (2/2 plans) — completed 2026-03-10

</details>

<details>
<summary>v4.0 Admin Course Creator with YouTube Integration (Phase 1) — SHIPPED 2026-03-11</summary>

- [x] Phase 1: Admin course creator with YouTube integration (2/2 plans) — completed 2026-03-11

</details>

<details>
<summary>v5.0 CWA Promptathon 2026 (Phase 1) — SHIPPED 2026-04-21</summary>

- [x] Phase 1: Promptathon live host panel with presenter slides, admin winner management, and permanent winners display (3/3 plans) — completed 2026-03-28

</details>

### v6.0 Student Ambassador Program (Phases 1-5) — IN PROGRESS

- [ ] **Phase 1: Foundation — Roles Array Migration** — Migrate `mentorship_profiles.role: string` → `roles: string[]` across app, rules, claims, and tests via the staged 5-deploy sequence without regressing any v1.0–v5.0 mentor/mentee/admin capability
- [ ] **Phase 2: Application Subsystem** — `/ambassadors/apply` intake, admin review panel, cohort management, two-stage Discord-accept, and the three applicant emails (confirmation, acceptance, decline)
- [ ] **Phase 3: Public Presentation** — Public `/ambassadors` cohort page, ambassador / alumni-ambassador profile badge, and optional post-acceptance public cohort-presentation video (read-only surface over the roles array)
- [ ] **Phase 4: Activity Subsystem** — Referral attribution (click → cookie → signup), ambassador-owned event tracker, monthly self-report with per-ambassador-timezone reminder cron, human-in-the-loop strike flagging, and weekly Discord-role reconciliation
- [ ] **Phase 5: Dashboard, Leaderboard, Offboarding & Alumni** — Gated `/ambassadors/dashboard` with hourly-snapshot leaderboard (4-week grace), onboarding checklist, Ambassador-of-the-Month, admin-confirmed offboarding flow with Discord role removal + email, and the alumni-flag term-end transition

## Phase Details

### Phase 1: Foundation — Roles Array Migration
**Goal**: Every user of the platform (existing mentors, mentees, admins, and unauthenticated visitors) experiences the roles-array migration as a no-op — all v1.0–v5.0 capabilities continue to work identically — while the data layer, security rules, custom claims, tests, and call sites are now ready for an additional `"ambassador"` role to coexist with `"mentor"` / `"mentee"` / `"admin"`.
**Depends on**: Nothing (first v6.0 phase; archives v5.0-phases as a prerequisite hygiene step)
**Requirements**: ROLE-01, ROLE-02, ROLE-03, ROLE-04, ROLE-05, ROLE-06, ROLE-07, ROLE-08
**Success Criteria** (what must be TRUE):
  1. An existing mentor with `role: "mentor"` in their profile doc can still sign in, open the admin dashboard, approve / decline applications, edit time slots, and appear in every mentor query — with no visible change and no permission-denied errors during or after the 5-deploy rollout.
  2. An existing mentee with an active booking still sees their booking, can still book new slots, and every mentee-targeted query (`array-contains "mentee"`) returns exactly the same set of mentees as the pre-migration `role == "mentee"` query returned — verified by pre/post document counts matching.
  3. A holder of a pre-migration ID token (issued up to 1 hour before the rules flip) continues to pass rule evaluation throughout the dual-claim window because rules accept either `token.role == "mentor"` or `"mentor" in token.roles`.
  4. `/ambassadors/*` routes are fully deployed but return 404 when `FEATURE_AMBASSADOR_PROGRAM` is disabled, so half-built ambassador features cannot be reached by real users during foundation rollout.
  5. Every one of the 95 permission test fixtures uses the new `roles: [...]` shape, the TypeScript build is green, and coverage reports show the new `roles.includes(...)` code paths are exercised (no fixture silently passing on a legacy fallback).

**Plans**: 10 plans
- [x] 01-types-zod-role-schema-PLAN.md — Role union + RoleSchema Zod enum + MentorshipProfile.roles field (Deploy #1 / Wave 1 / ROLE-01)
- [x] 02-feature-flag-helper-PLAN.md — `isAmbassadorProgramEnabled()`, `/ambassadors/*` 404 gates, nav filtering (Deploy #1 / Wave 1 / ROLE-08)
- [ ] 03-permission-helpers-PLAN.md — hasRole/hasAnyRole/hasAllRoles + claim-side mirrors with dual-read; refactor isAcceptedMentor (Deploy #1 / Wave 2 / ROLE-02)
- [ ] 04-migration-scripts-PLAN.md — `migrate-roles-to-array.ts` + `sync-custom-claims.ts` (Deploys #2 + #2.5 / Wave 2 / ROLE-03 + ROLE-05)
- [ ] 05-firestore-rules-dual-read-PLAN.md — `firestore.rules isAcceptedMentor()` dual-claim read (Deploy #3 / Wave 3 / ROLE-04)
- [ ] 06-role-mutation-helper-PLAN.md — `syncRoleClaim` stub + wire into profile POST + extend `verifyAuth` (Deploy #4 / Wave 3 / ROLE-05 + ROLE-07)
- [ ] 07-call-site-migration-PLAN.md — Migrate 29 files from `profile.role === "x"` to `hasRole(profile, "x")` (Deploy #4 / Wave 3 / ROLE-07)
- [ ] 08-test-fixture-migration-PLAN.md — Migrate 95 fixtures to dual-shape + new coverage for the six helpers (Deploy #4 / Wave 4 / ROLE-06)
- [ ] 09-client-claim-refresh-PLAN.md — `useClaimRefresh` hook + `MentorshipContext` refresh on `_claimSync.refreshed` (Deploy #4 / Wave 4 / ROLE-05)
- [ ] 10-final-cleanup-deploy5-PLAN.md — Manual gate + drop MentorshipRole + array-only rules + `drop-legacy-role-field.ts` (Deploy #5 / Wave 5 / ROLE-04 final)

### Phase 2: Application Subsystem
**Goal**: A prospective student can submit a complete ambassador application (identity + video or link + academic verification) through a public form, an admin can triage the queue end-to-end (list → detail → accept / decline with notes), and acceptance atomically seeds a real ambassador on the platform — Firestore role + ambassador subdoc + cohort attachment commit first, then Discord role assignment is attempted with an admin-visible retry path if Discord is unreachable.
**Depends on**: Phase 1 (Foundation must be live in production before any write path can append `"ambassador"` into `roles[]`; flipping `FEATURE_AMBASSADOR_PROGRAM` on is the gate for this phase)
**Requirements**: COHORT-01, COHORT-02, COHORT-03, COHORT-04, APPLY-01, APPLY-02, APPLY-03, APPLY-04, APPLY-05, APPLY-06, APPLY-07, APPLY-08, REVIEW-01, REVIEW-02, REVIEW-03, REVIEW-04, REVIEW-05, DISC-01, DISC-02, DISC-03, EMAIL-01, EMAIL-02, EMAIL-03
**Success Criteria** (what must be TRUE):
  1. An admin can create a cohort with name / start / end / maxSize / status from the admin panel, open or close its application window, view all accepted ambassadors attached to it, and the system refuses a new acceptance when `maxSize` is reached.
  2. A signed-in prospective ambassador (account ≥30 days old) can complete `/ambassadors/apply` in one sitting — including video submission as either a direct Firebase Storage upload or an unlisted Loom / YouTube link — and see their application status (`submitted | under_review | accepted | declined`) on their own profile afterwards, confirmed via an automatic submission email.
  3. An applicant with an unrecognized academic TLD is not rejected — the form surfaces the student-ID photo upload as a first-class fallback path and an admin reviewer can verify it manually.
  4. An admin opens an application detail page, streams the video via a 1-hour signed URL (never a persistent `getDownloadURL`), and a Discord banner appears if the applicant's handle cannot be resolved to a `discordMemberId` — giving a retry or manual-link action before acceptance.
  5. On accept, the Firestore commit (`roles += "ambassador"` + ambassador subdoc + cohort attach) succeeds independently of the Discord call, and if the Discord role assignment fails the admin panel shows a retry button — clicking it is idempotent (never double-assigns) and surfaces success.
  6. Applicants receive the right transactional email at the right moment — confirmation on submit, acceptance email with onboarding steps on accept, decline email with kind-but-firm messaging and reapply encouragement on decline — and declined-application videos are auto-deleted 30 days after the decline decision.

**Plans**: TBD

### Phase 3: Public Presentation
**Goal**: The world can see the active ambassador cohort on `codewithahsan.dev/ambassadors` with only the fields each ambassador has chosen to share publicly, and any user's profile page correctly displays an Ambassador (or Alumni Ambassador) badge so status is visible wherever an ambassador shows up on the platform.
**Depends on**: Phase 2 (needs real accepted ambassadors in `mentorship_profiles` with `roles` containing `"ambassador"` to render anything meaningful; can run in parallel with Phase 4)
**Requirements**: PRESENT-01, PRESENT-02, PRESENT-03, PRESENT-04
**Success Criteria** (what must be TRUE):
  1. A visitor hitting `/ambassadors` (unauthenticated) sees a card for every active-cohort ambassador with their photo, display name, university, one-line bio, and social links — and crucially nothing else (no email, no Discord handle, no private application video).
  2. Any profile page (mentor profile, user profile) renders an "Ambassador" badge when the profile's `roles` array contains `"ambassador"`, and renders an "Alumni Ambassador" badge when it contains `"alumni-ambassador"` — verified by visiting a seeded ambassador's profile post-acceptance.
  3. An accepted ambassador can (optionally) upload a separate public `cohortPresentationVideo` from their profile and it renders on their `/ambassadors` card — distinct from their private application video, which never becomes publicly accessible.
  4. Offboarded or not-yet-accepted users never appear on `/ambassadors` — the page is strictly gated to currently-active members of the current cohort, verified by a `roles array-contains "ambassador"` + `ambassador.active == true` query.

**Plans**: TBD
**UI hint**: yes

### Phase 4: Activity Subsystem
**Goal**: An accepted ambassador can drive measurable community growth and accountability from inside the program — sharing a human-readable referral code that attributes new signups to them, logging events they host, submitting a monthly self-report that feeds the 2-strike accountability loop — while the system uses human-in-the-loop cron jobs (flags for admin review, never auto-mutates state) to keep the program tone kind but credible.
**Depends on**: Phase 2 (needs seeded ambassadors with `ambassador` subdocs to own referral codes, events, and reports; can run in parallel with Phase 3)
**Requirements**: REF-01, REF-02, REF-03, REF-04, REF-05, EVENT-01, EVENT-02, EVENT-03, EVENT-04, REPORT-01, REPORT-02, REPORT-03, REPORT-04, REPORT-05, REPORT-06, REPORT-07, DISC-04
**Success Criteria** (what must be TRUE):
  1. An ambassador copies their unique referral code (e.g., `AHSAN-A7F2`) from their profile, shares `codewithahsan.dev/?ref=AHSAN-A7F2`, and when the recipient signs up for the first time (within 30 days and through any OAuth provider), a `referrals/{id}` doc is created attributing the signup to the ambassador — with self-attribution and double-attribution both blocked.
  2. An ambassador logs an event they hosted (date, type, attendees, link, notes) from the dashboard, can edit or delete it up to 30 days after the event date, and an admin can view every cohort event and flag / hide spammy entries — with the ambassador's visible event count reflecting only non-hidden entries.
  3. An ambassador submits a monthly self-report (3 short-answer fields, auto-populated with that month's events and referrals) once per month, the dashboard shows next-due date and status badge (on-time / overdue / submitted), and a friendly Discord DM reminder arrives 3 days before the deadline and again on deadline day.
  4. A daily GitHub Actions cron evaluates missing reports against each ambassador's stored timezone and flags candidates for admin review — the cron itself never mutates strike counts; all strike increments are an explicit admin action from the admin panel, and the admin panel surfaces a one-click offboarding flow the moment an ambassador reaches 2 confirmed strikes.
  5. A separate weekly reconciliation cron flags any accepted ambassador who is missing the Discord Ambassador role — again, no auto-mutation — so an admin can retry role assignment or follow up manually.

**Plans**: TBD

### Phase 5: Dashboard, Leaderboard, Offboarding & Alumni
**Goal**: An active ambassador can see their own impact at a glance and (after a 4-week grace period) compare against their cohort on a calm, hourly-updated leaderboard that shows raw per-category metrics (no composite score, nobody visibly last); a term-ending ambassador transitions cleanly to alumni with the right badge and retained recognition; a 2-strike offboarding atomically revokes the ambassador role, removes the Discord role, ends cohort membership, and fires the offboarding email.
**Depends on**: Phase 4 (Activity must exist and have written denormalized counters / referral / event / report documents before Dashboard can aggregate anything meaningful)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, DASH-09, ALUMNI-01, ALUMNI-02, ALUMNI-03, DISC-05, EMAIL-04
**Success Criteria** (what must be TRUE):
  1. An active ambassador visiting `/ambassadors/dashboard` sees their personal stats (referral count, events hosted, reports on-time, strike count, cohort progress, next-report-due), and any non-ambassador hitting the same URL gets a 404 — verified with a seeded mentee and an unauthenticated visitor.
  2. On a first-visit, the dashboard presents an onboarding checklist (join `#ambassadors`, set bio, upload cohort video, share referral link, log first event) with per-item completion state persisting on the ambassador subdoc, plus an admin-curated "Ambassador of the Month" field read from the cohort doc.
  3. Within the first 4 weeks of the cohort, the leaderboard section shows a friendly "Leaderboard unlocks in N weeks" banner; after week 4 it reveals top-3 of each raw category (referrals, events hosted, reports on-time) plus the ambassador's own rank privately ("Your rank: #7") — with cumulative (default) and "this month" views, both reading from an hourly-aggregated snapshot that displays "Updated N minutes ago" and offers a manual-refresh button.
  4. When an ambassador successfully completes the term, their `ambassador.active` flips to `false` with `endedAt` set and their `mentorship_profiles.roles` atomically swaps `"ambassador"` → `"alumni-ambassador"` (via the shared `roleMutation` helper), and the public profile badge re-renders as "Alumni Ambassador" while `/ambassadors` stops listing them.
  5. When an admin triggers the 2-strike offboarding flow, the ambassador role is revoked from `roles`, the Discord Ambassador role is removed (failures surface in the admin panel with a retry button), cohort membership is marked `ended`, the offboarding email fires, and the user does NOT receive the alumni flag (confirmed distinct from the term-completion alumni transition).

**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| v6.0 Phase 1: Foundation — Roles Array Migration | 0/10 | Planned | — |
| v6.0 Phase 2: Application Subsystem | 0/0 | Not started | — |
| v6.0 Phase 3: Public Presentation | 0/0 | Not started | — |
| v6.0 Phase 4: Activity Subsystem | 0/0 | Not started | — |
| v6.0 Phase 5: Dashboard, Leaderboard, Offboarding & Alumni | 0/0 | Not started | — |

---
*Last updated: 2026-04-21 — v6.0 Phase 1 planned (10 plans, 5 waves, Deploys #1-#5)*
