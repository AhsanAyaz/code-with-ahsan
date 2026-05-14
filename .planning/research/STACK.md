# Technology Stack — v6.0 Student Ambassador Program

**Project:** Code With Ahsan — Student Ambassador Program v1
**Researched:** 2026-04-21
**Overall confidence:** HIGH (verified against existing codebase + current Firebase/Discord docs)

## Scope note

This document covers **only the stack additions/changes needed for the v6.0 ambassador milestone**. The already-validated base stack (Next.js 16, React 19, Firebase Firestore/Auth/Storage, DaisyUI/Tailwind, Gemini, Google Calendar, GitHub Actions cron) is intentionally **not** re-researched. See the milestone context for the baseline.

**Bottom line:** This milestone needs **zero new runtime dependencies** for the happy path. Every required capability can be built with libraries already in `package.json` or with the existing raw-`fetch`/Firebase SDK patterns the codebase has established. Two optional additions (`react-hook-form`, `university-domains-list` JSON) are flagged with clear decision criteria.

## Recommended Stack (per capability)

### 1. Video upload handling (60–90 s, up to ~100 MB)

| Decision | Value |
|----------|-------|
| Technology | `firebase/storage` — `uploadBytesResumable()` + `getDownloadURL()` |
| Package version | `firebase@^12.6.0` (already installed) |
| New dependency? | **No** |
| Pattern | Direct client-to-Storage upload, bypasses Next.js API routes entirely |

**Why this choice:**

