---
phase: 05-dashboard-leaderboard-offboarding-alumni
verified: 2026-05-21T17:07:56Z
status: gaps_found
score: 1/5 invariants verified (1 PASS, 3 PARTIAL, 1 FAIL)
overrides_applied: 0
gaps:
  - truth: "Within first 4 weeks of cohort, leaderboard shows 'Leaderboard unlocks in N weeks' banner; after week 4 reveals top-3 + own rank, reads from hourly-aggregated snapshot with 'Updated N minutes ago' + manual refresh"
    status: failed
    reason: "Multiple cross-cutting issues. (a) API never returns `graceActive` boolean — UI reads `leaderboard.graceActive` which is always undefined; grace banner will NEVER display. (b) Each `top3` entry is missing the `rank` field — UI dereferences `.rank` on every entry and will render `#undefined`. (c) `ownRank` payload key mismatch — API returns `{ referralsRank, eventsRank, reportsRank }` (LeaderboardCategoryRanks type) but UI reads `ownRank.referrals/events/reportsOnTime` — every own-rank cell renders `—`. (d) Hourly-snapshot pipeline is dead — the scripts/ambassador-leaderboard-snapshot.ts cron writer exists but no GitHub workflow references it; route was refactored (commit 76ad6f7) to live computation with 5-min in-memory cache. SUMMARYs 05-02 and 05-03 claim hourly cron is wired — false."
    artifacts:
      - path: "src/app/api/ambassador/dashboard/leaderboard/route.ts"
        issue: "Response shape mismatch with LeaderboardPanel consumer: no graceActive flag computed; ownRank uses *Rank suffixes; entries lack rank field"
      - path: "src/app/ambassadors/dashboard/LeaderboardPanel.tsx"
        issue: "Reads `leaderboard.graceActive` (line 143), `entry.rank` (lines 228/233/238), and `ownRank.referrals/events/reportsOnTime` (lines 245-267) — none of which the API produces"
      - path: ".github/workflows/ambassador-activity-checks.yml"
        issue: "Missing hourly cron schedule (`0 * * * *`) and the `ambassador-leaderboard-snapshot` job entirely — only contains report-flag (daily 08:00 UTC) and discord-reconciliation (Monday 09:00 UTC) jobs"
      - path: "scripts/ambassador-leaderboard-snapshot.ts"
        issue: "Orphaned — file exists with snapshot-writing logic but no workflow invokes it; never produces snapshots in production"
    missing:
      - "Compute `graceActive = Date.now() < Date.parse(graceEndDate)` server-side and include in API response"
      - "Attach `rank: number` to each top-3 entry (look up uid in ambassadorRanks for the relevant category before stripping the map)"
      - "Rename `ownRank` keys to `{ referrals, events, reportsOnTime }` OR rename the consumer to read `*Rank` suffixes — pick one canonical shape"
      - "Either (a) re-add the leaderboard-snapshot hourly cron job to ambassador-activity-checks.yml AND switch the route to read leaderboard_snapshots/{cohortId} (matching the goal as written), OR (b) accept the deviation explicitly and remove the orphaned cron script + update spec to say 'live with 5-min cache'"
  - truth: "Onboarding checklist with per-item completion persisted on the ambassador subdoc"
    status: partial
    reason: "OnboardingChecklist PATCHes /api/ambassador/profile with `{ onboarding: { [key]: true } }`, but the PATCH handler validates with `AmbassadorPublicFieldsSchema` (Zod) which only accepts public fields (university, city, publicTagline, twitterUrl, githubUrl, personalSiteUrl, cohortPresentationVideoUrl) — `onboarding` is NOT a known key. The handler will either reject with 400 'Invalid body' (Zod fail) or fall through to 'No valid fields to update' (subdocUpdate empty)."
    artifacts:
      - path: "src/app/ambassadors/dashboard/OnboardingChecklist.tsx"
        issue: "Line 28-32 sends `{ onboarding: { [key]: true } }` to PATCH /api/ambassador/profile — endpoint does not accept this shape"
      - path: "src/app/api/ambassador/profile/route.ts"
        issue: "PATCH handler uses AmbassadorPublicFieldsSchema (no `onboarding` field); never writes to subdoc.onboarding"
    missing:
      - "Either add an `onboarding` field to AmbassadorPublicFieldsSchema with a dedicated write path on PATCH, OR introduce a new endpoint (e.g. PATCH /api/ambassador/onboarding) that updates subdoc.onboarding atomically"
  - truth: "Dashboard auth gate (DASH-01, DASH-02) — personal stats include referrals, events, reports on-time, strikes, cohort progress, next-report-due"
    status: partial
    reason: "Auth gate is correctly enforced (404 feature off, 401 unauth, 403 non-ambassador) — Invariant 1 *gating half* PASSES. However DashboardClient typing claims `data.stats.reportsOnTime` and PersonalStatsPanel renders `reportsOnTime`, but GET /api/ambassador/dashboard/me only returns `reportsCount` (no on-time tracking). Result: PersonalStatsPanel renders `undefined` for the Reports On Time stat at runtime."
    artifacts:
      - path: "src/app/api/ambassador/dashboard/me/route.ts"
        issue: "Returns `stats.reportsCount` only (line 84) — no `reportsOnTime` field"
      - path: "src/app/ambassadors/dashboard/DashboardClient.tsx"
        issue: "Type declares `stats.reportsOnTime: number` (line 19), passes `data.stats.reportsOnTime` to PersonalStatsPanel (line 116)"
      - path: "src/app/ambassadors/dashboard/PersonalStatsPanel.tsx"
        issue: "Renders `{reportsOnTime}` as stat-value — will display `undefined` when prop is missing"
    missing:
      - "Derive `reportsOnTime` server-side (e.g. count monthly_reports where `onTime == true`, or compare submittedAt vs deadline) and add to the /me response"
      - "OR: rename the UI prop to `reportsCount` to match the current API contract"
  - truth: "Term-completion alumni transition — atomically swaps ambassador → alumni-ambassador, sets active:false + endedAt, public_ambassadors.active:false, /ambassadors stops listing them"
    status: partial
    reason: "Server-side endpoint POST /api/ambassador/members/[uid]/alumni implements the atomic batch correctly (arrayUnion + arrayRemove via two sequential update() calls per Firestore Pitfall 1, subdoc { active:false, endedAt }, public_ambassadors.active:false NOT deleted per ALUMNI-03). AmbassadorBadge renders both variants. /ambassadors page queries active==true. BUT the admin cannot trigger this from the UI: `AlumniTransitionButton` requires `cohortEndDate !== null && cohortEndDate < now`, and `GET /api/ambassador/members/[uid]` returns the subdoc verbatim without joining the cohort doc — so `subdoc.cohortEndDate` is always undefined. Visibility gate at line 31-37 always returns null → button never renders. Endpoint is reachable only by direct API call. Known gap surfaced by 05-05 SUMMARY (Deviations section)."
    artifacts:
      - path: "src/app/api/ambassador/members/[uid]/alumni/route.ts"
        issue: "Endpoint logic is correct (passes); not consumed via UI"
      - path: "src/app/api/ambassador/members/[uid]/route.ts"
        issue: "GET returns `subdoc: normalizeTimestamps(subdocSnap.data())` only — does not join cohorts/{cohortId}.endDate"
      - path: "src/app/admin/ambassadors/members/[uid]/AlumniTransitionButton.tsx"
        issue: "Visibility gate (line 31-37) returns null when cohortEndDate is null; component is effectively dead UI"
      - path: "src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx"
        issue: "Passes `detail.subdoc.cohortEndDate ?? null` (line 190); subdoc.cohortEndDate never populated"
    missing:
      - "Extend GET /api/ambassador/members/[uid] to read cohorts/{subdoc.cohortId} and return cohort.endDate as an ISO string on the subdoc payload (or a sibling field `cohort: { endDate }`)"
      - "Update MemberDetailClient to read the new field"
  - truth: "2-strike offboarding — atomic role revoke + Discord role removal (with retry surface) + cohort membership ended + offboarding email; user does NOT receive alumni flag"
    status: verified
    reason: "POST /api/ambassador/members/[uid]/offboard correctly performs atomic batch: arrayRemove('ambassador') only, subdoc {active:false, endedAt, offboardedAt}, public_ambassadors deleted. Soft-failure post-commit steps for Discord removal + email (each wrapped in try/catch returning a boolean, no rollback). OffboardConfirmModal triggers it; MemberDetailClient surfaces a retry banner when discordRemoved=false. removeDiscordRole treats 404 as success (idempotent). ALUMNI-02 invariant verified: no alumni-ambassador arrayUnion in this route."
    artifacts:
      - path: "src/app/api/ambassador/members/[uid]/offboard/route.ts"
        issue: "VERIFIED — atomic batch + soft steps + ALUMNI-02 invariant honored"
      - path: "src/app/admin/ambassadors/members/[uid]/OffboardConfirmModal.tsx"
        issue: "VERIFIED — accessible <dialog>, calls offboard endpoint"
      - path: "src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx"
        issue: "VERIFIED — retryDiscord callback re-POSTs to offboard endpoint, handles 409 as success"
      - path: "src/lib/discord.ts:948"
        issue: "VERIFIED — removeDiscordRole handles 204/404 as success"
      - path: "src/lib/email.ts:702"
        issue: "VERIFIED — sendAmbassadorOffboardingEmail signature matches caller"
    missing: []
