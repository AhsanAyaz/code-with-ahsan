---
phase: quick-69
plan: "01"
subsystem: promptathon-2026
tags: [ui, sponsors, promptathon]
dependency_graph:
  requires: []
  provides: [sponsor-card-name-and-tier-color]
  affects: [CurrentSponsorsSection]
tech_stack:
  added: []
  patterns: [tier-color-map, inline-helper-function]
key_files:
  modified:
    - src/app/events/cwa-promptathon/2026/components/CurrentSponsorsSection.tsx
decisions:
  - "Used module-level TIER_COLORS const map with getTierColor helper rather than inline ternary chain for readability and extensibility"
metrics:
  duration: "~5 minutes"
  completed: "2026-03-07"
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-69 Plan 01: Update Promptathon Sponsor Cards Summary

**One-liner:** Sponsor cards now display sponsor name in white text and a tier-colored label (Tool Partner=green, Gold=warning-yellow, Platinum=yellow-300, Community Partner=primary).

## What Was Built

Updated `CurrentSponsorsSection.tsx` to render three stacked items per confirmed sponsor card:

1. Sponsor logo (squircle mask, unchanged)
2. Sponsor name — `text-[11px] font-bold text-white mt-1 leading-tight`
3. Tier label — `text-[10px] font-semibold` with color from `getTierColor(sponsor.tier)`

Added a `TIER_COLORS` lookup map and `getTierColor` helper at the module level, covering all tier variants ("Tool Partner", "Gold", "Gold Sponsor", "Platinum", "Platinum Sponsor", "Community Partner").

Removed `mb-2` from the Image className since name and tier labels are now stacked below the logo within the fixed `h-28` card.

Placeholder cards (`SPONSOR_PLACEHOLDERS`) are unchanged.

## Tasks

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Add sponsor name and tier-color label to confirmed sponsor cards | 23f0fe4 | Done |

## Verification

- TypeScript compiles with no errors in the changed file
- Placeholder cards retain their existing structure
- Visit `/events/cwa-promptathon/2026` — CommandCode card shows: squircle logo, "CommandCode" in white, "Tool Partner" in green (`text-success`)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- File exists: `src/app/events/cwa-promptathon/2026/components/CurrentSponsorsSection.tsx` — FOUND
- Commit 23f0fe4 — FOUND
