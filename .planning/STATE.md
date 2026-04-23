---
gsd_state_version: 1.0
milestone: v6.0
milestone_name: Student Ambassador Program
status: executing
stopped_at: Phase 4 context gathered
last_updated: "2026-04-23T13:26:22.829Z"
last_activity: 2026-04-23
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 25
  completed_plans: 24
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

**Core value:** Community members can find mentors, collaborate on real projects with structured support, and follow clear learning roadmaps—all within a mentor-led, quality-focused environment.
**Current focus:** Phase 03 — public-presentation

## Current Position

Phase: 03 (public-presentation) — EXECUTING
Plan: 6 of 6
Status: Ready to execute
Last activity: 2026-04-23

## Performance Metrics

**v5.0 Velocity:**

- 3 plans completed across 1 phase
- ~22 scoped commits, 41 files changed, +5,514/-37 LOC
- Total execution: 2 days (2026-03-27 research → 2026-03-28 final polish)

**v4.0 Reference:**

- 2 plans completed across 1 phase
- 15 commits, 246 files changed, +11,603/-3,459 LOC
- Total execution: 7 days (2026-03-04 → 2026-03-11)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

- [Phase 01]: Used top-level import for HackathonTwist in constants.ts for cleaner type annotation
- [Phase 01]: Winners GET API is publicly accessible to allow public display panel to read without credentials
- [Phase 01-03]: Admin form uses PLACEMENTS config array to DRY up 3 placement sections; WinnersDisplay returns null until announcedAt confirmed
- [Phase 01]: HostAuthGate imports only ADMIN_TOKEN_KEY from AdminAuthGate — token-only auth with no Firebase user dependency
- [Phase 01]: TwistRevealSection owns its countdown internally via setInterval in useRef — parent HostPanel only flips twistPhase state
- [Phase 01]: WinnersSection uses prevRevealedCount ref to detect 2->3 transition for confetti (prevents double-fire)
- [Phase quick-260410]: Used text-based social proof strip and single DaisyUI collapse for a la carte markdown
- [v6.0 roadmap]: Phase structure mirrors research consensus — Phase 1 Foundation (roles migration, 5-deploy sequence) → Phase 2 Application (seeds real ambassadors) → Phase 3 Public Presentation || Phase 4 Activity (parallel; independent subsystems) → Phase 5 Dashboard/Leaderboard/Offboarding/Alumni (aggregates over Activity outputs).
- [v6.0 roadmap]: Offboarding (DISC-05, EMAIL-04) is landed in Phase 5 alongside the strike-triggered flow because the strike counter and admin offboarding UI both live in Phase 4's strike system but the atomic roles-array mutation + Discord removal is tightly coupled to the alumni-flag transition mechanics in ALUMNI-01..03.
- [v6.0 roadmap]: Reconciliation cron for missing Discord roles (DISC-04) lives in Phase 4 because it's cron infrastructure paired with the strike-check cron; role assignment at acceptance (DISC-01..03) stays in Phase 2.
- [Phase 01]: Four-role vocabulary (mentor/mentee/ambassador/alumni-ambassador) locked as Zod enum + TS union in src/types/mentorship.ts (D-01)
- [Phase 01]: MentorshipProfile.roles is required Role[] (never null/undefined) — dual-read window keeps role? optional until Deploy #5 (D-04, D-06)
- [Phase 01-foundation-roles-array-migration]: Footer Ambassadors link placed first in /rates /privacy /terms nav block (no existing Mentorship/Projects links in Footer to sit next to)
- [Phase 01-foundation-roles-array-migration]: headerNavLinks.js and Footer.tsx read process.env inline (D-12 exception authorized by plan: bundle-time Next.js inlining requires literal env reference)
- [Phase 01-foundation-roles-array-migration]: VALID_ROLES duplicated (not imported) in migration scripts — keeps tsx runs decoupled from Next.js path-mappings; role vocabulary is locked (D-01) so drift risk is acceptable
- [Phase 01-foundation-roles-array-migration]: Custom claims sync uses merge-preserve spread (...customClaims, roles, role, admin) — setCustomUserClaims is replace-not-merge, the spread prevents clobbering pre-existing admin/beta/etc claims
- [Phase 01-03]: PermissionUser.role stays required (narrower than MentorshipProfile.role which is optional) to minimize churn in the 29 call-sites and 95 test fixtures migrated by Plans 07/08
- [Phase 01-03]: isAcceptedMentor promoted from private helper to exported function during refactor onto hasRole — public signature preserved, dual-read benefit now automatic
- [Phase 01-03]: Dual-read pattern uses nullish-coalescing ?? (NOT ||) because [].includes(x) returns false, so empty roles array correctly short-circuits without silently falling back to legacy role field
- [Phase 01-foundation-roles-array-migration]: Firestore rules isAcceptedMentor() dual-claim: OR(legacy role, "roles" in token && "mentor" in token.roles) — existence guard ordering is mandatory (Firestore in operator throws on unset field)
- [Phase 01-foundation-roles-array-migration]: syncRoleClaim helper mirrors scripts/sync-custom-claims.ts merge pattern ({...existing, roles, role: roles[0] ?? null, admin}) — Plan 10 Deploy #5 cleanup must patch both files in lock-step
- [Phase 01-foundation-roles-array-migration]: verifyAuth extended with optional roles?/admin?/role? fields via new AuthContext interface; AuthResult kept as deprecated type alias for backward compat (zero external callers found)
- [Phase 01-foundation-roles-array-migration]: PUT /api/mentorship/profile syncs claims on every update (not just role/isAdmin changes) — ~50-150ms RPC trade-off for guaranteed D-14 invariant if future refactor adds role mutations via this handler
- [Phase 01-foundation-roles-array-migration]: admin/profiles/route.ts received invariant-documenting comment instead of syncRoleClaim wiring (PUT handler mutates only status/discord/notes/feedback, never roles/isAdmin — Step C audit confirmed no other admin write surfaces in mentorship API tree)
- [Phase 01]: Plan 07 call-site migration: 30 files modified, 66 hasRole occurrences across 17 files. Dual-read/dual-write pattern established. Rule 3 deviation: relaxed PermissionUser.role to optional, extended lib/email.ts local shim with roles.
- [Phase 01-foundation-roles-array-migration]: Plan 09 client-claim-refresh: exposed syncClaimsFromResponse on MentorshipContext + refreshClaimsNow/useClaimRefresh helpers; call-site wiring deferred (plan scope limited to context + hook file); strict === true check to discriminate from truthy failure shape
- [Phase 01]: Plan 08 test fixture migration: dual-shape fixtures (role+roles both present), 108 tests (53 pre-existing + 55 new), measured v8 coverage on src/lib/permissions.ts = 90.54% branch / 94.91% line (gate >=90% PASS); installed @vitest/coverage-v8 and backfilled missing @rollup native dep (Rule-3 blocker)
- [Phase 02-application-subsystem]: AMBASSADOR_DISCORD_MIN_AGE_DAYS defaults to 30 (spec §4); 7-day alternative reviewed at Plan 09 pre-flight (D-03)
- [Phase 02-application-subsystem]: DISCORD_AMBASSADOR_ROLE_ID set to PENDING_DISCORD_ROLE_CREATION placeholder; acceptance API returns discordRoleAssigned=false while placeholder is active (DISC-02)
- [Phase 02-04]: requireAdmin returns { ok: true; uid: string } discriminated union — uid synthesised as admin:token12 prefix for Plan 06 reviewedBy audit field (legacy admin auth has no Firebase uid)
- [Phase 02-04]: featureGate() helper extracted per-file — all /api/ambassador/cohorts/* handlers return 404 when FEATURE_AMBASSADOR_PROGRAM is off (Pitfall 3)
- [Phase 02-04]: GET /cohorts scope=open (no auth, upcoming+windowOpen) vs scope=all (admin-only) — Plan 07 apply wizard uses open scope without admin credentials
- [Phase 02-05]: FieldValue imported directly from firebase-admin/firestore (not re-exported from firebaseAdmin.ts)
- [Phase 02-05]: Plan 07 wizard uses client crypto.randomUUID() for upload path; Firestore doc id is auto-generated and need not match
- [Phase 02-05]: EMAIL-01 failure is logged but never fails the submission response (submission persists regardless)
- [Phase 02-06]: runAcceptanceTransaction uses db.runTransaction() for atomic COHORT-04 maxSize enforcement; acceptance idempotent (re-accept returns 200 alreadyAccepted:true, no double count); Discord failure never rolls back Firestore (D-17, discordRetryNeeded:true persisted); /discord-resolve always re-resolves handle freshly (Pitfall 2); reviewedBy=admin.uid on every decision (APPLY-08)
- [Phase 02-07]: Inlined validateAcademicEmailClient (regex-only) in wizard because academicEmail.ts uses Node fs — server still runs full Hipo check on submission. Wizard uses crypto.randomUUID() for upload path; Firestore doc id is auto-generated independent
- [Phase 02-08]: Pagination cursor stack in ApplicationsList — Firestore cursors are forward-only so previous-page stack replays cursors on Previous click. First admin detail-page pattern (D-09) — shape should be mirrored by future admin detail pages
- [Phase 02-application-subsystem]: Plan 09 pre-flight: AMBASSADOR_DISCORD_MIN_AGE_DAYS=7 (option-b, user chose lower-friction first-cohort value over spec-default 30 per D-03)
- [Phase 02-application-subsystem]: Plan 09 pre-flight: Ambassador Discord role created in CWA server; DISCORD_AMBASSADOR_ROLE_ID set to real 19-digit role ID (replaces PENDING_DISCORD_ROLE_CREATION); Phase 2 ship gate cleared
- [Phase 02-application-subsystem]: Plan 09 REVIEW-04: cleanup-declined-application-media runs weekly (Mon 04:00 UTC); Firestore composite index (status ASC, declinedAt ASC) created on first-run failure; idempotent via studentIdCleanedUp flag + { ignoreNotFound:true } Storage delete
- [Phase 03-public-presentation]: `/u/[username]` is canonical public profile route; `/mentorship/mentors/[username]` 308-redirects to it; cards on `/ambassadors` link to `/u/[username]` (D-01)
- [Phase 03-public-presentation]: Public ambassador fields live on `mentorship_profiles/{uid}/ambassador/v1` subdoc — extends Phase 2 shape with university/city (snapshot from app doc on accept), publicTagline, twitterUrl, githubUrl, personalSiteUrl, cohortPresentationVideoUrl/EmbedType (D-02..D-04)
- [Phase 03-public-presentation]: linkedinUrl stays on parent MentorshipProfile (mentor reuse); card render joins parent + subdoc (D-03a)
- [Phase 03-public-presentation]: cohortPresentationVideo is URL-paste only, reuses Phase 2 isValidVideoUrl/classifyVideoUrl validators; Storage upload deferred to future quick task (D-04, D-04a)
- [Phase 03-public-presentation]: New PATCH /api/ambassador/profile endpoint writes to subdoc + public_ambassadors/{uid} projection in a single batched write; do NOT extend /api/mentorship/profile (D-05a, D-08)
- [Phase 03-public-presentation]: `public_ambassadors/{uid}` denormalized projection (top-level collection, public-read rules) — written on accept (in-transaction) and on PATCH; /ambassadors uses single collection query (D-07..D-09)
- [Phase 03-public-presentation]: Single AmbassadorBadge component handles both "ambassador" and "alumni-ambassador" variants — built in Phase 3, reused unchanged in Phase 5 (D-10)
- [Phase 03-public-presentation]: Badge placement scoped to /u/[username] only (PRESENT-03 minimum); MentorCard, project/roadmap byline chips deferred to future quick task (D-11)
- [Phase 03-public-presentation]: Cross-phase contract — Phase 5 alumni transition + 2-strike offboarding MUST update or remove `public_ambassadors/{uid}`; Phase 4 referral/event/report writes do NOT touch it (D-12, D-13)
- [Phase 03]: Pre-transaction username resolution: ensureUniqueUsername runs outside db.runTransaction() because where().limit().get() is illegal inside txn.get; resolvedUsername passed as closure into txn body
- [Phase 03]: Re-accept NO-OP invariant locked: subdocPayload build, projection write (public_ambassadors/{uid}), and username backfill are all gated inside if (!alreadyAccepted) — in-life updates are PATCH endpoint's responsibility (plan 03-03)
- [Phase 03-03]: AuthContext cast as unknown as DecodedRoleClaim for hasRoleClaim compatibility — index signature missing in AuthContext but structural fields (roles/role/admin) are identical
- [Phase 03-03]: PATCH diff-oriented: empty-string body values map to FieldValue.delete() on subdoc; projection re-derived locally from post-write state to avoid second Firestore read
- [Phase 03]: AmbassadorBadge is a single component switching on role prop (D-10) so Phase 5 alumni transition reuses it unchanged — badge placement scoped to /u/[username] only for Phase 3 (D-11)
- [Phase 03]: 308 redirect /mentorship/mentors/:username → /u/:username lives in next.config.ts redirects() (D-01) — applies at edge before Next.js routing, natively preserves query strings; existing route files kept as dead code for post-launch cleanup
- [Phase 03-06]: AmbassadorPublicCardSection uses diff-based payload (initial vs form) — only changed fields sent to PATCH; empty string is meaningful (server treats as FieldValue.delete())
- [Phase 03-06]: /profile AmbassadorPublicCardSection gated by isAmbassadorProgramEnabled() + profile null-guard + hasRole ambassador|alumni-ambassador (D-05 — alumni keep the edit surface)
- [Phase 03-05]: getCurrentCohortId fallback: status=active preferred, most-recent startDate as fallback, null if no cohorts
- [Phase 03-05]: Server component reads db directly on /ambassadors — no internal fetch to /api/ambassadors/public to avoid URL-resolution footgun
- [Phase 03-05]: Sort updatedAt ASC on public_ambassadors projection (monotonic proxy for acceptance order) — joinedAt lives on subdoc and not duplicated to avoid schema drift

### Workflow Notes

**Cron jobs — always use GitHub Actions + scripts/:**
Scheduled tasks use `.github/workflows/*.yml` running `npx tsx scripts/*.ts`. Do NOT use Vercel cron or Next.js API routes for scheduled work.

**Quick task + PR workflow:**
For GitHub issue fixes, use `/gsd:quick` to plan and execute, then cherry-pick onto a fix branch and create PR with "Closes #NNN".

**v6.0 foundation rollout — 5-deploy sequence (Phase 1):**
Do not deploy the rules flip before `sync-custom-claims.ts` completes. Dual-claim rules window must stay for ≥2 weeks. Rollback of rules must be one command away during deploy. `FEATURE_AMBASSADOR_PROGRAM` gates every `/ambassadors/*` route through Phase 1 and only flips on at the start of Phase 2.

### Roadmap Evolution

- v5.0 CWA Promptathon 2026 shipped 2026-04-21 (1 phase, 3 plans)
- v6.0 Student Ambassador Program spec drafted 2026-04-21
- v6.0 requirements defined 2026-04-21 — 63 v1 + 9 future + out-of-scope catalog
- v6.0 roadmap created 2026-04-21 — 5 phases, 66 requirements mapped (counted actual REQ-IDs in REQUIREMENTS.md; milestone spec's "63" figure is a minor undercount — see Blockers/Concerns)

### Blockers/Concerns

- **Minor requirement-count discrepancy:** Milestone planning context stated 63 v1 requirements, but `.planning/REQUIREMENTS.md` contains 66 REQ-IDs (ROLE ×8, COHORT ×4, APPLY ×8, REVIEW ×5, DISC ×5, PRESENT ×4, REF ×5, EVENT ×4, REPORT ×7, DASH ×9, ALUMNI ×3, EMAIL ×4 = 66). All 66 are mapped in the roadmap. Likely an off-by-three in the original milestone brief; REQUIREMENTS.md is treated as authoritative and the "Coverage" footer in REQUIREMENTS.md should be updated from 63 → 66 during the next requirements edit.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 72 | update the rates card according to feedback | 2026-03-17 | f0efea9 | [72-update-the-rates-card-according-to-feedb](./quick/72-update-the-rates-card-according-to-feedb/) |
| 73 | rates page redesign — sponsorship pitch deck layout | 2026-03-18 | 96fb4c7 | [73-rates-page-redesign-codewithahsan-dev-ra](./quick/73-rates-page-redesign-codewithahsan-dev-ra/) |
| 260402-ls1 | improve DX for open-source contributors (.env.example, seed script, README, CONTRIBUTING.md) | 2026-04-02 | b39387d | [260402-ls1-improve-dx-for-open-source-contributors-](./quick/260402-ls1-improve-dx-for-open-source-contributors-/) |
| 260409-lsg | add Re-activate button to cancelled mentorship cards (GH-160) | 2026-04-09 | 852e56d | [260409-lsg-add-button-to-re-activate-mentorship-for](./quick/260409-lsg-add-button-to-re-activate-mentorship-for/) |
| 260410 | CRO audit and optimize rates page (CTAs, social proof, collapsible a la carte) | 2026-04-09 | d11b30f | [260410-cro-audit-and-optimize-mentorship-rates-](./quick/260410-cro-audit-and-optimize-mentorship-rates-/) |
| 260411 | update inactivity warning message to @mention mentor and mentee (GH-151) | 2026-04-10 | 3fa2bff | [260411-update-inactivity-warning-message-to-men](./quick/260411-update-inactivity-warning-message-to-men/) |
| Phase 01 P01 | 2min | 1 tasks | 1 files |
| Phase 01-foundation-roles-array-migration P02 | 3 min | 3 tasks | 6 files |
| Phase 01-foundation-roles-array-migration P04 | 2 min | 2 tasks | 3 files |
| Phase 01-foundation-roles-array-migration P03 | 4 min | 2 tasks | 1 files |
| Phase 01-foundation-roles-array-migration P05 | 1 min | 1 tasks | 1 files |
| Phase 01-foundation-roles-array-migration P06 | 4min | 4 tasks | 4 files |
| Phase 01 P07 | 32min | 2 tasks | 30 files |
| Phase 01-foundation-roles-array-migration P09 | ~3min | 2 tasks | 2 files |
| Phase 01 P08 | ~6min | 1 tasks | 3 files |
| Phase 02-application-subsystem P01 | 3 | 3 tasks | 4 files |
| Phase 02-application-subsystem P04 | 6min | 3 tasks | 4 files |
| Phase 02-application-subsystem P05 | 17min | 3 tasks | 5 files |
| Phase 02-application-subsystem P09 | 46min | 4 tasks | 5 files |
| Phase 03 P03-02 | 3min | 2 tasks | 2 files |
| Phase 03 P03-03 | 8 | 2 tasks | 1 files |
| Phase 03 P03-04 | 2min | 3 tasks | 4 files |
| Phase 03-public-presentation P03-06 | 3min | 3 tasks | 2 files |
| Phase 03-public-presentation P03-05 | 45 | 4 tasks | 5 files |

## Session Continuity

Last session: 2026-04-23T13:26:22.825Z
Stopped at: Phase 4 context gathered
Resume file: .planning/phases/04-activity-subsystem/04-CONTEXT.md

---
*Last activity: 2026-04-22 - Phase 03 discuss-phase complete; 4 gray areas resolved, 13 decisions locked*