human_verification:
  - test: "Load /ambassadors/dashboard as a non-ambassador (mentor/mentee/unauthenticated) and as an ambassador"
    expected: "Non-ambassador: 404 (or client-side redirect to /profile). Authenticated ambassador: dashboard renders 5 stats, onboarding checklist, leaderboard panel"
    why_human: "Live auth context required (custom claims, ID token); requires running Firebase Auth"
  - test: "Verify 'Updated N minutes ago' label on the LeaderboardPanel updates after manual Refresh button click"
    expected: "Label resets to '0 minutes ago' or similar after Refresh resolves"
    why_human: "UI interaction + Firestore-backed timestamp behavior; cannot grep"
  - test: "Trigger the offboarding flow against a seeded test ambassador and confirm the offboarding email is delivered"
    expected: "Test inbox receives 'Your Ambassador Status — Important Update' email; admin panel shows no Discord retry banner if Discord call succeeded"
    why_human: "Email delivery (Mailtrap/Resend) + Discord bot live token integration"
  - test: "Onboarding checklist persistence — toggle joinedDiscord, reload dashboard, confirm flag survives"
    expected: "Currently expected to FAIL (PATCH endpoint rejects onboarding key); manual confirmation needed before declaring closure"
    why_human: "Confirms gap-2 reproduction before authoring closure plan"
