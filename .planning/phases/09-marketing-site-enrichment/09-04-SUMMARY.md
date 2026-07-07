---
phase: 09-marketing-site-enrichment
plan: 04
subsystem: marketing-site
tags: [sponsors, portfolio-reuse, ssr]
dependency-graph:
  requires: ["09-01"]
  provides: ["sponsors-about-ahsan-section", "sponsors-work-showcase"]
  affects: ["src/app/sponsors/page.tsx"]
tech-stack:
  added: []
  patterns:
    - "Async server component composition mirroring src/app/about/page.tsx"
key-files:
  created: []
  modified:
    - src/app/sponsors/page.tsx
decisions:
  - 'Reused PortfolioBio, BooksSection, CoursesSection, OpenSourceSection as-is (D-01); only new wiring was as="h2" on PortfolioBio and courses prop on CoursesSection.'
  - "Converted SponsorsPage from sync to async server component to await getCourses(), mirroring about/page.tsx exactly."
metrics:
  duration: "~15 min"
  completed: 2026-07-08
---

# Phase 9 Plan 04: Sponsors Page Enrichment (About-Ahsan + Work Showcase) Summary

Converted `/sponsors` from a sync server component to async, inserting a founder-authority "About Ahsan" section (reused `PortfolioBio` demoted to `<h2>`) and Ahsan's work showcase (`BooksSection` + `CoursesSection` + `OpenSourceSection`, same components as `/about` and home) — closing the "page feels empty" gap by proving the person and body of work a sponsor is buying access to.

## What Was Built

- `src/app/sponsors/page.tsx`:
  - Added imports: `getCourses` from `@/lib/content/contentProvider`; `PortfolioBio`, `BooksSection`, `CoursesSection`, `OpenSourceSection` from `@/components/portfolio/*`.
  - `SponsorsPage` changed from `export default function SponsorsPage()` to `export default async function SponsorsPage()`, with `const courses = await getCourses();` at the top of the body (mirrors `about/page.tsx:18-19`).
  - Inserted `<PortfolioBio as="h2" />` immediately after the hero+brands-strip `</section>` and before "What we offer" — the `as="h2"` prop (already added in 09-01) demotes the bio's internal heading so the page retains exactly one `<h1>` (the existing "Partner with Code with Ahsan" hero heading, unchanged).
  - Inserted `<BooksSection />`, `<CoursesSection courses={courses} />`, `<OpenSourceSection />` (in that order) after the audience-stats `</section>` and before the `<section id="contact">` block.
  - Hero, brands strip, offer cards, audience stats, and contact form were left byte-for-byte unchanged aside from the two insertion points above. No `maxDuration` config added.

## Verification

- `grep` confirms: `async function SponsorsPage`, `await getCourses`, `PortfolioBio as="h2"`, `CoursesSection courses={courses}` all present.
- `npx tsc --noEmit` — no errors reported for `sponsors/page.tsx`.
- `npx eslint src/app/sponsors/page.tsx` — clean, no output.
- `npm run build` — succeeded; `/sponsors` prerendered as static content (`○ /sponsors`).
- `grep -n "<h1"` on `sponsors/page.tsx` shows exactly one literal `<h1>` (the hero heading, line 99 post-edit); `PortfolioBio.tsx` uses a dynamic `Heading` element driven by the `as` prop, so no second literal `<h1>` is introduced.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary changes. `getCourses()` reuse mirrors the already-shipped `/about` page (threat register T-09-05, disposition: accept).

## Self-Check: PASSED

- FOUND: src/app/sponsors/page.tsx (modified, exists)
- FOUND: e5cb206 (git log --oneline confirms commit exists on feat/phase-9-marketing-enrichment)
