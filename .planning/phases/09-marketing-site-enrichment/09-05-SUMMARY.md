---
phase: 09-marketing-site-enrichment
plan: 05
subsystem: marketing-home-page
tags: [home, composition, quality-floor, marketing]
dependency-graph:
  requires: ["09-01", "09-03", "09-04"]
  provides: ["home-page-recomposition"]
  affects: ["src/app/page.tsx"]
tech-stack:
  added: []
  patterns:
    - "Locked 11-section marketing home flow (banners -> hero -> trusted-by -> stats -> work showcase -> pillars -> testimonials -> founder -> sponsor band -> newsletter -> FAQ)"
    - "Group eyebrow (<work />, <testimonials />) as a standalone page-padding band above a group of reused components, alternating base-100/base-200 band rhythm"
key-files:
  created: []
  modified:
    - src/app/page.tsx
decisions:
  - "Group-eyebrow wrapper sections use bg-base-100 (not bg-base-200) so they act as a breather/transition band before the following component's own bg-base-200 band, avoiding two consecutive same-color bands with a redundant border-t line"
  - "CoursesSection receives courses via await getCourses() exactly as in /about/page.tsx; BooksSection and OpenSourceSection self-fetch their data modules (no props)"
  - "PortfolioBio intentionally NOT added to the home Founder/About section (UI-SPEC row 8) to avoid a duplicate bio with /sponsors; FounderCredibility retained as-is"
metrics:
  duration: "~25 minutes"
  completed: 2026-07-08
---

# Phase 09 Plan 05: Home Page Recomposition + Quality Floor Summary

Recomposed `src/app/page.tsx` into the locked 11-section jamwithai-shaped marketing flow (rebuilt hero, trusted-by strip, work showcase, sponsor band) and ran the programmatic quality-floor checks (build, tsc, maxDuration grep) — human visual QA (375px/themes/motion/CTA routing) is the one remaining checkpoint.

## What Was Built

### Task 1: Recompose page.tsx into the locked marketing section order — DONE, committed `9163e58`

`src/app/page.tsx` `Home()` now awaits both `getHomeBanners()` and `getCourses()` and renders, in order:

1. Banners (`HomeBanners`, env-gated) — unchanged
2. `CommunityHero` (rebuilt in prior wave — proof manifest + 3 CTAs, `/api/stats` fetch untouched)
3. `TrustedByStrip` (new, reuses sponsors `BRAND_LOGOS`)
4. `CommunityStats` + `SocialReachBar` — untouched, `/api/stats` integration intact
5. Ahsan's work showcase — `<SectionEyebrow tag="work">built and shared with the community</SectionEyebrow>` group header, then `BooksSection`, `CoursesSection courses={courses}`, `OpenSourceSection` composed exactly as `/about/page.tsx`
6. `PillarsGrid` — unchanged
7. Testimonials — `<SectionEyebrow tag="testimonials">what mentees say</SectionEyebrow>` then `TestimonialsSection` (already empty-guarded from 09-01: `if (testimonials.length === 0) return null;`)
8. `FounderCredibility` — unchanged; `PortfolioBio` deliberately NOT added here (avoids duplicate bio, per UI-SPEC row 8)
9. `SponsorBand` (new, teal `btn-accent`, CTA -> `/sponsors`)
10. Newsletter — existing inline `<section>`, now with `id="newsletter"` so the hero's "Subscribe to the newsletter" CTA (`href="#newsletter"`) scrolls to it
11. `HomeFAQ` — unchanged

Metadata (lines 20-40) and the `/api/stats` wiring in `CommunityHero`/`CommunityStats`/`SocialReachBar` were not touched.

### Task 2: Quality-floor build verification (SPEC Req 9) — DONE, verification-only (no commit needed)

- `npm run build` — **passed**, all routes compiled (static + dynamic), no build errors.
- `npx tsc --noEmit` — clean for `src/app/page.tsx` (no TS errors surfaced).
- `npx eslint src/app/page.tsx` — clean, no output.
- `grep -rEn "maxDuration" src/app` — no match with a value > 60; **no serverless `maxDuration > 60` introduced**.
- `/api/stats` fetch code — unchanged across `CommunityHero.tsx`, `SocialReachBar.tsx`, `CommunityStats.tsx` (no edits made to those files in this plan).
- Grep-verified all required section markers present in `page.tsx`: `await getCourses`, `TrustedByStrip`, `SponsorBand`, `TestimonialsSection`, `id="newsletter"`, `CommunityStats`.
- Statically confirmed `/sponsors` has exactly one `<h1>` (`src/app/sponsors/page.tsx:99` "Partner with Code with Ahsan"); `PortfolioBio`'s internal heading is not an `<h1>` on that page (demoted in the prior 09-04 wave).

### Task 3: Human visual QA — **PENDING** (checkpoint, gate="blocking")

This is a `checkpoint:human-verify` task. All programmatic/headless checks above pass; a human still needs to walk the browser-based checklist below. Per the executor's operating instructions, execution stopped here rather than self-approving.

## Remaining Human Checks (Task 3, exact steps from the plan)

1. Run `npm run dev`, open `http://localhost:3000`.
2. HERO: confirm `<community-led />` eyebrow, headline with live/`5,000+` count, monospace proof manifest (gde/books/installs/talks, values in violet), and 3 CTAs — Join the community (violet, opens Discord new tab), Subscribe to the newsletter (neutral, scrolls to `#newsletter`), Sponsor us (teal, routes to `/sponsors`).
3. HEADER: confirm the teal "Sponsor" button is visible in the navbar, stays visible while scrolling, has a visible focus ring on Tab, and becomes icon-only (still >=44px tap target) below `sm`.
4. Confirm TRUSTED-BY, SHOWCASE, TESTIMONIALS, SPONSOR BAND render in order without overlap; Sponsor band CTA "See sponsorship options" -> `/sponsors`.
5. On `/sponsors`: confirm About-Ahsan (`PortfolioBio`) appears after the brands strip, the work showcase appears before the contact form, and there is exactly one page `<h1>`.
6. RESPONSIVE: at 375px width, confirm no horizontal scroll on home and `/sponsors`.
7. THEMES: toggle light and dark — confirm brand logos render (currentColor) in both, no unreadable text, no broken layout.
8. MOTION: enable OS "reduce motion" and reload — confirm hero content is fully visible with no transforms/animation.
9. CONSOLE: confirm no errors in the browser console on either page in both themes.

**Resume signal:** type "approved", or describe any issue (section, theme, viewport, and what looked wrong) for a follow-up gap-closure task.

## Deviations from Plan

None — plan executed exactly as written. The only executor judgment call was the group-eyebrow wrapper band color (documented above as a decision, not a deviation): using `bg-base-100` instead of `bg-base-200` for the `<work />` and `<testimonials />` eyebrow wrapper sections to preserve the alternating band rhythm and avoid a redundant double border-top between two consecutive same-color bands.

## Known Stubs

None. All showcase/testimonials data flows through existing, already-populated data modules (`src/data/booksData.js`, `src/lib/content/contentProvider` courses, `src/data/openSourceProjects`, `src/data/testimonials`) — no hardcoded empty/placeholder values were introduced.

## Threat Flags

None. No new network endpoints, auth paths, or trust-boundary changes — `getCourses()` mirrors the existing `/about` build-time read with no user input, matching the plan's accepted T-09-06 disposition.

## Self-Check

- `src/app/page.tsx` — FOUND (modified, committed).
- Commit `9163e58` — FOUND in `git log --oneline`.

## Self-Check: PASSED
