# Phase 1: Foundation — Roles Array Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 01-foundation-roles-array-migration
**Areas discussed:** Role vocabulary & admin placement, Helper API shape + dual-read semantics, FEATURE_AMBASSADOR_PROGRAM flag mechanism, Custom claims strategy

---

## Role Vocabulary & Admin Placement

### Q1: What strings should be valid in the roles[] array?

| Option | Description | Selected |
|--------|-------------|----------|
| mentor \| mentee \| ambassador \| alumni-ambassador (Recommended) | Exact four roles this milestone introduces. Alumni-ambassador already in spec (ALUMNI-01). Zod enum locked; TypeScript union blocks typos at compile time. | ✓ |
| mentor \| mentee \| ambassador \| alumni-ambassador \| admin | Fold admin into the array too. Unifies to a single authorization axis. Requires migrating isAdmin boolean + 14 isAdmin-reading files. | |
| Freeform string[] with no enum | Schema just says string[]; validation at API boundaries only. Max flexibility, zero compile-time safety. | |

**User's choice:** Recommended — four-role enum.
**Notes:** Keeps Phase 1 scoped; admin unification is out of scope.

### Q2: How should admin be represented?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep isAdmin: boolean separate (Recommended) | Status quo — admin stays on mentorship_profiles.isAdmin and token.admin claim. Zero regression risk to the 14 files that read isAdmin. | ✓ |
| Fold admin into roles[] too | One unified axis. Requires migrating isAdmin → roles[] simultaneously. Increases blast radius of an already high-risk phase. | |
| Mirror admin both places during Phase 1, consolidate later | Dual-write overhead, two sources of truth during interim — exactly the trap the 5-deploy sequence was designed to avoid. | |

**User's choice:** Recommended — keep isAdmin separate.
**Notes:** Admin is architecturally different (grant-by-script vs signup flow).

### Q3: Where should the canonical Role type/enum live?

| Option | Description | Selected |
|--------|-------------|----------|
| src/types/mentorship.ts (Recommended) | Replace existing MentorshipRole union right next to MentorshipProfile. Matches conventions — all mentorship types live here. Zod schema added alongside. | ✓ |
| New file: src/types/roles.ts | Dedicated roles module. Cleaner separation but creates a new import path that all 29 call sites + tests have to adopt. | |
| In src/lib/permissions.ts | Co-locate with permission helpers. Couples permissions and types, breaks src/types/ ownership of domain types. | |

**User's choice:** Recommended — src/types/mentorship.ts.

### Q4: How should empty/missing roles be treated post-migration?

| Option | Description | Selected |
|--------|-------------|----------|
| Always roles: [] (never undefined, never null) (Recommended) | Backfill ensures every profile doc has roles: string[] (possibly empty). Zod schema requires the field. Helpers return false for empty. | ✓ |
| Allow roles?: string[] as optional | Schema makes roles optional; helpers handle undefined. More defensive but lets docs drift back to missing-field state. | |
| roles[] with default ['mentee'] for new signups | Every profile always has at least one role. 'mentee' becomes a kind of 'authenticated' marker. | |

**User's choice:** Recommended — always roles: [].

---

## Helper API Shape + Dual-Read Semantics

### Q1: What signatures should the permission helpers expose?

| Option | Description | Selected |
|--------|-------------|----------|
| hasRole(profile, role) + hasAnyRole(profile, roles[]) + hasAllRoles(profile, roles[]) (Recommended) | Exact signatures from ROLE-02. Three distinct verbs for three distinct semantics. Overloading prevented. | ✓ |
| Single hasRole(profile, role \| role[]) with overloads | One function handles both cases. Fewer imports, but call sites become ambiguous. | |
| Method form: profile.hasRole('mentor') | Attach helpers to profile object. Reads nicely but requires wrapping everywhere profiles flow. Not codebase style. | |

**User's choice:** Recommended — three distinct helper signatures.

