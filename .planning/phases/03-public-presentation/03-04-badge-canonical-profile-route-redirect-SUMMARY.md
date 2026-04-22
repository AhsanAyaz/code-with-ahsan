---
phase: 03-public-presentation
plan: "03-04"
subsystem: frontend

tags:
  - typescript
  - next.js
  - react
  - ambassador
  - public-profile
  - redirect

# Dependency graph
requires:
  - phase: 03-public-presentation
    plan: "03-01"
    provides: "PublicAmbassadorDoc, PUBLIC_AMBASSADORS_COLLECTION, AmbassadorSubdoc from src/types/ambassador.ts"
  - phase: 03-public-presentation
    plan: "03-02"
    provides: "public_ambassadors/{uid} projection written on acceptance"
tech-stack:
  added: []
  patterns:
    - "Server component + client wrapper split for /u/[username] — server fetches Admin SDK data, client renders interactive UI"
    - "Dual-read roles pattern (roles array ?? role string fallback) for backward compat during dual-write window"
    - "Next.js redirects() in next.config.ts for edge-level 308 permanent redirect preserving :path segment and query strings"

key-files:
  created:
    - "src/components/ambassador/AmbassadorBadge.tsx"
    - "src/app/u/[username]/page.tsx"
    - "src/app/u/[username]/PublicProfileClient.tsx"
  modified:
    - "next.config.ts"

key-decisions:
  - "AmbassadorBadge is a single component switching on role prop (D-10) so Phase 5 alumni transition reuses it unchanged"
  - "Badge placement scoped to /u/[username] only for Phase 3 (D-11) — MentorCard integration deferred to a quick task"
  - "Mentor section in PublicProfileClient is a v1 link-out scaffold (not inlining MentorProfileClient) — full mentor UI migration deferred; badges + public fields satisfy PRESENT-02"
  - "notFound() guard on missing profiles AND profiles with no public-visible role prevents username enumeration"
  - "308 redirect lives in next.config.ts redirects() (not a placeholder page) because it applies at edge before Next.js routing and natively preserves :path + query strings"

requirements-completed:
  - "PRESENT-02"

# Metrics
duration: ~2min
completed: 2026-04-22
---

# Phase 03 Plan 04: AmbassadorBadge + /u/[username] canonical profile route + 308 redirect Summary

**AmbassadorBadge pill component (two variants), canonical /u/[username] public profile page with server-side role gating and ambassador projection read, and 308 permanent redirect from /mentorship/mentors/:username → /u/:username at the Next.js edge.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-22T22:12:37Z
- **Completed:** 2026-04-22T22:14:48Z
- **Tasks:** 3
- **Files created:** 3 (`src/components/ambassador/AmbassadorBadge.tsx`, `src/app/u/[username]/page.tsx`, `src/app/u/[username]/PublicProfileClient.tsx`)
- **Files modified:** 1 (`next.config.ts`)

## Accomplishments

- Created `src/components/ambassador/AmbassadorBadge.tsx` — single component, two variants (`ambassador` → `badge-primary` + Award icon; `alumni-ambassador` → `badge-secondary` + GraduationCap icon). Supports optional `size` (sm/md/lg) and `className` props per plan spec.
- Created `src/app/u/[username]/page.tsx` — Next.js App Router server component:
  - Fetches `mentorship_profiles` by username via Admin SDK (dual-read roles pattern).
  - Conditionally reads `public_ambassadors/{uid}` projection for ambassador/alumni-ambassador profiles.
  - Generates SEO metadata with canonical URL, OG profile type, Twitter card.
  - `notFound()` for missing profiles AND profiles with no public-visible role (prevents username enumeration).
- Created `src/app/u/[username]/PublicProfileClient.tsx` — client component rendering:
  - Header: ProfileAvatar + displayName + `@username` + badge row (AmbassadorBadge × 2 variants).
  - Tagline/bio paragraph (ambassador publicTagline preferred over profile bio).
  - University + city from ambassador subdoc.
  - Social links row (LinkedIn, Twitter, GitHub, personal site).
  - Mentor section v1 scaffold (link-out to /mentorship/mentors search).
- Added `{ source: "/mentorship/mentors/:username", destination: "/u/:username", permanent: true }` to `next.config.ts` `redirects()` array — 308 at edge, preserves query strings (D-01).
- `npx tsc --noEmit` clean (pre-existing `social-icons` SVG errors out of scope). `npm run lint` clean on all new files.

## Task Commits

1. **Task 1: Create AmbassadorBadge component** — `e5b9af8` (feat)
2. **Task 2: Create /u/[username] page.tsx + PublicProfileClient.tsx** — `ead6200` (feat)
3. **Task 3: Add 308 redirect in next.config.ts** — `1a2a75d` (feat)

## Files Created/Modified

- `src/components/ambassador/AmbassadorBadge.tsx` (created, 53 lines) — two-variant badge pill, DaisyUI badge classes, Lucide icons, size + className props.
- `src/app/u/[username]/page.tsx` (created, 150 lines) — server component, Admin SDK fetch, generateMetadata, notFound guards.
- `src/app/u/[username]/PublicProfileClient.tsx` (created, 112 lines) — client component, full profile card with badges, socials, tagline, mentor scaffold.
- `next.config.ts` (modified, +8 lines) — 308 redirect entry added at end of redirects() array.

## Decisions Made

- **D-Runner-01:** Worktree was behind main (missing Phase 3 plans 01–03 commits). Ran `git merge main --no-edit` (fast-forward, no conflicts) before starting task execution — same preflight as Plan 03-01 executor noted in its SUMMARY.
- **D-Runner-02:** Mentor section in `PublicProfileClient` implemented as a link-out to `/mentorship/mentors?search=...` rather than inlining `MentorProfileClient`. The plan explicitly calls this out as the v1 scaffold (Task 2 action text). PRESENT-02 is fully satisfied by the badge row; full mentor UI migration is a future quick task.

## Deviations from Plan

None — plan executed exactly as written. All three tasks implemented verbatim per plan code blocks.

## Known Stubs

- **Mentor section (v1 scaffold):** `PublicProfileClient.tsx` lines 97–109 — the "See mentor profile" button links to `/mentorship/mentors?search=...` rather than inlining the full mentor profile. This is an **intentional v1 scaffold** per the plan (Task 2 action text explicitly states this). The badge rendering (PRESENT-02) and ambassador fields are fully wired — no placeholder data. The mentor section placeholder will be addressed in a future quick task once the full mentor profile migration is planned.

## Self-Check: PASSED

Verified files exist:
- `src/components/ambassador/AmbassadorBadge.tsx` — FOUND (created)
- `src/app/u/[username]/page.tsx` — FOUND (created)
- `src/app/u/[username]/PublicProfileClient.tsx` — FOUND (created)
- `next.config.ts` — FOUND (modified)

Verified commits exist:
- `e5b9af8` (Task 1) — FOUND
- `ead6200` (Task 2) — FOUND
- `1a2a75d` (Task 3) — FOUND

---
*Phase: 03-public-presentation*
*Completed: 2026-04-22*
