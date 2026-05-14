# Pitfalls Research

**Domain:** Student Ambassador Program on existing Next.js 16 + Firebase community platform
**Researched:** 2026-04-21
**Confidence:** HIGH (grounded in actual codebase inspection + spec review + prior-milestone retrospective lessons)

## Context for Consumers

This research is scoped to **adding** ambassador features to an existing 46,772-LOC production codebase with live mentorship and project-collaboration subsystems. Pitfalls are anchored to:

- Actual code: `src/lib/permissions.ts` (lines 21–26: `PermissionUser.role: MentorshipRole`), `firestore.rules` (lines 14–18: `request.auth.token.role == "mentor"`), `src/types/mentorship.ts` (line 6: `type MentorshipRole = "mentor" | "mentee" | null`), `src/lib/discord.ts` (lines 806–877: `assignDiscordRole`, `lookupMemberByUsername`).
- Confirmed scale: 35 occurrences of `role: '<literal>'` across 17 test/app files; ~72 role usages overall per milestone brief.
- Prior retrospective lessons: non-blocking Discord pattern (v2.0), auth pattern divergence (v4.0), permission foundation-first (v2.0), phase archival (v5.0).

---

## Critical Pitfalls

### Pitfall 1: Rules-vs-app deploy race on the role migration

**What goes wrong:**
`firestore.rules` still reads `request.auth.token.role == "mentor"` (line 16), but the app starts writing/expecting `roles: string[]`. On deploy, one of three bad states materializes for 30s–10min:

1. App deployed first, rules stale → legitimate mentors denied because their new token claim is `roles: ["mentor"]` not `role: "mentor"`.
2. Rules deployed first, app stale → old app writes `role: "mentor"` but new rules want `roles`; writes fail.
3. Rules deployed, app deployed, but existing *sessions* still hold the old custom claim (`role`, not `roles`) until token refresh (up to 1 hour). Mentors get spurious permission denials mid-session.

**Why it happens:**
Firebase custom claims are set asynchronously and propagate on next ID-token refresh (default 1 hour TTL). Deploys are treated as atomic but they aren't — rules bundle ships separately from the Vercel app, and ID tokens in user browsers are cached. Developers test locally with fresh tokens and miss the stale-session case entirely.

**How to avoid:**
- **Dual-read rules during transition.** Write rules that accept *either* shape: `(request.auth.token.role == "mentor" || "mentor" in request.auth.token.roles)`. Ship this *before* any app change.
- **Dual-write in app.** On every user mutation that touches role, write both fields for the transition window. Only remove `role` after 100% of users are backfilled AND claims are rotated.
- **Force token refresh after claim migration.** Call `auth.currentUser.getIdToken(true)` on the next authenticated request post-deploy, OR bump a `claimsVersion` field that a client-side hook watches to trigger refresh.
- **Deploy order matters:** rules (dual-read) → backfill → app (dual-write) → app (roles-only) → rules (roles-only). Five separate deploys, not one.

**Warning signs:**
- Sentry/error logs show a spike in `PERMISSION_DENIED` errors immediately after any of the five deploys.
- Support reports of "mentor tab is empty" or "can't approve an application" from users who haven't closed their browser since before the deploy.
- Tests pass locally but smoke-tests against a pre-existing staging user fail.

**Phase to address:**
Phase 1 (Role migration). This is the *prerequisite* phase for everything else and must ship cleanly before the ambassador features that depend on `roles.includes("ambassador")` can ship.

---

### Pitfall 2: Backfill migration that loses data or misses users

**What goes wrong:**
A Node script iterates `users` collection to transform `role: "mentor"` → `roles: ["mentor"]`. On a real dataset (thousands of docs):

- **Pagination skip.** `collection.get()` pulls everything into memory — fine at 1K docs, OOMs at 50K. Switching to `.limit(500).startAfter(cursor)` but not committing batch writes in-order → a subset is skipped when the next page cursor lands mid-batch.
- **Users with no role at all.** Legacy users (pre-v1.0) may have no `role` field. The naive script writes `roles: [undefined]` or `roles: [null]`, which Firestore accepts but breaks every subsequent `array-contains` query.
- **Users with `role: null`.** The `MentorshipRole` type allows `null` (line 6 of `src/types/mentorship.ts`). Naive transform produces `roles: [null]` — same problem.
- **Script re-runs are not idempotent.** If it crashes halfway, re-running appends to the array instead of deduplicating, producing `roles: ["mentor", "mentor"]`.

**Why it happens:**
Migrations are treated as one-shot scripts, not production code. They skip the error handling, null-handling, and idempotency that app code gets. Production `users` collections always have a long tail of weird legacy shapes (the v1.0 admin-created profiles, imported data, manually-edited docs) that differ from the type definition.

**How to avoid:**
- **Use `{ merge: true }` with conditional transforms.** For each doc, read `role`, derive `roles` as `[role].filter((r) => r && typeof r === "string")`, write only if `roles` doesn't already exist or differs.
- **Paginate with document snapshots, not cursor values.** `query.limit(500).startAfter(lastSnapshot)` — prevents drift.
- **Make the script idempotent.** If `doc.data().roles` exists and is an array, skip. Log skipped count separately from migrated count.
- **Run against a prod snapshot first.** Firestore export to a staging project, run migration, verify counts: `migrated + already_migrated + skipped_no_role == total`. Any discrepancy = bug.
- **Keep `role` written for 1 week post-migration** before the second cleanup pass. Reversibility matters.
- **Write a dry-run mode** that logs the before/after JSON for 100 random docs without writing.

**Warning signs:**
- Post-migration count of `users` with `roles: array-contains "mentor"` ≠ pre-migration count of `users` with `role == "mentor"`.
- `users` with `roles` field but array length 0 or containing null.
- New queries returning fewer mentors than the old page did.

**Phase to address:**
Phase 1 (Role migration). The migration script is a deliverable with its own tests, not a throwaway.

---

### Pitfall 3: Test stubs still use `role: "mentor"` and silently pass

**What goes wrong:**
There are 35 occurrences of `role: "<literal>"` across 17 test/app files (confirmed via grep). After the type changes to `roles: string[]`, any test file that builds a fixture as `{ role: "mentor", ... }` is now *missing* the `roles` field. TypeScript either:

1. Catches it (if the type is strict and `role` is removed entirely) — good.
2. *Doesn't catch it* (if `roles` is optional, or if `role` is kept as a deprecated back-compat field) — the test now silently builds a broken user object. Worse: permission helpers that fall back to `role` keep returning the right answer during the transition, masking the fact that the test hasn't actually been migrated.

A specific trap: `permissions.test.ts` has 5 fixtures with `role: "mentor"` or `role: "mentee"` and the permission helpers on line 53–56 of `src/lib/permissions.ts` do `user.role === "mentor"`. If the helpers are updated to check `roles.includes("mentor")` but the test fixture isn't, the test passes only because `user.roles` is `undefined` and `undefined.includes(...)` throws → test catches the throw and reports "correctly denied" for the wrong reason.

