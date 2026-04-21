# Architecture Research — Student Ambassador Program v1 (v6.0)

**Domain:** Community platform — multi-role user system + ambassador activity/attribution tracking
**Researched:** 2026-04-21
**Confidence:** HIGH (existing codebase is authoritative; all findings grounded in concrete files)

This document answers: **How does the Student Ambassador Program integrate with the existing Code With Ahsan platform?** Every claim traces to a concrete file in the repo.

---

## 1. System Overview — New Subsystems Inside the Existing App

```
┌────────────────────────────────────────────────────────────────────────┐
│                      NEXT.JS 16 APP ROUTER (existing)                  │
│                                                                        │
│  PUBLIC                        USER                  ADMIN             │
│  ┌──────────────┐   ┌─────────────────────┐   ┌──────────────────┐    │
│  │/ambassadors  │   │/ambassadors/apply   │   │/admin/ambassadors│    │
│  │  (cohort)    │   │/ambassadors/dashbd  │   │  /[appId]/review │    │
│  │              │   │  /report (monthly)  │   │  (review panel)  │    │
│  │Profile badge │   │  /events (log form) │   │/admin/referrals  │    │
│  │  (NEW)       │   │                     │   │  (attribution)   │    │
│  └──────┬───────┘   └──────────┬──────────┘   └─────────┬────────┘    │
│         │                      │                        │              │
├─────────┼──────────────────────┼────────────────────────┼─────────────┤
│                                                                        │
│       PERMISSIONS MODULE  ←──  existing src/lib/permissions.ts         │
│       (MIGRATED to roles:string[])                                     │
│                                                                        │
│       DISCORD MODULE      ←──  existing src/lib/discord.ts             │
│       (+ DISCORD_AMBASSADOR_ROLE_ID + #ambassadors channel)            │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                      API ROUTES (src/app/api/)                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ /api/ambassadors/apply        POST   — creates application      │  │
│  │ /api/admin/ambassadors/[id]   PUT    — review + Discord assign  │  │
│  │ /api/ambassadors/referrals    POST   — record click             │  │
│  │ /api/referrals/attribute      POST   — bind to signed-up user   │  │
│  │ /api/ambassadors/events       GET/POST                          │  │
│  │ /api/ambassadors/reports      GET/POST                          │  │
│  │ /api/ambassadors/dashboard    GET    — aggregated read          │  │
│  │ /api/ambassadors              GET    — public cohort list       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│                         DATA (Firestore)                               │
│                                                                        │
│  EXISTING (MIGRATED):                      NEW (v6.0):                 │
│  mentorship_profiles.role → roles[]        applications                │
│    (primary user doc — note: it is           (+ storage: videos)       │
│     NOT `users/`, it is                    cohorts                     │
│     `mentorship_profiles/`)                referrals                   │
│                                            events (ambassador-hosted)  │
│                                            monthlyReports              │
│                                            ambassadorClicks (optional) │
│                                            mentorship_profiles.        │
│                                              ambassador (subdoc)       │
├────────────────────────────────────────────────────────────────────────┤
│                EXTERNAL — Discord guild 874...                         │
│  Roles: mentor (1422...), mentee (1445...), ambassador (NEW)           │
│  Channels: #find-a-mentor, #project-collaboration, #ambassadors (NEW)  │
└────────────────────────────────────────────────────────────────────────┘
```

### Single most-important correction to the spec

**The primary user doc collection is `mentorship_profiles/{uid}`, NOT `users/{uid}`.**

The spec (§9.4) names the collection `users/...` but that collection does not exist in the codebase — every `role` read/write goes through `mentorship_profiles`. Verified:

- `src/app/api/mentorship/profile/route.ts:25,85,111,166` — all CRUD uses `db.collection("mentorship_profiles")`
- `scripts/migrate-skill-level.ts:25` — migrates the same collection
- `src/types/mentorship.ts:12` — type is `MentorshipProfile`, not `User`

Roadmap phases MUST refer to this collection by its real name. The `roles` array migration applies to `mentorship_profiles.role` → `mentorship_profiles.roles`.

---

## 2. Subsystem → Components/Files Map

The spec's 4-subsystem split (§9.3) maps cleanly onto Next.js App Router with one caveat covered in §8. This table lists every new file + every modified file, grouped by subsystem.

### 2.1 Foundation (prerequisite, not a subsystem)

| File | New/Modified | Purpose |
|------|--------------|---------|
| `src/types/mentorship.ts` | MODIFIED | `MentorshipRole` → `MentorshipRoleV2 = "mentor" \| "mentee" \| "admin" \| "ambassador"`; `role: MentorshipRole` → `roles: MentorshipRoleV2[]`; add `ambassador?: { cohortId; strikes; joinedAt; endedAt; active }` subdoc type |
| `src/lib/permissions.ts` | MODIFIED | `PermissionUser.role: MentorshipRole` → `roles: MentorshipRoleV2[]`; `isAcceptedMentor` changes to array check; add `isAmbassador`, `isAcceptedAmbassador` helpers; add 7–10 ambassador permission functions |
| `src/lib/role-helpers.ts` | NEW | Shared array helpers: `hasRole(profile, role)`, `addRole(profile, role)`, `removeRole(profile, role)`, `getPrimaryRole(profile)` (for legacy UI that currently branches on single role) |
| `firestore.rules` | MODIFIED | `isAcceptedMentor()` helper changes from `request.auth.token.role == "mentor"` to `"mentor" in request.auth.token.roles`; same pattern anywhere `role ==` appears |
| `scripts/migrate-roles-to-array.ts` | NEW | One-shot migration: for each `mentorship_profiles` doc, write `roles: [doc.role]` (preserving existing value as single-element array) and delete the legacy `role` field. Dry-run flag. Idempotent. |
| `scripts/sync-custom-claims.ts` | NEW | For each profile, re-issue Firebase custom claims with `roles: [...]` instead of `role: "..."`. Must run after data migration and before rules deploy. See §3 for timing. |
| `src/__tests__/permissions.test.ts` | MODIFIED | All 95 test fixtures flip from `role: "mentor"` to `roles: ["mentor"]`; add new test cases for multi-role users + ambassador permission functions |
| `src/__tests__/security-rules/firestore.test.ts` | MODIFIED | Same shift in token claim fixtures |
| **~29 call-site files** (see §3) | MODIFIED | `profile.role === "mentor"` → `profile.roles?.includes("mentor")`, etc. Backward-compat helper `hasRole(profile, "mentor")` recommended instead of raw `.includes` |

