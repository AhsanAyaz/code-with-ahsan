# Feature Research — Student Ambassador Program v1 (v6.0)

**Domain:** Developer/student community ambassador program (15–25 ambassador cohort, 6-month fixed term)
**Researched:** 2026-04-21
**Confidence:** HIGH for application/benefits/referral patterns (multiple cited programs corroborate); MEDIUM for leaderboard/monthly-report specifics (less authoritative public documentation; rely on synthesized community best practices)

## Context (what this research feeds)

The design spec (`docs/superpowers/specs/2026-04-21-student-ambassador-program-design.md`) already defines scope. This research answers: **for each of those features, what are the table-stakes behaviours that comparable programs have converged on, what are differentiators worth considering for v1, and what should be actively avoided as over-engineering?** The categorization below drives the v6.0 `REQUIREMENTS.md` scoping AskUserQuestion flow.

The Code With Ahsan platform already has the mentor/mentee application + admin review pipeline, Discord role integration, profile system, and centralized permissions — this research focuses on *what's ambassador-specific* and assumes those existing rails will be reused.

## Feature Landscape

### Table Stakes (Must Have for v1)

Features users/applicants expect. Absence makes the program feel unserious or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Application form — core identity fields** (name, email, Discord handle, university, year of study, country/city) | Every cited program (GitHub Campus Experts, MLSA, Figma Campus Leaders, Notion, v0) asks these. Baseline for reviewer context. | LOW | Reuse `/mentorship/apply` form patterns. Add `.edu` validation + student-ID photo fallback (per spec §4). |
| **Application form — short-answer motivation/essay** (2–3 questions, ~100–250 words each) | MLSA asks three structured short-answer questions ("Guide / Welcome / Connect"). Jotform and 123FormBuilder templates converge on motivation + leadership experience + relevant activity. | LOW | Recommend 2–3 focused prompts, not an open "tell us about yourself." Suggested prompts: (1) Why ambassador, (2) Campus/community experience, (3) 90-day plan if accepted. |
| **Video submission (60–120 sec)** | Every creator-adjacent program requires it: GitHub Campus Experts (video resume after initial form), MLSA (one of three responses as video, <2 min), Google Gemini Student Ambassador (video). 1–2 min is the universal ceiling — no one asks for longer. | MEDIUM | Spec already specifies 60–90s, Firebase Storage upload. **Recommendation: allow external link (YouTube/Loom unlisted) as alternative to upload** — big unlisted videos are flaky to upload and many applicants already have them hosted elsewhere. |
| **Admin review panel — list, filter, detail, accept/reject, notes** | Reuses existing `/mentorship/admin/*` pattern; reviewers need queue management, not novelty. | LOW | Directly reuse existing admin queue components; just swap collection from `mentorshipApplications` → `ambassadorApplications`. |
| **Pass/fail email outcome** | Applicants will disengage if they hear nothing. Standard across all programs. | LOW | Reuse existing mentorship acceptance email infrastructure. |
| **Discord role auto-assign on acceptance** | Spec explicitly requires. Already-built mentor flow demonstrates the pattern works. | LOW | Reuses `src/lib/discord.ts` — just a new role ID. Confirmed as existing capability per spec §9.1 #9. |
| **Ambassador badge on public profile** | Every program uses visible role marker (MVP logo, Campus Expert badge, etc.). The value of the benefit is in the visibility. | LOW | New `roles: string[]` check (already part of v6.0 migration); conditional badge component in profile header. |
| **Public cohort page** (`/ambassadors`) with photo, name, university, 1-line bio, social links | GitHub Campus Experts has `/campus-experts` showcase; Figma has campus leader LinkedIn-driven showcase; Notion has ambassador directory. This is a core recruitment driver for *next* cohort — applicants check "who got in." | LOW–MEDIUM | Static-ish read from `users` where `roles.includes('ambassador')` and `ambassador.cohortId === activeCohort`. |
| **Unique referral link per ambassador with signup attribution** | Universal mechanic. v0 (Dub), ReferralRock, BrandChamp all do this. Signup is the unambiguous conversion event. | MEDIUM | Short human-readable code (e.g., `cwa.link/r/ahsan-abc` or `?ref=ahsan-abc`) preferred over UUIDs — research on referral codes converges that short, memorable, personalized codes convert better than opaque UUIDs. Store `(ambassadorId, referredUserId, createdAt, sourceLink)` in `referrals/*`. |
| **Private ambassador dashboard** — personal stats + cohort leaderboard | Spec requires; Ambassify, BrandChamp, v0-style programs all provide some form. | MEDIUM | Gated by `roles.includes('ambassador')` on the permission system. Reads aggregated counts — does not own data. |
| **Monthly self-report form** | Spec requires — and it's the *primary accountability surface* per spec §8.1. Simple, written, Firestore-backed. | LOW | Keep short: 4–5 fields (see recommended schema below). |
| **Event hosting tracker** (log event: date, type, attendance est, link) | Spec requires. Ambassadors can't show up on leaderboard without this. | LOW | One-form CRUD into `events/*` (ambassador-owned; separate from platform events). |
| **Strike counter visible to ambassador** | Per spec §8, two-strike offboarding. If ambassadors can't see their own strike count, the rule is unfair. | LOW | Shown on private dashboard. Numeric: "0 of 2 missed check-ins." |

