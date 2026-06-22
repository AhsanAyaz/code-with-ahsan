---
quick_id: 260621-u7a
slug: vis-65-remove-ambassador-link-from-foote
date: 2026-06-21
issue: VIS-65 [GH#212]
---

# Quick Task: Remove Ambassador link from footer

## Problem
The Ambassador page link is duplicated — it already exists in the navbar, and
`src/components/Footer.tsx` renders a second `/ambassadors` link in the footer nav.

## Change
Remove the feature-flagged Ambassadors `<Link>` block (Footer.tsx lines 24-28).
Leave the surrounding `<nav>` and the Rates / Privacy Policy / Terms of Service
links untouched.

## Acceptance Criteria
- [ ] Footer no longer contains an Ambassador link
- [ ] All other footer links (Rates, Privacy Policy, Terms of Service) remain intact
- [ ] `npm run check` passes (Biome)

## Source
https://github.com/AhsanAyaz/code-with-ahsan/issues/212
