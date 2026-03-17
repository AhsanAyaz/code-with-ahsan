---
phase: quick-73
plan: "01"
subsystem: rates-page
tags: [rates, ui, redesign, marketing, sponsorship]
dependency_graph:
  requires: []
  provides: [rates-page-redesign]
  affects: [src/app/rates/RatesClient.tsx, src/content/rates.json]
tech_stack:
  added: []
  patterns: [JSX data constants, conditional Tailwind classes, fixed positioning for floating CTAs]
key_files:
  created: []
  modified:
    - src/app/rates/RatesClient.tsx
    - src/content/rates.json
decisions:
  - "License note placed above Usage Rights heading in markdown rather than as a JSX section, keeping the article self-contained"
  - "Facebook section fully removed per plan; TikTok retained"
  - "Package data declared as typed constants at file top, not fetched from JSON, for easy maintenance"
metrics:
  duration: "~3 minutes"
  completed: "2026-03-18"
  tasks_completed: 2
  files_modified: 2
---

# Phase quick-73 Plan 01: Rates Page Redesign Summary

**One-liner:** Redesigned /rates as a sponsorship pitch deck with hero, credential pills, stat grid, three featured package cards, cleaned a la carte markdown, closing CTA block, and persistent floating Book-a-call button.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Clean rates.json article content | 753b948 | src/content/rates.json |
| 2 | Rewrite RatesClient.tsx with full redesigned layout | 96fb4c7 | src/app/rates/RatesClient.tsx |

## What Was Built

**rates.json changes:**
- Removed opening 12-month license paragraph (it now appears in markdown above Usage Rights instead)
- Renamed all platform headings to "A la carte — [Platform]" format
- Deleted all package subsections from markdown (YouTube Packages, Instagram Packages, LinkedIn Packages)
- Removed entire Facebook section
- Stripped repeated 12-year veteran credential sentences from YouTube item descriptions
- Added "Additional platforms available on request." line before Usage Rights
- Added 12-month license note immediately above the Usage Rights heading

**RatesClient.tsx changes:**
- Hero section: "Reach 170,000+ developers who build for a living" headline with audience subheading
- Credential pills: GDE status, 4 books, 13M+ installs, 50+ talks, flat fee note
- 4-stat grid: YouTube 34k+, Instagram 64k+, Discord 4,400+, Newsletter 2,100+
- Three featured package cards: Awareness ($1,850), Growth ($4,000 / "Most popular"), Authority ($5,500)
- Cleaned a la carte markdown rendered via LegitMarkdown
- Closing CTA section with "Send a brief" mailto and "Book a call" calendar link
- Floating vertical "Book a call" button on desktop (lg:flex fixed right-6)
- Fixed bottom bar with "Book a call" on mobile (lg:hidden fixed bottom-0)

## Verification

- `npx tsc --noEmit`: No errors
- `npm run build`: Build succeeded, /rates rendered as static route
- rates.json spot-check: No Facebook, no credential blocks, all a la carte headings renamed, license note above Usage Rights
- RatesClient.tsx spot-check: FEATURED_PACKAGES, STATS, CREDENTIAL_PILLS constants present; two CTA buttons; floating desktop button (`lg:flex fixed`); mobile bottom bar (`lg:hidden fixed bottom-0`)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- src/app/rates/RatesClient.tsx: FOUND
- src/content/rates.json: FOUND
- Commit 753b948: FOUND
- Commit 96fb4c7: FOUND
