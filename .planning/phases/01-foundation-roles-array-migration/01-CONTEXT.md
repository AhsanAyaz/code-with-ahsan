# Phase 1: Foundation — Roles Array Migration - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate `mentorship_profiles/{uid}.role: string` → `roles: string[]` across the Next.js app, Firestore security rules, Firebase custom claims, permission helpers, test fixtures, and all 29+ call sites — via the staged 5-deploy sequence with a dual-claim compatibility window — without regressing any v1.0–v5.0 mentor / mentee / admin capability. `FEATURE_AMBASSADOR_PROGRAM` gates every `/ambassadors/*` route so Phase 2 features can ship dark before the public flip.

**NOT in this phase:** `/ambassadors/apply` form behavior, admin review panel, cohort model, Discord role assignment on accept, email notifications. Those are Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Role Vocabulary & Admin Placement

- **D-01:** Canonical role vocabulary is exactly four strings: `"mentor" | "mentee" | "ambassador" | "alumni-ambassador"`. Locked as a Zod enum + TypeScript union so typos fail at compile time and at the API boundary. New roles in future milestones require an explicit type edit + migration + rules update.
- **D-02:** Admin stays as the separate `isAdmin: boolean` on `mentorship_profiles` and the existing `token.admin == true` custom claim. **Admin does NOT fold into `roles[]` in Phase 1.** Phase 1's blast radius stays scoped to the four mentorship-program roles. Admin is architecturally different (grant-by-script, not by signup flow); unifying the two axes is out of scope for this milestone.
- **D-03:** Canonical `Role` type/enum and Zod schema live in `src/types/mentorship.ts` (alongside the existing `MentorshipRole` union, which this phase replaces). Downstream consumers — API routes, migration scripts, `src/lib/permissions.ts`, tests — all import from this single path.
- **D-04:** Post-migration invariant: every profile doc has `roles: string[]` (possibly empty). Never `undefined`, never `null`. Zod schema requires the field. Helpers return `false` for empty arrays. This removes null-check boilerplate across all 29 call sites.

### Helper API Shape + Dual-Read Semantics

- **D-05:** Permission helpers expose three distinct signatures in `src/lib/permissions.ts`:
  - `hasRole(profile, role: Role): boolean`
  - `hasAnyRole(profile, roles: Role[]): boolean`
  - `hasAllRoles(profile, roles: Role[]): boolean`
  Three verbs for three semantics — passing an array to `hasRole` must be a TypeScript error to force readable call sites.