### 2.2 Application Subsystem

Writes `applications/`, on accept appends `"ambassador"` to `roles[]` and writes `ambassador` subdoc.

| File | New/Modified | Purpose |
|------|--------------|---------|
| `src/types/ambassador.ts` | NEW | `ApplicationStatus`, `ApplicationDoc`, `CohortDoc` types |
| `src/app/ambassadors/apply/page.tsx` | NEW | Public application form (video upload via Firebase Storage, `.edu` detection, student-ID photo fallback) |
| `src/app/ambassadors/apply/ApplyForm.tsx` | NEW | Client form component (follows `RatesClient.tsx` pattern) |
| `src/app/api/ambassadors/apply/route.ts` | NEW | POST: write `applications/{id}` + Storage upload URL generation. Rate-limited (1 per uid). |
| `src/lib/ambassador/eduVerification.ts` | NEW | `.edu`/`.ac.*`/`.edu.*` TLD detection + manual-review flag for unrecognized TLDs |
| `src/app/admin/ambassadors/page.tsx` | NEW | List tab (Pending \| Accepted \| Declined \| All) |
| `src/app/admin/ambassadors/[applicationId]/page.tsx` | NEW | Review detail: video player, applicant info, notes, Accept/Decline buttons |
| `src/app/api/admin/ambassadors/route.ts` | NEW | GET: list/filter applications. Admin session-cookie auth (mirror `src/app/api/mentorship/admin/profiles/route.ts` pattern) |
| `src/app/api/admin/ambassadors/[applicationId]/route.ts` | NEW | PATCH: accept/decline. On accept: (1) append `"ambassador"` to `mentorship_profiles.{uid}.roles` in transaction, (2) write `.ambassador` subdoc, (3) fire-and-forget Discord role assign, (4) send acceptance email |
| `src/app/admin/ambassadors/cohorts/page.tsx` | NEW | Cohort management (create/edit/close) |
| `src/components/admin/AdminNavigation.tsx` | MODIFIED | Add `{label: "Ambassadors", href: "/admin/ambassadors"}` — see §7 for full nav |
| `firestore.rules` | MODIFIED | Add `match /applications/{id}` (public create, admin read/update) and `match /cohorts/{id}` (public read, admin write) |

### 2.3 Activity Subsystem

Writes `referrals/`, `events/`, `monthlyReports/`. All keyed by `ambassadorId` (= uid).

| File | New/Modified | Purpose |
|------|--------------|---------|
| `src/lib/ambassador/referralCode.ts` | NEW | Generate + resolve referral codes (e.g., `AHSAN-A7F2`). Uniqueness enforced via `mentorship_profiles.ambassador.referralCode`. |
| `src/app/api/ambassadors/referrals/resolve/route.ts` | NEW | Public GET `?code=...` → returns ambassador uid. Used by the landing-page hook to set cookie. |
| `src/lib/ambassador/refTracker.ts` | NEW | Client-side module that reads `?ref=CODE` on first page load, sets a first-party cookie `cwa_ref` (30-day expiry — see §5.2) |
| `src/app/LayoutWrapper.tsx` | MODIFIED | Mount a tiny ref-capture hook (or add to root layout). Fires once per session before auth. |
| `src/app/api/referrals/attribute/route.ts` | NEW | POST: called during signup AFTER profile doc created. Takes `{ refCode, referredUserId }`, writes `referrals/{id}` with de-dup + self-attribution guard |
| `src/app/api/mentorship/profile/route.ts` | MODIFIED | After `db.collection("mentorship_profiles").doc(uid).set(profile)` (line 111), read `cwa_ref` cookie from request → call attribution handler inline (await, not fire-and-forget, so retries are possible) |
| `src/app/ambassadors/events/page.tsx` | NEW | Ambassador event-log form (date, type, attendees, link, notes) |
| `src/app/api/ambassadors/events/route.ts` | NEW | POST: create event (writer must be `hasRole(profile, "ambassador")`). GET: list own events. |
| `src/app/ambassadors/reports/page.tsx` | NEW | Monthly self-report form |
| `src/app/api/ambassadors/reports/route.ts` | NEW | POST: write `monthlyReports/{id}`. Also resets `ambassador.strikes` missed-month counter for the submitted month |
| `.github/workflows/ambassador-strike-check.yml` | NEW | GitHub Actions cron (1st of each month): scans cohort → if no report for previous month → increments `ambassador.strikes` and sends Discord DM warning. Reuses `firebase-admin` init pattern from `scripts/mentorship-inactivity-warning.ts` |
| `scripts/ambassador-strike-check.ts` | NEW | The cron's executable |
| `firestore.rules` | MODIFIED | Add `match /referrals`, `/events`, `/monthlyReports` — owner can read own, admin reads all, write goes through Admin SDK (server-only) |

