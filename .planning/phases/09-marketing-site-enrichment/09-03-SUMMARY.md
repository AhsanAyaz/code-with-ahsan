---
phase: 09-marketing-site-enrichment
plan: 03
subsystem: ui
tags: [nextjs, react, tailwind, daisyui, framer-motion, marketing]

requires:
  - phase: 09-marketing-site-enrichment
    provides: SectionEyebrow shared bracketed-mono eyebrow helper (09-01)
provides:
  - Rebuilt CommunityHero with monospace proof manifest + 3-CTA cluster
  - New TrustedByStrip home component reusing sponsors BRAND_LOGOS
  - New teal SponsorBand component linking to /sponsors
affects: [09-05]

tech-stack:
  added: []
  patterns:
    - "Hero proof-manifest key:value mono readout (violet values, muted keys)"
    - "Reserved-color CTA lanes: btn-primary=community, btn-outline=neutral, teal text/border=sponsor"
    - "framer-motion staggered fade-up reveal gated by useReducedMotion"

key-files:
  created:
    - src/components/home/TrustedByStrip.tsx
    - src/components/home/SponsorBand.tsx
  modified:
    - src/components/home/CommunityHero.tsx

key-decisions:
  - "Used framer-motion useReducedMotion + conditional initial/animate props for the hero's staggered reveal, collapsing to no-op when reduced motion is requested"
  - "SponsorBand teal tint adapted from the home newsletter's radial-gradient band pattern, swapping violet rgba(143,39,224,0.05) for teal rgba(31,178,166,0.06)"
  - "Hero eyebrow badge composes the shared SectionEyebrow with a -mb-3 wrapper to cancel its built-in mb-3 so it sits inline with the pulse dot"

requirements-completed: [SPEC-R1, SPEC-R4, SPEC-R5]

duration: 25min
completed: 2026-07-08
---

# Phase 9 Plan 03: Hero, Trusted-By Strip & Sponsor Band Summary

**Rebuilt CommunityHero with a monospace `key : value` proof manifest and 3-CTA reserved-color cluster; new TrustedByStrip and teal SponsorBand components ready for composition in 09-05**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-08T00:00:00Z
- **Completed:** 2026-07-08T00:25:00Z
- **Tasks:** 3
- **Files modified:** 3 (1 modified, 2 created)

## Accomplishments

- CommunityHero rebuilt in place: single restrained glow (dual orbs removed), bracketed-mono `<community-led />` eyebrow via shared `SectionEyebrow`, new 4-row monospace proof manifest (GDE, books, installs, talks), and exactly three CTAs (Join the community / Subscribe / Sponsor us) honoring the reserved-color contract — `/api/stats` fetch + 5,000 fallback preserved byte-identical.
- New `TrustedByStrip` component extracts the sponsors brand-logo strip pattern, importing `BRAND_LOGOS` directly (no SVG duplication) with the Cloudways height exception intact.
- New `SponsorBand` component renders the locked heading/body/CTA in a teal-tinted band, `btn-accent` as the only color treatment.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rebuild CommunityHero (proof manifest + 3-CTA cluster)** - `dd16366` (feat)
2. **Task 2: Create TrustedByStrip (reuse BRAND_LOGOS)** - `08fc371` (feat)
3. **Task 3: Create SponsorBand (teal home Sponsor band)** - `205727f` (feat)

_Note: pre-commit hooks (eslint --fix + prettier --write) reformatted each file in place; no logic changes resulted._

## Files Created/Modified

- `src/components/home/CommunityHero.tsx` - Rebuilt hero: proof manifest, 3-CTA cluster, single glow, shared eyebrow, unchanged `/api/stats` fetch
- `src/components/home/TrustedByStrip.tsx` - New: trusted-by brand logo strip reusing `BRAND_LOGOS`
- `src/components/home/SponsorBand.tsx` - New: teal Sponsor band CTA to `/sponsors`

## Decisions Made

- framer-motion reveal is opt-in via `useReducedMotion`; when reduced motion is requested, the `fadeUp` spread becomes `{}` so the motion components render with no initial/animate transform, satisfying the Motion Contract without a second code path.
- Chose `text-accent border-accent` on the hero's third CTA (rather than DaisyUI's `btn-accent` solid fill) to keep it visually as a `btn-outline` per the locked copy contract ("Sponsor us" → `btn btn-outline` teal/accent) while remaining the only teal element in the hero.
- `TrustedByStrip` and `SponsorBand` are server components (no client state needed), keeping the client-boundary minimal to just `CommunityHero`.

## Deviations from Plan

None - plan executed exactly as written. The `-mb-3` wrapper around `SectionEyebrow` inside the hero badge is a minor CSS composition detail to align the shared helper inline with the pulse dot, not a deviation from any locked contract.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three components are built and independently verified (`npx tsc --noEmit`, `eslint`, `npm run build` all clean) but are NOT YET composed into `src/app/page.tsx` — that composition (plus visual/responsive/reduced-motion verification at 375px, both themes) happens in 09-05 per the plan's design.
- No blockers. `CommunityHero`, `TrustedByStrip`, and `SponsorBand` are ready to import directly into `page.tsx` in the next plan.

---

_Phase: 09-marketing-site-enrichment_
_Completed: 2026-07-08_

## Self-Check: PASSED
