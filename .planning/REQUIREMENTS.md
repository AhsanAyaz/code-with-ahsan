# Requirements: v6.0 Student Ambassador Program

**Defined:** 2026-04-21
**Core Value:** Community members can find mentors, collaborate on real projects, and follow clear learning roadmaps — all within a mentor-led, quality-focused environment. v6.0 extends this by adding a Student Ambassador Program that grows community reach and activates the existing 4800+ Discord community through student-led events, onboarding, and referrals.
**Milestone goal:** Ship v1 of the Student Ambassador Program — application pipeline → public cohort presentation → activity tracking → private dashboard + leaderboard — to recruit and activate the first 15–25 ambassadors.
**Design reference:** `docs/superpowers/specs/2026-04-21-student-ambassador-program-design.md`
**Research reference:** `.planning/research/SUMMARY.md`

## v1 Requirements

Scoped requirements for v6.0. Each maps to exactly one roadmap phase (populated during roadmap creation).

### Role System (Foundation — prerequisite)

- [x] **ROLE-01**: `mentorship_profiles/{uid}` schema supports `roles: string[]` (array) in place of `role: string`, with legacy `role` field retained during a dual-claim compatibility window
- [x] **ROLE-02**: `src/lib/permissions.ts` exposes `hasRole(profile, role)`, `hasAnyRole(profile, roles)`, and `hasAllRoles(profile, roles)` helpers backed by array-membership semantics
- [x] **ROLE-03**: Idempotent, paginated migration script (`scripts/migrate-roles-to-array.ts`) backfills every existing `mentorship_profiles` doc with a `roles` array, with dry-run mode and null-safe handling
- [x] **ROLE-04**: `firestore.rules` are updated to dual-read accept both `role == "X"` and `"X" in roles` during the migration window, then switched to array-only after rollout
- [x] **ROLE-05**: Firebase custom-claims sync script propagates the new `roles` claim to every active user's ID token, with a force-refresh signal handled client-side
- [x] **ROLE-06**: All 95 existing permission test cases are migrated to the new `roles` shape in the same PR as the type change (TypeScript-breaking so no fixture silently passes)
- [x] **ROLE-07**: All 29 non-test files that read `.role` are migrated to the array-aware helpers with zero regression to existing mentor / mentee / admin flows
- [x] **ROLE-08**: `FEATURE_AMBASSADOR_PROGRAM` feature flag gates every new `/ambassadors` route so Foundation can ship without exposing half-built ambassador features

### Cohort Management

- [x] **COHORT-01**: Admin can create a cohort (`name`, `startDate`, `endDate`, `maxSize`, `status: upcoming | active | closed`) from the admin panel
- [x] **COHORT-02**: Admin can open / close an application window on a cohort (applications accepted only while status is `upcoming` and window is open)
- [x] **COHORT-03**: Admin can view the list of all accepted ambassadors attached to a cohort
- [x] **COHORT-04**: System enforces cohort `maxSize` at acceptance time (acceptance request rejected if cohort is full)

### Application Pipeline

- [x] **APPLY-01**: Public `/ambassadors/apply` page renders the application form behind a Firebase-authenticated gate (must be signed in, must be ≥30 days since Discord-linked account creation)
- [x] **APPLY-02**: Application form captures: name, university, year of study, country / city, Discord handle, academic email, 2–3 short-answer prompts, target cohort
- [x] **APPLY-03**: Applicant can submit the 60–90s application video either as direct upload to Firebase Storage **or** as an unlisted external link (Loom / YouTube) — both must validate duration / accessibility
- [x] **APPLY-04**: Academic email is validated against a layered allowlist — regex for `.edu`, `.edu.{cc}`, `.ac.{cc}` domains plus the Hipo `world_universities_and_domains.json` snapshot, with graceful fallback messaging when an unknown TLD is submitted
- [x] **APPLY-05**: Applicants whose email fails automatic validation can upload a student-ID photo as a first-class fallback path (admin reviewer verifies manually)
- [x] **APPLY-06**: Application creates an `applications/{applicationId}` document and stores uploaded video at `applications/{applicantUid}/{applicationId}/video.{ext}` with deny-by-default storage rules (writer = applicant, readers = applicant + admin)
- [x] **APPLY-07**: Applicant can view the status of their own application (`submitted | under_review | accepted | declined`) on their profile page
- [x] **APPLY-08**: Applicant receives a confirmation email on submission and a pass / fail email on the final decision