---

# Phase 5: Dashboard, Leaderboard, Offboarding & Alumni — Verification Report

**Phase Goal (ROADMAP.md line 164):**
> An active ambassador can see their own impact at a glance and (after a 4-week grace period) compare against their cohort on a calm, hourly-updated leaderboard that shows raw per-category metrics (no composite score, nobody visibly last); a term-ending ambassador transitions cleanly to alumni with the right badge and retained recognition; a 2-strike offboarding atomically revokes the ambassador role, removes the Discord role, ends cohort membership, and fires the offboarding email.

**Verified:** 2026-05-21T17:07:56Z
**Status:** `gaps_found`
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (5 Success Criteria)

| # | Invariant | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Dashboard auth gate + 6 personal stats | PARTIAL | Auth gate verified (`src/app/api/ambassador/dashboard/me/route.ts:50-57`); but `reportsOnTime` stat is undefined at runtime — API returns `reportsCount` only |
| 2 | Onboarding checklist persists + Ambassador-of-the-Month banner | PARTIAL | Banner OK (`AmbassadorOfMonthBanner.tsx`); checklist PATCH never writes — wrong endpoint contract |
| 3 | 4-week grace banner + raw top-3 + own-rank + hourly snapshot + "Updated N minutes ago" + Refresh | FAIL | API never produces `graceActive`; entries lack `rank`; `ownRank` key mismatch; hourly cron orphaned (replaced by 5-min in-memory cache, contradicts goal text) |
| 4 | Term-completion alumni transition (atomic role swap, badge re-render, /ambassadors delisting) | PARTIAL | Endpoint correct; admin UI cannot trigger it because `subdoc.cohortEndDate` is never populated (known gap from 05-05 SUMMARY) |
| 5 | 2-strike offboarding (atomic, no alumni flag, Discord removal + retry surface, email) | PASS | Atomic batch + soft Discord/email + retry banner all wired; ALUMNI-02 invariant honored |

