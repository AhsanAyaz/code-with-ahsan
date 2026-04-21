# Project Research Summary

**Project:** Code With Ahsan — v6.0 Student Ambassador Program
**Domain:** Community platform feature add-on — multi-role user system + ambassador application / activity / presentation / dashboard subsystems, layered on an existing Next.js 16 + Firebase production app
**Researched:** 2026-04-21
**Confidence:** HIGH

## Executive Summary

v6.0 adds four new subsystems — **Application pipeline, Public Presentation, Activity tracking, and Dashboard + Leaderboard** — to the existing Code With Ahsan platform, gated by a prerequisite migration from single `role: string` to `roles: string[]` on `mentorship_profiles/{uid}`. **Every capability in the milestone can be built with packages already in `package.json`** — no new runtime dependencies are required. The only external asset added is a one-time `curl` of the Hipo `world_universities_and_domains.json` snapshot into `src/data/`.

The research converges strongly on two recommendations that the design spec should incorporate before phase planning: (1) the roles migration is **not** a one-PR change — it requires a staged 5-deploy sequence with a dual-claim compatibility window to avoid bricking live sessions when Firestore rules flip; and (2) **Discord role assignment on acceptance must break from the v2.0 non-blocking "log and forget" pattern** — acceptance is a promised real-time benefit, and silent failure strands ambassadors. `assignDiscordRole()` already exists at `src/lib/discord.ts:829`; the integration is 95% ready but needs a two-stage accept (Firestore commit + Discord retry UI) plus immutable `discordMemberId` storage.

Key risks cluster around two areas: the **foundation migration** (75 call sites + 95 permission tests + `firestore.rules` + custom-claims sync, all of which must stay in sync across deploys), and the **human tone of the program** — multiple researchers flag that auto-strikes, public leaderboards, and composite "activity scores" are community-program anti-patterns that destroy goodwill in small cohorts. v1 should ship human-in-the-loop strikes (cron flags → admin DM → admin confirms), keep the leaderboard private and cohort-scoped with raw per-category metrics, and defer leaderboard reveal by 4 weeks. These are opinionated departures from a literal reading of spec §9.1 that the requirements phase should explicitly confirm.

## Spec Corrections

The spec requires patching before phase planning begins. Concrete inaccuracies, in priority order:

1. **`users/{userId}` → `mentorship_profiles/{uid}`** — §9.4 and §9.1 #6 reference `users/...` as the primary profile collection. **This collection does not exist in the codebase.** Every role read/write today goes through `mentorship_profiles` (verified: `src/app/api/mentorship/profile/route.ts:25,85,111,166`, `src/types/mentorship.ts:12`, `scripts/migrate-skill-level.ts:25`). The roles array migration applies to `mentorship_profiles.role` → `mentorship_profiles.roles`. Every downstream spec reference (`users.roles`, `users.ambassador`, `users.{userId}.roles`) must be updated.
2. **§12 open question "Does Discord integration support programmatic role assignment for arbitrary users?"** — Answered YES. `src/lib/discord.ts:829` `assignDiscordRole()` already works against any guild member (used today in the mentor approval path, not just signup). No webhook/bot extension needed.
3. **§9.1 implicit "activity score" composite** — §7.3 and §8.1 both reference an "activity score" suggesting a composite metric. Research consensus (Gainsight, Circle, Bettermode, CMX) is that composite scoring is the #1 driver of gamified-community decay in small cohorts. Spec should be corrected to specify **raw per-category display** (referrals, events hosted, reports submitted), or the decision should be surfaced to requirements before schema is frozen.
4. **§5 "video doubles as organic marketing"** — Conflates *application* video (private pitch for selection) with *public cohort* video (marketing). These should be separate Storage paths with separate rules and separate upload moments. Applicants should not be forced to make their selection pitch public.
5. **§12 referral attribution window** — Research confirms 30 days as the industry default (Google Ads, Amazon Associates). Spec should lock this in rather than leaving it open.