**Why it happens:**
Tests feel "done" because they're green. Bulk find-replace on app code rarely includes test fixtures because devs don't want to touch passing tests. The 95 permission tests from v2.0 give false confidence precisely because they're comprehensive — any that *aren't* migrated blend in.

**How to avoid:**
- **Make the migration a TypeScript-breaking change.** Rename `role` → `roles` and change the type from `MentorshipRole` to `string[]`. Every test fixture becomes a red squiggle until migrated.
- **Run tests with `--coverage` before and after.** Coverage drop in `permissions.ts` signals tests that still exercise the old path.
- **Add a smoke test that fails on presence of legacy field.** `expect(user).not.toHaveProperty("role")` in a compile-time utility or a schema test.
- **Migrate test fixtures in the same PR as the type change.** No transition window for tests — they either use the new shape or don't compile.

**Warning signs:**
- All 95 permission tests still green after the migration landed. (Statistically unlikely — at least one should have needed a fixture change.)
- `grep -rn "role:" src/__tests__` still returns matches after Phase 1 ships.
- Coverage report shows `roles.includes` is never hit in tests.

**Phase to address:**
Phase 1 (Role migration). Bundled with the type change PR.

---

### Pitfall 4: Firestore `array-contains` query composition limits

**What goes wrong:**
The new dashboard wants to list "all ambassadors who are also mentors" or "show me all users with role X ordered by createdAt." Firestore has two hard limits on `array-contains`:

1. **Only one `array-contains` per query.** You cannot do `where("roles", "array-contains", "ambassador").where("roles", "array-contains", "mentor")`. This fails at runtime with an index error.
2. **`array-contains-any` accepts up to 30 values.** Fine for the current set of 3–4 roles, but if the role system grows (campus rep, lead ambassador, alumni, etc.) to 30+ in v2+, queries start failing.
3. **Composite index explosion.** Every `array-contains` + `orderBy` + equality combo needs its own composite index. Admin queries like "all ambassadors ordered by `ambassador.joinedAt` desc" require a new index.

Specific scenario: The existing admin "All Mentors" page currently does `where("role", "==", "mentor").orderBy("createdAt")`. Post-migration it becomes `where("roles", "array-contains", "mentor").orderBy("createdAt")` — different composite index. If the index isn't deployed, the page returns "index required" errors only in production (emulator is lenient).

**Why it happens:**
`array-contains` looks like a drop-in replacement for `==`, but Firestore's query planner treats it differently. Developers migrate the query syntax without noticing they now need new indexes, and the "index required" URL in the error message is easy to miss in server logs.

**How to avoid:**
- **Inventory every role-based query first.** Grep for `role`, `.where(.*role`, and document the exact query shape. For each, determine the new shape and whether a new composite index is needed.
- **Commit `firestore.indexes.json` changes in the same PR.** Firebase tooling supports a JSON manifest — anything the app queries should be in that file.
- **Run the migrated app against the emulator with `--ui` and click every role-filtered admin page** before deploying. The emulator emits index warnings even though it allows the query.
- **For "X AND Y" role queries,** use a denormalized boolean or a scalar role-tuple pattern: store `primaryRole: "ambassador"` for the common case, use `roles` only for membership checks. Or accept that Y-filtering happens in memory post-query.
- **Never use `array-contains-any` with an unbounded list.** If the list of roles grows, migrate to multiple documents / a subcollection before hitting 30.

**Warning signs:**
- Admin pages show "The query requires an index" in production but work locally.
- Query latency on the All Mentors page jumps from <100ms to 500ms+ (missing index → full collection scan).
- Firestore billing ticks up disproportionately — reads per page load climbing.

**Phase to address:**
Phase 1 (Role migration) for the query shape changes and new indexes; Phase 6 (Dashboard) for any new ambassador-specific queries.

---

### Pitfall 5: Referral attribution fraud — self-dealing and click-farm attribution

**What goes wrong:**
Ambassadors can quietly game the leaderboard and the ≥150-signup success metric by:

1. **Self-referral via burner accounts.** Ambassador signs up with a fresh Gmail/Outlook, hits their own referral link, counts as a referred signup. No technical barrier in a naive v1.
2. **Family/friends round-tripping.** Ambassador's siblings create Discord + platform accounts, sign up through the link, never return. Not technically fraud, but not "community growth."
3. **Link-spamming existing communities.** Ambassador drops their referral link into another Discord server, subreddit, or WhatsApp group they're already in. Every prior contact of theirs who signs up gets attributed — but these users would have likely joined anyway via organic word-of-mouth. Attribution theft, not real growth.
4. **Bot click farms.** Cheap traffic services ($5 for 1000 clicks) can get an ambassador to the top of the leaderboard with fake traffic. Even if signups require real emails, clicks alone may be surfaced on the dashboard and create misleading leaderboards.
5. **Cross-attribution poaching.** Two ambassadors in the same campus: one drops their link in a WhatsApp group the other seeded. First-touch vs last-touch attribution becomes a political issue.

**Why it happens:**
Any referral program with leaderboards + tangible benefits (paid workshop revshare, LinkedIn recommendation, "top performer" spotlight) creates economic incentive to game. Ambassadors aren't malicious — they're competitive students looking for legitimate edges. The v1 has ≥3 paid workshops and 25% revshare explicitly on the table (Section 7.2), which is real money.