### 2.4 Dashboard Subsystem (read-only)

Pure consumer. Does not own data. Reads from §2.3 collections + aggregates.

| File | New/Modified | Purpose |
|------|--------------|---------|
| `src/app/ambassadors/dashboard/page.tsx` | NEW | Private dashboard. Gated: server-side redirect if `!hasRole(profile, "ambassador")` |
| `src/app/ambassadors/dashboard/DashboardClient.tsx` | NEW | Stats widgets (referral count, events hosted, strikes, next-report-due). Mirrors `src/components/mentorship/dashboard/StatsWidget.tsx` pattern |
| `src/app/ambassadors/dashboard/Leaderboard.tsx` | NEW | Cohort leaderboard. Reads aggregated numbers. |
| `src/app/api/ambassadors/dashboard/route.ts` | NEW | GET: aggregates counts (referrals count, events count, report count) in one call. Uses batched reads (30-item chunks — same pattern as existing `mentorship/admin/profiles`) |
| `src/app/api/ambassadors/leaderboard/route.ts` | NEW | GET: cohort-scoped aggregation — returns ordered list of ambassadors + their scores. Gated to `roles.includes("ambassador")` (cohort-private) |

### 2.5 Public Presentation Subsystem

Read-only. Isolated from the dashboard.

| File | New/Modified | Purpose |
|------|--------------|---------|
| `src/app/ambassadors/page.tsx` | NEW | Public cohort page. Lists accepted active ambassadors (photo, bio, university, socials). Server component, ISR-friendly. |
| `src/app/api/ambassadors/route.ts` | NEW | Public GET: returns active cohort members. Follows the v5.0 public-GET pattern (see `.planning/PROJECT.md:148` — "Public GET on winners API") |
| `src/components/AmbassadorBadge.tsx` | NEW | Small reusable badge component, rendered conditionally when `hasRole(profile, "ambassador") \|\| hasRole(profile, "alumni-ambassador")` |
| `src/app/mentorship/mentors/[username]/MentorProfileClient.tsx` | MODIFIED | Render `<AmbassadorBadge />` in header when applicable (existing file reads `.role` today — will switch to `roles[]` via the foundation migration) |
| `src/app/profile/page.tsx` | MODIFIED | Same — add badge; existing file already branches on `.role` so it's in the migration list anyway |

---

## 3. Roles-Array Migration — Ordered Strategy

This is the single largest integration risk. There are two kinds of state that must stay in sync: **Firestore documents** and **Firebase custom claims** (used by `firestore.rules`). Getting the deploy order wrong bricks the app for 100% of users.

### 3.1 Current reality (verified)

- **~75 `.role` occurrences across 29 files** (grep: `\.role\b` on `src/`). Spec said 72/30; close enough.
- `MentorshipRole = "mentor" | "mentee" | null` in `src/types/mentorship.ts:6` — **note: `"admin"` is NOT in this union**; admins are tracked via `isAdmin: boolean` on `PermissionUser` + `request.auth.token.admin == true` in rules. The `roles` array should still include `"admin"` for future-proofing, but the admin check mechanism doesn't have to change.
- `firestore.rules:16–17` uses `request.auth.token.role == "mentor"` and `request.auth.token.status == "accepted"` — these are Firebase custom claims (token-embedded), not Firestore reads.
- 95 permission test cases in `src/__tests__/permissions.test.ts` all use `role: "mentor" \| "mentee"`.
- No existing migration script for roles; `scripts/migrate-skill-level.ts` is the nearest template.

### 3.2 Deploy order (strict)

```
Step 1: TYPES + HELPERS + NEW FIELD (backward-compatible, no-risk)
  ── Add `roles?: string[]` as OPTIONAL alongside existing `role`
  ── Add `hasRole(profile, role)` helper with fallback: if roles exists use it, else fall back to legacy single role
  ── Deploy. Now both old and new code paths work.

Step 2: DATA MIGRATION (dual-write, read-from-new)
  ── Run scripts/migrate-roles-to-array.ts (idempotent, batched, dry-run first)
  ──   For each mentorship_profiles doc: set roles = [existing_role_value]
  ── ALSO: modify profile POST/PUT handlers to dual-write role AND roles on any mutation
  ── At this point data is consistent. role field still present (not deleted yet).

Step 3: UPDATE CUSTOM CLAIMS
  ── Run scripts/sync-custom-claims.ts
  ──   For each user: admin.auth().setCustomUserClaims(uid, { ...existing, roles: [role], role: role })
  ── Users must re-authenticate (or wait ≤1hr token TTL) to get new claims. Push a banner "please sign out and back in".
  ── Both `role` and `roles` live on the token simultaneously.

Step 4: UPDATE CALL SITES (29 files)
  ── Switch reads to `hasRole(profile, "mentor")`
  ── Deploy incrementally — PR per domain (admin pages, mentorship pages, profile pages, project pages, roadmap pages)
  ── Legacy `role` field still present — safe to roll back any PR.

Step 5: UPDATE firestore.rules
  ── Change isAcceptedMentor() from `token.role == "mentor"` → `"mentor" in token.roles`
  ── *** DEPLOY RULES AND APP TOGETHER ***   (see §3.3)

Step 6: CLEANUP
  ── Remove dual-write (only write roles going forward)
  ── Remove legacy `role` field from documents (optional — cheapest to leave; Firestore doesn't charge)
  ── Remove fallback logic from hasRole()
  ── Remove `role` claim from custom claims (next claim sync)
```