### Admin Review

- [x] **REVIEW-01**: Admin review panel at `/admin/ambassadors` lists applications with filters (cohort, status, submission date) and pagination
- [x] **REVIEW-02**: Admin can open an application detail view that shows all form fields, streams the video via a short-lived signed URL (1-hour expiry, regenerated each page load), and displays prior reviewer notes
- [x] **REVIEW-03**: Admin can accept or decline an application with an optional note; single-reviewer workflow (no voting in v1)
- [x] **REVIEW-04**: Declined applications trigger a retention cron that deletes the stored video 30 days after the decline decision
- [x] **REVIEW-05**: Admin panel shows a Discord integration banner if acceptance cannot resolve a `discordMemberId` for an applicant (allows retry / manual link)

### Discord Integration

- [x] **DISC-01**: At the point of application, the applicant's Discord handle is resolved to an immutable `discordMemberId` stored on the `applications/{applicationId}` doc (fails soft — admin sees a warning but can still review)
- [x] **DISC-02**: Acceptance uses a two-stage flow — Firestore commit (roles update + ambassador subdoc + cohort attach) must succeed independently; Discord role assignment is attempted right after and any failure surfaces in the admin panel with a retry button
- [x] **DISC-03**: Discord role assignment is idempotent — the accept endpoint never double-assigns, and the retry button works from any prior failure state
- [ ] **DISC-04**: Scheduled reconciliation cron flags (does not auto-mutate) any accepted ambassador who is missing the Discord Ambassador role, so admin can act
- [ ] **DISC-05**: Offboarding an ambassador (strike-based or admin-initiated) removes the Discord Ambassador role via the same integration; failures surface in the admin panel for retry

### Public Presentation

- [ ] **PRESENT-01**: Public `/ambassadors` page lists active-cohort ambassadors with photo, display name, university, 1-line bio, and social links
- [ ] **PRESENT-02**: `/ambassadors` page reads from a denormalized projection (no sensitive fields — no email, no Discord handle) backed by an array-contains query on `mentorship_profiles.roles`
- [ ] **PRESENT-03**: Any user profile page renders an "Ambassador" badge when the profile has `"ambassador"` in `roles`, and an "Alumni Ambassador" badge when it has `"alumni-ambassador"`
- [ ] **PRESENT-04**: Optional public `cohortPresentationVideo` (separate from the private application video) can be uploaded by the ambassador after acceptance and is rendered on their `/ambassadors` card

### Referral System

- [ ] **REF-01**: Each accepted ambassador is assigned a short human-readable referral code (e.g., `AHSAN-A7F2`) stored on their ambassador subdoc, guaranteed unique
- [ ] **REF-02**: Visiting any page with `?ref={code}` sets a first-party cookie `cwa_ref` (30-day expiry, `SameSite=Lax`, path `/`) that survives OAuth redirects to Discord / Google / GitHub sign-in flows
- [ ] **REF-03**: On successful platform signup (first profile creation in `/api/mentorship/profile` POST), the `cwa_ref` cookie is consumed once and a `referrals/{referralId}` doc is created with `ambassadorId`, `referredUserId`, `convertedAt`, `sourceCode` — then cleared from the cookie
- [ ] **REF-04**: Self-attribution is blocked (ambassador cannot refer themselves); double-attribution is blocked (a `referredUserId` can only be attributed once); referrals attributed to an ambassador who is no longer active are recorded but not counted
- [ ] **REF-05**: Ambassador referral count on the dashboard reflects `referrals` where `ambassadorId == self` and the referred user's account still exists