- **D-06:** During the dual-write window (deploys #3 and #4), helpers prefer `profile.roles` with fallback to legacy `profile.role` when `roles` is missing. Concretely: `profile.roles?.includes(role) ?? profile.role === role`. Fallback is removed in the final cleanup PR — not kept long-term.
- **D-07:** `hasRole(null, 'mentor')` / `hasRole(undefined, 'mentor')` returns `false`. Matches the existing `isAcceptedMentor` pattern in `src/lib/permissions.ts:53`. Lets call sites write `if (hasRole(profile, 'mentor'))` without null-guarding first.
- **D-08:** Mirror server-side variants for decoded Firebase ID tokens: `hasRoleClaim(decodedToken, role)`, `hasAnyRoleClaim(decodedToken, roles)`, `hasAllRoleClaimsClaim(decodedToken, roles)`. These let API routes check authorization against a decoded token without a Firestore round-trip. Input shapes differ enough (profile vs claim) that separate signatures beat a polymorphic helper.

### FEATURE_AMBASSADOR_PROGRAM Flag Mechanism

- **D-09:** Flag is a Next.js env var set in Vercel: `FEATURE_AMBASSADOR_PROGRAM` server-side, `NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM` client-side. Flipping requires a redeploy (~30s). Off by default in `.env.example`. No runtime Firestore read for flag state.
- **D-10:** When off, `/ambassadors`, `/ambassadors/apply`, `/ambassadors/dashboard`, and `/admin/ambassadors` all return the standard Next.js `notFound()` (404). No "coming soon" leak, no redirect, no SEO indexing of half-built routes. Matches ROADMAP Phase 1 Success Criteria #4.
- **D-11:** Header and footer navigation items pointing to `/ambassadors` are filtered out when the flag is off (read from `NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM` in `src/data/headerNavLinks.js` and wherever footer nav lives). No dangling links.
- **D-12:** Flag is read via a single helper `isAmbassadorProgramEnabled()` in `src/lib/features.ts` (new file). One place owns the server/client env-name split and the string-comparison-to-boolean logic. Tests can mock this helper cleanly.

### Custom Claims Strategy

**Codebase reality (discovered during scout):** `setCustomUserClaims` is **never called** in app code or scripts. `firestore.rules:14-18` references `request.auth.token.role == "mentor"` and `token.admin == true`, but no code writes `role` as a claim; the `token.role` rule almost certainly returns false in prod (dead code). The `token.admin` claim appears to have been set manually via Firebase Console for Ahsan; `scripts/set-admin-flag.js` only writes the Firestore profile doc. Most authorization today happens via Admin SDK in API routes, bypassing rules.

- **D-13:** Phase 1 **actively syncs `roles` and `admin` custom claims** and turns the vestigial rules into live defense-in-depth.
  - Build `scripts/sync-custom-claims.ts` as a one-time backfill script.
  - Wire claim-refresh into the shared `roleMutation` helper (per SUMMARY.md): every write that mutates `mentorship_profiles.roles` or `isAdmin` also calls `admin.auth().setCustomUserClaims(uid, { ...existing, roles, admin })`.
  - Update `firestore.rules` to dual-read (`token.role == "mentor" || "mentor" in token.roles`) during the migration window, then switch to array-only after rollout.
- **D-14:** Claim refresh timing: server refreshes claim synchronously on every role mutation; client force-refreshes via `user.getIdToken(true)` on the next component mount after a mutation signal. Mutation endpoints return a `refreshToken: true` signal or write a client-readable doc flag. No >1-hour stale-claim window (unacceptable UX for a newly-accepted ambassador who can't use their dashboard).
- **D-15:** Backfill ordering: **data backfill first, then claims sync.**
  - Deploy #2: `scripts/migrate-roles-to-array.ts` populates `mentorship_profiles.roles`.
  - Deploy #2.5: `scripts/sync-custom-claims.ts` reads the now-migrated docs and sets Auth custom claims. Roles array is the single source of truth.
  - Only after both complete does the rules flip proceed to deploy #3+.
- **D-16:** Rules dual-claim window closes **manually** on explicit "all clear" signal — not on a timer. Deploy #5 (rules-only, drop legacy `token.role` fallback) is held until (a) no session/permission-denied errors surface in prod logs during the dual-claim window, (b) a verification query confirms 100% of active users have the `roles` claim set. Research recommended ≥2-week minimum window; manual close keeps that duration flexible and won't auto-ship into an incident.

### Claude's Discretion

The following details are left to research + planner judgment:

- Exact structure of the `sync-custom-claims.ts` pagination / retry / rate-limiting logic — standard Admin SDK patterns apply.
- Rollback procedure for each of the 5 deploys — one-command `git revert` on the rules deploy; for the data backfill, rely on idempotency + dry-run verification rather than a restore procedure.
- Specific observability / monitoring signals to watch during the dual-claim window (Vercel logs + Firestore audit logs should be sufficient; no new tooling needed).
- Exact file placement of `src/lib/ambassador/roleMutation.ts` vs inlining in Phase 1 — can land as a stub in Phase 1 and harden in Phase 2 when it's actually used by the accept path. Planner decides.
- Whether to migrate the 95 test fixtures via search-and-replace vs. manual review — TypeScript breakage forces every one to surface; mechanical migration is fine if the type change is the forcing function.
- Whether `hasRoleClaim` variants land in `src/lib/permissions.ts` or a sibling `src/lib/permissions-claims.ts` — planner decides based on file size.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone-level

- `.planning/PROJECT.md` — v6.0 goals, evolution, non-negotiables
- `.planning/REQUIREMENTS.md` §Role System (ROLE-01..08) — authoritative v1 requirements for this phase
- `.planning/ROADMAP.md` Phase 1 — phase goal and 5 success criteria
- `docs/superpowers/specs/2026-04-21-student-ambassador-program-design.md` — full ambassador program design spec (already patched for `mentorship_profiles` collection name correction and roles-as-array)

### Research output (milestone-level)

- `.planning/research/SUMMARY.md` — Executive summary + spec corrections; **§Watch Out For #1–#3 are authoritative for Phase 1 pitfalls**
- `.planning/research/STACK.md` — Verifies zero new runtime deps; Firebase SDK 12.6 + Zod 4.3 conventions
- `.planning/research/ARCHITECTURE.md` — 5-deploy sequence details, `roleMutation` module design, call-site surface
- `.planning/research/PITFALLS.md` — Rules-vs-app deploy race, backfill data-loss risks, test-stubs-silently-passing

### Existing code the migration touches

- `src/types/mentorship.ts:6,12,15` — current `MentorshipRole` and `MentorshipProfile.role` field
- `src/lib/permissions.ts:15-26,48-95` — `PermissionUser` interface, helper internals (`isAcceptedMentor`, etc.)
- `src/__tests__/permissions.test.ts` — 95 permission test fixtures (all use `role: "mentor"` shape)
- `firestore.rules:14-18,140` — `isAcceptedMentor()` rule + its one consumer (roadmap create)
- `storage.rules` — currently 100% deny; not changed in Phase 1 (first client-writable path lands in Phase 2)
- `scripts/set-admin-flag.js` — reference for existing admin-flag script pattern

### External

- Firebase Admin SDK custom claims docs — standard reference, fetch via Context7 if needed during planning

*If planner discovers additional refs during research, append to this list rather than starting a new one.*

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`src/types/mentorship.ts`** — `MentorshipProfile` interface already has all the fields; only `role` changes to `roles`. Zod schema can be introduced alongside without touching unrelated fields.
- **`src/lib/permissions.ts`** — `PermissionUser`, `isAcceptedMentor`, `canOwnerOrAdminAccess` pattern established. New helpers (`hasRole`, `hasAnyRole`, `hasAllRoles`, + claim variants) slot in alongside; existing `isAcceptedMentor` can be rewritten on top of `hasRole(profile, 'mentor') && profile.status === 'accepted'` for DRY.
- **`src/lib/auth.ts`** — `verifyAuth()` already returns a decoded token. Claim-shaped helpers can read directly from what it returns (extended to include the `roles` and `admin` claims).
- **`src/lib/firebaseAdmin.ts`** — Firebase Admin SDK already initialized; `admin.auth().setCustomUserClaims(uid, ...)` is available without any new setup.
- **`scripts/set-admin-flag.js`** — Established pattern for Firebase Admin script (env-loading, service account, dry-run-style single-target mutation). `migrate-roles-to-array.ts` and `sync-custom-claims.ts` should follow the same shape but extend with pagination and bulk operation.
- **Existing GitHub Actions cron workflows (`.github/workflows/*.yml`)** — Already the established pattern for scheduled scripts per the STATE.md workflow note. No Vercel cron / Next.js API routes for scheduled work.

### Established Patterns

- **Admin SDK for server-side auth.** API routes use `verifyAuth()` → `admin.firestore().doc(...)` — bypasses Firestore rules. Rules today are mostly defense-in-depth for the few client-direct-write paths (projects, roadmaps, applications, invitations). Phase 1 tightens this by making the rules actually enforce what the API routes already enforce.
- **Feature gating via env vars.** No precedent for runtime flags (Firestore config docs). Codebase consistently uses `process.env.XYZ` + `NEXT_PUBLIC_XYZ` split.
- **Zod 4 validation at boundaries.** `src/lib/validation/` already uses Zod 4; `z.enum([...])` is the natural home for the `Role` schema.
- **Scripts run as `npx tsx scripts/*.ts`.** `package.json` already has tsx wired up. New migration script follows this invocation style.
- **Sentinel logging.** Winston logger (`src/lib/logger.ts`) is the existing log target for scripts and API routes.

### Integration Points

- `src/types/mentorship.ts` — Role/RoleSchema export
- `src/lib/permissions.ts` — helper API additions
- `src/lib/features.ts` (new) — `isAmbassadorProgramEnabled()`
- `src/data/headerNavLinks.js` (and footer config) — nav filtering
- `firestore.rules` — dual-read helper + array-only final state
- `scripts/migrate-roles-to-array.ts` (new)
- `scripts/sync-custom-claims.ts` (new)
- `src/contexts/MentorshipContext.tsx` — client-side force-refresh on mutation signal (inspect; may need a small listener)
- `src/app/api/mentorship/profile/route.ts` — primary write path; first place to add claim-sync call
- `src/__tests__/permissions.test.ts` — all 95 fixtures migrate in the same PR

</code_context>

<specifics>
## Specific Ideas

- **Dual-read helper implementation pattern**: `profile.roles?.includes(role) ?? profile.role === role` — a one-line safe-navigation expression that short-circuits cleanly in both the migrated and pre-migration states. Planner should verify this compiles under TypeScript strict mode.
- **Role enum export convention**: model after existing `ProjectStatus` / `RoadmapStatus` string unions in `src/types/mentorship.ts` — TypeScript type union for consumers, Zod enum for runtime validation, both exported from the same file.
- **Flag-check placement in route layouts**: `app/ambassadors/layout.tsx` and `app/admin/ambassadors/layout.tsx` each call `if (!isAmbassadorProgramEnabled()) notFound()` at the top. Centralized — single point per route tree rather than per-page.
- **Claim refresh signal**: option A — API route returns `{ claimRefreshed: true }` in the response body and the client hook calls `user.getIdToken(true)` before trusting subsequent reads. Option B — write a sentinel field (e.g., `mentorship_profiles.{uid}.claimsVersion`) that the client listens to via `onSnapshot` and force-refreshes on change. Planner chooses; A is simpler for Phase 1's mutation sites, B matters more in Phase 2+ when server-side processes can trigger claim changes without the client initiating the mutation.

</specifics>

<deferred>
## Deferred Ideas

- **Moving `admin` into `roles[]`** — discussed and rejected for Phase 1 blast-radius reasons. Could be revisited in a future dedicated "auth model cleanup" phase, but is NOT on the v6.0 roadmap.
- **Runtime Firestore flag for `FEATURE_AMBASSADOR_PROGRAM`** — env var decided instead. If ops ever needs runtime kill-switch, introduce as a separate follow-up rather than here.
- **"Coming soon" marketing placeholder at `/ambassadors`** — rejected for Phase 1 (goal is zero exposure). Could be a separate marketing-page phase in a future milestone.
- **Auto-close of dual-claim window via cron/PR** — rejected for Phase 1; manual close with explicit verification. Auto-close is a reasonable future hardening if the team ships enough migrations to want a reusable pattern.
- **Nav-item "grayed out with tooltip" presentation** — rejected for Phase 1. If marketing wants a teaser phase before public launch, introduce via a separate flag (`FEATURE_AMBASSADOR_TEASER`) in a future milestone.

</deferred>

---

*Phase: 01-foundation-roles-array-migration*
*Context gathered: 2026-04-21*