### 3.3 Race-condition risk between app deploy and rules deploy

**The trap:** If you deploy Firestore rules expecting `token.roles` BEFORE the `sync-custom-claims.ts` script completes, every signed-in user whose token still has only `token.role` (not `token.roles`) hits a `permission-denied` wall. The app looks "broken" for 100% of logged-in users until their tokens refresh (up to 1 hour, or until they re-login).

**The fix (dual-claim window):** In Step 3 above, write BOTH `role` AND `roles` to custom claims. In Step 5, write rules that accept EITHER:

```javascript
function isAcceptedMentor() {
  return isSignedIn() &&
         (("mentor" in request.auth.token.roles) ||
          (request.auth.token.role == "mentor")) &&
         request.auth.token.status == "accepted";
}
```

Leave this dual-check in place for at least 2 weeks after Step 5, then tighten to `roles` only. This eliminates the race entirely — old tokens still work, new tokens still work.

### 3.4 Migration risks summary

| Risk | Severity | Mitigation |
|------|----------|------------|
| Rules deployed before claims synced → app bricks | CRITICAL | Dual-claim window (§3.3) |
| Long-lived open sessions with stale tokens | HIGH | Dual-claim window + force-refresh on next request |
| Data migration partial failure (batch timeout) | MEDIUM | Idempotent script — re-runnable; add `migratedAt` timestamp for tracking |
| Mix of dual-write + single-write during PR rollout | MEDIUM | `hasRole()` helper reads whichever exists; never raw `.includes` |
| Permission tests flip en-masse → hard to review | MEDIUM | Update fixture factory in a single commit, let test assertions stay the same |
| Typos across 29 call-site files | MEDIUM | Mechanical refactor with codemod script; no manual edits |
| New `"ambassador"` role written to docs before migration complete | HIGH | Gate the application-subsystem feature flag on `FEATURE_AMBASSADOR_PROGRAM=true`; flip only after Step 6 |

---

## 4. Referral Attribution Data Flow

### 4.1 End-to-end flow (click → signup → attribution)

```
 ┌─ AMBASSADOR shares URL: codewithahsan.dev/?ref=AHSAN-A7F2 ─┐
 │                                                            │
 ▼                                                            │
 (1) VISITOR hits any page with ?ref=CODE                     │
 │   - src/app/layout.tsx (root) mounts <RefCapture />        │
 │   - reads ?ref from window.location                        │
 │   - POST /api/ambassadors/referrals/resolve?code=CODE      │
 │     returns { ambassadorUid }                              │
 │   - sets first-party cookie `cwa_ref`:                     │
 │       { ambassadorUid, code, clickedAt, expires: 30d }     │
 │   - strips ?ref from URL via router.replace() (clean URL)  │
 │                                                            │
 ▼                                                            │
 (2) VISITOR browses (hours or days)                          │
 │   - cookie persists across pages                           │
 │   - cookie is HttpOnly=false (needs to survive client nav) │
 │   - SameSite=Lax (default, works for this use case)        │
 │                                                            │
 ▼                                                            │
 (3) VISITOR signs up (Firebase Auth → /api/mentorship/profile)│
 │   - src/app/api/mentorship/profile/route.ts POST           │
 │   - profile doc created at mentorship_profiles/{uid}       │
 │   - BEFORE returning 201:                                  │
 │     * read `cwa_ref` cookie from request                   │
 │     * call attributeReferral({refCode, refUid, newUid})    │
 │                                                            │
 ▼                                                            │
 (4) ATTRIBUTION HANDLER (sync, not fire-and-forget)          │
 │   - if cookie absent → no-op                               │
 │   - if refUid === newUid → SELF-ATTRIBUTION, reject        │
 │   - if refUid has roles.includes("ambassador") === false   │
 │       → ambassador was revoked mid-flight, soft-reject     │
 │   - check referrals collection for existing doc where      │
 │     referredUserId === newUid → DOUBLE-ATTRIBUTION, reject │
 │   - write referrals/{auto-id}:                             │
 │     { ambassadorId: refUid, referredUserId: newUid,        │
 │       convertedAt: now, sourceCode: code,                  │
 │       clickedAt: cookie.clickedAt }                        │
 │   - clear cookie                                           │
 │                                                            │
 ▼                                                            │
 (5) DASHBOARD reads aggregated count on next load            │
```

### 4.2 Decision points (with rationale)

| Question | Decision | Rationale |
|----------|----------|-----------|
| Where is ref code persisted between click and signup? | **First-party cookie** (`cwa_ref`, 30-day expiry) | Survives domain nav and session restart. localStorage is same-origin only + lost in private mode. URL-passing-through-signup breaks if user clicks a different CTA mid-flow. |
| When is `referrals/{id}` written? | **On profile creation** (inside `/api/mentorship/profile` POST, synchronous) | Profile creation is the atomic "user exists now" moment. Attaching here guarantees the write happens. Firebase Auth signup alone does NOT create the profile — the platform's sign-up is Auth→Profile POST. |
| Attribution window | **30 days** (cookie expiry) | Common industry default (Google Ads, Amazon Associates). Document this in §12 of the spec as the answer to the open question. |
| Self-attribution prevention | `refUid === newUid` check inside attribution handler | Cheap, correct. |
| Double-attribution prevention | Check `referrals where referredUserId == newUid` before write | Single query; referredUserId is unique per user. |
| What if cookie is present but refCode no longer resolves? | Silent drop (no error to user) | Ambassador may have been offboarded mid-cookie-life. User experience shouldn't suffer. |
| Ambassador-to-ambassador referral | **Allow pre-acceptance only.** Once `roles.includes("ambassador")`, their prior sponsor's attribution is frozen. | Answers open question from spec §12. Keeps activity window clean per §9.4 "ambassador activity starts from acceptance date". |
| Referral source link tracking | `sourceCode` + `clickedAt` stored | Supports per-link analytics later without schema change. |