**Score:** 1 PASS / 3 PARTIAL / 1 FAIL = **1 of 5 invariants fully verified**

---

### Required Artifacts (Level 1–3)

| Artifact | Expected | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `src/app/ambassadors/dashboard/page.tsx` | Server shell delegating to client | ✓ | ✓ | ✓ | VERIFIED |
| `src/app/ambassadors/dashboard/DashboardClient.tsx` | Role-gate redirect, fetch /me, compose panels | ✓ | ✓ | partial — passes `reportsOnTime` which API doesn't return | PARTIAL |
| `src/app/ambassadors/dashboard/PersonalStatsPanel.tsx` | 5-stat DaisyUI grid | ✓ | ✓ | partial — receives undefined for reportsOnTime | PARTIAL |
| `src/app/ambassadors/dashboard/OnboardingChecklist.tsx` | 5-item checklist with PATCH persistence | ✓ | ✓ | broken — PATCH targets endpoint that rejects the payload | PARTIAL/HOLLOW |
| `src/app/ambassadors/dashboard/LeaderboardPanel.tsx` | Tab toggle + grace banner + top-3 + own rank + Updated N min + Refresh | ✓ | ✓ | broken — reads fields API doesn't produce | FAIL |
| `src/app/ambassadors/dashboard/AmbassadorOfMonthBanner.tsx` | Banner with cohort doc field | ✓ | ✓ | ✓ | VERIFIED |
| `src/app/api/ambassador/dashboard/me/route.ts` | Three-gate + parallel reads + Pitfall 6 derivation | ✓ | ✓ | ✓ (but contract drift on reportsOnTime) | PARTIAL |
| `src/app/api/ambassador/dashboard/leaderboard/route.ts` | Read snapshot, extract own rank | ✓ | ✓ (does live-compute instead of snapshot read) | broken — response shape ≠ UI contract | FAIL |
| `src/lib/ambassador/leaderboard.ts` | buildLeaderboardSnapshot + 1224 ranking + UTC month + grace math | ✓ | ✓ | ✓ | VERIFIED |
| `scripts/ambassador-leaderboard-snapshot.ts` | Hourly cron writer | ✓ | ✓ | ✗ no workflow invokes it (orphaned by commit 76ad6f7) | ORPHANED |
| `.github/workflows/ambassador-activity-checks.yml` | Hourly leaderboard-snapshot job | ✗ (job NOT present) | — | — | MISSING |
| `firestore.rules` (leaderboard_snapshots block) | `allow read, write: if false` | ✓ (`firestore.rules:263-265`) | ✓ | ✓ | VERIFIED |
| `src/app/api/ambassador/members/[uid]/offboard/route.ts` | Atomic batch + Discord + email + no alumni | ✓ | ✓ | ✓ | VERIFIED |
| `src/app/api/ambassador/members/[uid]/alumni/route.ts` | Atomic arrayUnion + arrayRemove + active:false + public:active:false | ✓ | ✓ | ✓ at API layer; UI cannot trigger | VERIFIED (server) / ORPHANED (UI) |
| `src/app/admin/ambassadors/members/[uid]/OffboardConfirmModal.tsx` | Accessible <dialog>, confirms + posts | ✓ | ✓ | ✓ | VERIFIED |
| `src/app/admin/ambassadors/members/[uid]/AlumniTransitionButton.tsx` | Cohort-end gate, confirm, POST | ✓ | ✓ | ✗ — always hidden because cohortEndDate is always null | ORPHANED |
| `src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx` | Wires both components + Discord retry banner | ✓ | ✓ | partial — alumni branch unreachable | PARTIAL |
| `src/lib/discord.ts` (removeDiscordRole) | Idempotent role removal | ✓ (`src/lib/discord.ts:948`) | ✓ | ✓ | VERIFIED |
| `src/lib/email.ts` (sendAmbassadorOffboardingEmail) | Email helper | ✓ (`src/lib/email.ts:702`) | ✓ | ✓ | VERIFIED |
| `src/components/ambassador/AmbassadorBadge.tsx` | Both variants (ambassador / alumni-ambassador) | ✓ | ✓ | ✓ | VERIFIED |