- **Vercel serverless functions have a 4.5 MB body limit** (per Vercel's Next.js hosting docs), so route-handler proxying is a non-starter for a 100 MB video. This forces direct client uploads.
- Firebase Storage does **not** support GCS-style pre-signed upload URLs, so the "signed URL" pattern is unavailable on this stack. Client-side Firebase SDK + Firebase Auth + Storage Security Rules **is** the idiomatic Firebase equivalent.
- The existing codebase already uses this exact pattern in `src/components/mentorship/MentorRegistrationForm.tsx` (imports `getStorage, ref, uploadBytes, getDownloadURL` from `firebase/storage`). We upgrade from `uploadBytes` → `uploadBytesResumable` specifically for the video path to get progress events and chunked upload (the rest of the codebase's small-file uploads can keep using `uploadBytes`).
- `uploadBytesResumable` uses 256 KiB-aligned chunks (Google recommends ≥ 8 MiB chunk size), supports pause/resume/retry on network flakiness, and emits `state_changed` progress events — all needed for a 100 MB upload on a student's potentially patchy connection.

**Size + duration enforcement:**

- **Client-side:** validate `file.size ≤ 100 * 1024 * 1024` and (via `<video>` `loadedmetadata`) duration ≤ 95 s before upload starts. Fail fast, save bandwidth.
- **Server-side (authoritative):** enforce in `storage.rules` — this is the only enforcement that can't be bypassed:
  ```
  match /ambassador-applications/{userId}/{fileName} {
    allow write: if request.auth != null
                 && request.auth.uid == userId
                 && request.resource.size < 105 * 1024 * 1024   // 105 MB headroom
                 && request.resource.contentType.matches('video/.*');
  }
  ```
- **Duration cannot be enforced in Storage Rules** — this is a gap. Acceptable mitigation: duration is validated client-side; admin reviewer sees the video in the review panel and rejects if wildly out of spec. Given the admin reviews every application anyway (Section 5 of the spec), this is fine for v1.

**Thumbnail generation:**

- **Recommendation: skip for v1.** The admin panel embeds a `<video controls preload="metadata">` with the Storage `downloadURL` — modern browsers render the first frame as the poster automatically when `preload="metadata"` is set. No thumbnail pipeline needed.
- If a real poster becomes necessary (e.g., for the public `/ambassadors` page if we ever showcase videos there — **not in v1 scope**), the right approach is a client-side `<canvas>.drawImage(videoEl)` at time=1.0s + `toBlob()` upload, not a Cloud Function. Flag for v2 only if the use case materializes.

**Alternatives considered:**

| Alternative | Rejected because |
|-------------|------------------|
| Route-handler proxy (POST to `/api/ambassadors/upload-video`) | Vercel 4.5 MB body limit kills this for 100 MB files |
| Signed upload URLs | Firebase Storage doesn't expose this; it's a raw GCS feature only accessible via Admin SDK server-side, which defeats the purpose |
| Mux / Cloudflare Stream / other video SaaS | Adds cost + vendor + new auth surface for a feature used 15–25 times per cohort. Not justified at this volume |
| FFmpeg server-side thumbnail generation | Vercel functions don't ship FFmpeg; would need a separate Cloud Function, which is over-engineering for v1 |

**Integration points:**

- `storage.rules` — add `ambassador-applications/` path (currently the rules are all-deny default; add a scoped allow)
- `src/components/ambassadors/ApplyForm.tsx` (new) — mirror `MentorRegistrationForm.tsx`'s Storage upload pattern, swap `uploadBytes` for `uploadBytesResumable`
- Firestore `applications/{applicationId}` doc stores `videoUrl` string (the `getDownloadURL` result), not the raw Storage path

**Confidence:** HIGH. Pattern is already proven in the codebase; `uploadBytesResumable` is stable Firebase SDK API.

---

### 2. Referral link attribution

| Decision | Value |
|----------|-------|
| Technology | Custom implementation: `?ref=<ambassadorCode>` query param → Next.js middleware → HTTP-only cookie → consumed on Firebase Auth signup callback |
| Package version | Zero new dependencies |
| New dependency? | **No** |
| Attribution window | 30 days (cookie `Max-Age=2592000`) |

**Why this choice:**

- The platform uses Firebase Auth for signup, so there's no "referral" concept in any auth library to lean on — whatever we build has to sit **outside** the auth flow and feed data into it.
- The volume is tiny: ~15–25 ambassadors, each sharing one link, target 150 signups total over 6 months. There's no scale problem justifying a third-party library (no need for Rewardful, FirstPromoter, Tolt, etc.).
- The codebase already has conventions for UTM params (grep across `src/` shows `utm_source` / `utm_medium` usage in `src/app/events/cwa-promptathon/2026/constants.ts` and elsewhere) — attribution is already a known pattern, just not previously persisted cross-session.
- **No signed-cookie library is needed.** The referral cookie does not need to be tamper-proof: worst case a user hand-crafts a cookie to credit an ambassador who didn't refer them, which inflates one ambassador's count by one. This is a low-stakes community program with an admin reviewing monthly reports; we're not paying per-referral bounties in v1 (revshare is workshops-only and tracked manually). Plain cookies are fine.
- HTTP-only + `SameSite=Lax` + `Secure` attributes are sufficient (set via `cookies()` helper in a Next.js Route Handler or middleware). No need for `iron-session`, `jose`, etc.

**Flow:**

1. Ambassador shares `https://codewithahsan.dev/?ref=AHMED-C1` (or `/ambassadors/AHMED-C1`, which 307s to `/` with the cookie set).
2. Next.js middleware (`src/middleware.ts`) matches requests with `?ref=`, sets HTTP-only cookie `cwa_ref=AHMED-C1; Max-Age=2592000; Path=/; SameSite=Lax; Secure`, strips the query param, redirects to the clean URL. (Clean URLs for SEO; cookie for attribution.)
3. On Firebase Auth signup (existing `onAuthStateChanged` + "create user doc" flow), a server action / route handler reads the cookie, validates the code exists in `users` where `roles` contains `"ambassador"`, writes a `referrals/{referralId}` doc with `{ ambassadorId, referredUserId, convertedAt: serverTimestamp(), sourceLink: "AHMED-C1" }`, then clears the cookie.
4. A new referral also writes (via the same atomic flow) a denormalized counter on `users/{ambassadorId}.ambassador.referralCount` for cheap leaderboard reads — see §6.

**Ambassador code format:** short slug, e.g., `AHMED-C1` (ambassador handle + cohort number). Generated once on application approval and stored on `users/{userId}.ambassador.referralCode`. Case-insensitive lookups (normalize to uppercase on write, uppercase on read).

**Alternatives considered:**

| Alternative | Rejected because |
|-------------|------------------|
| `next-auth` referral plugins | Platform uses Firebase Auth, not NextAuth |
| `iron-session` / `jose` signed cookies | Over-engineered; no real fraud surface in v1 |
| Rewardful / FirstPromoter / Tolt SaaS | Monthly cost > program's entire v1 operational budget for a 25-user feature |
| Client-side `localStorage` attribution | Cleared on browser switch / incognito / cross-device signup → unreliable. Cookies survive more real-world flows |
| UTM parsing libraries (e.g., `utm-params`, `query-string` with UTM schema) | Query string parsing is a 3-line `URLSearchParams` call; not worth a dep |
| Firebase Auth custom claims for referrer | Custom claims are capped at 1KB per user and are overkill for a one-shot attribution signal. Firestore doc is the right place |

**Integration points:**

- `src/middleware.ts` (currently doesn't exist per `src/` listings; new file) — thin, only matches `?ref=` requests
- `src/lib/auth/signup-hooks.ts` (or equivalent — attach to the existing "create user doc" flow) — reads cookie, writes referral doc
- `firestore.rules` — new `referrals/` collection rules: create allowed only via Admin SDK (server-side write only, to prevent users self-attributing), read gated to `roles.includes('ambassador')` for own referrals

**Confidence:** HIGH for the pattern; MEDIUM on one edge case — **users who sign up via Google/OAuth providers** (most CWA users) complete Firebase Auth signup before the "create user doc" code runs, so the cookie-read must happen in the post-signup handler, not as part of the auth request itself. This is a planner detail, not a stack question.

---

### 3. .edu / academic domain verification

| Decision | Value |
|----------|-------|
| Technology | **Hand-maintained regex for common academic TLD suffixes + optional JSON allowlist loaded from `Hipo/university-domains-list`** |
| Package version | No npm package; download `world_universities_and_domains.json` snapshot into `src/data/university-domains.json` |
| New dependency? | **No** (data file, not a package) |

**Why this choice (layered approach):**

**Layer 1 (hard gate): regex for academic-shaped TLDs.** Covers the 80% case cheaply:

```
/\.(edu|edu\.[a-z]{2,4}|ac\.[a-z]{2,4})$/i
```

Matches `.edu`, `.edu.pk`, `.edu.au`, `.ac.uk`, `.ac.jp`, `.ac.in`, etc. Rejects `.com`, `.io`, anything without an academic pattern. This is the first and cheapest check.

**Layer 2 (optional allowlist): domain in `world_universities_and_domains.json`.** For universities that use non-academic TLDs (e.g., German `.de`, French `.fr`, Finnish `.fi` university domains), check the domain against the Hipo list. This snapshot is ~9,000+ institutions worldwide in JSON form — load it once into memory (it's ~3–5 MB JSON, gzips to ~400 KB) in a server-side helper. Import lazily in the application verification route only.

**Layer 3 (human fallback): admin manual override.** Per the spec (Section 4), "for universities without a standardized academic TLD, a student ID photo upload is accepted and verified by the admin reviewer." The system must already support manual admin review regardless, so layer 3 is free.

**Why not an npm package:**

- `academic-email-verifier` — last published 3 years ago, not actively maintained as of 2026 ([npm](https://www.npmjs.com/package/academic-email-verifier)).
- `node-university-domains`, `university-domains` (npm) — last updated March 2016.
- **All npm packages in this space are stale.** The **data source itself is alive** — `Hipo/university-domains-list` on GitHub is actively maintained with 1,700+ commits — but no one has bothered wrapping it in a package. That's fine: the data is just a JSON file, we fetch it at build time and commit the snapshot.

**Alternatives considered:**

| Alternative | Rejected because |
|-------------|------------------|
| npm `academic-email-verifier` or `university-domains` | Unmaintained (3+ years stale) |
| Live API call to `universities.hipolabs.com` on every application submit | Introduces external dependency failure mode on the critical application-submit path. Snapshot the JSON into the repo instead — refresh annually or when needed |
| Regex-only (no allowlist) | Too restrictive; excludes real university emails on `.de`, `.fr`, etc. |
| Allowlist-only (no regex) | Too loose if the list is stale; `.edu`/`.ac.*` pattern is a reliable fast-path |
| Building our own crawler of university domains | Massively out of scope |

**Integration points:**

- `src/data/university-domains.json` — committed snapshot of [world_universities_and_domains.json](https://github.com/Hipo/university-domains-list/blob/master/world_universities_and_domains.json)
- `src/lib/validation/academic-email.ts` (new) — exports `isAcademicEmail(email: string): { valid: boolean; method: "regex" | "allowlist" | null }`. Server-side only (the JSON is too large to ship to the client).
- Called from the application submission API route, not the client form. The client gets back a boolean + hint; the authoritative check runs on submit.
- Refresh cadence: manual, annually. Add a note in `docs/` to rerun when student applications start rejecting valid schools.

**Confidence:** HIGH. The regex handles most academic TLDs correctly per common-sense TLD patterns; the Hipo list is the single best-maintained open data source in this space.

---

### 4. Discord role assignment (programmatic)

| Decision | Value |
|----------|-------|
| Technology | Extend `src/lib/discord.ts` — **no new library needed** |
| Package version | Raw `fetch()` calls to Discord API v10 (current pattern in the codebase) |
| New dependency? | **No** |

**Critical finding — the codebase already does this.** A full read of `src/lib/discord.ts` confirms:

1. **The project does NOT use the `discord.js` npm package.** Despite the milestone context suggesting otherwise ("Discord.js integration (src/lib/discord.ts)"), the file uses raw `fetch()` against `https://discord.com/api/v10`. No `discord.js` import appears anywhere in the repo. The planner needs to know this — any phase plan that says "use discord.js" is wrong; the pattern is plain fetch + bot token.
2. **Programmatic role assignment to existing members already works.** `assignDiscordRole(discordUsername, roleId)` at line 829 does exactly this: looks up the member by username (`lookupMemberByUsername`), then calls `PUT /guilds/{guild_id}/members/{user_id}/roles/{role_id}`. It's used today to auto-assign `DISCORD_MENTOR_ROLE_ID` and `DISCORD_MENTEE_ROLE_ID` (hard-coded at lines 807–808).
3. **The only thing missing is the Ambassador role ID constant.** Add:
   ```typescript
   export const DISCORD_AMBASSADOR_ROLE_ID = "<new-role-id-from-discord>";
   ```
   and optionally a thin wrapper `assignAmbassadorRole(discordUsername)` for ergonomics. That's the entire extension.

**Scopes / bot permissions:** The existing bot token already has `Manage Roles` permission (required for `PUT /roles/{roleId}`) — proven by the fact that `assignDiscordRole` currently succeeds for mentor/mentee roles. The **one gotcha**: the bot's role in the Discord server hierarchy must sit *above* the Ambassador role for the assignment to work. This is a Discord server admin config task, not a code task.

**Private `#ambassadors` channel:** Separate concern from role assignment. Same `discord.ts` module already creates category-scoped private channels (`createMentorshipChannel`, `createProjectChannel`). A new `createAmbassadorChannel` or `getOrCreateAmbassadorsChannel` (singleton — one shared channel for the whole cohort, not per-ambassador) follows the same pattern. Role-based permission overwrite (`type: 0` = Role, target = `DISCORD_AMBASSADOR_ROLE_ID`, `allow: "3072"` = VIEW_CHANNEL + SEND_MESSAGES) means new ambassadors auto-gain channel access when their role is assigned — no per-member permission overwrites needed.

**Alternatives considered:**

| Alternative | Rejected because |
|-------------|------------------|
| Add `discord.js@^14.x` as a proper client library | Duplicates what `src/lib/discord.ts` already does for 0 value. Would add ~15 MB and a WebSocket gateway connection that Next.js serverless can't sustain anyway. Current fetch-based pattern is the right shape for serverless |
| Use Discord webhooks for role assignment | Webhooks can't assign roles — they can only post messages. Not applicable |
| OAuth2 `identify`/`guilds.join` scopes | Requires user-initiated OAuth flow; we want bot-driven role assignment on admin approval, which the existing bot-token pattern already does correctly |

**Integration points:**

- `src/lib/discord.ts` — add `DISCORD_AMBASSADOR_ROLE_ID` constant + (optional) `assignAmbassadorRole()` wrapper + new `getOrCreateAmbassadorsChannel()`
- Admin application-approval handler calls `assignDiscordRole(discordUsername, DISCORD_AMBASSADOR_ROLE_ID)` after flipping `applications/{id}.status = "accepted"` and appending `"ambassador"` to `users.roles`
- Existing non-blocking error pattern (log + don't throw) already used for mentor/mentee role assignment applies directly

**Confidence:** HIGH. Verified by full read of `src/lib/discord.ts`; no research ambiguity.

---

### 5. Form validation (ambassador application form)

| Decision | Value |
|----------|-------|
| Technology | **Zod 4 schemas (server-side) + raw React state (client-side), matching the existing codebase pattern** |
| Package version | `zod@^4.3.6` (already installed) |
| New dependency? | **No** |
| `react-hook-form`? | **No** — optional, see decision below |

**Why this matches the codebase:**

A full grep of the codebase for form patterns returns:

- `react-hook-form` — **not imported anywhere.** Zero files.
- `zod` — imported in **exactly one file** (`src/lib/validation/urls.ts`, validates GitHub URLs). Installed but unused for forms.
- All current forms (`MentorRegistrationForm.tsx`, `MenteeRegistrationForm.tsx`, project creation at `src/app/projects/new/page.tsx`, roadmap creation at `src/app/roadmaps/new/page.tsx`, profile form, onboarding form) use **raw `useState` per field + inline validation + manual error state**.

The ambassador apply form must align with this pattern, not diverge. "Align with the same stack" per the question: **raw React state on the client, Zod schema on the server for the submit API route.** This also lets the admin panel (review action) share the exact same Zod schema, which the URL validator file demonstrates as the intended pattern.

**Zod 4 note:** The project is on `zod@^4.3.6` (released Nov 2025 line), not Zod 3. Key v4 differences that affect our schemas:

- `z.string().email()` is now `z.email()` (top-level, not method chain)
- `z.string().url()` is now `z.url()`
- Error customization uses `{ error: "message" }` not `{ message: "..." }` in many places
- `.default()` behavior changed for optional fields

These are planner-level details, not stack decisions — but the planner must write Zod 4 syntax, not Zod 3. The one existing consumer (`src/lib/validation/urls.ts`) uses `z.string().url()` — that's legacy Zod 3 syntax that happens to still work in Zod 4, but new code should use the v4 forms.

**Optional: add `react-hook-form@^7.x`?**

**Recommendation: no, unless the planner explicitly sees the apply form becoming multi-step with complex interdependencies.** Justification:

- The apply form is ~10 fields (name, email, Discord handle, university, year, country/city, motivation, pitch, video, accept-commitments). Roughly the same size as `MentorRegistrationForm` which uses raw state successfully.
- Adding `react-hook-form` here alone creates a one-off pattern that diverges from every other form in the codebase — higher cognitive load for whoever edits the mentor form tomorrow.
- The win of `react-hook-form` (fewer re-renders, easier complex validation) doesn't materialize at this form complexity.

**If the planner disagrees** after seeing the full form spec and wants to introduce `react-hook-form@^7.54.x` + `@hookform/resolvers` as a milestone-wide refactor target (convert mentor + mentee + roadmap + ambassador forms together), that's a legitimate call — but it's a separate milestone concern, not a v6.0 one-form decision.

**Alternatives considered:**

| Alternative | Rejected because |
|-------------|------------------|
| `react-hook-form` + `@hookform/resolvers` for this form only | Diverges from 5+ existing forms; creates inconsistency |
| `formik` | Codebase has never used it; no reason to add now |
| Raw HTML5 `required`/`pattern` only | Insufficient for "video file under 100 MB, duration ≤ 95 s, academic email, accepted commitments" composite validation |
| `valibot` (Zod alternative) | Codebase already has Zod installed |

**Integration points:**

- `src/lib/validation/ambassador-application.ts` (new) — exports `ambassadorApplicationSchema` and `ambassadorApplicationInput` type. Mirrors the shape of `src/lib/validation/urls.ts`.
- Client form in `src/app/ambassadors/apply/page.tsx` uses `useState` per field; runs `schema.safeParse()` on submit for final check; calls POST API.
- Server route `src/app/api/ambassadors/applications/route.ts` re-runs `schema.parse()` as the authoritative validation.

**Confidence:** HIGH. Directly observed from codebase; Zod already installed.

---

### 6. Data aggregation for leaderboard (cohort size 15–25)

| Decision | Value |
|----------|-------|
| Technology | **Denormalized counters on `users/{userId}.ambassador` subdoc, updated transactionally from Next.js API routes at write time** |
| Package version | `firebase@^12.6.0` (already installed) — uses `runTransaction()` and `increment()` |
| New dependency? | **No** |

**Why this choice (for this cohort size):**

The spec defines three leaderboard aggregates per ambassador: **referral count, events hosted, strikes**. Cohort size is 15–25, refreshed every 6 months. Let's compare the four realistic options:

**Option A — Client-side aggregation on every leaderboard view.**

Fetch all `referrals` where `ambassadorId in [25 ids]`, all `events` where `ambassadorId in [25 ids]`, all `monthlyReports` per ambassador, count them in JS.
- **Reads per leaderboard view:** ~(150 referrals + 60 events + ~120 reports) ≈ 330 reads per cohort × N ambassadors viewing the leaderboard. Across 25 ambassadors viewing 4×/month over 6 months = 3,000 views × 330 = 990,000 reads over the term. Well within free tier but wasteful and slow (client round-trip time).
- Also requires Firestore `'in'` query chunking (10-element limit per query → 3 queries per collection).
- **Verdict:** Works but noticeably slow UX; the leaderboard is the primary dashboard surface and needs to feel snappy.

**Option B — Firestore native `count()` / `sum()` aggregation queries.**

`getCountFromServer(query(collection(db, 'referrals'), where('ambassadorId', '==', id)))` per ambassador.
- **Reads per leaderboard view:** 1 aggregation call per ambassador per aggregate = 25 × 3 = 75 aggregation reads per view. Each aggregation billed as ~1 read per "up to 1000 docs scanned" — so ~75 reads per view (vs. 330 in option A).
- Pros: Server-side, no client round-trips after queries complete, no denormalization bug surface.
- Cons: Still 75 parallel queries per view; aggregation queries use existing indexes, so no new index config needed; but they can't subscribe via `onSnapshot` (aggregations are one-shot) so the leaderboard can't live-update without polling.
- **Verdict:** Good middle ground; works for this scale but the lack of live updates is a minor downgrade.

**Option C — Denormalized counters on `users/{userId}.ambassador`, updated by Cloud Functions triggers.**

Cloud Function on `onDocumentCreated("referrals/{id}")` increments `users/{ambassadorId}.ambassador.referralCount`.
- Pros: Leaderboard reads are a single `users` collection query with `array-contains('ambassador', 'ambassador')` — dead simple, supports `onSnapshot` live updates, counters are ready at read time.
- Cons: **The project has essentially no Cloud Functions deployed** — `functions/src/index.ts` is empty except for scaffolding comments. Introducing Cloud Functions now adds CI/CD surface (separate deploy step, separate `functions/package.json`, blaze plan billing concerns), linting config, and a new failure mode. Idempotency of triggers is also a real concern (triggers can fire more than once — see [Firestore functions counter docs](https://fireship.io/lessons/firestore-cloud-functions-data-aggregation/)), requiring dedupe keys in the counter update.
- **Verdict:** Over-engineered for 25 users writing a few docs/week.

**Option D — Denormalized counters updated transactionally from Next.js API routes at write time. ← RECOMMENDED**

When a referral conversion happens (existing signup hook in §2), the same API route that writes `referrals/{id}` also increments `users/{ambassadorId}.ambassador.referralCount` using `FieldValue.increment(1)` inside a single Firestore transaction. Same for event creation (`events/{id}` + `.eventCount++`) and monthly-report misses (`.strikeCount++`).
- Pros: Zero new infrastructure. Reuses the existing Next.js API route pattern. Transactional — no double-count bugs. Leaderboard reads are a single cheap `users` query. `onSnapshot` gives live updates for free.
- Cons: Every referral/event/report write path must remember to update the counter. Mitigated by localizing each write to a single dedicated API route (one per activity type) so the counter update lives alongside the primary write. This is already the codebase's convention — see the bookings transaction pattern (`src/lib/permissions.ts` + the Firestore transactions for bookings noted in PROJECT.md Key Decisions).
- **Verdict:** Best fit for the existing stack's conventions and this program's scale.

**Pricing comparison at v1 scale (15–25 ambassadors × 6 months):**

| Option | Leaderboard-view reads (term total) | New infra? | Live updates? |
|--------|-------------------------------------|------------|---------------|
| A (client-side) | ~1,000,000 | No | Yes (but slow) |
| B (native aggregations) | ~225,000 | No | No (one-shot) |
| C (Cloud Functions) | ~75,000 (just users reads) | **Yes** (CF deploy) | Yes |
| D (inline counters) ← | ~75,000 (just users reads) | **No** | Yes |

All options are comfortably under the Firestore free tier (50K reads/day). Option D wins on **simplicity × maintainability × UX**.

**Hybrid recommendation:** Use Option D as the primary path. Keep Option B (`getCountFromServer`) as a one-shot **reconciliation tool** in an admin route (e.g., `/api/admin/ambassadors/reconcile-counters`) that recomputes counters from source of truth if they ever drift — a cheap safety net rather than a primary mechanism.

**Alternatives considered:**

| Alternative | Rejected because |
|-------------|------------------|
| Big-data pipeline (BigQuery / Materialize) | Absurd at this scale |
| Redis cache layer for counters | Adds infra; counters change maybe 5×/day total across the cohort |
| Scheduled recompute (daily GitHub Actions cron) | Introduces lag on the leaderboard; ambassadors want instant feedback on new referrals |

**Integration points:**

- `src/types/mentorship.ts` (or new `src/types/ambassador.ts`) — extend `users/{id}.ambassador` subdoc with `referralCount: number`, `eventCount: number`, `strikeCount: number` (default 0)
- `src/app/api/ambassadors/referrals/route.ts` — wraps the write in `runTransaction` + `increment(1)` on `users/{ambassadorId}.ambassador.referralCount`
- `src/app/api/ambassadors/events/route.ts` — same pattern for events
- Monthly-report cron (existing GitHub Actions pattern) — on missed report, writes strike + increments `strikeCount`
- Leaderboard query: single `users` collection `where('roles', 'array-contains', 'ambassador')` + `where('ambassador.cohortId', '==', currentCohortId)`, read counters directly; supports `onSnapshot` for live updates

**Confidence:** HIGH. Pattern is already established in the codebase for bookings (transactional writes with Firestore).

---

## Summary of Dependency Changes

### Runtime Dependencies — Added

**None.** Every capability is buildable from `package.json` as-is.

### Runtime Dependencies — Considered & Rejected

| Package | Why rejected |
|---------|-------------|
| `discord.js@^14.x` | Existing `src/lib/discord.ts` covers all needs with raw fetch; adding would bloat the bundle and break Vercel serverless fit |
| `react-hook-form@^7.x` + `@hookform/resolvers` | Codebase uses raw React state; one-off adoption creates inconsistency — defer to a cross-form refactor milestone if needed |
| `academic-email-verifier`, `node-university-domains`, `university-domains` | All stale (3+ years unmaintained) |
| `iron-session`, `jose` | Referral cookie doesn't need signing at this trust level |
| Video platforms (Mux, Cloudflare Stream) | Cost + complexity unjustified at 25 uploads/cohort |
| Cloud Functions (`firebase-functions`) for leaderboard counters | Over-engineered for 15–25 users; inline transactional increments are cleaner |

### Data Assets — Added

| Asset | Source | Size | Refresh |
|-------|--------|------|---------|
| `src/data/university-domains.json` | [Hipo/university-domains-list](https://github.com/Hipo/university-domains-list) `world_universities_and_domains.json` | ~3–5 MB (server-side only) | Manually, annually |

### Environment Variables — Added

| Variable | Purpose |
|----------|---------|
| `DISCORD_AMBASSADOR_ROLE_ID` | Export as a constant in `src/lib/discord.ts` (mirrors existing `DISCORD_MENTOR_ROLE_ID`); no `.env` entry needed |
| `DISCORD_AMBASSADORS_CATEGORY_ID` (optional) | If we want a dedicated category for ambassador channels instead of reusing `Mentorship` or creating at root |

### Firebase Security Rules — Updated

- `storage.rules`: add scoped `ambassador-applications/{userId}/{fileName}` write path with 105 MB ceiling and `video/*` content-type check
- `firestore.rules`: add rules for new collections — `applications/`, `cohorts/`, `referrals/`, `events/` (ambassador-hosted), `monthlyReports/`; update `users/` rules to support reads gated on `request.auth.token.roles[*]` array membership (corollary of the role-system migration prerequisite in PROJECT.md)

## Installation

**No `npm install` commands are required for this milestone.** The only asset to add is a JSON file:

```bash
# One-time: snapshot the Hipo university domains list into the repo
curl -o src/data/university-domains.json \
  https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json
```

Everything else uses already-installed packages.

## Key Integration Points with Existing Stack

| Existing system | How v6.0 extends it |
|-----------------|---------------------|
| `src/lib/discord.ts` | Add `DISCORD_AMBASSADOR_ROLE_ID` const, new `getOrCreateAmbassadorsChannel()` helper, optional `assignAmbassadorRole()` wrapper |
| `src/lib/permissions.ts` | Add ambassador permission functions (`canViewAmbassadorDashboard`, `canReviewApplications`); update existing checks to use `roles.includes(...)` per the role-migration prerequisite |
| Firebase Storage (`uploadBytes` pattern in `MentorRegistrationForm`) | Use `uploadBytesResumable` for the video upload path; add `ambassador-applications/` Storage rules |
| Firestore session-cookie auth | Reuse existing admin auth for the `/admin/ambassadors` review panel |
| GitHub Actions cron pattern (not Vercel cron) | Add a monthly cron job that (a) opens the monthly-report window, (b) on month-end, writes strikes for any ambassador who didn't submit |
| Gemini (`@google/genai`) | **Not used in v1 ambassador program.** If v2 wants AI-suggested ambassador-of-the-month rationale based on activity, it slots in here |
| Existing UTM conventions | Referral link system is UTM-compatible — `?ref=X&utm_source=ambassador&utm_campaign=cohort-1` coexists cleanly |
| Zod (`src/lib/validation/urls.ts`) | Extend with `src/lib/validation/ambassador-application.ts` schema |

## What NOT to Add (planner guidance)

These were considered and explicitly rejected; the planner should not reintroduce them without a new written justification:

1. **`discord.js` package** — the raw-fetch pattern is intentional and correct for Vercel serverless.
2. **`react-hook-form`** for the apply form alone — creates form-pattern inconsistency.
3. **Cloud Functions** for leaderboard aggregation — inline transactional counters are simpler at this scale.
4. **A video platform SaaS** — Firebase Storage direct upload is sufficient for 60–90 s videos at 25/cohort.
5. **Signed-cookie libraries** for referrals — the trust model doesn't need them.
6. **An npm academic-email package** — all candidates are abandoned; the Hipo JSON snapshot is the right level of abstraction.
7. **FFmpeg / server-side video processing** for thumbnails — `<video preload="metadata">` browser posters are enough.
8. **A middleware framework or auth rewrite** — existing Firebase Auth + middleware cookie handling covers referral attribution.

## Sources

- [Firebase Cloud Storage — Upload files on Web (`uploadBytesResumable`)](https://firebase.google.com/docs/storage/web/upload-files) — HIGH confidence
- [Firebase Storage Security Rules](https://firebase.google.com/docs/storage/security) — HIGH confidence
- [Firestore Aggregation Queries (count, sum, avg)](https://firebase.google.com/docs/firestore/query-data/aggregation-queries) — HIGH confidence
- [Firestore write-time aggregation patterns](https://firebase.google.com/docs/firestore/solutions/aggregation) — HIGH confidence
- [Discord API v10 — Add Guild Member Role](https://discord.com/developers/docs/resources/guild#add-guild-member-role) — HIGH confidence (corroborated by working code in `src/lib/discord.ts:829`)
- [Hipo/university-domains-list (GitHub)](https://github.com/Hipo/university-domains-list) — HIGH confidence (actively maintained, 1,700+ commits)
- [academic-email-verifier (npm, unmaintained)](https://www.npmjs.com/package/academic-email-verifier) — verified stale
- [Vercel serverless function body size limits (4.5 MB)](https://vercel.com/docs/functions/runtimes) — HIGH confidence (well-established platform limit)
- [Zod 4 changelog / release notes](https://zod.dev/v4) — MEDIUM confidence (Zod v4 is current; specific per-API changes should be re-verified at implementation time)
- Codebase: `src/lib/discord.ts`, `src/components/mentorship/MentorRegistrationForm.tsx`, `src/lib/validation/urls.ts`, `package.json`, `functions/src/index.ts`, `firebase.json`, `storage.rules`, `firestore.rules` — HIGH confidence (directly read during this research)
