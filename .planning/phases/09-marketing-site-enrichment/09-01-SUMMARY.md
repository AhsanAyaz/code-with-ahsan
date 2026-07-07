---
phase: 09-marketing-site-enrichment
plan: 01
subsystem: ui
tags: [react, nextjs, daisyui, jetbrains-mono, tailwind]

# Dependency graph
requires: []
provides:
  - Shared SectionEyebrow component rendering the bracketed-mono signature motif (`<tag />`)
  - Configurable heading level on PortfolioBio (h1 default, h2 for reuse contexts)
  - Empty-state guard on TestimonialsSection (hides gracefully at 0 items)
affects: [09-02, 09-03, 09-04, 09-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bracketed-mono eyebrow: font-mono text-xs tracking-widest text-base-content/40, lowercase, self-closing-tag framing via HTML entities"
    - "Polymorphic heading prop via `const Heading = as;` local variable pattern for single-restyle reuse"

key-files:
  created:
    - src/components/home/SectionEyebrow.tsx
  modified:
    - src/components/portfolio/PortfolioBio.tsx
    - src/components/portfolio/TestimonialsSection.tsx

key-decisions:
  - "SectionEyebrow accepts tag, optional children (descriptive suffix), and align (default center) — mirrors the sponsors page analog's token vocabulary exactly, only dropping `uppercase` and adding bracket framing"
  - 'PortfolioBio''s `as` prop defaults to h1 so /about (the only current consumer) is unaffected; sponsors page reuse in a later plan will pass as="h2"'

patterns-established:
  - "Pattern 1: Shared presentational eyebrow component consumed across hero, trusted-by, work group, testimonials, sponsor band"
  - "Pattern 2: Reused portfolio components accept a minimal prop surface (heading level) rather than being re-authored per consuming page"

requirements-completed: [SPEC-R3, SPEC-R7]

# Metrics
duration: 12min
completed: 2026-07-07
---

# Phase 9 Plan 01: Shared Eyebrow Helper + Portfolio Reuse Prep Summary

**Bracketed-mono SectionEyebrow component plus the two reuse-forced edits (PortfolioBio heading-level prop, TestimonialsSection empty-state guard) that unblock every later Phase 9 composition plan.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-07T22:52:00Z
- **Completed:** 2026-07-07T23:04:24Z
- **Tasks:** 3 completed
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Created `SectionEyebrow`, the shared bracketed-mono presentational helper that will render every section label across home and sponsors (`<work />`, `<testimonials />`, `<trusted-by />`, `<community-led />`) in the JetBrains Mono utility register, matching the sponsors page analog's token vocabulary minus `uppercase`.
- Added an optional `as` prop to `PortfolioBio` (default `h1`) enabling the single genuine restyle the reuse strategy forces — demoting to `<h2>` when composed onto `/sponsors` (or elsewhere it isn't the page's top heading) — with zero impact on the existing `/about` usage.
- Guarded `TestimonialsSection` to return `null` when the testimonials data array is empty, satisfying the SPEC Req 3 "graceful degradation — section hidden" acceptance criterion.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared bracketed-mono SectionEyebrow helper** - `b62e6af` (feat)
2. **Task 2: Add configurable heading level to PortfolioBio (h1→h2 forced edit)** - `46689fc` (feat)
3. **Task 3: Guard TestimonialsSection against empty data (graceful hide)** - `5d07979` (fix)

**Plan metadata:** (this commit, immediately following)

## Files Created/Modified

- `src/components/home/SectionEyebrow.tsx` - New shared eyebrow component; default export, `tag`/`children`/`align` props, lowercase bracket framing via HTML entities.
- `src/components/portfolio/PortfolioBio.tsx` - Added `as?: "h1" | "h2"` prop (default `h1`); name heading now renders via `const Heading = as;` local variable instead of a hardcoded `<h1>`.
- `src/components/portfolio/TestimonialsSection.tsx` - Added `if (testimonials.length === 0) return null;` guard before the section shell.

## Decisions Made

- Kept `SectionEyebrow`'s default alignment centered (matching the sponsors analog) with an opt-in `align="left"` for the hero's potential left/center variance in later plans.
- Used HTML entities (`&lt;`/`&gt;`) rather than literal `<`/`>` characters so JSX never attempts to parse the bracket framing as an element — also satisfies the threat register's T-09-01 disposition (static string, no injection surface).

## Deviations from Plan

None - plan executed exactly as written. Prettier/eslint auto-formatting (via pre-commit hooks) made cosmetic line-wrap adjustments to each file at commit time; no logic changes resulted.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `SectionEyebrow`, the `PortfolioBio` heading prop, and the `TestimonialsSection` empty guard are all in place and verified (`npx tsc --noEmit`, `npx eslint`, `npm run build` all clean).
- `/about` page renders unaffected (still calls `<PortfolioBio />` with no prop, defaulting to `<h1>`).
- Later plans (09-02 through 09-05) can now compose these primitives onto the rebuilt home page and `/sponsors` without further prerequisite work.

---

_Phase: 09-marketing-site-enrichment_
_Completed: 2026-07-07_

## Self-Check: PASSED