---

### Key Link Verification

| From | To | Via | Status | Detail |
|------|-----|-----|--------|--------|
| DashboardClient.tsx | GET /api/ambassador/dashboard/me | authFetch | WIRED (with contract drift on reportsOnTime) | Fetch + response handling present |
| LeaderboardPanel.tsx | GET /api/ambassador/dashboard/leaderboard | authFetch | NOT_WIRED (broken contract) | Reads `graceActive`, `entry.rank`, `ownRank.referrals` — API never produces these fields |
| OnboardingChecklist.tsx | PATCH /api/ambassador/profile | authFetch | NOT_WIRED | PATCH handler rejects `{ onboarding: {...} }` payload (Zod schema doesn't accept it) |
| OffboardConfirmModal | POST /api/ambassador/members/[uid]/offboard | fetch + adminHeaders | WIRED | All response paths handled, retry banner surfaces on discordRemoved=false |
| AlumniTransitionButton | POST /api/ambassador/members/[uid]/alumni | fetch + adminHeaders | WIRED at code level, but visibility gate prevents render | Effectively unreachable |
| .github/workflows/ambassador-activity-checks.yml | scripts/ambassador-leaderboard-snapshot.ts | (no invocation) | NOT_WIRED | Workflow has no hourly schedule and no leaderboard-snapshot job |
| buildLeaderboardSnapshot (live mode) | API route response | direct call + 5min cache | WIRED but contract violates spec | Replaces snapshot-read; goal says "hourly-aggregated snapshot" |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data? | Status |
|----------|---------------|--------|---------------------|--------|
| PersonalStatsPanel.reportsOnTime | prop from DashboardClient | `data.stats.reportsOnTime` (does NOT exist) | NO (undefined) | HOLLOW_PROP |
| LeaderboardPanel.graceActive | API field | route never emits | NO (undefined) | DISCONNECTED |
| LeaderboardPanel.top3[].rank | API field | LeaderboardEntry has no rank | NO (undefined) | DISCONNECTED |
| LeaderboardPanel.ownRank.referrals/events/reportsOnTime | API field | route returns referralsRank/eventsRank/reportsRank | NO (undefined) | DISCONNECTED |
| OnboardingChecklist persistence | Firestore subdoc.onboarding | PATCH /api/ambassador/profile (Zod rejects) | NO (writes ignored) | DISCONNECTED |
| Leaderboard snapshot collection | hourly cron | no workflow runs it | NO (snapshot never written) | DISCONNECTED |
| Dashboard /me referrals/events/reports counts | Firestore aggregations | parallel `.count().get()` | YES | FLOWING |
| Offboard endpoint role removal | profile.roles | `FieldValue.arrayRemove("ambassador")` | YES | FLOWING |
| Alumni endpoint role swap | profile.roles | arrayUnion + arrayRemove batch | YES | FLOWING |

---

### Behavioral Spot-Checks

Skipped — no running server. The contract mismatches are detectable by static code reading; behavioral confirmation routed to Human Verification.

---

### Probe Execution

Skipped — no probe scripts declared in PLAN or SUMMARY for this phase.

---

### Requirements Coverage

| Req | Description (abbrev.) | Status | Evidence |
|-----|----------------------|--------|----------|
| DASH-01 | `/ambassadors/dashboard` ambassador-gated; others 404 | SATISFIED | `dashboard/me/route.ts:50-57`; DashboardClient role-redirect at line 46-48 |
| DASH-02 | Stats: referrals, events, reports-on-time, strikes, cohort progress, next-report-due | BLOCKED | API returns reportsCount only (no on-time tracking); cohort progress also absent — only cohort fields are name + startDate + endDate + ambassadorOfTheMonth |
| DASH-03 | Raw per-category metrics, no composite score | SATISFIED | `leaderboard.ts:24-42` — three categories, no aggregate |
| DASH-04 | Cumulative (default) + this-month views | SATISFIED (server) / BROKEN (UI consumes mismatched shape) | route supports `?view=`; LeaderboardPanel has tab UI |
| DASH-05 | Top-3 per category + own private rank, nobody visibly last | BLOCKED | Server emits top-3 correctly + ownRank, but key-shape mismatch causes UI to render "—" for own rank and `#undefined` for ranks |
| DASH-06 | First-4-weeks grace banner | BLOCKED | `buildLeaderboardSnapshot` computes graceEndDate; API does NOT compute `graceActive`; UI never displays banner |
| DASH-07 | Hourly snapshot + "Updated N min ago" + manual refresh | BLOCKED | Hourly cron not wired (orphaned script); intentional refactor to 5-min cache (commit 76ad6f7). "Updated N min" + Refresh button present in UI but reading cache-write time, not hourly snapshot |
| DASH-08 | Onboarding checklist with per-item state on subdoc | BLOCKED | PATCH endpoint contract mismatch — onboarding writes silently fail (or 400) |
| DASH-09 | Ambassador of the Month from cohort doc | SATISFIED | `dashboard/me/route.ts:94`; AmbassadorOfMonthBanner.tsx renders |
| ALUMNI-01 | Atomic ambassador → alumni-ambassador role swap | SATISFIED (server) | `alumni/route.ts:58-79` — atomic batch with sequential arrayUnion + arrayRemove |
| ALUMNI-02 | Offboarded-by-strike does NOT get alumni flag | SATISFIED | `offboard/route.ts:68-77` — only arrayRemove("ambassador"), no arrayUnion |
| ALUMNI-03 | "Alumni Ambassador" badge + delisted from /ambassadors | SATISFIED | AmbassadorBadge renders both variants; `/ambassadors/page.tsx:32` filters `active == true`; alumni endpoint sets `public_ambassadors.active = false` (not deletion per ALUMNI-03) |
| DISC-05 | Discord role removed on offboarding; failures surface for retry | SATISFIED | `offboard/route.ts:80-91` + MemberDetailClient retry banner (line 152-167) + `removeDiscordRole:948` idempotent on 404 |
| EMAIL-04 | Offboarding email fires | SATISFIED | `offboard/route.ts:94-106` + `email.ts:702` helper |

**Coverage totals:** 8 SATISFIED · 6 BLOCKED · 0 needs-human-only.

---

### Anti-Patterns Found

| File | Line(s) | Pattern | Severity | Impact |
|------|---------|---------|----------|--------|
| `src/app/ambassadors/dashboard/DashboardClient.tsx` | 19 | Type field `reportsOnTime: number` not produced by API | WARNING | Silent contract drift — TypeScript can't catch JSON shape mismatches |
| `src/app/ambassadors/dashboard/LeaderboardPanel.tsx` | 17,18,228,233,238,245-267 | Reads multiple fields the API doesn't emit | BLOCKER | UI is hollow at the rank/grace-display level |
| `src/app/ambassadors/dashboard/OnboardingChecklist.tsx` | 28-32 | PATCHes endpoint that rejects the payload | BLOCKER | Persistence layer disconnected — checklist resets on every reload |
| `src/app/api/ambassador/dashboard/leaderboard/route.ts` | 60-72 | Response shape doesn't match consumer contract (no graceActive, no rank in entries, ownRank key naming) | BLOCKER | Causes invariant 3 failure |
| `scripts/ambassador-leaderboard-snapshot.ts` | whole file | Orphaned — no workflow invokes it | INFO | Dead code (matches refactor commit 76ad6f7) |
| `src/app/admin/ambassadors/members/[uid]/AlumniTransitionButton.tsx` | 31-37 | Visibility gate effectively always hides the button | BLOCKER | Admin cannot trigger alumni transition via UI |
| `.planning/phases/05-dashboard-leaderboard-offboarding-alumni/05-02-SUMMARY.md` | "What was built" section | Claims hourly schedule + leaderboard-snapshot job were added to workflow file — false | INFO | SUMMARY narrative drift (also true for 05-03 SUMMARY "reads single leaderboard_snapshots/{cohortId} doc") |

No `TBD`, `FIXME`, or `XXX` markers were found in modified files (debt-marker gate clean).

---

### Human Verification Required

1. **Dashboard auth gate against live Firebase Auth**
   - **Test:** Visit `/ambassadors/dashboard` while signed in as (a) mentor (b) mentee (c) unauthenticated (d) ambassador with valid claim
   - **Expected:** (a)(b)(c) → 404 from API + redirect to `/profile` from client; (d) loads dashboard
   - **Why human:** Custom-claim ID-token issuance requires running Firebase Auth

2. **LeaderboardPanel "Updated N minutes ago" + manual Refresh**
   - **Test:** Load dashboard, note timestamp, click Refresh
   - **Expected:** Label updates to ~0 minutes after Refresh completes
   - **Why human:** UI interaction + cache invalidation timing

3. **Offboarding email delivery**
   - **Test:** Trigger offboarding flow against seeded test ambassador
   - **Expected:** Test inbox receives "Your Ambassador Status — Important Update" email; admin panel shows no Discord retry banner if Discord call succeeded
   - **Why human:** Email delivery (Resend) + live Discord bot token integration

4. **Onboarding checklist persistence reproduction**
   - **Test:** Open dashboard, click "Mark as done" on joinedDiscord, reload page
   - **Expected:** Checkbox should remain checked — currently expected to FAIL (PATCH endpoint rejects body)
   - **Why human:** Confirms gap-2 reproduction in production before closure plan is written

---

### Gaps Summary

Phase 5 delivers a complete backend for offboarding (invariant 5) and a server-correct alumni endpoint (invariant 4 server-side), but the dashboard surface has multiple broken UI ↔ API contracts:

- **Contract drift between Plan 05-03 (API) and Plan 05-05 (UI).** The LeaderboardPanel was authored expecting `graceActive`, per-entry `rank`, and `ownRank.{referrals,events,reportsOnTime}` — none of which the leaderboard route emits. The PersonalStatsPanel expects `reportsOnTime` but `/me` returns `reportsCount` only.

- **OnboardingChecklist persistence dead.** The component PATCHes `/api/ambassador/profile` with an `{ onboarding: {...} }` body, but the existing handler is a public-fields editor (Phase 3 D-03/D-05) that doesn't accept this key — Zod will reject or the diff will be empty. DASH-08 is unimplemented end-to-end despite the UI component existing.

- **Hourly snapshot pipeline broken/abandoned.** The 05-02 SUMMARY claims a `cron: '0 * * * *'` was added to the workflow and an `ambassador-leaderboard-snapshot` job — neither is present. A later commit (76ad6f7) explicitly refactored the route to live computation with a 5-min in-memory cache, orphaning the snapshot script. This is a scope deviation from the goal text ("hourly-updated leaderboard... reads from hourly-aggregated snapshot") that needs explicit acceptance (override) or rollback.

- **Alumni admin UI dead.** `AlumniTransitionButton` requires `subdoc.cohortEndDate` to be in the past, but GET `/api/ambassador/members/[uid]` does not join cohorts/{cohortId} to expose endDate. Known gap surfaced by 05-05 SUMMARY itself ("Deviations: cohortEndDate passed as null"). Admin can call `/api/ambassador/members/[uid]/alumni` only via direct API request — no UI path.

- **Invariant 5 (2-strike offboarding) is the one fully-verified invariant.** Atomic batch, soft-step Discord + email, retry banner, ALUMNI-02 distinct-lifecycle invariant all hold.

---

## Overall Verdict

**FAIL — gaps_found.** Phase 5 ships invariant 5 cleanly, but invariants 1–4 each have UI-layer or contract gaps that prevent the dashboard from rendering correct data and prevent the admin from triggering the alumni transition. Recommend a closure plan covering: (a) /me payload `reportsOnTime` + cohort progress derivation, (b) /leaderboard payload shape alignment (graceActive + entry.rank + ownRank key naming), (c) PATCH onboarding write path, (d) /api/ambassador/members/[uid] cohort.endDate join, and (e) explicit decision on hourly-snapshot vs live-cache architecture (with workflow + script cleanup if the cache path is accepted).

---

_Verified: 2026-05-21T17:07:56Z_
_Verifier: Claude (gsd-verifier)_