### Q2: During the dual-write window (deploys #3 and #4), how should helpers read?

| Option | Description | Selected |
|--------|-------------|----------|
| Prefer roles[], fall back to legacy role when roles is missing (Recommended) | profile.roles?.includes(role) ?? profile.role === role. Safe during backfill drift. Fallback removed in final cleanup PR. | ✓ |
| Strict roles[]-only from day one | Helpers ignore profile.role entirely. Simpler code. Dangerous if backfill missed any docs. | |
| Read both and union the results | Returns true if either shape matches. Max safety but creates edge cases (data-drift masking). | |

**User's choice:** Recommended — prefer roles[], fall back to role.

### Q3: What should hasRole return when profile is null/undefined?

| Option | Description | Selected |
|--------|-------------|----------|
| Return false (Recommended) | hasRole(null, 'mentor') === false. Matches existing isAcceptedMentor pattern. Clean call sites without null-guards. | ✓ |
| Throw | Caller must null-check first. Forces explicit handling but bloats every call site. | |
| Return undefined | Tri-state: true/false/undefined. More accurate but unergonomic; subtle bugs possible. | |

**User's choice:** Recommended — return false.

### Q4: Should helpers also work against decoded Firebase ID tokens?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — add hasRoleClaim(token, role) variants (Recommended) | API routes with a decoded token (from verifyAuth) can check without Firestore round-trip. Mirrors profile-shape helpers. | ✓ |
| No — helpers work only on MentorshipProfile | Server code always fetches profile first. Adds Firestore read to every auth check. | |
| Single polymorphic helper that accepts either shape | Elegant but hides internal branching on different role-field names. | |

**User's choice:** Recommended — add claim-shaped variants.

---

## FEATURE_AMBASSADOR_PROGRAM Flag Mechanism

### Q1: How should FEATURE_AMBASSADOR_PROGRAM be configured?

| Option | Description | Selected |
|--------|-------------|----------|
| Next.js env var (Recommended) | process.env.FEATURE_AMBASSADOR_PROGRAM + NEXT_PUBLIC_ variant. Flip = redeploy (~30s). Matches existing codebase convention. | ✓ |
| Firestore config/featureFlags doc | Flippable at runtime, no redeploy. One Firestore read per gated request. No precedent for this pattern in codebase. | |
| Build-time constant in src/lib/features.ts | Simple boolean export, toggled via PR. No env sprawl but rollback requires code revert, not env flip. | |

**User's choice:** Recommended — env var.

### Q2: When flag is off, what should /ambassadors/* routes return?

| Option | Description | Selected |
|--------|-------------|----------|
| 404 via notFound() (Recommended) | Standard Next.js 404. No 'coming soon' leak, no SEO indexing. Matches Phase 1 Success Criteria #4. | ✓ |
| Redirect to / (homepage) | Users land somewhere useful. Pollutes analytics with phantom sessions. | |
| Coming-soon placeholder page | Branded teaser with email signup. Good marketing but contradicts zero-exposure goal. | |

**User's choice:** Recommended — 404.

### Q3: Should nav links to /ambassadors also be hidden when flag is off?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — header/footer nav items filtered (Recommended) | Consistent with 404 gate. Reads NEXT_PUBLIC_ flag in nav config. Prevents 'click link → 404' confusion. | ✓ |
| No — leave nav as-is, let 404 do the job | Simpler config but worse UX for unannounced feature. | |
| Nav items present but disabled with tooltip | Grayed-out 'Launching soon'. Contradicts phase goal of zero exposure. | |

**User's choice:** Recommended — filter nav.

### Q4: Where should the flag be read?

| Option | Description | Selected |
|--------|-------------|----------|
| Single helper: isAmbassadorProgramEnabled() in src/lib/features.ts (Recommended) | Centralized read-logic handles server/client split and string-to-bool. Mockable in tests. | ✓ |
| Inline process.env checks everywhere | Pragmatic but scatters the 'true' string-comparison bug surface and forces correct naming at each use. | |