### Event Tracker

- [ ] **EVENT-01**: Ambassador can log an event they hosted from their dashboard (`date`, `type`, `attendance estimate`, optional `link`, optional `notes`)
- [ ] **EVENT-02**: Ambassador can edit or delete their own logged events (not others') until 30 days after the event date
- [ ] **EVENT-03**: Admin can view all events logged in a cohort and flag / hide obviously spammy entries
- [ ] **EVENT-04**: Event count on dashboard / leaderboard reflects the ambassador's non-hidden events in the current cohort

### Monthly Report & Strike System

- [ ] **REPORT-01**: Ambassador submits a short monthly self-report (3 free-text fields — what worked, what blocked, what needed) from the dashboard, auto-populated with their logged events and referrals of the reporting month
- [ ] **REPORT-02**: `monthlyReports/{reportId}` captures `ambassadorId`, `cohortId`, `month`, `text`, `submittedAt`; one report per ambassador per month enforced at write time
- [ ] **REPORT-03**: Dashboard shows next-report-due date and badges the report status (on-time / overdue / submitted)
- [ ] **REPORT-04**: GitHub Actions cron (daily) evaluates missing reports against per-ambassador timezones and flags candidates for review — **does not mutate strike state**
- [ ] **REPORT-05**: A friendly Discord DM reminder is sent to the ambassador 3 days before the deadline and again at the deadline (non-blocking — failure logs but does not throw)
- [ ] **REPORT-06**: Admin confirms a strike manually from the admin panel after reviewing the flagged ambassador; strike increments are an explicit admin action, never automatic
- [ ] **REPORT-07**: At 2 confirmed strikes, the admin panel surfaces an offboarding flow (one-click: revoke ambassador role, remove Discord role, mark cohort membership `ended`, send offboarding email)

### Private Dashboard & Leaderboard

- [ ] **DASH-01**: `/ambassadors/dashboard` is gated to users where `hasRole(profile, "ambassador")` is true; other roles 404
- [ ] **DASH-02**: Dashboard shows the ambassador's own stats — referral count, events hosted, reports on-time, strike count, cohort progress, next-report-due
- [ ] **DASH-03**: Dashboard shows a private cohort leaderboard with **raw per-category metrics** (referrals, events hosted, reports on-time) — no composite "activity score"
- [ ] **DASH-04**: Leaderboard offers "cumulative" (default) and "this month" views; cumulative does not reset
- [ ] **DASH-05**: Leaderboard displays the top 3 of each category plus the ambassador's own rank privately ("Your rank: #7") — nobody is visibly last
- [ ] **DASH-06**: Leaderboard reveal is gated for the first 4 weeks of the cohort — before that a banner reads "Leaderboard unlocks in N weeks" so ambassadors build momentum without rank pressure
- [ ] **DASH-07**: Leaderboard values come from an hourly-aggregated Firestore snapshot (written by GitHub Actions cron) rather than live listeners; the UI shows "Updated N minutes ago" and offers a manual refresh button
- [ ] **DASH-08**: Dashboard renders a first-visit onboarding checklist (join `#ambassadors`, set bio, upload cohort video, share referral link, log first event) with per-item completion state stored on the ambassador subdoc
- [ ] **DASH-09**: Dashboard renders an admin-curated "Ambassador of the Month" field for the current cohort (field read from `cohorts/{cohortId}`)

### Alumni Flag

- [ ] **ALUMNI-01**: On successful term completion, the ambassador subdoc transitions to `active: false` with `endedAt` set, and `"alumni-ambassador"` is appended to `mentorship_profiles.roles` while `"ambassador"` is removed — atomic update via the `roleMutation` helper
- [ ] **ALUMNI-02**: Offboarded-by-strike ambassadors do NOT receive the alumni flag (different lifecycle state)
- [ ] **ALUMNI-03**: Public profile badge renders "Alumni Ambassador" for alumni; the `/ambassadors` page only lists currently-active ambassadors

### Email Notifications

- [x] **EMAIL-01**: Application-submitted confirmation email (transactional)
- [x] **EMAIL-02**: Application accepted email (with onboarding steps)
- [x] **EMAIL-03**: Application declined email (with kind-but-firm messaging and encouragement to reapply for future cohorts)
- [ ] **EMAIL-04**: Offboarding email on 2-strike removal (from the admin panel flow)

## Future Requirements (v1.x / v2)

Acknowledged but deferred. Tracked so nothing is forgotten; not in the v6.0 roadmap.

### Application / Review

- **FUTURE-APPLY-01**: On-platform interview scheduling for shortlisted applicants (15-min slots with Ahsan) — manual Calendly / Google Meet sufficient for cohort 1
- **FUTURE-REVIEW-01**: Multi-reviewer voting with partial-acceptance state machine — only justified once cohort 2+ brings in 2–3 reviewers

### Presentation

- **FUTURE-PRESENT-01**: "Recent events hosted" feed per ambassador on the public `/ambassadors` page — requires activity data to exist first

### Referral

- **FUTURE-REF-01**: Click tracking (redirect endpoint that logs every click before bouncing to the landing page) — v6.0 ships with conversion-only attribution
- **FUTURE-REF-02**: Aggregate click → signup conversion funnel on the dashboard

### Strike System

- **FUTURE-REPORT-01**: Automated strike-warning email at 1 confirmed strike — kept manual in v6.0 until first real strike validates the automation

### Operational Tooling (deliberate manual-for-v1)

- **FUTURE-OPS-01**: Certificate generator (handled manually in Canva for ≤25 certificates in v6.0)
- **FUTURE-OPS-02**: Revenue-share accounting dashboard (handled manually via Stripe exports + spreadsheet in v6.0)
- **FUTURE-OPS-03**: Swag shipping address collection (handled via external Google Form in v6.0)

### Scaling

- **FUTURE-SCALE-01**: Tiered ambassador structure (Campus Rep → Lead Ambassador) — deferred to v2 per spec §11
- **FUTURE-SCALE-02**: Non-student "Community Ambassador" track — deferred to v2 per spec §2

## Out of Scope

Explicitly excluded from v6.0. Documented to prevent scope creep — anti-features flagged by research have their own **anti-feature** reason so the exclusion is durable.

| Feature | Reason |
|---------|--------|
| Public leaderboard (outside the cohort) | **Anti-feature.** Toxic in small cohorts per Gainsight / Circle / Bettermode / CMX research — bottom-of-25 is psychologically worse than bottom-of-500. Leaderboard stays private to the cohort. |
| Composite "activity score" | **Anti-feature.** Arbitrary weights incentivize gaming and are flagged as the #1 driver of community-gamification decay. v6.0 uses raw per-category display only. |
| Real-time Discord activity scraping for strike / score signal | **Anti-feature.** Privacy, consent, and reward-noise concerns. Spec §9.1 flags as "optional future"; stays there. |
| Mandatory public posting of the application video | **Anti-feature.** Privacy asymmetry — forces applicants to expose pitch publicly to be considered. Optional public video (`cohortPresentationVideo`) is a separate post-acceptance field. |
| Automatic strike increments on missed commitments (events, Discord presence) | **Anti-feature.** Strikes only fire on missed monthly reports, and even those require explicit admin confirmation. Backdoored auto-enforcement breaks the tone of the program. |
| Tiered ambassador ranks in v1 | **Anti-feature for this scale.** 15–25 cohort doesn't give enough signal to tier fairly. Deferred per spec §11. |
| Cash or credit payouts for referrals | **Anti-feature.** Misaligns incentives; revshare is restricted to paid workshops per spec §7.2. |
| Monthly leaderboard reset | **Anti-feature.** Erases the compounding value of consistent work and penalizes early strong performers. Leaderboard is cumulative with a "this month" filter. |
| New runtime dependencies (`discord.js`, `react-hook-form`, Cloud Functions, video SaaS) | Research confirmed zero new deps required; introducing any of these creates inconsistency with existing patterns for no capability gain. |
| Paid internship / employment program | Out of scope per spec §2 — Ambassador Program is volunteer-with-benefits, not employment. |
| Community moderator replacement | Out of scope per spec §2 — ambassadors are evangelists / activators, not primary moderators. |
| Academic-credit or certification tracks | Out of scope per spec §2. |
| Mobile app | v6.0 stays web-first, consistent with v1.0–v5.0 constraint. |

## Constraints (inherited)

- Must use existing Next.js 16 / React 19 / Firebase / DaisyUI stack
- Must follow existing admin dashboard styling and component patterns
- Must use existing `src/lib/discord.ts` functions (extend, do not replace)
- No new runtime dependencies without explicit justification
- Must not regress any v1.0–v5.0 validated capability — foundation migration must be backwards-compatible through the dual-claim window

## Traceability

Every v1 REQ-ID maps to exactly one phase. Populated during roadmap creation (2026-04-21).

| Requirement | Phase | Status |
|-------------|-------|--------|
| ROLE-01 | Phase 1 — Foundation: Roles Array Migration | Complete |
| ROLE-02 | Phase 1 — Foundation: Roles Array Migration | Complete |
| ROLE-03 | Phase 1 — Foundation: Roles Array Migration | Complete |
| ROLE-04 | Phase 1 — Foundation: Roles Array Migration | Complete |
| ROLE-05 | Phase 1 — Foundation: Roles Array Migration | Complete |
| ROLE-06 | Phase 1 — Foundation: Roles Array Migration | Complete |
| ROLE-07 | Phase 1 — Foundation: Roles Array Migration | Complete |
| ROLE-08 | Phase 1 — Foundation: Roles Array Migration | Complete |
| COHORT-01 | Phase 2 — Application Subsystem | Complete |
| COHORT-02 | Phase 2 — Application Subsystem | Complete |
| COHORT-03 | Phase 2 — Application Subsystem | Complete |
| COHORT-04 | Phase 2 — Application Subsystem | Complete |
| APPLY-01 | Phase 2 — Application Subsystem | Complete |
| APPLY-02 | Phase 2 — Application Subsystem | Complete |
| APPLY-03 | Phase 2 — Application Subsystem | Complete |
| APPLY-04 | Phase 2 — Application Subsystem | Complete |
| APPLY-05 | Phase 2 — Application Subsystem | Complete |
| APPLY-06 | Phase 2 — Application Subsystem | Complete |
| APPLY-07 | Phase 2 — Application Subsystem | Complete |
| APPLY-08 | Phase 2 — Application Subsystem | Complete |
| REVIEW-01 | Phase 2 — Application Subsystem | Complete |
| REVIEW-02 | Phase 2 — Application Subsystem | Complete |
| REVIEW-03 | Phase 2 — Application Subsystem | Complete |
| REVIEW-04 | Phase 2 — Application Subsystem | Complete |
| REVIEW-05 | Phase 2 — Application Subsystem | Complete |
| DISC-01 | Phase 2 — Application Subsystem | Complete |
| DISC-02 | Phase 2 — Application Subsystem | Complete |
| DISC-03 | Phase 2 — Application Subsystem | Complete |
| DISC-04 | Phase 4 — Activity Subsystem | Pending |
| DISC-05 | Phase 5 — Dashboard, Leaderboard, Offboarding & Alumni | Pending |
| PRESENT-01 | Phase 3 — Public Presentation | Pending |
| PRESENT-02 | Phase 3 — Public Presentation | Pending |
| PRESENT-03 | Phase 3 — Public Presentation | Pending |
| PRESENT-04 | Phase 3 — Public Presentation | Pending |
| REF-01 | Phase 4 — Activity Subsystem | Pending |
| REF-02 | Phase 4 — Activity Subsystem | Pending |
| REF-03 | Phase 4 — Activity Subsystem | Pending |
| REF-04 | Phase 4 — Activity Subsystem | Pending |
| REF-05 | Phase 4 — Activity Subsystem | Pending |
| EVENT-01 | Phase 4 — Activity Subsystem | Pending |
| EVENT-02 | Phase 4 — Activity Subsystem | Pending |
| EVENT-03 | Phase 4 — Activity Subsystem | Pending |
| EVENT-04 | Phase 4 — Activity Subsystem | Pending |
| REPORT-01 | Phase 4 — Activity Subsystem | Pending |
| REPORT-02 | Phase 4 — Activity Subsystem | Pending |
| REPORT-03 | Phase 4 — Activity Subsystem | Pending |
| REPORT-04 | Phase 4 — Activity Subsystem | Pending |
| REPORT-05 | Phase 4 — Activity Subsystem | Pending |
| REPORT-06 | Phase 4 — Activity Subsystem | Pending |
| REPORT-07 | Phase 4 — Activity Subsystem | Pending |
| DASH-01 | Phase 5 — Dashboard, Leaderboard, Offboarding & Alumni | Pending |
| DASH-02 | Phase 5 — Dashboard, Leaderboard, Offboarding & Alumni | Pending |
| DASH-03 | Phase 5 — Dashboard, Leaderboard, Offboarding & Alumni | Pending |
| DASH-04 | Phase 5 — Dashboard, Leaderboard, Offboarding & Alumni | Pending |
| DASH-05 | Phase 5 — Dashboard, Leaderboard, Offboarding & Alumni | Pending |
| DASH-06 | Phase 5 — Dashboard, Leaderboard, Offboarding & Alumni | Pending |
| DASH-07 | Phase 5 — Dashboard, Leaderboard, Offboarding & Alumni | Pending |
| DASH-08 | Phase 5 — Dashboard, Leaderboard, Offboarding & Alumni | Pending |
| DASH-09 | Phase 5 — Dashboard, Leaderboard, Offboarding & Alumni | Pending |
| ALUMNI-01 | Phase 5 — Dashboard, Leaderboard, Offboarding & Alumni | Pending |
| ALUMNI-02 | Phase 5 — Dashboard, Leaderboard, Offboarding & Alumni | Pending |
| ALUMNI-03 | Phase 5 — Dashboard, Leaderboard, Offboarding & Alumni | Pending |
| EMAIL-01 | Phase 2 — Application Subsystem | Complete |
| EMAIL-02 | Phase 2 — Application Subsystem | Complete |
| EMAIL-03 | Phase 2 — Application Subsystem | Complete |
| EMAIL-04 | Phase 5 — Dashboard, Leaderboard, Offboarding & Alumni | Pending |

**Coverage:**
- v1 requirements: 66 total (counted across ROLE ×8, COHORT ×4, APPLY ×8, REVIEW ×5, DISC ×5, PRESENT ×4, REF ×5, EVENT ×4, REPORT ×7, DASH ×9, ALUMNI ×3, EMAIL ×4)
- Mapped to phases: 66 ✓
- Unmapped: 0 ✓
- Phase distribution: Phase 1 = 8 · Phase 2 = 23 · Phase 3 = 4 · Phase 4 = 17 · Phase 5 = 14

*Note on "63" figure:* Earlier milestone context referenced 63 v1 requirements. Actual REQ-ID count in this file is 66; the roadmap maps all 66. Discrepancy is a minor off-by-three in the original brief, surfaced here for transparency — no requirements were added or dropped during roadmapping.

---
*Requirements defined: 2026-04-21*
*Last updated: 2026-04-21 — traceability populated during roadmap creation (5 phases, 100% coverage)*
*2026-04-22 — Phase 2 complete: COHORT-04, REVIEW-01/02/03/05, EMAIL-02/03 flipped to Complete per VERIFICATION.md evidence.*
