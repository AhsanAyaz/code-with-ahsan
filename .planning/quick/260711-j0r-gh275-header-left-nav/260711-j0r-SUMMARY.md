---
phase: quick-260711-j0r
plan: 1
subsystem: header-navigation
tags: [header, nav, daisyui, books]
requires: []
provides: [START_LEARNING_LINKS, COMMUNITY_LINKS, left-nav-dropdowns]
affects: [LayoutWrapper, SideNav, BooksSection]
tech-stack:
  added: []
  patterns: [daisyui-details-dropdown, responsive-md-visibility]
key-files:
  created: []
  modified:
    - src/data/headerNavLinks.js
    - src/components/LayoutWrapper.tsx
    - src/components/SideNav.tsx
    - src/components/portfolio/BooksSection.tsx
decisions:
  - "Used daisyUI <details className='dropdown'> for left-nav groups (native, no JS state)"
  - "md:hidden on SideNav outer wrapper hides trigger + drawer + backdrop together on desktop"
metrics:
  duration: ~6m
  completed: 2026-07-11
---

# Phase quick-260711-j0r Plan 1: GH#275 Header Left Nav Summary

daisyUI `<details>` dropdowns ("Start learning", "Community Engagements") added to the LEFT of the top header on desktop; hamburger/SideNav hidden on desktop; home book-card CTA fallback unified to "Get your copy".

## What Was Built

- **Task 1** — Added `START_LEARNING_LINKS` (Books, Courses, Roadmap, Challenges, Logic Buddy, Projects, Blog) and `COMMUNITY_LINKS` (Mentorship, Ambassadors [flag-gated], Events, Discord) to `headerNavLinks.js`, reusing `AMBASSADORS_ENABLED` and `LINKS.DISCORD`. Existing exports untouched.
- **Task 2** — In `LayoutWrapper.tsx`, imported the two arrays and rendered two `btn btn-outline btn-sm` dropdowns after the logo inside `navbar-start` (now `gap-2`), desktop-only via `hidden md:inline-block`. In `SideNav.tsx`, added `md:hidden` to the outer `z-[100]` wrapper so the hamburger, drawer, and backdrop are all hidden on desktop and shown on mobile.
- **Task 3** — Changed `BooksSection.tsx` CTA fallback from "Get on Amazon" to "Get your copy", matching `/books` `BookCard`. Per-book `btnText` values untouched.

## Commits

| Task | Commit  | Message                                                                       |
| ---- | ------- | ----------------------------------------------------------------------------- |
| 1    | 15eeef0 | feat(header): add grouped Start learning + Community nav arrays (GH#275)      |
| 2    | 459a561 | feat(header): add left-side nav dropdowns, hide hamburger on desktop (GH#275) |
| 3    | 4cb82f7 | fix(books): make home book card CTA fallback 'Get your copy' (GH#275)         |

## Verification

- `npx tsc --noEmit` — passed (no output).
- `npm run build` — succeeded, all routes prerendered.
- Grep confirms both new exports, dropdown import/markup in LayoutWrapper, `md:hidden` in SideNav, and "Get your copy" fallback in BooksSection.

## Deviations from Plan

None — plan executed exactly as written. (The pre-commit lint hook reformatted BooksSection.tsx whitespace via prettier; behavior unchanged.)

## Self-Check: PASSED

- src/data/headerNavLinks.js — FOUND
- src/components/LayoutWrapper.tsx — FOUND
- src/components/SideNav.tsx — FOUND
- src/components/portfolio/BooksSection.tsx — FOUND
- Commits 15eeef0, 459a561, 4cb82f7 — FOUND