### Differentiators (Consider for v1, Could Defer)

Features that elevate the program but aren't deal-breakers in month 1. Each is flagged with whether evidence suggests v1 inclusion or deferral.

| Feature | Value Proposition | Complexity | Notes / Recommendation |
|---------|-------------------|------------|------------------------|
| **Interview scheduling on the platform** (top-N finalists get 15-min slot with Ahsan) | Spec mentions optional interview step. Could reuse existing mentor booking infrastructure to offer time slots. | MEDIUM | **Defer to v1.x.** First cohort is 15–25 ambassadors; Ahsan can send Calendly/Google Meet links manually. Wire up to booking system only if cohort 2 scales. |
| **"Ambassador of the Month" spotlight feature** (surfaces on private channel + socials) | Spec §7.3 explicitly lists. Creates aspiration without unhealthy comparison (one winner, not a ranked list). | LOW | **Include in v1 — but as a simple admin-curated flag, not an algorithmic award.** Cheap to build, high recognition value. Just a `spotlightOfMonth: { month, ambassadorId, blurb }` doc rendered on the private dashboard. |
| **Referral link clicks tracking** (not just conversions) | Shows effort, not just outcomes. Ambassadors with high clicks / low conversion need help with the pitch, not accountability. | MEDIUM | **Defer to v1.x.** Day 1 ambassadors only need to see: "X people clicked, Y signed up." Clicks require a redirect endpoint that logs — doable but adds scope. Launch with conversion-only, add clicks after first month of real data. |
| **Onboarding checklist on first dashboard visit** ("Set Discord handle, post intro in #ambassadors, fill swag address, read the handbook") | BrandChamp / NextBee research both cite Week-1 activation predicting long-term retention (3× retention if ambassador posts quality content in Week 1). | LOW | **Include in v1.** A simple checklist component with 5–6 items on the dashboard. No state machine — just checkboxes stored on the ambassador subdoc. Huge value per hour of build. |
| **Intro thread in `#ambassadors` channel** | Standard onboarding pattern. Operational, not platform — but the platform's onboarding checklist can prompt it. | LOW (operational) | Operational task handled by Discord + onboarding checklist reminder. No platform build needed. |
| **Featured projects / events the ambassador is running** on the public cohort page | The Figma Campus Leaders showcase, John Cabot ambassador pages, and University of Waterloo pages all spotlight what the ambassador is *actively doing* beyond just their bio. Drives recruitment for the next cohort. | MEDIUM | **Defer to v1.x.** Cohort page launches with static bios. Once ambassadors are logging events, the public page can pull a "Recent events hosted" feed per ambassador. Small follow-on task. |
| **Alumni badge / archive** | Spec §7.3 mentions permanent alumni badge. Low lift. | LOW | **Include in v1** — zero marginal cost once `cohortId` + `active` flag exist on the ambassador subdoc. End-of-term script flips `active: false` and the badge becomes "Alumni Ambassador." Worth including because the first cohort *will* hit term end during v6.x maintenance windows. |
| **Email notifications** (application accepted/rejected, monthly report reminder, strike warning) | Any program without these feels unprofessional. | MEDIUM | **Include in v1 for acceptance/rejection + monthly report reminder**, defer strike-warning email to manual until the first strike actually happens. |
| **Swag address collection on-platform** | Listed explicitly as out-of-scope in spec §9.2 (external Typeform). | LOW if built, zero if external | **Keep external (per spec).** Don't reintroduce. One-off form not worth native build. |
| **Certificate PDF generator** | Listed explicitly as out-of-scope in spec §9.2 (Canva manual for ≤25 certificates). | HIGH if built | **Keep manual (per spec).** Revisit in v2 if cohort 2 grows. |