### 4.3 Non-obvious edge cases to handle

1. **Server component hydration:** `<RefCapture />` must be a client component (`"use client"`) because cookies can't be set from a Server Component render path without a Server Action. Simplest: put the capture inside `src/components/LayoutWrapper.tsx` which is already a client wrapper.
2. **Cookie + Next.js caching:** Mark profile-creation route as `export const dynamic = "force-dynamic"` to prevent response caching based on cookie presence.
3. **OAuth flow interruption:** Firebase popup signup → some providers trigger a full-page redirect that DOES preserve cookies. Test with Google and GitHub specifically.
4. **Private/incognito mode:** Cookie is still set, just doesn't persist past window close. Acceptable — if they close the window before signing up, they're not a conversion anyway.
5. **Crawlers + preview bots:** Facebook/Twitter/Slack link unfurl bots hit with `?ref=` in URL. Don't write anything server-side from the resolve endpoint — cookie is client-set, so these don't pollute anything. (Good; confirming this matches our design.)

---

## 5. Discord Role-Assignment Integration

### 5.1 Where the two IDs come from

**(a) The Ambassador's Discord user ID** comes from looking up their Discord username via the existing `lookupMemberByUsername()` function in `src/lib/discord.ts:100`. The Discord username is already stored on the profile: `MentorshipProfile.discordUsername` (`src/types/mentorship.ts:19`). Every mentor/mentee already provides this and it's validated against the guild on save (`src/app/api/mentorship/profile/route.ts:212–235`).

**Ambassador applications already require Discord handle** per spec §5.1, so this field is guaranteed populated. The application form should also run the same `lookupMemberByUsername` validation at submit time so we catch bad handles before acceptance.

**(b) The Ambassador Discord role ID** comes from a module constant, following the existing pattern:

```typescript
// src/lib/discord.ts lines 807–819 already contain:
export const DISCORD_MENTOR_ROLE_ID = "1422193153397493893";
export const DISCORD_MENTEE_ROLE_ID = "1445734846730338386";
const PROJECT_REVIEW_CHANNEL_ID = "874565618458824715";
// ... etc.

// ADD:
export const DISCORD_AMBASSADOR_ROLE_ID = "<new-role-id>";
export const AMBASSADORS_CHANNEL_ID = "<new-channel-id>";
```

**Not env vars.** These are hardcoded constants in existing discord.ts. Ahsan can manually create the Ambassador role + `#ambassadors` channel in the Discord Developer console and paste the IDs into the file. This matches the v1.0/v2.0 precedent.

### 5.2 The assignment call

`src/lib/discord.ts:829` already exports `assignDiscordRole(discordUsername, roleId)`. It returns `Promise<boolean>` and is fire-and-forget-friendly (catches errors internally).

In `src/app/api/admin/ambassadors/[applicationId]/route.ts` on accept, the sequence is:

```typescript
// Pseudocode — mirror the mentor-approval Discord call pattern
if (isDiscordConfigured() && application.discordUsername) {
  // Non-blocking: same "log errors, don't throw" pattern from Key Decisions
  assignDiscordRole(application.discordUsername, DISCORD_AMBASSADOR_ROLE_ID)
    .catch((err) => log.error("Ambassador role assign failed", err));
}
```

### 5.3 Additional Discord operations needed

| Operation | Existing fn? | Action |
|-----------|--------------|--------|
| Assign Ambassador role on accept | YES (`assignDiscordRole`) | Wire in route handler |
| Remove Ambassador role on offboard (2 strikes) | **NO** | Add `removeDiscordRole(username, roleId)` — trivial extension (DELETE instead of PUT on the same endpoint) |
| Add to `#ambassadors` channel | Partial (`addMemberToChannel` line 1265) | Reuse — takes (channelId, discordUsername) |
| Remove from `#ambassadors` on offboard | YES (`removeMemberFromChannel` line 1315) | Reuse |
| Alumni role retention (spec §7.3) | **NO** | Add `DISCORD_ALUMNI_AMBASSADOR_ROLE_ID` constant; at term-end script, assign alumni role + remove active ambassador role |
| Strike warning DM | YES (`sendDirectMessage` line 526) | Called from cron job |

### 5.4 Open question (flagged in spec)

Spec §12: "Does the existing Discord integration support programmatic role assignment for arbitrary Discord users, or only on account signup?" — **Answer: YES, it supports arbitrary role assignment.** `assignDiscordRole()` already works against any Discord user in the guild; it's used today in the mentor approval path (not just signup). No webhook/bot extension needed.

---

## 6. Component Boundaries — Are the 4 Subsystems Actually Clean?

### 6.1 Verdict: MOSTLY CLEAN, with 2 coupling points to flag

The spec's 4-subsystem split (Application / Activity / Dashboard / Public Presentation) maps cleanly to Next.js routing + Firestore ownership **except for**:

### 6.2 Coupling point #1: Roles-array mutation is shared

**Application subsystem** writes to `mentorship_profiles.{uid}.roles` to append `"ambassador"`. But so does the offboarding script (`events/strikes` triggers role removal). That means **two subsystems write the same field** — Application writes `+ambassador`, Activity writes `-ambassador` when strikes hit threshold.

**Mitigation:** Route both through a single `src/lib/ambassador/roleMutation.ts` module with two functions: `grantAmbassadorRole(uid, cohortId)` and `revokeAmbassadorRole(uid, reason)`. Both do the Firestore transaction + Discord calls + custom-claim refresh atomically. This makes the coupling explicit and tested in one place.

### 6.3 Coupling point #2: Profile page renders badge based on Public Presentation logic

**Public Presentation** subsystem owns the `AmbassadorBadge` component. But it's rendered on the mentor profile page (`MentorProfileClient.tsx`) and the logged-in profile page (`profile/page.tsx`) — both of which are owned by other surfaces. This is unavoidable cross-subsystem render, but not a functional coupling — just import the component.

**Mitigation:** Keep `AmbassadorBadge` in `src/components/` (shared UI), not under `src/app/ambassadors/`. Logic is thin (render if role present).

### 6.4 Coupling point #3 (non-issue, documented for completeness)

The **Dashboard** reads from Activity-owned collections. This is by design — dashboards are downstream consumers. No mutation goes dashboard → activity. Clean.

### 6.5 Testability in isolation

| Subsystem | Can be tested alone? | How |
|-----------|---------------------|-----|
| Application | YES | Seed no activity data; test accept flow → check role/cohort docs exist |
| Activity | YES | Seed fake ambassador profile (roles=["ambassador"]); exercise event/report/referral endpoints |
| Dashboard | YES | Seed fake activity (30 events, 10 referrals) + fake profile; render dashboard; assert counts |
| Public Presentation | YES | Seed 5 ambassador profiles; fetch `/ambassadors`; assert 5 cards rendered |

---

## 7. Admin URL Structure

### 7.1 Existing admin conventions (verified from `AdminNavigation.tsx`)

```
/admin               (overview)
/admin/pending       (pending mentors list)
/admin/mentors       (all mentors)
/admin/mentees       (all mentees)
/admin/projects      (projects)
/admin/roadmaps      (roadmaps)
/admin/courses       (courses)
/admin/events        (events list)
/admin/events/[eventId]   (event detail - winners mgmt)
```

Pattern: **flat list at top, nested detail pages under `[id]`**.

### 7.2 Recommended ambassador admin URLs

```
/admin/ambassadors                       — overview (pending | accepted | declined tabs)
/admin/ambassadors/[applicationId]       — review detail (video + accept/decline)
/admin/ambassadors/cohorts               — cohort list / manage
/admin/ambassadors/cohorts/[cohortId]    — cohort detail: members, dates, status
/admin/ambassadors/referrals             — referral attribution table (admin oversight)
```

This matches the `/admin/events/[eventId]` precedent exactly. Do **NOT** split into `/admin/applications` and `/admin/ambassadors` — one surface, nested detail.

### 7.3 Required AdminNavigation change

Add one entry to the `navItems` array in `src/components/admin/AdminNavigation.tsx` after "Events":

```typescript
{ label: "Ambassadors", href: "/admin/ambassadors", exact: false },
```

The `exact: false` lets the tab highlight when on `/admin/ambassadors/*`.

---

## 8. Permission Rule Shape (Post-Migration)

### 8.1 New `PermissionUser` shape

```typescript
// src/lib/permissions.ts (MODIFIED)
export interface PermissionUser {
  uid: string;
  roles: MentorshipRoleV2[];         // CHANGED: was role: MentorshipRole
  status?: "pending" | "accepted" | "declined" | "disabled" | "changes_requested";
  isAdmin?: boolean;
  // NEW optional ambassador subdoc for ambassador-specific checks:
  ambassador?: {
    cohortId: string;
    strikes: number;
    active: boolean;
  };
}
```

### 8.2 Helper + new permission functions

```typescript
// src/lib/role-helpers.ts (NEW)
export function hasRole(user: PermissionUser | null, role: MentorshipRoleV2): boolean {
  return !!user?.roles?.includes(role);
}

// src/lib/permissions.ts additions
function isAcceptedMentor(user: PermissionUser | null): boolean {
  if (!user) return false;
  return hasRole(user, "mentor") && user.status === "accepted";
}

function isActiveAmbassador(user: PermissionUser | null): boolean {
  if (!user) return false;
  return hasRole(user, "ambassador") && user.ambassador?.active === true;
}

export function canAccessAmbassadorDashboard(user: PermissionUser | null): boolean {
  return isActiveAmbassador(user) || hasRole(user, "alumni-ambassador");
}

export function canSubmitAmbassadorEvent(user: PermissionUser | null): boolean {
  return isActiveAmbassador(user);
}

export function canSubmitAmbassadorReport(user: PermissionUser | null): boolean {
  return isActiveAmbassador(user);
}

export function canViewAmbassadorLeaderboard(user: PermissionUser | null): boolean {
  // Cohort-private — active ambassadors only (spec §7.3)
  return isActiveAmbassador(user);
}

export function canReviewApplications(user: PermissionUser | null): boolean {
  return user?.isAdmin === true;
}
```

### 8.3 Edge cases where array-shape breaks down