**User's choice:** Recommended — single helper.

---

## Custom Claims Strategy

**Scout finding presented with question:** setCustomUserClaims never called anywhere in app code or scripts. firestore.rules references token.role but no code writes it. token.admin likely set once manually via Firebase Console for Ahsan. Most auth happens via Admin SDK bypassing rules.

### Q1: Given the finding above, what's the claims strategy for Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Sync roles + admin claims actively, fix the broken rule (Recommended) | Build sync-custom-claims.ts + wire into roleMutation helper. Turn vestigial rule into live defense-in-depth. Research assumed this. | ✓ |
| Abandon claim-based rules entirely — Admin SDK only | Accept rules as dead. Smallest Phase 1 footprint but contradicts ROLE-05 (explicit custom-claims sync requirement). | |
| Sync claims but keep rules weak/permissive | Build sync script for future use, defer rules flip to later phase. Splits 5-deploy into 3+2. | |

**User's choice:** Recommended — actively sync claims.

### Q2: When should the roles claim get refreshed on a user's ID token?

| Option | Description | Selected |
|--------|-------------|----------|
| Server refreshes on every role mutation; client force-refreshes on next mount (Recommended) | API route calls setCustomUserClaims on mutation. Client force-refreshes via getIdToken(true). No >1h staleness. | ✓ |
| Server refreshes; client reads on natural refresh (~1h) | Simpler but up to 1h stale-claim window. Bad UX: newly-accepted ambassador can't use dashboard for an hour. | |
| Scheduled nightly sync for all users | Up to 24h stale. Safety-net only, not primary mechanism. | |

**User's choice:** Recommended — synchronous mutation + client force-refresh.

### Q3: Should the one-time backfill run before or after data-backfill?

| Option | Description | Selected |
|--------|-------------|----------|
| Data backfill first, then claims sync (Recommended) | Deploy #2 backfills roles[]. Deploy #2.5 reads migrated docs and sets claims. Single source of truth. | ✓ |
| Claims sync first, then data backfill | Claims script reads legacy role. Creates drift window between scripts. | |
| Interleaved: both read same snapshot | Ops complexity not justified for ~400 users. | |

**User's choice:** Recommended — data first, then claims.

### Q4: How should the rules dual-claim window close?

| Option | Description | Selected |
|--------|-------------|----------|
| Manual close after explicit 'all clear' signal (Recommended) | Deploy #5 held until (a) no permission-denied errors, (b) 100% of active users have roles claim. Won't auto-close into incident. | ✓ |
| Auto-close after fixed 14-day timer | GitHub Actions fires PR on day 14. Risks closing during low-activity period. | |
| Close during next unrelated deploy | Low ceremony but couples migration cleanup to feature work. | |

**User's choice:** Recommended — manual close.

---

## Claude's Discretion

Areas where the user deferred to research + planner judgment:

- Exact structure of sync-custom-claims.ts pagination / retry / rate-limiting logic
- Rollback procedure for each of the 5 deploys
- Specific observability / monitoring signals during the dual-claim window
- Exact file placement of src/lib/ambassador/roleMutation.ts (Phase 1 stub vs Phase 2 harden)
- Whether to migrate 95 test fixtures via search-and-replace vs manual review
- Whether hasRoleClaim variants land in permissions.ts or a sibling file

## Deferred Ideas

Captured in CONTEXT.md <deferred>:

- Moving admin into roles[] (rejected for Phase 1 blast-radius reasons; not on v6.0 roadmap)
- Runtime Firestore flag for FEATURE_AMBASSADOR_PROGRAM (env var chosen instead)
- "Coming soon" marketing placeholder at /ambassadors (separate marketing-page phase in future milestone)
- Auto-close of dual-claim window via cron/PR (manual close chosen for Phase 1)
- Nav-item "grayed out with tooltip" presentation (rejected for Phase 1)
