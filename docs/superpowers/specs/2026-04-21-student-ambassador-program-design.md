# Student Ambassador Program — Design

**Status:** Approved (brainstorm)
**Date:** 2026-04-21
**Owner:** Ahsan Ayaz
**Scope:** First cohort (v1) of the Code With Ahsan Student Ambassador Program

## 1. Purpose

Create a 6-month ambassador program that simultaneously:

1. **Grows the community's reach** by recruiting enrolled university students who evangelize Code With Ahsan at their campuses and local networks.
2. **Activates the existing 4800+ Discord community** through ambassador-led study groups, events, onboarding of newcomers, and general presence.

Leadership development is the mechanism: ambassadors receive structured responsibilities, recognition, and career-building benefits in exchange for driving growth and activation. The program explicitly treats "student leadership" as the means, not a separate goal.

## 2. Non-goals

- Paid internship or structured employment program
- Replacement for community moderators (ambassadors are evangelists/activators, not primary moderators)
- Certification or academic credit program
- Broad "Community Ambassador" track for non-students (considered for v2 if v1 succeeds)
- Building advanced tooling (certificates, automated revshare accounting) in v1 — these stay manual until volume justifies investment

## 3. Cohort shape

- **Size:** 15–25 ambassadors in the first cohort
- **Term:** 6 months, fixed (not rolling)
- **Title:** "Student Ambassador"
- **Cohort numbering:** Ambassadors are attached to a named cohort (e.g., "Cohort 1 — Spring 2026") so alumni can be identified later

Fixed-term is intentional: it provides a clean exit ramp for underperformers without awkward firing, creates FOMO for the next cohort, and gives the program a clear rhythm.

## 4. Eligibility

A candidate must meet **all** of the following:

- Currently enrolled in a university/college (any degree level). Preferred verification: valid `.edu` (or national equivalent, e.g., `.edu.pk`, `.ac.uk`) email address at application time. **Fallback:** for universities without a standardized academic TLD, a student ID photo upload is accepted and verified by the admin reviewer. Global openness must not be gated on email-TLD alone.
- Has been a member of the Code With Ahsan Discord for **≥ 30 days** at application time.
- Accepts the program commitments (Section 6) in writing as part of the application.

Open worldwide. No age floor beyond "enrolled student." Non-students are excluded from this cohort; a separate track may be introduced in v2.

## 5. Selection process

1. **Application form** (public page on the platform): motivation, relevant experience, a 2–3 sentence pitch for what they'd do as an ambassador, Discord handle, `.edu` email, university + year of study, home country/city.
2. **60–90 second video submission** uploaded with the application. The video doubles as organic marketing — applicants are encouraged (not required) to also post it publicly, and the best videos get amplified by the Code With Ahsan channels. This filters for communication skills, which is the core ambassador competency.
3. **Admin review** in the admin panel by Ahsan (and optionally a small review committee): shortlist → optional 15-minute interview with top finalists → final accept/reject.

Applicants get a pass/fail email outcome. Accepted applicants receive onboarding steps (Discord role, swag form, dashboard walkthrough).

## 6. Commitments

Each ambassador commits to roughly **3–4 hours per week** across the following baseline activities:

1. **Host ≥ 1 event or study group per month.** Can be a Discord voice session, an in-person study jam, a workshop intro, etc.
2. **Active on Discord.** Welcome newcomers, answer questions, attend at least two community events per month.
3. **Represent the community at ≥ 1 campus/local event during the term.** Can be a lunch talk at their university club, a flyer campaign, a booth at a campus fair — low bar, just one real touchpoint.
4. **Refer members via their tracked referral link.** Soft target: ~5 referred signups across the term. This is a directional goal, not a strict quota — it feeds the dashboard and shows up on the private leaderboard.

Stretch activities (not required, but rewarded via recognition/benefits): full workshop delivery, blog post/video content, mentoring a junior community member.

## 7. Benefits

### 7.1 Baseline (all ambassadors)

Low-cost, high-perceived-value benefits guaranteed to every accepted ambassador.

**Granted on acceptance:**

- Exclusive "Ambassador" role on Discord
- Ambassador badge on their Code With Ahsan platform profile
- Private `#ambassadors` Discord channel (cohort community + staff)
- Monthly 1:1 or group call with Ahsan
- Early access to new platform features / beta program
- First-pick on open-source project leadership roles within the community
- Listed on the public `/ambassadors` page (photo, bio, social links)
- Free access to all **self-hosted** Code With Ahsan premium courses during the term (Packt books and other externally-published material are **excluded** because the author would incur direct cost; up to one externally-published book may optionally be gifted to top performers at term end as a stretch perk)

**Granted on term completion (subject to not being offboarded):**

- LinkedIn recommendation (delivered by Ahsan)
- Certificate of completion (PDF)

### 7.2 Selective / stretch

