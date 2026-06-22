---
quick_id: 260621-u7a
slug: vis-65-remove-ambassador-link-from-foote
date: 2026-06-21
issue: VIS-65 [GH#212]
status: complete
---

# Summary: Remove Ambassador link from footer

## What changed
Removed the feature-flagged Ambassadors `<Link>` block from
`src/components/Footer.tsx`. The link was a duplicate of the navbar entry.

## Files modified
- `src/components/Footer.tsx` — deleted the `NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM`
  conditional `/ambassadors` link (5 lines).

## Acceptance Criteria
- [x] Footer no longer contains an Ambassador link
- [x] All other footer links (Rates, Privacy Policy, Terms of Service) remain intact
- [x] `npx biome check src/components/Footer.tsx` passes

## Verification
`npx biome check src/components/Footer.tsx` → clean (no output).
`Link` import still used by remaining footer links.