| Edge case | Problem | Resolution |
|-----------|---------|------------|
| **Role-specific subdoc shape** (ambassador has cohortId/strikes; mentor has expertise[]; mentee has skillsSought[]) | Simple array doesn't capture structured state per role | Keep role-specific fields as **separate subdocs** (`.ambassador`, `.mentor`, `.mentee`), not inside the array. The array answers "which roles?"; subdocs answer "state of each". |
| **Alumni state transition** (was ambassador → term ended → alumni-ambassador) | Array membership is all-or-nothing | Introduce `"alumni-ambassador"` as a separate role string. On term-end, swap: remove `"ambassador"`, add `"alumni-ambassador"`. This is cleaner than an `active: boolean` flag on the array. |
| **Role-specific status** (mentor "accepted/declined/pending"; mentee auto-accepted) | Top-level `status: string` can't represent per-role states | Move `status` into per-role subdoc: `mentor: { status: "accepted" }`, `ambassador: { active: true, cohortId }`. Top-level `status` stays as legacy during migration; deprecate after. (This is a v2 cleanup, NOT v1 — flag as known debt.) |
| **Multi-role query** (find all accepted mentors) | Firestore `array-contains` works for single-role lookup | `where("roles", "array-contains", "mentor")` works. Combining with `where("status", "==", "accepted")` currently works because status is still top-level. After per-role-status refactor, would need a composite index. Not v1 concern. |
| **Role history / past cohorts** | Array overwrites don't preserve history | v2 concern per spec §9.4. Handle with a subcollection `mentorship_profiles/{uid}/roleHistory/{entryId}` when needed. |
| **A user who is BOTH pending mentor AND ambassador** | `status: "pending"` is ambiguous — pending for which role? | Same as above: move per-role state into subdoc. v1 decision: when a user becomes an ambassador, their `status` is *not* modified — it continues to reflect mentor/mentee state. `canSubmitAmbassadorReport` doesn't check `status`, only `ambassador.active`. |

### 8.4 Firestore rules shape

```javascript
// Helper (dual-claim compatible, §3.3)
function hasRole(role) {
  return isSignedIn() && (
    role in request.auth.token.roles ||
    request.auth.token.role == role  // legacy fallback
  );
}

function isActiveAmbassador() {
  // Ambassador active state is in Firestore subdoc, not in token
  // → read-time document lookup required
  return hasRole("ambassador") &&
         get(/databases/$(database)/documents/mentorship_profiles/$(request.auth.uid))
           .data.ambassador.active == true;
}

match /events/{eventId} {
  // Ambassador writes their own events; admin reads all
  allow read: if isActiveAmbassador() && resource.data.ambassadorId == request.auth.uid || isAdmin();
  allow create: if isActiveAmbassador() && request.resource.data.ambassadorId == request.auth.uid;
  // ...
}
```

**Gotcha flagged:** `isActiveAmbassador()` does a Firestore `get()` inside rules, which **costs one doc read per rule evaluation** and **adds latency**. Existing rules already do this for project ownership (`firestore.rules:64`), so the pattern is accepted. But for hot paths (dashboard reads), prefer API-route enforcement with Admin SDK (which bypasses rules) + rule-deny client access — the same pattern the mentorship admin routes already use (`firestore.rules:176-177` comment: "For now, deny client access to mentorship collections").

---

## 9. Build Order (Roadmap Phase Recommendation)

### 9.1 Recommended phasing

```
PHASE 1 — Role system foundation (NOT a visible feature)
  └─ Type changes
  └─ Permissions module update (with dual-claim helpers)
  └─ Migration script + dry-run
  └─ Custom-claims sync
  └─ firestore.rules update with dual-claim window
  └─ 95 test fixtures flipped
  └─ 29 call-site files updated
  └─ E2E smoke test: existing mentor/mentee flows still work
  GATE: all v5.0 functionality unchanged → continue

PHASE 2 — Application subsystem (alone)
  └─ /ambassadors/apply + storage + applications collection
  └─ /admin/ambassadors + review panel
  └─ Accept flow: writes role into roles[] + ambassador subdoc + Discord role assign
  └─ Cohorts collection + admin UI
  GATE: can accept a test ambassador end-to-end

PHASE 3a — Public Presentation (parallel with 3b)
  └─ /ambassadors public page
  └─ AmbassadorBadge component
  └─ Badge wired into profile + mentor profile pages
  (Smallest, least risky — easy win)

PHASE 3b — Activity subsystem (parallel with 3a, BUT larger)
  └─ Referral: resolve + cookie + attribute endpoint + signup hook
  └─ Event tracker
  └─ Monthly report form
  └─ GitHub Actions strike-check cron
  └─ Discord role removal on offboard
  GATE: seeded ambassador can log events, submit report, and be referred

PHASE 4 — Dashboard subsystem (read-only consumer)
  └─ /ambassadors/dashboard
  └─ Leaderboard
  └─ Aggregation endpoint
  (Can only be built AFTER Activity has seed data to aggregate)
```

### 9.2 Why this order

1. **Foundation first** — every subsystem downstream reads `roles[]`. If foundation is half-done, you cannot write or test *anything* downstream reliably.
2. **Application before Activity** — Activity assumes ambassadors exist in Firestore with the `"ambassador"` role. Seeding manually is possible, but the application pipeline is the realistic testbed.
3. **Public Presentation is a cheap win** and can happen in parallel with Activity, because it only reads roles + cohort docs — both of which exist after Phase 2.
4. **Dashboard is last** — it aggregates over Activity outputs. Building it earlier means stubbing data that will just be thrown away.

