---
phase: 09-marketing-site-enrichment
plan: 02
subsystem: ui
tags: [nextjs, react, daisyui, lucide-react, navbar, sponsors]

# Dependency graph
requires: []
provides:
  - Persistent teal Sponsor button in the site header (navbar-end), linking to /sponsors
affects:
  [09-marketing-site-enrichment (later plans touching header/nav), sponsors landing page work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [
      "Header CTA pattern: btn btn-sm btn-accent + lucide icon + hidden sm:inline label for responsive icon-only buttons",
    ]

key-files:
  created: []
  modified: [src/components/LayoutWrapper.tsx]

key-decisions:
  - "Used the local ./Link component (not next/link) to match existing LayoutWrapper conventions"
  - "Placed Sponsor button as first child of navbar-end (before ProfileMenu) per UI-SPEC ordering"
  - "Relied on existing sticky top-0 header for 'always visible while scrolling' requirement instead of adding new positioning"

patterns-established:
  - 'Icon-only-below-sm nav CTA: lucide icon (aria-hidden) + `<span className="hidden sm:inline">Label</span>`, with aria-label on the wrapping Link for accessibility at all breakpoints'

requirements-completed: [SPEC-R5]

# Metrics
duration: 8min
completed: 2026-07-08
---

# Phase 09 Plan 02: Persistent Header Sponsor Button Summary

**Added a teal (btn-accent) "Sponsor" CTA with a HandCoins icon to LayoutWrapper's navbar-end, linking to /sponsors, visible on every page while scrolling.**

## Performance

- **Duration:** ~8 min
- **Tasks:** 1 completed
- **Files modified:** 1

## Accomplishments

- Persistent, always-visible Sponsor button in the header (navbar-end), leveraging the existing `sticky top-0` header
- Correctly uses the teal Sponsor lane (`btn-accent`), distinct from primary/violet used elsewhere
- Responsive: icon-only with `aria-label="Sponsor"` below `sm`, icon + "Sponsor" label at `sm` and above; `min-h-11` preserves a ≥44px tap target in the icon-only state
- Left `ProfileMenu` and `SideNav` (#263 side-nav mechanics) completely untouched

## Task Commits

1. **Task 1: Add persistent Sponsor button to navbar-end** - `38d3757` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `src/components/LayoutWrapper.tsx` - Added `HandCoins` import from `lucide-react` and a new `Link` to `/sponsors` (`btn btn-sm btn-accent gap-1 min-h-11`, `aria-label="Sponsor"`) as the first child of `navbar-end`, before `ProfileMenu`.

## Decisions Made

- Reused the local `./Link` wrapper already imported in the file (not `next/link`), matching the existing pattern for the logo link.
- No new positioning/sticky logic added — the header was already `sticky top-0`, satisfying "persistent while scrolling" for free.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Header Sponsor entry point is live and ready for the `/sponsors` page work (and the 09-05 human-verify checkpoint that folds in manual visual/keyboard verification of this button).
- No blockers. `ProfileMenu`/`SideNav` mechanics unaffected, so downstream plans touching those areas are unaffected by this change.

---

_Phase: 09-marketing-site-enrichment_
_Completed: 2026-07-08_