- **Swag kit** at term start (t-shirt + stickers + notebook). Delivered globally; shipping address collected via external form.
- **Virtual ambassadors summit** once per term (online, free). In-person summit deferred to v2.
- **Revenue share on paid workshops they bring in:** **25%** of net revenue (net of platform fees and any speaker payout). Paid out at end of term or end of workshop, whichever comes first. Tracked manually in v1.
- **Featured at least once** on Code With Ahsan socials / YouTube during the term.

### 7.3 Pure recognition ($0)

- "Ambassador of the Month" spotlight in the private channel and on socials
- Private leaderboard visible to the cohort (referrals, events hosted, activity score)
- Permanent "Alumni Ambassador" badge retained after term ends

## 8. Accountability

### 8.1 Tracking mechanics

- **Automatic signals** surfaced on the dashboard (Section 9):
  - Referral conversions via the ambassador's unique link
  - Events logged in the event tracker
  - Self-reported data from the monthly report
  - (Optional future) Discord activity score pulled via bot integration
- **Monthly self-report form:** each ambassador fills out a short form covering what they did, blockers they hit, and what they need from Ahsan. Missing a monthly report counts as one strike.

**The monthly report is the primary accountability surface.** Failing to deliver on the commitments in Section 6 (events, referrals, campus touchpoint, Discord presence) does not itself generate an automatic strike — it is visible on the dashboard and is the subject of the monthly 1:1 call. This is deliberate: the strike system protects against *absenteeism*, while the 1:1 call addresses *under-delivery*. Planning should not design a stricter auto-enforcement system without an explicit policy change.

### 8.2 Offboarding policy

**Two-strike rule.** Missing two monthly check-ins during the term results in removal from the program, with a 30-day advance notice after the first strike. The two-strike rule is deliberately firm: it protects the value of the ambassador role for those who are putting in the work, and it lets underperformers exit with dignity rather than being judged subjectively at term end.

No mid-term review call is required in v1; the strike system and dashboard provide enough signal. This can be tightened in v2 if needed.

## 9. Platform architecture (v1 build)

The core loop — **apply → get accepted → track activity → see leaderboard** — lives on the Code With Ahsan platform because it **is** the product. Operational edges (certificates, swag shipping, revshare accounting) are deliberately kept manual for v1 to reduce build scope.

### 9.1 In scope (build on Next.js + Firebase)

| # | Feature | Purpose | Notes |
|---|---------|---------|-------|
| 1 | `/ambassadors/apply` application form page | Public form with .edu verification + video upload | Uses Firebase Storage for video; Firestore for application record |
| 2 | Admin review panel | List, review, accept/reject applications | Reuses existing admin auth pattern |
| 3 | Ambassador badge on user profile | Public indicator | `roles` array on user doc contains `"ambassador"`; UI reads it |
| 4 | Public `/ambassadors` page | Lists current cohort (photo, bio, university, socials) | Static-ish page reading cohort collection |
| 5 | Referral link/code system | Unique link per ambassador; tracks signups | Attribution written to Firestore on signup; aggregated in dashboard |
| 6 | Private ambassador dashboard | Each ambassador sees their own stats + cohort leaderboard | Gated to `roles` array containing `"ambassador"`; reads aggregated activity |
| 7 | Monthly self-report form | Simple form → Firestore | Drives the 2-strike counter |
| 8 | Event hosting tracker | Ambassadors log events they ran (date, type, attendance estimate, link) | Feeds dashboard |
| 9 | Discord role auto-assign | On application approval, assign Ambassador role in Discord | Extends existing Discord integration (README confirms this already exists) |

### 9.2 Out of scope for v1

- **Workshop revenue tracking (25% revshare):** Handled manually via Stripe exports + spreadsheet. Not enough volume in cohort 1 to justify building.
- **Certificate generator:** Handled manually in Canva / a design tool at term end for cohort 1 (≤ 25 certificates).
- **Swag address collection:** External form (Google Form or Typeform). Not worth building a one-off form flow.

### 9.3 Component boundaries

- **Application subsystem:** application form page + admin review panel + acceptance workflow. Interface: writes `applications` and (on accept) appends `"ambassador"` to `mentorship_profiles.{uid}.roles` + writes `mentorship_profiles.{uid}.ambassador` subdoc + `cohorts` docs. Consumers of its output: Discord integration, dashboard, public `/ambassadors` page.
- **Activity subsystem:** referral system + event tracker + monthly report form. Interface: writes activity events keyed by `ambassadorId` + `cohortId`. Consumer: dashboard.
- **Dashboard subsystem:** reads the above, aggregates per ambassador, renders individual view + cohort leaderboard. Pure read-side; does not own data.
- **Public presentation:** `/ambassadors` page (read-only view of accepted cohort members) and profile badge rendering (reads `role` flag). Separate from the dashboard because it has different access requirements and change cadence.

