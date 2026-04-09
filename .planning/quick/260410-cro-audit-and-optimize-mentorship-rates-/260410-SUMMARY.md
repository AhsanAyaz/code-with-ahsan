---
phase: quick
plan: 260410
subsystem: ui
tags: [cro, daisyui, tailwind, conversion-optimization]

requires:
  - phase: quick-73
    provides: rates page redesign with featured packages layout
provides:
  - CRO-optimized rates page with CTAs on package cards
  - Social proof strip with past brand collaborations
  - Collapsible a la carte pricing via DaisyUI accordion
  - Mid-page conversion CTA between packages and a la carte
  - Visual hierarchy enhancement on Growth (recommended) package
affects: [rates-page, sponsorship]

tech-stack:
  added: []
  patterns: [daisyui-collapse-for-long-content, cta-on-every-pricing-card]

key-files:
  created: []
  modified:
    - src/app/rates/RatesClient.tsx

key-decisions:
  - "Used text-based social proof strip instead of logo images (no logo files available)"
  - "Wrapped entire a la carte markdown in single DaisyUI collapse rather than splitting by platform (markdown is a single blob)"
  - "Used struck-through a la carte values for price anchoring on package cards"

patterns-established:
  - "CTA buttons on every pricing card linking to calendar booking URL"
  - "DaisyUI collapse for long markdown content to reduce visual noise"

requirements-completed: [CRO-01, CRO-02, CRO-03]

duration: 3min
completed: 2026-04-09
---

# Quick 260410: CRO Audit and Optimize Rates Page Summary

**CRO-optimized rates page with package CTAs, social proof strip, collapsible a la carte accordion, mid-page conversion point, and visual hierarchy on the Growth package**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-09T18:42:56Z
- **Completed:** 2026-04-09T18:45:38Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Every featured package card now has a visible "Book a call" CTA button (filled for Growth, outline for others)
- Growth card enhanced with shadow, scale transform, and filled CTA for stronger visual differentiation
- Struck-through a la carte values shown above package prices for savings anchoring
- Availability note with animated pulse dot communicates limited slots below hero stats
- Mid-page CTA section between packages and a la carte with both email and calendar options
- Social proof strip with Airia, Kimi (Moonshot AI), and Cloudways below the hero
- A la carte markdown wrapped in DaisyUI collapse accordion (collapsed by default)
- Usage rights simplified to a one-liner with "details discussed on call"

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CTAs to package cards, mid-page CTA, and availability note** - `20c39b4` (feat)
2. **Task 2: Add social proof strip and collapsible a la carte sections** - `d11b30f` (feat)

## Files Created/Modified
- `src/app/rates/RatesClient.tsx` - CRO-optimized rates page with all conversion elements (300 lines)

## Decisions Made
- Used text-based social proof strip (brand names as styled links) since no logo image files are available
- Wrapped entire a la carte markdown in a single DaisyUI collapse component since the markdown blob cannot be split by platform
- Used reasonable a la carte comparison values ($1,950 / $4,400 / $6,600) that align with existing "Save $X" text on each package

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing build failure due to missing `@loupeink/web-sdk` dependency (unrelated to rates page changes) - verified same error exists on clean main branch

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Rates page CRO complete, ready for visual review at codewithahsan.dev/rates
- Consider adding real brand logo images in a future task for stronger social proof