## Key Findings

### Stack Decisions

**Zero new runtime dependencies.** Every capability uses packages already installed (Firebase SDK 12.6, Zod 4.3, raw `fetch` to Discord API v10). One-time data asset: `Hipo/university-domains-list` JSON snapshot for the `.edu` allowlist. Detail in [STACK.md](./STACK.md).

| Capability | Choice | One-line rationale |
|-----------|--------|--------------------|
| Video upload | Firebase Storage `uploadBytesResumable()` direct-from-client | Vercel's 4.5 MB body limit makes route-handler proxying a non-starter for 100 MB videos; pattern already in `MentorRegistrationForm.tsx` |
| Referral attribution | Plain first-party cookie `cwa_ref` (30d, `SameSite=Lax`) + Next.js middleware + post-signup hook | Firebase Auth has no referral concept; at 15–25 ambassadors / 150 signups there's no fraud surface justifying signed cookies; avoid OAuth-redirect param loss |
| `.edu` verification | Layered — regex `(\.edu|\.edu\.[a-z]{2,4}|\.ac\.[a-z]{2,4})$` + Hipo JSON allowlist fallback + admin student-ID photo fallback | Every npm package in this space is 3+ years stale; the data source itself (Hipo) is alive |
| Discord role assign | Extend existing `src/lib/discord.ts` — add `DISCORD_AMBASSADOR_ROLE_ID` constant + thin wrapper | Codebase uses raw `fetch` to Discord API v10, NOT `discord.js` — do not introduce `discord.js` |
| Form validation | Zod 4 server-side + raw `useState` client-side | Matches every other form in the codebase; `react-hook-form` is not used anywhere; one-off adoption creates inconsistency |
| Leaderboard aggregation | Denormalized counters on `mentorship_profiles.{uid}.ambassador.{referralCount,eventCount,strikeCount}`, transactionally incremented from Next.js API routes | `runTransaction` + `increment(1)` pattern matches existing bookings transactional writes; avoids Cloud Functions which are not deployed; supports `onSnapshot` for the dashboard |

**Zod 4 note for planners:** Zod 4.3 is installed. Use `z.email()`/`z.url()` (top-level), not Zod 3's `z.string().email()`. Error customization uses `{ error: "..." }`.