Each subsystem is testable in isolation: application subsystem can be tested without activity data; activity subsystem can be tested by seeding fake ambassadors; dashboard can be tested by seeding fake activity.

### 9.4 Data model sketch

- `applications/{applicationId}`: applicant info, video URL, status, reviewerNotes, cohortTarget
- `cohorts/{cohortId}`: name, startDate, endDate, maxSize, status (`upcoming | active | closed`)
- `mentorship_profiles/{uid}.roles`: **array of role strings** (e.g., `["mentor", "ambassador"]`). Replaces the previous single `role` field on the same document. A user can hold multiple roles simultaneously — an ambassador can also be a mentee, a mentee can also mentor others, etc. All role checks become array-membership checks (`roles.includes('ambassador')`), and Firestore queries use `array-contains`. Migration of existing `role: string` data to `roles: string[]` (on `mentorship_profiles/{uid}`, the same document) is a prerequisite task in the first phase. This migration must follow a staged 5-deploy sequence with a dual-claim window to avoid bricking live mentor/admin sessions — see research summary and PITFALLS.md for the sequence.
- `mentorship_profiles/{uid}.ambassador`: `{ cohortId, strikes, joinedAt, endedAt, active, discordMemberId }` subdoc (v1 assumes a single ambassador tenure per user; `discordMemberId` is captured at application-time lookup so acceptance doesn't depend on the username being current. Evolving to an array or subcollection is a v2 planning concern if alumni are re-invited to later cohorts.)
- `referrals/{referralId}`: `{ ambassadorId, referredUserId, convertedAt, sourceLink }`
- `events/{eventId}`: `{ ambassadorId, date, type, attendees, link, notes }` (ambassador-hosted events only; separate from platform-wide events)
- `monthlyReports/{reportId}`: `{ ambassadorId, month, cohortId, text, submittedAt }`

## 10. Operational notes

- **Launch runway:** application window 4 weeks; review + interview window 2 weeks; cohort onboarding week 1 of term.
- **Manual operations (v1):** swag fulfillment, certificate generation, revshare calculation + payout, LinkedIn recommendations, social feature scheduling.
- **Communication:** private `#ambassadors` Discord channel is the primary ongoing channel; monthly call is the structured checkpoint.

## 11. Success criteria for v1

The program is considered successful at term end if:

- ≥ 75% of ambassadors complete the term (i.e., not offboarded via strikes)
- The cohort collectively hosts ≥ 60 events (avg ≥ 3 per ambassador over 6 months, above the 1/month baseline)
- At least 150 new **platform signups** are attributed to ambassador referral links (platform signup is the attribution surface; Discord-join attribution is materially harder to track and is out of scope for v1's referral system — see Section 9.1 Feature #5)
- At least 3 paid workshops are brought in by ambassadors (validating revshare mechanic)
- Post-term survey: ≥ 80% of ambassadors say they'd recommend the program to another student

If these thresholds are met, v2 should explore: larger cohort, tiered structure (Campus Rep → Lead Ambassador), in-person summit, and building the deferred v1 tooling (automated certificates, revshare dashboard).

## 12. Open questions (for implementation planning)

**Resolved during v6.0 research (2026-04-21):**

- ~~Does the existing Discord integration support programmatic role assignment for arbitrary Discord users?~~ **Answered YES.** `src/lib/discord.ts:829` `assignDiscordRole()` already works against any guild member. No webhook/bot extension required. See `.planning/research/ARCHITECTURE.md`.
- ~~Referral attribution window?~~ **Answered: 30 days** (industry default — Google Ads, Amazon Associates). Lands in the `cwa_ref` cookie `Max-Age`.
- ~~Ambassador-to-ambassador referrals?~~ **Answered:** allow pre-acceptance attribution; freeze once `roles.includes("ambassador")` (referred ambassadors start clean from acceptance).

**Still open — surfaced to requirements phase for explicit decision:**

- **Video submission mode:** upload-only vs upload OR external link (Loom / unlisted YouTube)? Research recommends accepting both to reduce mobile-upload flakiness.
- **Leaderboard metric display:** raw per-category (referrals / events / reports) vs composite "activity score"? Research strongly recommends raw (composite scoring flagged as #1 community-decay driver in small cohorts).
- **Leaderboard reveal:** visible from day 1 vs 4-week grace period? Research recommends grace period (small-N day-1 leaderboards create toxic early dynamics).
- **Admin review:** single reviewer (Ahsan) or multi-reviewer with voting? Affects admin panel state machine.
- **Self-hosted premium courses enumeration:** which existing platform courses are "self-hosted" vs. externally published (Packt, Amazon)? Needed before the "free course access" benefit is delivered.

These are planning-phase decisions for the **v6.0 Student Ambassador Program** milestone (GSD milestone kicked off 2026-04-21).
