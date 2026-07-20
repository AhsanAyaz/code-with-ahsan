---
phase: quick
plan: 260720-fio
subsystem: marketing-site (sponsors funnel)
tags: [sponsors, rate-card, seo-copy, content-trim]
dependency-graph:
  requires: []
  provides: [/rates page, aligned social/audience numbers site-wide]
  affects: [src/app/sponsors/page.tsx, src/app/rates/page.tsx, src/data/socialReach.ts]
tech-stack:
  added: []
  patterns:
    [
      daisyUI + Tailwind card tokens (rounded-2xl bg-base-200 border border-base-300),
      native details/summary for collapsible pricing groups,
      local SectionEyebrow helper per page,
    ]
key-files:
  created:
    - src/app/rates/page.tsx
  modified:
    - src/data/socialReach.ts
    - src/components/home/CommunityHero.tsx
    - src/app/events/cwa-promptathon/2026/constants.ts
    - src/app/sponsors/page.tsx
    - next.config.ts
decisions:
  - "Removed the legacy /rates -> /sponsors permanent redirect (next.config.ts, GH#261 era) since /rates is now a real, linkable page again (Rule 3 blocking-issue fix, not in original plan file list but required for the feature to work)."
  - "Dropped `async` from SponsorsPage component since getCourses() was the only await."
metrics:
  duration: ~25 min
  completed: 2026-07-20
---

# Phase quick Plan 260720-fio: Sponsors Page QA (ClickUp 86caqkjwh) Summary

One-liner: Aligned four stale audience/installs numbers across the site, trimmed the sponsors page catalog into a compact credibility strip with a new Kimi case study and two inventory formats, and shipped a brand-new `/rates` page built from the approved rate-card data.

## What was built

**Task 1 — Number alignment (commit `2909678`)**

- `src/data/socialReach.ts`: newsletter count `2100` → `3000` (single source feeding `/api/stats`, `SocialStats`, and all aligned copy).
- `src/components/home/CommunityHero.tsx`: MANIFEST `installs` value `"13M+"` → `"14M+"`.
- `src/app/events/cwa-promptathon/2026/constants.ts`: `COMMUNITY_STATS` and `SPONSOR_STATS` Discord Members `"4,500+"` → `"5,200+"` (both arrays); `"130,000+ Social Followers"` and all other values untouched.

**Task 2 — Sponsors page trim (commit `e83d4ff`)**

- Removed `getCourses` import/call, `BooksSection`, `CoursesSection`, `OpenSourceSection` imports and their rendered sections; dropped `async` from the page component (no other `await` remained).
- Added a compact credibility strip (three linked cards using existing `rounded-2xl bg-base-200 border border-base-300` tokens) pointing to `/books`, `/courses`, and `https://github.com/ahsanayaz` — keeps the contact form reachable in ~2 scrolls.
- `CREDENTIALS` "13M+ library installs" → "14M+ library installs"; newsletter OFFERING copy "2,100+" → "3,000+".
- Added two new `OFFERINGS` entries with `GraduationCap` / `CalendarDays` lucide icons: "Course & Workshop Adoption" and "Sponsored Community Events" (latter flagged DRAFT pending Maham confirmation, per plan).
- Added a "Results" case-study section (Kimi / Moonshot AI) immediately before `#contact`, with 52,000+ views / 3.1% CTR / 1,600+ clicks / 210 signups — flagged as representative figures pending exact archived numbers.
- Added a "View the full rate card →" link to `/rates` beside the "Book a call directly" line near the contact form.
- No $600 budget tier added — out of scope per plan.

**Task 3 — New `/rates` page (commit `80e5fc7`)**