**How to avoid — v1 defensive minimum (no ML, no fraud team):**
- **Attribute only on signup + verified email + Discord join.** Require all three before a referral counts. Signup alone is too cheap; adding Discord-join + email-verify makes self-dealing painful.
- **Log but don't act on fraud signals.** Even if v1 doesn't block anything, record for every referral conversion:
  - IP address of the click and the signup.
  - User agent of the click.
  - Time delta between click → signup → first Discord activity.
  - Email domain (flag if same as ambassador's email domain or burner domains).
  - Whether the referrer's own IP submitted the signup (same-IP flag).
  - GeoIP country of click vs GeoIP country of signup (mismatches are either VPN or suspicious).
- **One-per-referrer dedup.** A given `referredUserId` can only be attributed to one ambassador, ever. First-touch wins. No re-attribution.
- **Cap referral count at a soft threshold in the leaderboard calculation.** Display "5+" for any ambassador above a threshold (e.g., 30 referrals) instead of the raw number — reduces gaming incentive for top-of-board.
- **Post-term manual audit.** Before paying out revshare or issuing certificates, the admin reviews the top 3 performers' logs. Disproportionate same-IP signups or clustered timing → conversation, not auto-strike.
- **Document the "spirit" explicitly in the commitment acceptance.** The terms ambassadors sign should say "attribution is for new community members only; burners / friend-loops / paid traffic will be disqualified." Makes post-hoc enforcement defensible.

**Warning signs:**
- One ambassador's referrals all come from the same IP / same /24 subnet.
- Referrals show zero Discord activity after joining for 30+ days.
- Spike in signups in a 4-hour window from one referral source, all with throwaway-email-provider domains.
- An ambassador's referral-to-retained-user ratio is dramatically below the cohort average.

**Phase to address:**
Phase 4 (Referral system) owns the attribution logic and signal logging. Phase 6 (Dashboard) owns the display side (the "5+" cap and hiding raw counts from peers). Admin review of signals is operational, not coded — but the data must be logged in v1 so it can be audited.

---

### Pitfall 6: `.edu` email verification gotchas

**What goes wrong:**
"Just check for `.edu`" sounds simple and fails globally for a worldwide program:

1. **International academic TLDs.** Students at University of Cambridge (`@cam.ac.uk`), University of Karachi (`@uok.edu.pk`), IIT Delhi (`@iitd.ac.in`), University of Tokyo (`@u-tokyo.ac.jp`) don't have `.edu`. A regex on `.edu$` rejects most non-US applicants. The spec already calls this out (Section 4) but the implementation will regress to the easy pattern if not explicit.
2. **Recently-graduated students.** A `.edu` address typically remains active for 6–12 months post-graduation. Someone who graduated in December 2025 can apply to a Spring 2026 cohort with a still-valid `.edu` and technically not be enrolled. The program explicitly requires "currently enrolled."
3. **Free `.edu`-lookalike domains.** `.education`, `.edu.co` (Colombia), commercial domains like `edu.example.com`. Naive suffix matching accepts them.
4. **Phone-verified `.edu` signups via service resellers.** Services exist that sell access to `.edu` email addresses for $5–20. Adobe/Apple/AWS student perks have been gamed this way for years. These emails pass any technical verification you can run from a web app.
5. **Students at non-standard institutions.** Bootcamp students, community college continuing-ed, online university students. Legitimately enrolled, no `.edu`. The spec's student-ID-photo fallback addresses this — but the *default* UX flow must offer the fallback without making it feel second-class.
6. **Universities with non-obvious TLDs.** `.sch.uk` (UK secondary schools), `.ac.nz` (New Zealand), `.edu.sg` (Singapore). Keeping a hand-maintained list goes stale.

**Why it happens:**
`.edu` is a US DNS convention. Treating it as "the academic email standard" is US-centric. The list of TLDs that indicate "enrolled student" globally is long (50+ suffix patterns), evolving, and insufficient on its own (lookalikes + resellers).

**How to avoid — proportional v1:**
- **Do not gate acceptance on email domain alone.** Treat the email TLD as *one signal* used by the admin reviewer, not an auto-approval. The spec already requires admin review — keep it.
- **Accept a curated allowlist of academic TLDs:** `.edu`, `.edu.<2-letter country>`, `.ac.<2-letter country>`, `.sch.<2-letter country>`, known one-off domains. Ship with ~30 suffixes in a config file, extend on demand.
- **For anything outside the allowlist, require student-ID photo upload.** Same reviewer flow. Explicit in spec (Section 4 fallback) — make sure the apply form UX makes this a first-class path, not a hidden "other" option.
- **Log the applicant's email TLD separately for cohort stats.** "Rejection rate by TLD" is useful data to tune future rounds.
- **Require enrollment confirmation in the commitments.** The commitment text asks the applicant to confirm they are currently enrolled; acceptance creates a record. If later discovered false, program removal is defensible.
- **Do not send magic-link / verification to the `.edu`.** Email ownership ≠ enrollment. Don't pretend it does. Verification email should only confirm they can receive mail; the enrollment check is the admin reviewing the video + student ID.

**Warning signs:**
- Rejection rate is strongly clustered by country — suggests the allowlist is missing that country's TLD.
- Applicant complaints like "my `.edu.pk` was rejected" — failing globally.
- Acceptance rate for the student-ID-photo path is dramatically lower than the `.edu` path — suggests reviewer bias, which defeats the fallback's purpose.

**Phase to address:**
Phase 2 (Application form + admin review) owns the verification UI and allowlist. Phase 8 (Operational / cohort close) owns the rejected-TLD analytics for next cohort tuning.

---

### Pitfall 7: Discord role-assignment programmatic assignment pitfalls

**What goes wrong:**
The codebase already has `assignDiscordRole()` (`src/lib/discord.ts` lines 829–877) with `DISCORD_MENTOR_ROLE_ID` and `DISCORD_MENTEE_ROLE_ID`. Adding `DISCORD_AMBASSADOR_ROLE_ID` and calling the function on acceptance looks trivial. But:

1. **Bot role hierarchy.** Discord enforces that a bot can only assign roles *below* its own highest role in the server's role list. If the Ambassador role is created above the bot's role (because Admin dragged it to the top for visibility), every assignment returns 403. The existing mentor/mentee roles work only because they were positioned below the bot at setup; a new role will inherit whatever position it was created at.
2. **User left the server between application and acceptance.** `lookupMemberByUsername` returns null, `assignDiscordRole` logs a warning and returns false (line 842). The application is marked accepted in Firestore but the user never gets the Discord role. Dashboard and public page show them as ambassador, Discord doesn't — permanent drift until manual intervention.
3. **User changed Discord accounts mid-term.** Ambassador signs up as `oldname#1234`, gets accepted, then changes their Discord username (Discord now has global usernames + display names; username changes are allowed). The `users.discordUsername` in Firestore is stale; any retry of role assignment fails because lookupMemberByUsername doesn't find them.
4. **Role assignment succeeds but user leaves server later.** Term continues, their "Ambassador" badge still shows on platform. They should probably lose ambassador status, but the existing system has no mechanism to detect "user left Discord."
5. **Rate limiting on bulk operations.** Accepting a batch of 15–25 applications at once triggers 15–25 consecutive role assignments. Discord's per-bot rate limit is 50 requests per second globally but lower per route. The existing `fetchWithRateLimit` helper handles this for normal use but a loop without delays can still trip it.
6. **Non-blocking failure is silent.** The spec pattern is non-blocking Discord (confirmed in v2.0 retro), but on *acceptance* that's risky — the user is told "accepted" and may never see their Discord role. They assume the bot will catch up; it doesn't.

**Why it happens:**
The existing pattern in v2.0 (log errors, don't throw) was designed for *notifications* and channel creation where lateness is fine. Role assignment on acceptance is different: it's a promised benefit delivered in real-time. The "fire-and-forget" pattern applied to role assignment creates silent failures.

**How to avoid:**
- **Treat acceptance as a two-stage action.** Stage 1 (Firestore write) commits the acceptance. Stage 2 (Discord role assign) has its own retry queue — not fire-and-forget, not blocking. On failure, surface a "Discord role pending — retry" state in the admin panel so the admin can retry without re-running the whole acceptance flow.
- **Document the role hierarchy requirement explicitly in the setup runbook.** "Place Ambassador role immediately below the bot's role. If the bot cannot assign, check role position." First thing ops should check.
- **On acceptance, validate the applicant is still in the server first.** If `lookupMemberByUsername` returns null, surface that to the admin: "Cannot assign role: user not currently in Discord server. Ask them to rejoin and retry."
- **Store the Discord `member.id` (immutable) on the user doc at first lookup, not just the username.** The bot can keep assigning roles via ID even if username changes. Username changes are common; user IDs are forever.
- **Add a scheduled reconciliation job.** Weekly cron: for each active ambassador, verify they still have the Discord Ambassador role and are still in the server. If not, flag the admin — don't auto-remove. Matches the strikes philosophy (human-in-the-loop, Pitfall 10).
- **Rate-limit bulk acceptance explicitly.** Process acceptances serially with 200ms between calls, not `Promise.all`.

**Warning signs:**
- Accepted applications where `discordRoleAssigned: false` is not surfaced to the admin → ambassador in Firestore but not in Discord.
- Admin says "I accepted 8, but only 5 show the role in Discord."
- Role-hierarchy 403 errors in logs with no UI surfacing.

**Phase to address:**
Phase 2 (Admin review + acceptance) owns the two-stage acceptance with retry UI. Phase 3 (Discord integration extension) owns the rate-limit-aware bulk path, hierarchy validation, and member-id storage.

---

### Pitfall 8: Video upload UX on mobile + flaky connections

**What goes wrong:**
The 60–90s application video (Section 5) is the single highest-friction step in the flow. Mobile users on 3G/4G cellular:

1. **100MB HEIC iPhone capture.** iOS Safari captures video in HEIC/HEVC by default; the resulting file is ~40–100MB for 90s at 1080p. Many browsers cannot play HEIC back in a `<video>` tag. Admin gets a file they can't review without downloading and playing locally.
2. **Vertical-only capture.** iOS camera in-browser prefers portrait. Reviewer gets letterboxed vertical videos unless the upload pipeline handles orientation metadata properly.
3. **Upload mid-trip drop.** User on a train / in a cafe loses connection at 70%. Naive `fetch(PUT url, { body: file })` fails, the applicant returns to a broken form, and either retries from scratch (losing motivation) or abandons (losing the applicant).
4. **App crash / page reload.** User switches tabs, OS reclaims memory on iOS Safari, page reloads, form state is gone, upload restarts. Common on older iPhones.
5. **Uploaded but applicant never confirmed.** App crash after successful upload but before Firestore commit → orphaned video in Storage, applicant thinks they didn't apply.
6. **No playback verification.** Applicant uploads a video recorded sideways with no audio. Nobody checks until admin review, 1–2 weeks later. Too late to ask for a re-record.
7. **Autoplay + audio blocked in admin review.** Admin opens the application, clicks the video, nothing plays because Chrome blocks autoplay with audio until user interaction. Admin thinks it's broken.
8. **Mobile browser Storage upload token expiry.** Direct-to-Storage uploads use signed URLs with TTL (default 60 min). A slow upload on 3G can exceed the TTL and fail near 100%.

**Why it happens:**
Video upload is hard. "Just call upload()" is a desktop-fiber assumption. The existing codebase has no video-upload precedent (roadmap markdown is the closest — text files to Storage). There's no reusable pattern for resumable large uploads.

**How to avoid — robust minimum:**
- **Cap file size hard in UI.** 50MB max at the input. Show a friendly "Please record at 720p or compress to under 50MB" message with a link to quick instructions. Rejects HEIC-originated huge files early.
- **Accept common web codecs only: MP4 H.264, WebM VP9.** Reject HEIC/HEVC upfront with a clear message. Modern iOS can be coerced to H.264 by setting capture attributes; document this in the apply form.
- **Use Firebase Storage resumable uploads.** The Firebase JS SDK's `uploadBytesResumable()` handles network drops and resumes automatically. Non-negotiable on mobile. Show a progress bar with a real percentage, not a spinner.
- **Persist form state to localStorage on each field change.** If the page reloads, restore the form. Include the Storage upload handle so resumption works across reloads.
- **Client-side pre-upload playback check.** After file selection, render the file in a `<video>` tag and require the user to click "Play" and then "This is my video" before the submit button enables. Catches sideways / silent / wrong-file in 30 seconds. High-leverage.
- **Commit Firestore application record *first* with status `"awaiting_video"`, then upload video, then patch record with video URL.** Upload failure doesn't strand the applicant — they can resume from their applications list. Orphan videos are discoverable; orphan records are not.
- **Admin review page: explicit Play button.** Don't autoplay. Set `preload="metadata"` and render a poster frame. Admin clicks Play → browser allows audio. Saves the "video is broken" support tickets.
- **Store videos private by default, signed URL for admin review only.** See Pitfall 12 for the full version. Do not make the review URL public.

**Warning signs:**
- High submission drop-off between "started video upload" and "application submitted" (>30% drop → upload UX is broken).
- Admin review queue has videos that won't play in Chrome.
- Support emails asking "did my application go through?"

**Phase to address:**
Phase 2 (Application form) owns all upload-path defensive code, format validation, resumable upload, and client-side playback check.

---

### Pitfall 9: Storage rules accidentally public — applicant video leak

**What goes wrong:**
`storage.rules` currently denies all reads/writes (`allow read, write: if false;` line 9 — confirmed). The ambassador video upload *must* change this. Common mistakes:

1. **Developer copies a "public read" pattern from Firebase docs.** `match /videos/{file} { allow read: if true; }` — applicant videos become Google-indexable if any URL is leaked. Applicants sharing personal pitches publicly without knowing.
2. **`allow read: if request.auth != null`** is the "I made it private" trap — every signed-in user can read every applicant's video, including unsuccessful rejected applicants. 4800+ Discord members could browse rejected videos if they guess the URL.
3. **Bucket object listing.** Even with per-object read rules, if the bucket allows list(), admins, applicants, and sometimes anonymous users can enumerate all filenames — which often include the applicant's name or email. PII leak via filename.
4. **`getDownloadURL()` tokens are persistent and public.** A `getDownloadURL()` returns a URL with a long-lived access token. Anyone with that URL can access the file, forever, even if rules are tightened later. If admin emails this URL to a reviewer, or pastes in Slack, it's permanent public access.
5. **Applicant cached video persists after rejection.** Rejected applicant's video stays in Storage indefinitely. When asked "please delete my data" (GDPR / basic decency), no mechanism exists.
6. **Wrong Storage path structure for security rules.** If videos are stored at `applications/{applicationId}/video.mp4` without including the applicant's UID in the path, rules can't check "is this the uploader" because the rule can't derive that from the path alone without a Firestore lookup.

**Why it happens:**
Storage rules are a different language from Firestore rules and are learned late. The path structure gets chosen early ("what's a clean URL?") and then binds the rule author's hands. `getDownloadURL()` is the documented happy path; signed URLs require more setup.

**How to avoid:**
- **Path structure first.** Store at `applications/{applicantUid}/{applicationId}/video.mp4`. This lets the rule do `request.auth.uid == applicantUid` cheaply.
- **Deny-by-default + explicit allow:**
  ```
  match /applications/{uid}/{appId}/{file} {
    allow write: if request.auth != null && request.auth.uid == uid
                 && request.resource.size < 50 * 1024 * 1024
                 && request.resource.contentType.matches("video/.*");
    allow read: if request.auth != null && (
      request.auth.uid == uid || request.auth.token.admin == true
    );
  }
  ```
- **Do NOT use `getDownloadURL()` for admin review.** Use the Admin SDK server-side to generate a 1-hour signed URL on each review-page load. The URL is never stored, never cached, expires after the review session.
- **Retention policy from day one.** Declined applications: video purged 30 days after rejection. Accepted applications: video purged 30 days after cohort end. Document and implement as a scheduled job (GitHub Actions cron — pattern established in v2.0).
- **Never include PII in filenames.** Use UUIDs or `{appId}.mp4`, never `firstname-lastname.mp4`.
- **Storage rules test pack.** Use Firebase emulator's rule test framework: test that applicant can upload, cannot read others' videos, admin can read, anonymous user blocked, direct object listing blocked.

**Warning signs:**
- A `getDownloadURL` call appears in the admin review code — strong smell.
- Storage paths contain email addresses or names.
- No scheduled deletion job exists 30 days post-cohort.

**Phase to address:**
Phase 2 (Application form) for write rules + upload path. Phase 2 or separate hardening task for read rules and signed-URL admin review. Phase 8 (Operational) owns the retention cron.

---

### Pitfall 10: Automatic strike system firing unfairly

**What goes wrong:**
Spec Section 8 defines the 2-strike rule: missing a monthly self-report = 1 strike, 2 strikes = removal. A naive implementation ("if no report for month X, increment strikes") fails in predictable, program-killing ways:

1. **Timezone edge firing.** Cron runs at UTC midnight on day 1 of month. An ambassador in Pakistan (UTC+5) submitting their report at 11pm local on the last day of the month submits at 6pm UTC — which looks fine — but one in Hawaii (UTC-10) submitting at 11pm local submits at 9am UTC the next day and gets a strike.
2. **End-of-month holidays.** Ambassador is genuinely on family emergency / sick / Eid / Christmas break over the last week of the month. Misses the report by 2 days. Auto-strike hits; they log in the next day to see they're halfway to being kicked out. Program goodwill destroyed in a single support email.
3. **Platform / form bug.** Form submission failed due to a deploy at end-of-month. Ambassador submits on time from their perspective; system shows no report; strike fires.
4. **"Strike" is perceived as a disciplinary action, not a tally.** Even one strike delivered without a human voice reads as "you're on thin ice." The program explicitly trades on trust and goodwill (Section 2, "leadership development"); an adversarial tone breaks that.
5. **First cohort = no precedent.** Ambassadors don't know the edges of the system. They learn by getting hit. By the time the policy is refined, you've lost half the cohort's goodwill.
6. **Offboarding removes Discord role → user can't see the `#ambassadors` channel → can't read the message explaining why they were offboarded.** Common failure mode: remove the role *after* sending the offboarding message. Even then, they can't respond in-channel.

**Why it happens:**
Automation feels fair because it's consistent. But "consistent" isn't the same as "perceived as fair." Students are exactly the demographic that has unpredictable life events (exams, travel, family) and will interpret rigid auto-enforcement as bureaucratic cruelty.

**How to avoid — human-in-the-loop patterns:**
- **No auto-strikes in v1.** The cron job should *flag for admin review*, not mutate state. Admin gets a weekly "these ambassadors missed last month's report" summary. Admin decides whether to convert to strike after a DM. Spec Section 8.1 already says "The monthly report is the primary accountability surface" and implies the 1:1 call is where under-delivery is discussed — preserve this tone for missed reports too.
- **7-day grace period + reminder.** Report due day 1 of month. On day 3, if not submitted, send a friendly Discord DM: "Hey, missed this month's report. Drop it in by day 7." On day 7, flag for admin. This catches 90% of honest lapses without any strike.
- **Submission timestamp compares in ambassador's local timezone.** Store `reportingTimezone` per ambassador. "Monthly" means "by end of month in their TZ," not UTC.
- **Offboard flow includes a grace "last call" DM.** "You're at 2 strikes. Reply by Friday if there's context we should know. Otherwise we'll offboard Monday." Strike-escalation is a conversation, not a trigger.
- **Remove Discord role *after* the offboarding conversation is acknowledged** — not as part of the cron action. Keep the `#ambassadors` channel access for 7 days post-offboarding for closure.
- **Visible "strike status" on dashboard.** Ambassador always knows their count. No surprises.
- **Whitelist-by-exception.** Admin can mark an ambassador "leave of absence" for a month (documented reason, e.g., "final exams") which exempts them from the strike count that month. Normalizes the human exception.

**Warning signs:**
- Strike complaints in the `#ambassadors` channel — any is too many in v1.
- Ambassador drop-off rate exceeds 25% (the spec targets ≥75% completion).
- Post-term NPS below 80% with "felt the strike system was unfair" in free-text responses.

**Phase to address:**
Phase 5 (Monthly report + strikes) owns the human-in-the-loop cron, grace period, reminder DM, and admin-approval-required escalation.

---

### Pitfall 11: Dashboard aggregation drift and anxiety-inducing recomputes

**What goes wrong:**
The leaderboard + individual dashboard pull from four sources: referrals, events, monthly reports, and the ambassador doc. Naive real-time aggregation fails in several ways:

1. **Real-time counter drift.** Admin retroactively edits an old event ("oops, that wasn't you, that was Sarah") — if the dashboard uses denormalized counters (`users.ambassador.eventsCount`) incremented on write, the counter doesn't decrement on admin edit. Counter drifts up over time.
2. **Leaderboard "flashing."** If the leaderboard uses real-time Firestore listeners, every referral write (potentially multiple per minute during a spike) re-renders the entire list. Position changes animate constantly; users find it anxiety-inducing. Ambassadors refresh compulsively to see themselves overtake others, creating a toxic competitive vibe.
3. **Stale denormalized counters after admin-side deletions.** An admin deletes an event (spam, accidental double-entry, post-rejection cleanup). The `events` collection shrinks; the denormalized `eventsCount` on the user doc doesn't. Dashboard now shows 8 events, click-through shows 7. User loses trust.
4. **Leaderboard exposing small absolute numbers.** With a 15–25 cohort, the leaderboard routinely shows "5 referrals, 2 referrals, 1 referral, 0, 0, 0…" — the low-ranked ambassadors feel publicly shamed. Small-n leaderboards are morale-negative.
5. **Aggregate calculation cost at read.** Dashboard-on-load recomputes from scratch: query `referrals where ambassadorId == X`, `events where ambassadorId == X`, etc. Every page load is 4+ queries per ambassador. At 25 ambassadors checking the dashboard daily, that's 100+ queries/day — negligible, but it scales badly as activity grows.
6. **"Last updated" not shown.** Users don't know if the number is live or stale. They refresh compulsively.

**Why it happens:**
Dashboards look like trivial read-side features; they're actually the hardest part of an ambassador program to get right emotionally. Real-time + competitive + small-N + visible to peers is a specific mix that generates anxiety unless designed explicitly against it.

**How to avoid — right update cadence for v1:**
- **Aggregated snapshots, hourly recompute.** A scheduled job (GitHub Actions cron, pattern established in v2.0) recomputes every ambassador's stats every hour, writes to `users.ambassador.stats` subdoc. Dashboard reads this snapshot with a visible "Updated 37 min ago." Eliminates real-time flashing and stale-counter drift in one move.
- **On-demand refresh button.** Ambassador can click "Refresh now" — triggers immediate recompute. Satisfies the "I just logged an event, show it" case without needing real-time listeners.
- **Leaderboard shows aggregates, not ranks below top 3.** Display: "Top 3" section with photos + counts, then "Your position: #7" privately. Nobody is publicly at the bottom.
- **Use "activity band" display instead of raw rank.** Top performers ("This month's leaders"), strong contributors, steady contributors. Qualitative grouping reduces direct comparison.
- **Aggregations are recomputed from source-of-truth, not incremented.** `stats.referralsCount = count(referrals where ambassadorId == X AND validated == true)`. Admin edits and deletions naturally flow in on next recompute.
- **Hide the leaderboard to the cohort for the first 4 weeks.** Give ambassadors time to start, without immediate rank pressure. After week 4, reveal.
- **Explicitly no public leaderboard.** Leaderboard is gated to `roles.includes("ambassador")` only. Peer pressure is bounded; outside pressure doesn't exist.

**Warning signs:**
- Dashboard page-load latency >2s (recomputing from scratch on every view).
- Ambassadors complaining their counts are wrong ("I logged 3 events but it says 2").
- One ambassador appears dramatically ahead in week 1 and nobody bothers to compete.

**Phase to address:**
Phase 6 (Dashboard + leaderboard) owns the aggregation strategy, cron job, display rules, and grace-period launch.

---

### Pitfall 12: Applicant video privacy — who can see it at what point

**What goes wrong:**
(Related to Pitfall 9 but with different framing: this is the data-lifecycle view.)

1. **Public video URL in application email.** Admin receives a notification "New application from X" with a direct video link. The email forwards or gets quoted in Slack. The URL leaks to non-admins.
2. **Video becomes public once applicant is accepted** (to show on the public `/ambassadors` page). But the *applicant's* video wasn't meant to be marketing — it was a pitch for selection. Suddenly it's on the public cohort page, possibly with visible dorm-room background, personal details, or references to not-yet-announced intent. Applicants should have to separately opt in to a public-facing video for the cohort page.
3. **Declined applicants' videos retained forever.** Stored in Storage with no deletion. If Storage rules are later loosened (Pitfall 9), history leaks.
4. **Video downloaded by reviewer to local machine.** Reviewer downloads the MP4 to review offline. It now exists outside the system. No audit trail, no revocation.
5. **Applicant cannot withdraw their application / delete their video.** No self-service flow. Applicant emails "please delete my application" — manual admin task.

**Why it happens:**
The spec mixes "application video" and "public cohort presentation" in one mental frame ("the video doubles as organic marketing" — Section 5). That's true *only if applicants opt in*, and only for *accepted* ambassadors.

**How to avoid:**
- **Two separate videos, two separate fields.** `applicationVideo` (private, signed-URL admin review only, auto-purged on decision) and `cohortPresentationVideo` (optional, separately uploaded, public, only for accepted ambassadors). Different Storage paths, different rules.
- **Default the `cohortPresentationVideo` to empty.** Accepted ambassadors are prompted to upload a new one if they want to be featured. Reusing the application video is a one-click option, not a default.
- **Reviewer sees video via signed-URL only.** No download button. Inline player. 1-hour expiry. Regenerated on each page load.
- **Self-service application withdrawal.** Applicant can delete their application (and attached video) from their own profile area. Hard-delete Storage + Firestore.
- **30-day retention on declined applications.** Cron job, same pattern as strike flagging. Declined application after 30 days → video deleted, application record anonymized (keep aggregates like "how many Pakistani applicants this cohort" but drop name/email/video).
- **Audit log on admin review.** Every view of an application video is logged with admin UID + timestamp. Supports post-hoc investigations if a leak is alleged.

**Warning signs:**
- Admin review page has a "Download video" button.
- Public `/ambassadors` page has videos that include content the ambassador didn't expect to be public.
- No deletion has ever happened in Storage since the feature shipped.

**Phase to address:**
Phase 2 (Application form) establishes the private-video pattern. Phase 7 (Public cohort page) handles the separate public video. Phase 8 (Operational) owns retention cron and audit log.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems. Specific to this milestone.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep `role` field alongside `roles` "just in case" indefinitely | No migration risk | Every new query has to decide which to use; dual-code-path bugs for years | During the migration transition window (1–2 weeks). Remove after. |
| Store referral source as a plain link param, no signed cookie | Cheap to implement | Any user can forge their referrer by editing URL | Never — always sign the referral token |
| Hardcode the allowlist of academic TLDs in a `const array` in the apply page | Ships fast | Updates require a full deploy; non-technical admin can't extend | OK for v1 with <30 entries; extract to Firestore config before v2 |
| Skip the Storage retention cron, manually delete declined videos | No cron code | Gets forgotten; 6 months later you have 200 orphan videos and a compliance question | Never after the first 2 weeks of operation |
| Use Firebase real-time listeners on the leaderboard because "it's cool" | Live-feel UX | Flashing, anxiety, cost, re-render storms | Never for this specific leaderboard use case |
| Fire-and-forget Discord role assignment on acceptance | Follows existing v2.0 pattern | Silent failures for the one operation that must succeed; ambassador experience broken | Never — acceptance needs a retry queue |
| One-click accept button in admin that runs Discord + Firestore + email in parallel | Fast admin UX | Partial-failure reconciliation becomes impossible | Acceptable if wrapped in a durable task queue pattern (not in v1 scope) |
| Skip the `discordMemberId` storage, continue using `discordUsername` | Matches existing pattern | Username-changed users can't have roles reassigned; dashboard drifts | During Phase 2, acceptable as a prototype. Must be fixed before Phase 3 ships. |
| Leaderboard recomputed on each page load (read-time aggregation) | No cron infra | Dashboard gets slow + Firestore read costs climb; doesn't scale | Acceptable for <100 ambassadors ever; must switch to scheduled aggregation at scale |
| Accept the application video at any size / any codec | Simplest code | Mobile users fail silently; admin gets unplayable files | Never — codec + size limits are table stakes |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Discord role assignment | Assuming role assignment succeeds because the function returned | Check return value; expose retry UI in admin panel when false |
| Discord role hierarchy | Creating Ambassador role at top of role list "for visibility" | Document runbook: role must sit immediately below bot's highest role |
| Discord member identity | Storing `discordUsername` only, not `discordMemberId` | Store both; use ID for all API calls, username only for display |
| Firebase Storage uploads | Using `uploadBytes` (non-resumable) for 50MB files on mobile | Use `uploadBytesResumable` + progress bar + resume-on-reload |
| Firebase Storage downloads | Using `getDownloadURL` for admin video review | Admin SDK signed URL, 1h expiry, never persisted |
| Firestore custom claims | Setting claims and assuming immediate effect | Claims propagate on next ID token refresh (≤1h); force refresh via `getIdToken(true)` post-migration |
| Firestore security rules | Deploying rules and app in one deploy and hoping for the best | Five-deploy sequence: dual-read rules → backfill → dual-write app → app-only → rules-only |
| Firestore composite indexes | Migrating `==` to `array-contains` without updating `firestore.indexes.json` | Every role-filter + orderBy combo gets an index; commit in same PR as query change |
| Email verification | Treating `.edu` as a proxy for "currently enrolled" | Use as signal, not gate; admin review is the enrollment check |
| GitHub Actions cron | Running strike-enforcement directly from cron | Cron flags for admin review; admin confirms; strike applied on confirm |
| Next.js 16 route auth | Diverging from the existing per-route Firebase session auth (v4.0 lesson) | Follow the exact pattern in `src/app/api/admin/*` — Firestore session auth, not env-var |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Role-based query with missing composite index | Admin page latency jumps from 100ms to 2–5s, "query requires index" errors in production only | Inventory all role queries; commit `firestore.indexes.json` with every role-query PR | Immediately on any user base >500 |
| Dashboard aggregation by querying on each load | Dashboard load time climbs with cohort size; Firestore reads inflate bill | Scheduled hourly aggregation job; page reads the snapshot | At ~100 concurrent dashboard users or with ambassadors logging many events |
| Real-time leaderboard listeners for all ambassadors | Every write triggers a cohort-wide re-render; tabs heat up phones | Poll the aggregated snapshot; no `onSnapshot` on the leaderboard | Any cohort with active referrals ticking through |
| Bulk acceptance triggers serial Discord API calls without backoff | 429 errors mid-batch; some acceptances complete, others don't | Serial with 200ms spacing; the existing `fetchWithRateLimit` wrapper | Whenever >10 accepted in one session |
| `array-contains-any` on `roles` as it grows | Query fails at runtime when roles list exceeds 30 | Denormalize primary role; use `array-contains-any` only for bounded lookups | At >30 role types (v3+) |
| Keeping all applicant videos forever | Storage bill climbs linearly with applications; GDPR exposure grows | 30-day retention on declined, 6-month on accepted post-cohort | Immediately — storage + compliance cost |
| Large Firestore document on `users/{uid}` (storing `ambassador` subdoc inline) | Approaching 1MB limit if stats/events are stored inline; read cost per query grows | Use subcollections for unbounded lists (events, reports); `users.ambassador` holds only small aggregates | Once any ambassador has >50 events |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Publicly-readable applicant videos | Personal pitches leak; rejected applicants' videos enumerable | Signed URLs for admin review; deny-by-default storage rules |
| Referral code forgery (editing URL to set referrer) | Ambassadors credit themselves for strangers' signups | Sign referral tokens server-side; attribute only on first click → signup path |
| Admin role elevation via client writes | Any authenticated user could set `roles: ["admin"]` on their own doc | Role writes (especially `admin`/`ambassador`) via server-side API only; Firestore rules forbid client `roles` mutations on `users` collection |
| Leaking applicant email to other applicants through denormalized data | Public `/ambassadors` page accidentally shows personal email | Denormalize only fields the ambassador explicitly makes public (name, bio, socials); never email |
| Strike manipulation by client | Ambassadors mutating their own strike counter to zero | Strike mutations server-side only; Firestore rules forbid client writes to `users.ambassador.strikes` |
| Accepting arbitrary HTML in monthly report or application | XSS on admin review page | Sanitize rendered output; render as plain text in admin review |
| Leaking applicant country/university before acceptance | Privacy breach if application list is ever indexed | Applications collection fully admin-only read; no public list endpoint |
| Discord role-assignment endpoint callable by non-admin | Anyone could grant themselves the Ambassador Discord role | Admin-only API route with Firestore session auth |
| Trusting the user's self-reported timezone for strike calculations | User could set timezone to pacific/kiritimati to extend deadline indefinitely | Derive timezone from account creation / profile with admin override; don't accept client-sent TZ on each strike check |
| Revshare calculation based on client-submitted workshop attendance | Ambassadors inflate numbers to juice payouts | v1 keeps revshare fully manual (spec Section 9.2); never accept client-side attendance as financial input |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Video upload progress shown as a spinner | User thinks it's hung; abandons | Percentage-based progress bar + resume-on-reload |
| "Pending" application status with no ETA | Applicant anxiety; support emails | Show expected review window ("Review completes by April 30"); email on decision |
| Auto-strike notification sent without human context | Ambassador feels accused; program goodwill evaporates | Admin DMs in human voice before any strike status change |
| Leaderboard flashes with position changes | Anxiety; compulsive refresh; toxic competition | Static leaderboard with hourly refresh + "last updated" timestamp |
| Bottom-of-leaderboard public shame | Low-performers disengage further | Show top 3 + "your rank: #X" privately |
| Rejection email with generic "not selected this round" | Applicant never learns why; low-quality re-applications next cohort | Template with specific generic feedback categories; admin picks one |
| Applicant can't see their own submitted application | Second-guessing; "did it send?" support emails | Read-only view of their submission under `/my-applications` |
| Admin review UI doesn't explicitly surface student ID vs `.edu` path | Reviewer treats one as default and misses the other | Two visually distinct review flows; both equally prominent |
| Ambassador badge shown on profile before Discord role propagated | User's Firestore profile says "Ambassador" but Discord doesn't recognize; looks broken | Surface provisioning state: "Ambassador role pending on Discord — retry" |
| Strike count hidden until the 2nd strike | User blindsided by offboarding | Strike count always visible on dashboard with explanation link |
| Confusing TLD rejection messages | Applicant gives up, doesn't try student-ID fallback | If TLD not in allowlist, directly surface student-ID upload as the path — don't show a rejection first |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Role migration:** Rules deployed with dual-read? Backfill script idempotent? Test fixtures migrated? Composite indexes committed? Custom claims force-refreshed?
- [ ] **Application form:** Video upload resumable? 50MB + codec limits enforced? Client-side playback check? Form state persisted across reloads? Storage path includes applicant UID?
- [ ] **Storage rules:** Deny-by-default kept for everything not explicitly allowed? Applicant videos not readable by other applicants? Admin review uses signed URLs, not `getDownloadURL`?
- [ ] **Admin review panel:** Displays `.edu`/TLD status AND student-ID path? Shows video playability? Two-stage accept (Firestore then Discord retry)? Audit log on every application view?
- [ ] **Discord role assignment:** `discordMemberId` stored? Retry UI on failure? Rate-limited for batch? Role hierarchy documented in runbook?
- [ ] **Referral system:** Tokens signed server-side? Attribution requires email + Discord + first-touch? Fraud signals logged even if not acted on? Dedup enforced?
- [ ] **Monthly report + strikes:** Cron flags, doesn't mutate? Grace period + reminder DM? Timezone per-ambassador? Offboarding is a conversation, not a trigger?
- [ ] **Dashboard:** Aggregated snapshot, not real-time? "Last updated" timestamp visible? Leaderboard shows top 3 + private rank? Revealed after week 4?
- [ ] **Public `/ambassadors` page:** Only shows accepted+active ambassadors? Separate optional public video (not application video)? No email exposure?
- [ ] **Retention:** 30-day declined-application purge cron deployed? 6-month-post-cohort video purge planned?
- [ ] **Custom claims propagation:** Users forced to re-auth post-migration? Stale-token denial tested against an hour-old session?
- [ ] **Test coverage:** All `role: "literal"` fixtures migrated to `roles: ["literal"]`? Coverage report shows `roles.includes` paths hit?

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Rules-vs-app deploy race causing mentor denials | LOW | Revert app deploy; ship dual-read rules; redeploy app |
| Backfill script produced `roles: [null]` on some docs | MEDIUM | Re-run idempotent migration with null-filter; monitor query results |
| Test suite silently passing with broken fixtures | MEDIUM | Add lint rule banning `role: "` in test files; migrate failed fixtures; re-run |
| Composite index missing in production | LOW | Create index from the Firestore console via the error URL; wait 5–15min |
| Ambassador accepted in Firestore but missing Discord role | LOW (per case) | Admin retry from admin panel's "Discord role pending" UI |
| Applicant video accidentally publicly readable | HIGH | Rotate all download URLs (requires re-uploading); tighten rules; apologize + notify affected |
| Referral fraud detected post-facto | MEDIUM | Invalidate flagged referrals; document policy for future; one-time conversation with ambassador |
| Auto-strike fired unfairly on cohort | HIGH (goodwill) | Reverse the strike in Firestore; public apology in `#ambassadors`; ship the human-in-the-loop fix same week |
| Leaderboard drift from admin edits | LOW | Run the aggregation cron manually; users see correct numbers within the hour |
| Applicant requests GDPR deletion | LOW if retention cron exists | Run one-off deletion script; confirm Storage + Firestore purged |
| Bulk Discord rate-limit 429 during mass acceptance | LOW | Wait 60s; retry the failed ones serially with 200ms spacing |
| Claims not refreshed post-migration | LOW | Client-side hook calls `getIdToken(true)` on detection of claims-version mismatch |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls. Phase numbering follows the milestone target-features order from PROJECT.md.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 — Rules-vs-app deploy race | Phase 1 (Role migration) | Staging deploy with old session token; mentor page loads correctly |
| 2 — Backfill data loss | Phase 1 (Role migration) | Pre/post counts match for every role; no `roles: [null]` in any doc |
| 3 — Test stubs silently passing | Phase 1 (Role migration) | `grep role: src/__tests__` returns zero; coverage on `roles.includes` paths ≥ previous |
| 4 — `array-contains` query limits | Phase 1 (Role migration) + Phase 6 (Dashboard) | All role-filter pages load in <200ms; `firestore.indexes.json` covers every query |
| 5 — Referral attribution fraud | Phase 4 (Referral system) + Phase 6 (Dashboard display) | Fraud signals logged on every conversion; top-3 only on public leaderboard; dedup tested |
| 6 — `.edu` verification gotchas | Phase 2 (Application form + admin review) | Allowlist includes international TLDs; student-ID-photo path is equally prominent |
| 7 — Discord role assignment | Phase 2 (Admin accept) + Phase 3 (Discord extension) | `discordMemberId` stored; retry UI in admin panel; hierarchy documented in runbook |
| 8 — Video upload UX | Phase 2 (Application form) | Resumable upload works on throttled mobile simulation; playback check mandatory before submit |
| 9 — Storage rules leak | Phase 2 (Application form) + hardening task | Rule emulator tests for cross-applicant access; signed URL expires in 1h |
| 10 — Unfair auto-strike | Phase 5 (Monthly report + strikes) | Cron flags, admin confirms; timezone per-ambassador; grace DM sent before flag |
| 11 — Dashboard aggregation drift | Phase 6 (Dashboard + leaderboard) | Aggregation cron runs hourly; "last updated" timestamp visible; no real-time listeners |
| 12 — Applicant video privacy | Phase 2 (Application) + Phase 7 (Public cohort page) + Phase 8 (Operational) | Two separate video fields; retention cron deployed; audit log records admin views |

---

## Prior-Milestone Lessons Applied

Drawn from `.planning/RETROSPECTIVE.md`:

- **v2.0 "non-blocking Discord" pattern** — Applied with nuance here. Keep it for notifications (announcements, DMs) but *not* for role assignment on acceptance (Pitfall 7). Acceptance needs retry UI.
- **v2.0 "foundation-first permissions"** — Directly validates putting the role migration in Phase 1 before any ambassador-specific feature. Do not build ambassador features on top of the old role field "to unblock parallel work."
- **v4.0 "auth pattern divergence"** — Do not invent a new auth pattern for ambassador admin routes. Use Firestore session auth like `src/app/api/admin/courses/*`. Diverging cost 1 UAT cycle on v4.0; will cost more here given the cross-feature admin surface.
- **v5.0 "phase directory archival"** — Ensure phase directories from v5.0 are archived to `milestones/v5.0-phases/` before v6.0 phase work begins so statistics and the gsd-tools CLI report cleanly. This is milestone hygiene, not a pitfall, but it was missed in v5.0 → v6.0.
- **v2.0 "audit cycle"** — Add a pre-ship audit phase that checks the "Looks Done But Isn't" checklist above. v2.0 needed a gap-closure phase because audit wasn't built-in; v6.0 should skip that scar.

---

## Sources

- **Codebase inspection** (HIGH confidence):
  - `src/lib/permissions.ts` lines 21–26, 53–56 — confirms current `role: MentorshipRole` shape.
  - `firestore.rules` lines 14–18 — confirms rules read `request.auth.token.role` and `.status`.
  - `src/types/mentorship.ts` line 6 — confirms `type MentorshipRole = "mentor" | "mentee" | null`.
  - `src/lib/discord.ts` lines 806–877 — confirms existing `assignDiscordRole`, `DISCORD_MENTOR_ROLE_ID`, `lookupMemberByUsername`, rate-limit wrapper.
  - `storage.rules` lines 6–12 — confirms current state is deny-all.
  - `grep role: src/__tests__` — confirmed 8 test fixtures use the legacy shape.
- **Milestone design spec** (HIGH confidence): `docs/superpowers/specs/2026-04-21-student-ambassador-program-design.md` Sections 4 (eligibility), 5 (selection + video), 6 (commitments), 8 (accountability + strikes), 9 (platform architecture), 11 (success criteria).
- **Retrospective lessons** (HIGH confidence): `.planning/RETROSPECTIVE.md` v2.0 (non-blocking Discord, foundation-first permissions), v4.0 (auth divergence), v5.0 (phase archival).
- **PROJECT.md milestone target-features** (HIGH confidence): lines 167–183 — defines v6.0 scope.
- **General domain knowledge** (MEDIUM confidence, unverified to official docs):
  - Firebase custom claims TTL behavior (~1h ID token refresh).
  - Discord API role-hierarchy rule (bot cannot assign roles above its own).
  - `array-contains-any` 30-value limit in Firestore.
  - HEIC codec browser compatibility.
  These are well-known constraints but not verified against official docs in this research pass. Implementers should validate via Context7 / official docs at phase-planning time.

---
*Pitfalls research for: Student Ambassador Program v1 (v6.0 milestone) on Next.js 16 + Firebase platform*
*Researched: 2026-04-21*