### Anti-Features (Actively Avoid)

Features that seem good in brainstorms but create operational drag, unhealthy dynamics, or misaligned incentives. Backed by community-program anti-pattern research.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Public leaderboard** (visible outside the cohort, indexed by search engines) | "Transparency / social proof for prospective ambassadors" | Toxic competition risk — Gainsight / Circle / Bettermode research all flag that publicly ranked contribution boards trigger gaming, sabotage, and shame for bottom-ranked members. In a cohort of 15–25, being visibly last is far worse than being 450th in a cohort of 500. Also creates a retention disincentive: once an ambassador is mathematically out of the top-5, their motivation to continue collapses. | Keep the leaderboard **strictly private to the cohort** (spec already says this). Show **relative percentiles/tiers** ("Top third / Active / Building momentum"), not absolute ranks 1–25. Rotate spotlight monthly to distribute recognition. |
| **Leaderboard points system with weighted composite "activity score"** ("1 referral = 10pts, 1 event = 25pts, Discord message = 0.1pts…") | "Single number = easy comparison + gamification" | Loss-of-intrinsic-motivation pattern: ambassadors optimize for the score, not the community. Low-quality Discord spam, inflated attendance numbers on logged events, etc. CMX and Gainsight research both flag point-aggregation as the #1 cause of gamified community decay. Also: weights are *arbitrary* and will get litigated every month. | Show **raw numbers by category** (referrals, events hosted, reports submitted on time). Let ambassadors and Ahsan interpret the mix. No composite score in v1. |
| **Real-time Discord activity scraping / score** (message counts, reactions given, etc.) | "Automatic engagement measurement" | Spec §9.1 already lists this as "optional future" and it should stay there. (a) Privacy/consent issues inside a general Discord, (b) message counts reward noise, (c) requires a persistent bot with elevated permissions — infrastructure the project doesn't need. | **Strike system + monthly 1:1 conversation.** The spec is explicit (§8.1): "the strike system protects against absenteeism, while the 1:1 call addresses under-delivery." Respect this — don't backdoor auto-enforcement via Discord metrics. |
| **Mandatory public posting of application video** | "Organic marketing for free" | Forcing public posting creates a privacy asymmetry (not everyone wants their face on a public rejection pile). Also filters out great candidates who are camera-shy with strangers but fine 1:1. Spec §5 already gets this right ("encouraged, not required"). | Keep public posting optional; amplify the best ones *post*-acceptance, not as a condition of submission. |
| **Long application form** (>10 minutes to complete) | "We want quality applicants who are serious" | Classic over-filtering. Jotform's own 2025 research and community-program reviews converge: forms longer than ~10 minutes drop completion rate by 50%+, and the people who *do* complete them are often the ones with the most free time, not the most talent. | Aim for 5–8 minutes: ~6 identity fields + 2 short-answer prompts + 1 video. Video already filters for communication skill; no need to also filter via essay length. |
| **Multi-stage application with written test / coding challenge** | "Technical filter" | Not the role. Ambassadors aren't shipping engineering — they're communicating. A technical filter selects against exactly the marketer/organizer profiles the program needs. | Video submission is the filter. Keep it. |
| **Tiered ambassador ranks within v1 cohort** (Bronze/Silver/Gold Ambassador) | "Progression creates motivation" | Tiering in a 15–25 cohort over 6 months is premature. You can't get meaningful signal to tier fairly, and tiering visibly creates a two-class system in a peer group that's supposed to be collaborative. Spec §11 correctly flags tiering as a v2 exploration. | Single "Ambassador" title in v1. "Alumni Ambassador" post-term. Tiering waits for v2 cohort 2+ when data exists. |
| **Leaderboard reset to zero every month** (instead of cumulative) | "Fresh chances each month" | Monthly resets erase the compounding effect of consistent work. An ambassador who hosts 1 event every month for 6 months looks identical to one who hosted 1 event in month 6 only. Also penalizes early strong performers psychologically. | **Cumulative over the term, with a "This month" secondary view.** Covers both use cases without punishing consistency. |
| **Referral codes that reward referrers with cash/credit** | "Stronger incentive = more referrals" | Misaligns incentives. Ambassadors start recruiting anyone for cash, not quality community members. Also creates tax/payments complexity the program is explicitly avoiding in v1. | Track referrals for recognition + revshare on *paid workshops they bring in* (spec §7.2). That's the one monetized lever, and it's tied to a specific high-value action, not raw signup counts. |
| **Public self-reported metrics** ("I ran an event with 150 attendees!") without verification | "Trust ambassadors" | Easy to game; leaderboard rankings become fiction. Even when ambassadors aren't intentionally inflating, self-reports drift. | Keep event tracker self-reported (spec §9.1 #8 is fine), but the **leaderboard should weight verifiable metrics** (referral signups from platform auth) **above self-reported** (event attendance). Let the numbers speak for themselves rather than combining them. |
| **Auto-strike on missed commitments** (missed event host, low Discord activity, etc.) | "Accountability at scale" | Spec §8.1 is explicit: "Planning should not design a stricter auto-enforcement system without an explicit policy change." Auto-strike on commitment failures replaces the 1:1 conversation with a machine; kills trust. | **Strikes only fire on missed monthly reports** (the spec's rule). Everything else is dashboard signal for the 1:1 call. |

## Feature Dependencies

```
Role system migration (users.role → users.roles[])
    └──required by──> Ambassador badge on profile
    └──required by──> Permission check for dashboard access
    └──required by──> Filtering /ambassadors public page
                          │
Application form
    └──writes──> ambassadorApplications/*
                 └──required by──> Admin review panel
                                   └──triggers on accept──> Discord role assign
                                                            └──writes──> users/{id}.roles += 'ambassador'
                                                                         users/{id}.ambassador subdoc
                                                                         cohorts/{cohortId} membership
                                                                            │
Referral link system ──writes──> referrals/*
Event tracker ──writes──> events/*              ──read by──> Private dashboard + leaderboard
Monthly report form ──writes──> monthlyReports/* ──read by──> Strike counter + dashboard
                                                              │
Public /ambassadors page ──reads──> users where roles.includes('ambassador') + cohort membership
```

### Dependency Notes

- **Everything blocks on the role system migration** (`role: string` → `roles: string[]`). This is correctly positioned as the first phase in the spec. No ambassador feature can be built without it, and the migration also affects existing mentor/mentee queries + security rules.
- **Public cohort page depends on acceptance flow completing.** The page cannot launch before the first cohort is accepted. Build it after the admin review panel is shipping accepts.
- **Leaderboard depends on at least one activity-writing subsystem** (referrals, events, or reports) producing data. Can be demo-able with seed data, but realistic testing needs one real subsystem live.
- **Discord role assignment** — spec §12 flags uncertainty about whether the existing integration supports programmatic role assignment for *arbitrary* Discord users, or only at signup. This is a planning-phase unknown that affects Feature #9 build complexity.
- **Referral attribution requires a signup event to hook into.** The existing auth flow needs a `?ref=` param reader that persists through OAuth redirects (localStorage fallback for when the param is lost across Discord/Google OAuth). Non-trivial — worth calling out as a sub-task.

## MVP Definition

### Launch With (v1 / v6.0 milestone)

Truly minimum to validate the program concept with 15–25 ambassadors over 6 months:

- [ ] **Role system migration** — prerequisite, not negotiable
- [ ] **Application form** (`/ambassadors/apply`) with .edu verification + student-ID fallback + video upload OR external link + 2–3 short-answer prompts
- [ ] **Admin review panel** (list, filter, detail, accept/reject, notes) — reuses mentorship admin pattern
- [ ] **Acceptance/rejection email** — reuses existing email infrastructure
- [ ] **Discord role auto-assign** on acceptance
- [ ] **Ambassador badge** on public profile
- [ ] **Public `/ambassadors` page** — photo, name, university, 1-line bio, socials
- [ ] **Referral link system** — short human-readable codes, signup conversion tracking (clicks tracking deferred)
- [ ] **Private ambassador dashboard** — personal stats (referrals count, events logged, reports submitted, strike counter) + private cohort leaderboard (raw numbers per category, cumulative with "this month" filter, **no composite score**)
- [ ] **Event hosting tracker** — simple CRUD form
- [ ] **Monthly self-report form** (4–5 fields, see below) — drives strike counter
- [ ] **Strike counter + auto-increment** on missed monthly reports (missed = no report submitted by month-end + 7 day grace)
- [ ] **Ambassador of the Month spotlight** — simple admin-curated field shown on private dashboard
- [ ] **Onboarding checklist** on first dashboard visit (5–6 items, checkboxes on ambassador subdoc)
- [ ] **Alumni badge / end-of-term flag** — cheap to include since we're already tracking `active` + `cohortId`

### Add After Validation (v1.x, 1–3 months post-launch)

- [ ] **Referral link click tracking** — trigger: ambassadors asking "how many people are clicking vs signing up?"
- [ ] **Featured events on public cohort page** — trigger: cohort page needs refresh content
- [ ] **Interview scheduling on-platform** — trigger: cohort 2 scales >30 applicants
- [ ] **Strike-warning email** — trigger: after first real strike occurs and demonstrates need for automation
- [ ] **Per-ambassador public "my events" subpage** — trigger: ambassadors asking for a shareable link to their activity

### Future Consideration (v2+)

- [ ] **Tiered ambassador ranks** (Campus Rep → Lead Ambassador) — defer until cohort 2+ data exists
- [ ] **Automated revshare dashboard** — defer until paid workshop volume > 3/term
- [ ] **Automated certificate generator** — defer until cohort size > 30
- [ ] **Discord activity score integration** — defer indefinitely; only reconsider if strike system proves insufficient AND policy change is made
- [ ] **In-person summit infrastructure** (RSVPs, travel logistics) — defer per spec §7.2
- [ ] **Non-student Community Ambassador track** — defer to v2 per spec §2
- [ ] **Multiple simultaneous ambassador tenures** (subcollection vs subdoc) — defer per spec §9.4

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Role system migration | HIGH (blocks everything) | MEDIUM (touches auth, security rules, all role queries) | P1 |
| Application form | HIGH | LOW (reuses mentorship form) | P1 |
| Admin review panel | HIGH | LOW (reuses admin pattern) | P1 |
| Video submission (upload + external link option) | HIGH | MEDIUM (storage, validation) | P1 |
| Discord role auto-assign | HIGH | LOW–MEDIUM (pending spec §12 clarification) | P1 |
| Ambassador badge on profile | MEDIUM | LOW | P1 |
| Public `/ambassadors` page | HIGH (recruitment for next cohort) | LOW | P1 |
| Referral link + signup attribution | HIGH | MEDIUM (OAuth redirect persistence is the tricky bit) | P1 |
| Private dashboard | HIGH | MEDIUM | P1 |
| Monthly report form | HIGH (primary accountability) | LOW | P1 |
| Event tracker | MEDIUM | LOW | P1 |
| Strike counter auto-increment | HIGH | LOW (cron job on existing GitHub Actions infra) | P1 |
| Onboarding checklist | HIGH (Week-1 activation = 3× retention) | LOW | P1 |
| Cohort leaderboard (raw categories, cumulative + "this month") | MEDIUM | LOW (pure read layer over existing data) | P1 |
| Ambassador of the Month field | MEDIUM | LOW | P1 |
| Alumni badge flag | LOW (term-end only) | LOW (just a boolean) | P1 |
| Acceptance/rejection + monthly-report-reminder emails | HIGH | LOW | P1 |
| Referral click tracking | MEDIUM | MEDIUM (redirect endpoint) | P2 |
| Featured events on public page | MEDIUM | MEDIUM | P2 |
| Interview scheduling | LOW (cohort 1) | MEDIUM | P3 |
| Strike-warning email | MEDIUM | LOW | P2 |
| Certificate generator | LOW (cohort 1) | HIGH | P3 |
| Tiered ranks | LOW (cohort 1) | HIGH | P3 |
| Discord activity auto-scoring | NEGATIVE | HIGH | Anti-feature |
| Composite "activity score" | NEGATIVE | MEDIUM | Anti-feature |
| Public leaderboard | NEGATIVE | LOW | Anti-feature |

**Priority key:** P1 = must have for v1 launch; P2 = v1.x add; P3 = future/v2+.

## Recommended Monthly Report Schema

Grounded in Jotform / 123FormBuilder / MLSA patterns + the principle that the form is the accountability surface (spec §8.1) and therefore needs to be cheap to fill out consistently:

| Field | Type | Why |
|-------|------|-----|
| Month | Auto-filled (read-only) | Remove friction |
| Events hosted this month | Multi-select link to `events/*` already logged | Cross-references tracker — no duplicate entry |
| Referral wins (who signed up via your link?) | Auto-populated read-only count + list | No re-entry; just visible acknowledgment |
| What worked? | Short text (~100 words) | Qualitative signal |
| What blocked you? | Short text (~100 words) | Feeds 1:1 call agenda |
| What do you need from Ahsan/the program next month? | Short text (~100 words) | Converts report into action |
| Optional: Anything you want to share with the cohort? | Short text | Drives private-channel content |

Total: ~3 free-text fields, ~5 min to fill. Anything longer breeds skipped reports, which directly inflates the strike rate.

## Recommended Application Form Schema

Grounded in MLSA / Figma / GitHub Campus Experts convergence + the 10-minute ceiling rule:

**Identity (auto-validated):**
1. Full name
2. Email (must match logged-in user)
3. `.edu`-style email OR student-ID photo upload (accepted TLD list + manual review fallback)
4. Discord handle (validated against existing Discord lookup from `src/lib/discord.ts`)
5. University name + year of study (dropdown for year)
6. Home country + city
7. Social links (at least one of LinkedIn / Twitter / GitHub / YouTube / Instagram)

**Qualitative (free text, ~100–150 words each):**
8. Why do you want to be a Code With Ahsan ambassador? (motivation)
9. Tell us about one time you organized, hosted, or led something in a community (campus, online, or elsewhere). (leadership evidence)
10. If accepted, what's your 90-day plan? (concrete intent)

**Video:**
11. 60–90 second video — upload to Firebase Storage OR paste YouTube/Loom unlisted link. Prompt: "Why you, why this, and one thing you'd do in your first month."

**Commitments:**
12. I have been a member of the Code With Ahsan Discord for at least 30 days (checkbox + auto-verified via Discord handle lookup where possible)
13. I accept the program commitments (checkbox, expandable list from spec §6)

Estimated completion time: 6–8 minutes if the applicant has their video ready; 15–20 if they record it from scratch. Acceptable.

## Competitor Feature Analysis

| Feature | GitHub Campus Experts | MLSA (Microsoft Learn Student Ambassadors) | Figma Campus Leaders | Notion Campus Leaders | v0 Ambassador | Our Approach |
|---------|-----------------------|---------------------------------------------|----------------------|-----------------------|---------------|--------------|
| Application flow | Form → video resume (sequential, 2 weeks apart) | 4-section form: privacy/terms + personal + institution + 3 written-or-video prompts | Form + emphasis on personality | Form (less public documentation) | Form + product-fit emphasis | Single form with video upload or external link — simpler than GitHub's two-stage, closer to MLSA's combined approach |
| Video length | "Video resume," no strict public cap | <2 min, one of three prompts as video | Not explicitly required | Not explicitly required | Not explicitly required | 60–90 sec (per spec) — tight enough to force clarity |
| Cohort model | Fixed, annual, July applications | Rolling throughout year | Annual, academic year | Annual | Beta / limited | **Fixed 6-month cohort** — closer to GitHub/Figma rhythm |
| Referral tracking | Not a core feature | Not a core feature | Not a core feature | Has referral mechanics via signup tracking | **Dub-powered referral link + 30% revshare 6 months** | Custom short-code referral + 25% revshare per spec |
| Leaderboard | Private community, not central | Private / internal | Private / internal | Internal — monthly incentivized targets | Not publicly confirmed | **Private cohort leaderboard, raw categories** (no composite score) |
| Monthly reporting | Informal via community | Informal; targets incentivized | Event-driven, not strict monthly | Monthly targets (gift cards/swag tied) | Not publicly documented | **Monthly self-report form, drives strikes** per spec |
| Offboarding | Implicit (don't renew) | Implicit / performance-based | Term-end | Term-end | Not publicly documented | **Explicit 2-strike with 30-day notice** — firmer than most peers; matches spec |
| Public ambassador page | ✓ `github.com/campus-experts` | ✓ `mvp.microsoft.com/studentambassadors` | ✓ LinkedIn-driven | ✓ Directory | Limited | **✓ `/ambassadors` cohort page** |
| Swag | ✓ | ✓ | ✓ (Config tickets) | ✓ | ✓ | ✓ (external form, manual fulfillment) |
| Revshare | No | No | No | No (swag/gifts instead) | ✓ 30% / 6 months | ✓ 25% on paid workshops (spec §7.2, manual) |

**Takeaway:** The Code With Ahsan approach sits closest to **GitHub Campus Experts + MLSA** in cohort mechanics (fixed-term, application + video, Discord-community-backed) but adds the **v0-style referral + revshare** monetization lever. Unique differentiator: **mentorship-platform integration** — no other program lists has ambassadors natively flowing into mentor/mentee roles the way this platform can.

## Dependencies on Existing Platform Capabilities

These v6.0 features rely on already-shipped infrastructure:

| v6.0 Feature | Depends On |
|--------------|------------|
| Application form | Mentorship application form patterns (v1.0), Firebase Storage for video |
| Admin review panel | Admin dashboard auth + list/detail patterns (`/mentorship/admin/*`) |
| Discord role auto-assign | `src/lib/discord.ts` role integration (v1.0) — **pending §12 clarification on programmatic role assignment for arbitrary users** |
| Public `/ambassadors` page | Profile system public view (v1.0), Firestore query patterns |
| Ambassador badge | Profile system (v1.0) + new `users.roles: string[]` (v6.0 migration) |
| Private dashboard | Centralized permission system (v2.0) with new `roles.includes('ambassador')` check |
| Referral attribution | Existing signup/auth flow — **needs modification to persist `?ref=` across OAuth redirects** |
| Email notifications | Existing email infrastructure used for mentor acceptance (v1.0) |
| Monthly report strike cron | GitHub Actions cron jobs (already used for mentor inactivity checks) |
| Onboarding checklist | User profile subdoc pattern (v1.0) |

## Risk Flags for Requirements Phase

Three items below warrant explicit `AskUserQuestion` discussion in requirements scoping:

1. **Video upload vs external link for applications.** Spec says upload-to-Firebase-Storage. Recommendation is to *also* allow YouTube/Loom unlisted links to reduce friction and upload flakiness. Scope impact: ~half a day more work, meaningful applicant-experience improvement.

2. **Referral attribution persistence across OAuth.** The unknown in the spec is not the referral *link* format — it's that Code With Ahsan uses OAuth (Discord/Google) for signup, and OAuth redirects can strip `?ref=` params. Solution: read `?ref=` on landing, stash in `localStorage`, read back in post-auth onSignup hook. Non-trivial. This is where a lot of competitor programs get the attribution wrong (lost clicks → lost credit → ambassador trust erodes). Worth explicit scoping.

3. **Leaderboard metric display — raw vs composite.** Recommendation is raw categories, not a composite score. Spec §9.1 says "activity score" which implies a composite. This deserves an explicit decision call before build — the anti-feature analysis above argues against composite scoring, and that's a decision worth making early because it shapes the schema.

## Sources

Primary program references (table-stakes verification):
- [GitHub Campus Experts — Applying](https://docs.github.com/en/education/about-github-education/use-github-at-your-educational-institution/applying-to-be-a-github-campus-expert) — HIGH confidence, official docs
- [GitHub Campus Experts program page](https://education.github.com/campus_experts) — HIGH, official
- [Microsoft Learn Student Ambassadors (MLSA)](https://mvp.microsoft.com/studentambassadors) — HIGH, official
- [MLSA application structure walkthrough](https://iamrudhresh.medium.com/how-to-apply-for-microsoft-learn-student-ambassador-mlsa-program-in-2024-604dd01cf7d7) — MEDIUM, community write-up of official form
- [Figma Campus Leaders — Sophia Sun analysis](https://sophiasun.substack.com/p/figmas-campus-ambassador-program) — MEDIUM, detailed peer analysis
- [Notion Campus Leaders program page](https://www.notion.so/Notion-Ambassador-Program-45448f9b8e704c7bab254bd505c4717c) — HIGH, official
- [Notion ambassador deep-dive (Community Inc.)](https://community.inc/deep-dives/community-everywhere-notion) — MEDIUM
- [v0 Ambassador Program announcement](https://vercel.com/blog/join-the-v0-ambassador-program) — HIGH, official (Vercel blog)
- [v0 Ambassador details + Dub referral + revshare](https://v0.app/ambassador) — HIGH, official
- [Developer ambassador programs list (geshan/developer-ambassador-programs)](https://github.com/geshan/developer-ambassador-programs) — MEDIUM, curated reference

Category patterns (cross-reference validation):
- [Top campus ambassador programs 2025 (Sophia Sun)](https://sophiasun.substack.com/p/campus-ambassador-programs-application) — MEDIUM
- [SocialLadder — Best campus ambassador programs 2026](https://www.socialladderapp.com/blog/best-campus-ambassador-programs-2024/) — LOW–MEDIUM

Form / application design:
- [Jotform student ambassador application template](https://www.jotform.com/form-templates/student-ambassador-application-form) — MEDIUM, industry convention
- [123FormBuilder student ambassador form](https://www.123formbuilder.com/free-form-templates/Student-Ambassador-Application-Form-3432241/) — MEDIUM
- [Higher Education Marketing — effective ambassador program design](https://www.higher-education-marketing.com/blog/how-to-design-and-implement-an-effective-student-ambassador-program-in-higher-education) — MEDIUM

Referral link patterns:
- [ReferralRock — what is a referral link](https://referralrock.com/blog/referral-link/) — MEDIUM
- [Buyapowa — referral codes vs referral links](https://www.buyapowa.com/blog/referral-codes-vs-referral-links/) — MEDIUM
- [Voucherify — referral code definition and best practices](https://www.voucherify.io/glossary/referral-code) — MEDIUM
- [GrowSurf — referral code formats](https://growsurf.com/blog/referral-code) — MEDIUM
- [Firebase traffic source attribution guide](https://medium.com/firebase-developers/firebase-traffic-source-attribution-guide-287d7de80d76) — MEDIUM, technical reference

Leaderboard + gamification anti-patterns (critical for the "no composite score / keep it private" recommendation):
- [Gainsight — Community gamification implementation guide](https://www.gainsight.com/blog/community-gamification/) — MEDIUM
- [Circle — Expert's guide to community gamification](https://circle.so/blog/community-gamification-guide) — MEDIUM
- [Bettermode — Gamification community engagement tips](https://bettermode.com/blog/gamification-community-engagement) — MEDIUM
- [CMX Hub — 2025 community industry trends report](https://www.cmxhub.com/community-industry-report) — MEDIUM
- [Ambassify — Gamification and leaderboards](https://www.ambassify.com/product/gamification) — LOW–MEDIUM (vendor)

Ambassador dashboard metrics:
- [Ambassify reporting & analytics](https://www.ambassify.com/product/reporting) — LOW–MEDIUM (vendor)
- [Fleexy — 6 KPIs to measure brand ambassador program success](https://fleexy.dev/blog/6-kpis-to-measure-brand-ambassador-program-success/) — LOW–MEDIUM

Onboarding research (Week-1 activation 3× retention claim):
- [NextBee — 7-day onboarding sequence](https://blog.nextbee.com/2026/01/08/ambassador-onboarding-the-7-day-sequence-that-gets-results/) — LOW (vendor marketing; use directionally, not as absolute fact)
- [BrandChamp — onboarding and incentivising participation](https://brandchamp.io/blog/onboarding-ambassadors-and-incentivising-participation/) — LOW (vendor)

---
*Feature research for: Student Ambassador Program v1 (Code With Ahsan community platform v6.0 milestone)*
*Researched: 2026-04-21*
*Consumer: `.planning/requirements/REQUIREMENTS.md` scoping for v6.0*