- Created `src/app/rates/page.tsx` (server component) matching `/sponsors` design language: `page-padding` wrapper, local `SectionEyebrow` helper, `rounded-2xl bg-base-200 border border-base-300` cards, `btn btn-primary`/`btn btn-outline`, centered `max-w-*` sections.
- Sections, in order: Hero (credential pills + "4 brand partnerships per month" note) → Audience (`SocialStats` with `label="The audience"` + `showTotal`) → Featured packages (Instagram Launch / Growth "Most popular" / Authority, each with struck-through original price, discounted price, save badge, and deliverables) → À la carte (native `details`/`summary` collapsibles per platform: YouTube, Instagram, LinkedIn, TikTok, Newsletter & Community) → Usage rights & add-ons (whitelisting, perpetual, buyout, exclusivity, raw footage percentages) → Closing CTA ("Send a brief" → `/sponsors#contact`, "Book a call" → `BOOKING_URL`).
- All figures sourced from `RATE-CARD-DATA.md`, using ALIGNED site numbers (14M installs, 5,200 Discord, 3,000 newsletter, 37k YouTube, 200,000+ total) — not the stale PDF figures.
- Exports `metadata` with `alternates.canonical: "/rates"` and an `openGraph` block mirroring `/sponsors`.
- **Rule 3 blocking-issue fix (not listed in plan's `files_modified`)**: `next.config.ts` had a permanent redirect `{ source: "/rates", destination: "/sponsors" }` from the GH#261 era ("rate-card calculator replaced by the simpler /sponsors page"). This redirect would have silently intercepted every request to the new `/rates` page before Next.js routing could render it. Removed the redirect entry so the new page is actually reachable — a build-verifiable, correctness-blocking fix, not a redesign decision.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Removed stale `/rates` → `/sponsors` permanent redirect**

- **Found during:** Task 3
- **Issue:** `next.config.ts` redirected all `/rates` traffic to `/sponsors` (301, permanent) from a prior "rate-card calculator replaced by the simpler /sponsors page" decision (GH#261). With this redirect in place, the newly created `src/app/rates/page.tsx` would never render — the redirect fires before route matching.
- **Fix:** Deleted the `{ source: "/rates", destination: "/sponsors", permanent: true }` entry from `redirects()` in `next.config.ts`.
- **Files modified:** `next.config.ts`
- **Commit:** `80e5fc7`

No other deviations — plan executed as written otherwise.

## Build verification

- `npm run build` — **PASS**, no type/build errors. `/rates` and `/sponsors` both compile as static (`○`) routes. Confirms the `getCourses` removal and the new `/rates` page compile cleanly.
- `npx tsc --noEmit -p .` — clean, no errors.
- `npx eslint` on all changed files (`src/app/rates/page.tsx`, `src/app/sponsors/page.tsx`, `src/data/socialReach.ts`, `src/components/home/CommunityHero.tsx`, `src/app/events/cwa-promptathon/2026/constants.ts`, `next.config.ts`) — clean, no warnings/errors.
- Manual `grep`-based verification for each task's `<verify>` block — all passed (see commit messages for exact checks run).
- Dev-server/Playwright manual load of `/sponsors` and `/rates`, and sponsor-form submission (items 3–5 of the plan's full-project verification) were **not** run in this session — build/lint/type checks were used as the primary automated gate. Flagged in `## Flags` below for the requested "local review by Ahsan before pushing."

## Flags (carried from plan)

- "Sponsored Community Events" one-liner in `OFFERINGS` is a DRAFT — needs Maham's confirmation before wide use.
- Case-study figures (52k views / 3.1% CTR / 1,600 clicks / 210 signups) in the sponsors page Kimi case study are representative — swap for exact archived numbers before wide sharing.
- Per plan: local review by Ahsan before pushing; after approval push branch `fix/sponsors-page-qa`, then tag Najla to test. This session did not push the branch or open a PR — only committed locally on `fix/sponsors-page-qa` as instructed.

## Self-Check: PASSED

- `src/app/rates/page.tsx` — FOUND
- `src/app/sponsors/page.tsx` (modified) — FOUND, contains `14M+ library installs`, `3,000+`, `Course & Workshop Adoption`, `Sponsored Community Events`, `Kimi`, `/rates`
- `src/data/socialReach.ts` — FOUND, `count: 3000`
- `src/components/home/CommunityHero.tsx` — FOUND, `"14M+"`
- `src/app/events/cwa-promptathon/2026/constants.ts` — FOUND, `5,200+` in both stat arrays, no `4,500` remaining
- `next.config.ts` — FOUND, `/rates` redirect removed
- Commit `2909678` — FOUND in `git log`
- Commit `e83d4ff` — FOUND in `git log`
- Commit `80e5fc7` — FOUND in `git log`