### 9.3 Where you can split further if phases feel too big

- Phase 2 can split into: (2a) Application form public + storage + applications collection; (2b) Admin review panel + accept/decline + Discord integration.
- Phase 3b can split into: (3b-i) Referral system; (3b-ii) Event tracker; (3b-iii) Monthly report + strike cron. They share no state between each other — pure parallel.

### 9.4 Where you CANNOT reorder

- **Do not attempt Phase 2 before Phase 1 is fully deployed to prod.** Writing `"ambassador"` into a still-`role:string` field corrupts data.
- **Do not build Dashboard before Activity.** You'll be writing dashboard code against a schema that doesn't exist yet and iterating twice.
- **Do not ship any ambassador feature flagged-off without a feature flag.** The `FEATURE_AMBASSADOR_PROGRAM` env switch (or Firestore `config/features` doc) should gate every new route during Phase 1 rollout.

---

## 10. Integration Risks Summary

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Roles migration bricks 100% of sessions (race between claims sync & rules deploy) | MEDIUM | CRITICAL | Dual-claim window (§3.3); deploy rules in non-emergency hours; have rollback of rules ready |
| 75 call sites silently break under new type (TS catches most but not all — string literals in JSX conditionals can be missed) | MEDIUM | MEDIUM | `grep -r "\.role\b"` after PR; strict TS build CI gate |
| Cookie-based ref attribution loses data on third-party tracker browsers (Safari ITP, Firefox strict mode) | HIGH | LOW-MEDIUM | First-party cookie (same domain) is largely immune. Document known loss. Dashboard shows "attributed signups" not "clicks"; some leakage acceptable. |
| Discord role assignment silently fails at acceptance time (Discord API down or bot de-authed) | LOW | LOW | Existing non-blocking pattern (spec Key Decision: "Non-blocking Discord failures"). Add admin UI to manually retry. |
| `mentorship_profiles` renamed to `users` by mistake during migration | LOW | CRITICAL | Lock the collection name early in Phase 1; code-review guard |
| GitHub Actions strike-check cron has a bug that falsely strikes people | LOW | HIGH | Dry-run flag; first deploy only DMs the admin (not the ambassador); flip to real DM after 1 month validated |
| Leaderboard queries don't scale past ~50 ambassadors (Firestore 30-item `in` limit) | LOW | LOW | Chunked batch pattern already in use (`src/app/api/mentorship/admin/profiles/route.ts`). Cohort <= 25 per spec — nowhere near limit. |
| Self-attribution via same-device anonymous browsing + signup | LOW | LOW | `refUid === newUid` check. Cookie persists across sign-out. |
| Ambassador badge renders stale after role revocation (client still has old profile cached) | MEDIUM | LOW | Refresh profile on next `refreshProfile()` call (exists in context). UI shows role revoke within 1–5 minutes of action. |

---

## 11. File Count Summary

| Category | Count | Notes |
|----------|-------|-------|
| New TypeScript files | ~28 | Application (8), Activity (9), Dashboard (4), Public (3), Shared lib (4) |
| New test files | ~5 | 1 per subsystem + shared helpers |
| Modified files (foundation) | ~32 | 29 call sites + permissions.ts + types + rules |
| Modified files (wiring new features) | ~4 | profile page, mentor profile page, AdminNavigation, LayoutWrapper |
| New scripts | 3 | migrate-roles-to-array.ts, sync-custom-claims.ts, ambassador-strike-check.ts |
| New GitHub Actions workflows | 1 | ambassador-strike-check.yml |
| Total code surface touched | **~68 files** | Over ~4 phases |

---

## 12. Sources

All assertions above are grounded in the following files (verified during research):

- `.planning/PROJECT.md` — milestone goal + existing architecture Key Decisions
- `docs/superpowers/specs/2026-04-21-student-ambassador-program-design.md` — v6.0 design spec
- `src/lib/permissions.ts` — centralized permission module (current shape of `PermissionUser`)
- `src/lib/discord.ts` — Discord integration (confirms `assignDiscordRole`, `lookupMemberByUsername`, `addMemberToChannel`, `sendDirectMessage`, `DISCORD_MENTOR_ROLE_ID` pattern)
- `src/lib/auth.ts` — session auth model
- `src/types/mentorship.ts` — `MentorshipRole` type (confirms single-role string today)
- `src/contexts/MentorshipContext.tsx` — client profile context (confirms `profile.role` call pattern)
- `src/app/api/mentorship/profile/route.ts` — profile CRUD (confirms `mentorship_profiles` collection name; the attribution write point)
- `src/app/api/mentorship/admin/auth/route.ts` — admin session-cookie pattern to reuse
- `src/app/admin/events/[eventId]/page.tsx` — nested admin route pattern
- `src/app/admin/events/page.tsx` — admin list page pattern
- `src/components/admin/AdminNavigation.tsx` — admin nav shape + ordering
- `firestore.rules` — existing rules (confirms custom-claim-based `role == "mentor"` check that must migrate)
- `scripts/migrate-skill-level.ts` — template for the roles migration script
- `src/__tests__/permissions.test.ts` — 95 test fixtures that all flip
- Grep `\.role\b` on `src/` — **75 occurrences across 29 files** (spec estimated 72/30 — aligned)

---

*Architecture research for: Student Ambassador Program v1 (v6.0)*
*Researched: 2026-04-21*
*Downstream consumer: Roadmapper agent — phase boundaries and build order; Phase-planner agents — component-to-file map*