**What NOT to add:** `discord.js` (adds 15 MB + WebSocket gateway incompatible with Vercel serverless), `react-hook-form` (diverges from 5+ existing forms), `firebase-functions`/Cloud Functions (over-engineered for 25 users), any video SaaS (Mux/Cloudflare Stream — cost unjustified at this volume), signed-cookie libraries (trust model doesn't need them), stale academic-email npm packages.

### Feature Bucketing

Detail in [FEATURES.md](./FEATURES.md).

**Must have for v1 (table stakes):**
- Role system migration (blocks everything)
- Application form: identity fields, 2–3 short-answer prompts, 60–90s video **with upload OR external Loom/YouTube link alternative**, `.edu` allowlist + student-ID photo fallback
- Admin review panel (reuses mentorship admin pattern — list/filter/detail/accept/reject/notes)
- Acceptance/rejection email
- Discord role auto-assign on acceptance (two-stage, retry UI on failure)
- Ambassador badge on public profile
- Public `/ambassadors` cohort page (photo, name, university, bio, socials)
- Referral link system with short human-readable codes (e.g., `AHSAN-A7F2`) and signup attribution
- Private ambassador dashboard (personal stats + cohort leaderboard — **raw per-category metrics, cumulative with "this month" filter, no composite score**)
- Event hosting tracker (ambassador-owned CRUD)
- Monthly self-report form (drives strike counter)
- Human-in-the-loop strike counter (cron flags, admin confirms)
- Onboarding checklist on first dashboard visit (Week-1 activation → 3× retention signal)
- Ambassador of the Month field (admin-curated, not algorithmic)
- Alumni badge flag (cheap; term-end state transition)

**Should have — differentiators worth considering:**
- Interview scheduling on-platform (**defer** — Ahsan can Calendly/Meet link manually for 15–25 ambassadors)
- Featured events on public cohort page (**defer to v1.x** — launch cohort page with static bios, add once activity data exists)
- Strike-warning email (**defer** — keep manual until first real strike validates automation need)
- Referral click tracking (**defer to v1.x** — launch with conversion-only, add redirect endpoint after)

**Anti-features to avoid actively:**
- **Public leaderboard** (toxic in small cohorts — bottom-of-25 is psychologically worse than bottom-of-500)
- **Composite "activity score"** (arbitrary weights, incentivizes gaming, Gainsight/Circle/Bettermode all flag as #1 community-decay driver)
- **Real-time Discord activity scraping** (privacy, consent, rewards noise — spec §9.1 already flags as "optional future," keep it there)
- **Mandatory public posting of application video** (privacy asymmetry, filters out camera-shy-but-great candidates)
- **Auto-strike on missed commitments** (strikes only fire on missed monthly reports per spec §8.1 — do not backdoor auto-enforcement via Discord metrics, event-log misses, or anything else)
- **Long application form >10 min** (Jotform research: >50% completion drop, filters for free time not talent)
- **Tiered ambassador ranks in v1** (15–25 cohort doesn't give enough signal to tier fairly — spec §11 correctly defers to v2)
- **Cash/credit for referrals** (misaligns incentives; revshare stays workshops-only per spec §7.2)
- **Monthly leaderboard reset** (erases compounding effect of consistent work; penalizes early strong performers)

### Architecture at a Glance

The spec's 4-subsystem split maps cleanly onto Next.js App Router. Detail in [ARCHITECTURE.md](./ARCHITECTURE.md).

**Four subsystems:**

1. **Application** — `/ambassadors/apply` public form + Firebase Storage video + `/admin/ambassadors` review panel. Writes `applications/`, on accept appends `"ambassador"` to `mentorship_profiles.{uid}.roles` + writes `.ambassador` subdoc + fires Discord role assign.
2. **Public Presentation** — `/ambassadors` cohort page (server component, ISR-friendly) + `AmbassadorBadge` component wired into profile pages. Pure read — reads `mentorship_profiles` where `roles array-contains 'ambassador'`.
3. **Activity** — Referral system (`/api/ambassadors/referrals/resolve`, `/api/referrals/attribute`), event tracker, monthly report form, GitHub Actions strike-check cron. Writes `referrals/`, `events/`, `monthlyReports/`; transactionally increments denormalized counters.
4. **Dashboard + Leaderboard** — `/ambassadors/dashboard` (gated on `hasRole("ambassador")`), pure read-only consumer of Activity outputs via aggregation endpoint.

**Build order (consensus across research):**

```
PHASE 1: Foundation — Roles migration
   │ (5-deploy sequence; see Watch Out For #1)
   ▼
PHASE 2: Application subsystem (alone — needed to seed real ambassadors)
   │
   ├──▶ PHASE 3a: Public Presentation    ──┐ (parallel; independent subsystems)
   │                                        │
   └──▶ PHASE 3b: Activity subsystem     ──┤
                                            │
                                            ▼
                                   PHASE 4: Dashboard (read-only; must be last)
```

**Cannot reorder:** Phase 2 before Phase 1 corrupts data. Dashboard before Activity has no schema to aggregate. Phase 3a/3b can genuinely run in parallel — they share no state.

**Primary data-flow insight:** Two subsystems write `mentorship_profiles.{uid}.roles` — Application writes `+ambassador` on accept, Activity writes `-ambassador` on offboard. Route both through a single `src/lib/ambassador/roleMutation.ts` module (`grantAmbassadorRole(uid)` / `revokeAmbassadorRole(uid, reason)`) that does Firestore transaction + Discord calls + custom-claim refresh atomically. Makes the coupling explicit and tested in one place.

**File scope:** ~28 new TS files, ~32 modified files (foundation migration), ~4 wiring changes (navigation, layout wrapper, profile pages), 3 new scripts (migrate-roles-to-array, sync-custom-claims, ambassador-strike-check), 1 new GitHub Actions workflow. **Total ~68 files touched.**

### Watch Out For

Top pitfalls, ordered by severity. Detail in [PITFALLS.md](./PITFALLS.md).

1. **Rules-vs-app deploy race on the roles migration** (CRITICAL — Phase 1).
   100% of live mentor/admin sessions can be denied for up to 1 hour if `firestore.rules` flips to `"mentor" in token.roles` before `sync-custom-claims.ts` completes. **Fix: 5-deploy sequence** — (a) dual-read rules accepting `token.role == "mentor" || "mentor" in token.roles`, (b) backfill data, (c) dual-write app (writes both `role` and `roles`), (d) app-only (reads `roles`, keeps writing both), (e) rules-only (drop legacy). Leave dual-claim window for 2 weeks minimum. Deploy in non-emergency hours with rules rollback ready.

2. **Backfill migration loses or corrupts data** (CRITICAL — Phase 1).
   Legacy users with `role: null` become `roles: [null]`, breaking every `array-contains` query silently. Non-idempotent re-runs produce `roles: ["mentor", "mentor"]`. **Fix:** filter nulls (`[role].filter(r => r && typeof r === "string")`), paginate with document snapshots not cursors, make the script idempotent (skip if `roles` array already exists and is correct), dry-run + prod-snapshot verify counts match before committing.

3. **Test stubs silently passing with broken fixtures** (HIGH — Phase 1).
   95 permission tests all use `role: "mentor"` shape. If the type change keeps `role` as back-compat, tests pass while exercising zero of the new `roles.includes()` path. **Fix:** make the type change TypeScript-breaking (rename `role` → `roles`, change to `string[]`) so every fixture lights up red until migrated; migrate test fixtures in the same PR as the type change; verify coverage hits `roles.includes` paths.

4. **Discord role assignment silently fails on acceptance** (HIGH — Phase 2).
   The v2.0 "non-blocking Discord" pattern (log errors, don't throw) is correct for notifications but **wrong for acceptance** — acceptance is a promised real-time benefit, and silent failure strands ambassadors in Firestore-accepted-but-not-in-Discord limbo. Role hierarchy, stale usernames, and bot-left-server are all real. **Fix:** two-stage accept (Firestore commit succeeds independently; Discord retry UI in admin panel). Store immutable `discordMemberId` at application-time lookup, not just username. Rate-limit bulk accepts serially with 200ms spacing. Document role-hierarchy requirement in the runbook ("Ambassador role must sit immediately below bot's role"). Scheduled weekly reconciliation cron flags — does not auto-mutate.

5. **Auto-strikes destroy goodwill in v1** (HIGH — Phase 3b/Activity).
   Naive "if no report by month-end, increment strikes" fails on timezone edges, platform bugs, Eid/Christmas/exam absences, and reads as bureaucratic cruelty regardless. First cohort has no precedent to learn from; they learn by getting hit, and you lose the cohort's trust. **Fix:** cron *flags* for admin review, does not mutate. 7-day grace + friendly Discord DM reminder on day 3. Admin DMs in human voice before any strike status change. Per-ambassador timezone storage. Visible strike count on dashboard (no surprises). Whitelist-by-exception ("leave of absence" admin flag). Offboarding is a conversation + 7-day grace before Discord role removal.

6. **Leaderboard drift + anxiety + public shame** (MEDIUM — Phase 4/Dashboard).
   Real-time listeners flash on every write → compulsive refresh, toxic competition. Denormalized counters drift when admin edits history. Small-N absolute numbers ("5, 2, 1, 0, 0, 0…") publicly shame low performers. **Fix:** hourly-aggregated snapshots written by a cron job (pattern established in v2.0 for inactivity checks), visible "Updated 37 min ago" timestamp, refresh button for on-demand recompute. Leaderboard strictly private to the cohort (gated on `hasRole("ambassador")`). Show top 3 publicly + "Your position: #7" privately — nobody is visibly last. 4-week grace period before first reveal. No composite score.

7. **Applicant video privacy + storage rules** (MEDIUM — Phase 2).
   `storage.rules` currently denies all. Adding ambassador video is the first write path — easy to overshoot to `allow read: if request.auth != null` (every signed-in user can read every rejected applicant's video) or `allow read: if true` (Google-indexable). `getDownloadURL()` returns persistent public tokens that can't be revoked. **Fix:** path structure `applications/{applicantUid}/{applicationId}/video.mp4` so rules can check uploader UID. Deny-by-default, allow-write to self only, allow-read to self + admin only. Admin review uses **Admin SDK signed URL with 1h expiry** generated fresh per page load — never `getDownloadURL()`. Two separate video fields: private `applicationVideo` (signed-URL admin review only, 30-day retention cron after decline decision) vs optional public `cohortPresentationVideo` (separately uploaded post-acceptance, public, opt-in). No filenames with PII.

## Decisions to Surface in Requirements

These are not blockers but affect scope. Surface explicitly via `AskUserQuestion` during requirements gathering so the answer lands in `REQUIREMENTS.md` before roadmapping:

1. **Video submission: upload-only vs upload OR external link (Loom/YouTube unlisted)?**
   Recommendation: allow both. Reduces mobile-upload flakiness and many applicants already have hosted videos. ~½ day extra scope for meaningful applicant-experience win. Requires deciding how the admin review panel handles external links (embed vs "click to open").

2. **Leaderboard metric display: raw per-category vs composite "activity score"?**
   Spec §7.3/§8.1 implies composite. Research consensus is strongly against composite in small cohorts. Recommendation: raw per-category (referrals, events hosted, reports on-time), cumulative with "this month" filter. Shapes the schema — decide before Phase 4.

3. **Referral attribution window.**
   Recommendation: 30 days (industry default — Google Ads, Amazon Associates). Confirm so it lands in the cookie `Max-Age` and is documented in the commitment acceptance.

4. **Admin review: single reviewer (Ahsan) or multi-reviewer with voting?**
   Spec §12 open question. Affects review panel UI complexity (status machine for "accepted by 2/3 reviewers" etc.). Recommendation for v1: single reviewer; add multi-reviewer in v2 if cohort 2 scales. Confirm.

5. **Leaderboard reveal: visible from day 1 vs 4-week grace period?**
   Research strongly recommends 4-week grace (gives ambassadors time to start without immediate rank pressure — small-N leaderboards on day 1 create toxic early dynamics). Confirm.

Secondary questions (lower priority, surface if time permits):
- Enumerate "self-hosted" premium courses for the free-course benefit (spec §12 open question).
- Confirm ambassador-to-ambassador referral attribution policy (recommendation from research: allow pre-acceptance attribution; freeze once `roles.includes("ambassador")`).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against existing codebase + current Firebase/Discord docs; zero new runtime deps removes most uncertainty |
| Features | HIGH | Table-stakes patterns corroborated across GitHub Campus Experts / MLSA / Figma / Notion / v0; anti-feature patterns corroborated across Gainsight / Circle / Bettermode / CMX |
| Architecture | HIGH | All claims grounded in concrete files in the repo; migration risks enumerated with mitigations |
| Pitfalls | HIGH | Anchored to actual codebase line numbers + prior-milestone retrospective lessons (v2.0, v4.0, v5.0) |

**Overall confidence:** HIGH

---
*Research completed: 2026-04-21*
*Ready for roadmap: yes, after spec patching of `mentorship_profiles` collection name*
