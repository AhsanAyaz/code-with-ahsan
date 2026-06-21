---
quick_id: 260621-c9m
slug: vis-66-consolidate-community-page
date: 2026-06-21
issue: VIS-66 [GH#215]
status: complete
---

# Summary: Consolidate to one community page

## What changed
Folded the `/community` "Community Hub" into the homepage `/` (the canonical
community landing) and 301-redirected the secondary URL.

## Files modified
- `next.config.ts` — added `{ source: "/community", destination: "/", permanent: true }`;
  repointed the ~23 legacy newsletter/digest slugs that previously targeted `/community`
  to `/` (no redirect chain); refreshed stale "→ /community" group comments.
- `src/app/community/page.tsx` — deleted (route now redirected).
- `src/components/community/CommunityGetInvolved.tsx`,
  `src/components/community/CommunityStatsBar.tsx` — deleted (only consumed by the route).
- `src/data/headerNavLinks.js` — removed the "Community Hub" entry from `MORE_LINKS`.
- `src/components/Features.tsx` — "Community" card href `/community` → Discord invite.
- `src/components/HomeFAQ.tsx` — added `id="faq"` to the FAQ section, removed the
  self-referential "Community page" sub-link, repointed the "Explore the Community"
  CTA → Discord invite.
- `src/app/sitemap.ts` — removed `/community`.

## Acceptance Criteria
- [x] One canonical community page exists (homepage `/`).
- [x] `/community` 301-redirects to `/`.
- [x] No broken `/community` links remain in nav, footer, or page content
  (`grep -rn "/community" src` → none).
- [x] Legacy redirects no longer chain through `/community`.
- [x] tsc clean for source (remaining tsc errors are stale `.next/` generated
  validator types that regenerate on the next build); eslint introduced no new errors.

## Notes
- Pre-existing eslint warning in `Features.tsx` (`//` text node in the "Expertise"
  heading) is unrelated to this change and was left untouched.
- The Discord channel directory that lived on `/community` was intentionally dropped
  per the reporter's "avoid complexity" ask; the homepage CommunityHero already drives
  users to Discord. Recoverable via git history if it should return.

## Verification
- `grep -rn "/community" src` → no matches.
- `npx tsc --noEmit` → only stale `.next/**/validator.ts` references to the deleted
  page (regenerated on build); no source errors.
