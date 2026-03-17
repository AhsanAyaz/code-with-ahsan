---
phase: 72-update-rates-card
plan: "01"
subsystem: content
tags: [rates, content, footer, pricing]
dependency_graph:
  requires: []
  provides: [updated-rate-card, rates-footer-link]
  affects: [rates-page, footer]
tech_stack:
  added: []
  patterns: [json-content-update]
key_files:
  created: []
  modified:
    - src/content/rates.json
    - src/components/Footer.tsx
decisions:
  - Inserted Newsletter & Community section between TikTok and Usage Rights as specified
  - Rates footer link placed before Privacy Policy
metrics:
  duration: "~5 minutes"
  completed: "2026-03-17T22:51:22Z"
  tasks_completed: 2
  tasks_total: 2
  commits: 2
  files_changed: 2
---

# Phase 72 Plan 01: Update Rate Card Summary

**One-liner:** Updated rates.json with revised subscriber counts (YouTube 34k+, Instagram 64k+, LinkedIn 23k+, Facebook 53k+), new prices (YouTube Short $900, Mention $1,200, TikTok $700), added Scale Package ($5,500), new Newsletter & Community section, and added /rates link to footer.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Apply all rate card updates to rates.json | 1171b37 | src/content/rates.json |
| 2 | Add Rates link to Footer | 29767f8 | src/components/Footer.tsx |

## Changes Summary

### rates.json

- YouTube heading: 33k+ → 34k+ subscribers
- YouTube body text: all references updated to 34,700+
- YouTube Short price: $800 → $900
- YouTube Mention/Integration price: $1,100 → $1,200
- YouTube Packages: Starter $2,800 → $2,900, Max Visibility $3,400 → $3,600 (Save $300)
- New Scale Package added: 3 Full Videos $5,500 (Save $1,100)
- Instagram: 62k+ → 64k+ followers
- LinkedIn: 22k+ → 23k+ followers
- Facebook: 52k+ → 53k+ followers
- TikTok Video: $400 → $700
- New Newsletter & Community section inserted between TikTok and Usage Rights sections

### Footer.tsx

- Added `<Link href="/rates">Rates</Link>` before Privacy Policy link in footer nav

## Verification

All 17 automated checks passed. JSON parses without error.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- `src/content/rates.json` — exists and modified
- `src/components/Footer.tsx` — exists and modified
- Commit `1171b37` — exists
- Commit `29767f8` — exists
