# Phase 9: Marketing Site Enrichment — Specification

**Created:** 2026-07-07
**Milestone:** v8.0 Marketing Site Refresh (parallel track; does not displace in-flight v7.0 agent work)
**Ambiguity score:** 0.19 (gate: ≤ 0.20)
**Requirements:** 9 locked

## Goal

The home page changes from a sparse 8-section community page into a marketing-driven landing (jamwithai.dev-level richness), and the `/sponsors` page gains an "About Ahsan" section and an "Ahsan's work" showcase — so both pages sell Ahsan's authority and the community's reach instead of reading as empty.

## Background

**Home** (`src/app/page.tsx`) composes eight components from `src/components/home/`: `HomeBanners` (env-gated), `CommunityHero`, `PillarsGrid`, `CommunityStats`, `SocialReachBar`, `FounderCredibility`, an inline newsletter block (`NewsletterForm`), and `HomeFAQ`. Screenshot review: hero is a single gradient headline + two CTAs over large empty space; no showcase of Ahsan's work, no testimonials, no brand/trusted-by strip. Live numbers come from `/api/stats` (consumed by `CommunityStats` + `SocialReachBar`).

**Sponsors** (`src/app/sponsors/page.tsx`, shipped in #263) has: hero, brand logo strip (Cloudways/Kimi/Airia mono SVGs in `public/static/images/sponsors/`), 6 offer cards, audience stats, contact form. User feedback: "a bit empty" — missing an About section and proof of past work.

No component today renders Ahsan's product/OSS portfolio (Angular Cookbook, books, courses, 13M+ install libraries) or community testimonials. `siteMetadata` holds some external links (e.g. `ngBook`). Stack: Next.js App Router, Tailwind v4 + DaisyUI tokens (brand primary `#8f27e0`), Rubik + JetBrains Mono, lucide-react, framer-motion. Vercel hobby plan caps serverless `maxDuration` at 60s (see recent deploy incident).

Real content (project list, testimonial quotes) will be supplied by Ahsan; until then sections render tasteful placeholders behind a single content module so swapping in real data is a data-only edit.

## Requirements

1. **Home hero rebuild**: The hero becomes a richer marketing unit.
   - Current: `CommunityHero` = eyebrow badge + gradient headline + one-paragraph subhead + two buttons (Join the Community, Explore Mentorship)
   - Target: Hero retains the community-strong badge + headline, adds a primary CTA cluster covering Join the Community (Discord), Newsletter subscribe, and a distinct **Sponsor** entry point, plus a "trusted by" brand-logo strip beneath it
   - Acceptance: Hero renders the badge, headline, ≥3 distinct CTAs (Discord, Newsletter, Sponsor), and a logo strip; each CTA routes to its correct destination (Discord invite, newsletter capture, `/sponsors`)

2. **Ahsan's work showcase (shared component)**: A new showcase section lists Ahsan's own products/OSS.
   - Current: No component renders Ahsan's portfolio anywhere
   - Target: A reusable showcase component driven by a single content module (e.g. `src/data/showcase.ts` or `src/content/*`) rendering cards for items like Angular Cookbook, published books, courses, notable OSS libraries (with the 13M+ installs proof); used on BOTH home and `/sponsors`
   - Acceptance: The component renders on home and `/sponsors` from the same data source; adding/removing an item is a data-only change; renders correctly at 0, 1, and 6+ items

3. **Testimonials section**: A new testimonials section on the home page.
   - Current: No testimonials exist on the site
   - Target: A testimonials component rendering quote + attribution (name, role, optional avatar), populated from a content module with placeholder entries until Ahsan supplies real quotes
   - Acceptance: Section renders ≥3 testimonial cards from the data module; empty state degrades gracefully (section hidden or placeholder) when the array is empty

4. **Trusted-by brand strip**: A brand-logo strip appears on the home page.
   - Current: Brand logos exist only on `/sponsors`
   - Target: A "trusted by" / "worked with" logo strip on home reusing the existing sponsor logo assets (`public/static/images/sponsors/`), theme-aware (mono `currentColor`)
   - Acceptance: The strip renders the existing brand logos on home in both light and dark themes without layout breakage

5. **Prominent Sponsor entry point**: Sponsorships becomes a first-class CTA, not buried.
   - Current: `/sponsors` is reachable only via side-nav "More" and the footer
   - Target: A visible "Sponsor" call-to-action on the home page (dedicated band or hero CTA) AND a prominent nav-level entry, in addition to the existing footer/more links
   - Acceptance: From the home page, a user can reach `/sponsors` via a clearly labelled Sponsor CTA above the fold or in a dedicated home section, plus a top-level nav affordance

6. **Retained home elements**: Existing high-value elements survive the rebuild.
   - Current: `CommunityStats` + `SocialReachBar` (live `/api/stats`), `HomeFAQ`, `FounderCredibility` all present
   - Target: Live stats, FAQ, and an upgraded founder-credibility/About-Ahsan block remain in the rebuilt page; the env-gated announcement banner remains available but is not a design focus
   - Acceptance: The rebuilt home still fetches and renders live `/api/stats` numbers, still renders the FAQ, and still renders a founder/About-Ahsan block; `/api/stats` integration is unbroken

7. **Sponsors: About Ahsan section**: `/sponsors` gains a founder-forward About section.
   - Current: `/sponsors` has no About content
   - Target: An "About Ahsan" section (creator story, GDE, books/talks, credibility proof) added to `/sponsors`, framed as the person sponsors are buying access to
   - Acceptance: `/sponsors` renders an About-Ahsan section positioned between existing sections; content is real or clearly-marked placeholder

8. **Sponsors: work showcase**: `/sponsors` gains the showcase from Requirement 2.
   - Current: `/sponsors` proves reach (stats/logos) but not Ahsan's own output
   - Target: The shared showcase component (Req 2) renders on `/sponsors`
   - Acceptance: `/sponsors` renders the showcase section from the shared data module

9. **No regressions / quality floor**: The rebuild ships without breaking the site.
   - Current: Site builds and deploys on Vercel hobby; pages are responsive + theme-aware
   - Target: New/rebuilt pages pass `npm run build`, deploy within hobby constraints (no `maxDuration > 60`), are responsive to 375px, respect `prefers-reduced-motion`, and work in light + dark themes
   - Acceptance: `npm run build` passes; production deploy succeeds; home + `/sponsors` render without console errors and without horizontal scroll at 375px in both themes

## Boundaries

**In scope:**

- Full visual rebuild of the home page (hero + section flow) to jamwithai-level richness
- New shared "Ahsan's work" showcase component + content module (used on home and `/sponsors`)
- New home testimonials section + content module
- Home trusted-by brand-logo strip (reusing sponsor logos)
- Prominent Sponsor CTA on home + a nav-level Sponsor affordance
- "About Ahsan" section added to `/sponsors`
- Retaining/upgrading live stats, FAQ, founder-credibility on home
- Placeholder content behind data modules where Ahsan's real content is pending

**Out of scope:**

- Community-built projects showcase (pulling from `/projects` data) — deferred; this phase showcases Ahsan's own products/OSS only
- Backend/API changes — no changes to `/api/stats`, `/api/sponsorship`, or data models
- Authoring the final real copy/testimonials/project list — Ahsan supplies these; phase delivers the structure + placeholders
- Redesign of other pages (mentorship, courses, projects, about route) — home + sponsors only
- Changing the side-nav structure shipped in #263 (beyond adding a prominent Sponsor entry point) — nav mechanics are done
- Newsletter provider / capture backend changes — reuse existing `NewsletterForm`

## Constraints

- Reuse DaisyUI tokens + brand primary `#8f27e0` (no new hardcoded color system); Rubik + JetBrains Mono type; lucide-react icons; framer-motion permitted but reduced-motion-safe.
- Showcase + testimonials must be data-module-driven so real content is a data-only swap (no JSX edits to add items).
- No serverless function may set `maxDuration > 60` (Vercel hobby ceiling).
- Live `/api/stats` integration must remain intact.
- Brand logo assets reused from `public/static/images/sponsors/` (theme-aware `currentColor`).
- Visual design direction is produced via the frontend-design skill in the UI phase (this SPEC locks WHAT sections exist and how they behave, not the pixel-level look).

## Acceptance Criteria

- [ ] Home hero renders badge + headline + ≥3 CTAs (Discord, Newsletter, Sponsor) + trusted-by logo strip; each CTA routes correctly
- [ ] A shared showcase component renders Ahsan's products/OSS on BOTH home and `/sponsors` from one data module
- [ ] Adding/removing a showcase item is a data-only edit (no component JSX change)
- [ ] Home renders a testimonials section (≥3 cards) from a data module; empty array degrades gracefully
- [ ] Home renders a trusted-by brand strip in light + dark themes
- [ ] Home has a prominent Sponsor CTA reaching `/sponsors`, plus a nav-level Sponsor affordance
- [ ] Home still renders live `/api/stats` numbers, the FAQ, and a founder/About-Ahsan block
- [ ] `/sponsors` renders an About-Ahsan section and the shared showcase section
- [ ] `npm run build` passes and production deploy succeeds (no `maxDuration > 60`)
- [ ] Home + `/sponsors` have no horizontal scroll at 375px and no console errors in light + dark themes

## Ambiguity Report

| Dimension           | Score | Min   | Status | Notes                                                           |
| ------------------- | ----- | ----- | ------ | --------------------------------------------------------------- |
| Goal Clarity        | 0.88  | 0.75  | ✓      | Two concrete deliverables; section list + content types locked  |
| Boundary Clarity    | 0.82  | 0.70  | ✓      | Community-projects, backend, real-copy authoring explicitly out |
| Constraint Clarity  | 0.70  | 0.65  | ✓      | Stack, hobby maxDuration, stats API, data-module rule locked    |
| Acceptance Criteria | 0.78  | 0.70  | ✓      | 10 pass/fail checks                                             |
| **Ambiguity**       | 0.19  | ≤0.20 | ✓      | Real content pending → placeholder-until-provided assumption    |

Status: ✓ = met minimum, ⚠ = below minimum (planner treats as assumption)

**Assumption flagged:** Final copy, testimonial quotes, and the exact product/OSS list are Ahsan-supplied and pending. The planner should build data-module-driven sections with placeholders; content swap is out-of-band and does not block the build.

## Interview Log

| Round | Perspective     | Question summary                   | Decision locked                                                                                                                                                                                                                                  |
| ----- | --------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Researcher      | How deep does the home rebuild go? | Full rebuild, jamwithai-level richness                                                                                                                                                                                                           |
| 1     | Researcher      | About framing (home + sponsors)?   | About Ahsan — personal creator authority                                                                                                                                                                                                         |
| 1     | Boundary Keeper | GSD framing?                       | New milestone v8.0, parallel to in-flight v7.0                                                                                                                                                                                                   |
| 1     | Researcher      | Social-proof content availability? | Ahsan provides testimonials + project list; reuse brand logos; placeholders meanwhile                                                                                                                                                            |
| 2     | Simplifier      | "Projects to show off" — whose?    | Ahsan's own products/OSS (Cookbook, books, courses, libs) — not community projects                                                                                                                                                               |
| 2     | Boundary Keeper | Primary home CTAs?                 | Join community (Discord), Explore mentorship, Newsletter, Sponsor — later narrowed: hero shows exactly 3 (Discord, Newsletter, Sponsor); Explore Mentorship surfaces via Pillars + nav, not the hero (confirmed 2026-07-07, supersedes this row) |
| 2     | Boundary Keeper | Keep which existing home elements? | Keep live stats, FAQ, founder credibility; banner deprioritized                                                                                                                                                                                  |
| 2     | Failure Analyst | Sponsor prominence?                | Yes — prominent nav + home slot (jamwithai-style)                                                                                                                                                                                                |

---

_Phase: 09-marketing-site-enrichment_
_Spec created: 2026-07-07_
_Next step: /gsd:discuss-phase 9 — then /gsd:ui-phase 9 for the visual design contract (frontend-design)_
