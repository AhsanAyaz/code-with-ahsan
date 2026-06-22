---
quick_id: 260621-c9m
slug: vis-66-consolidate-community-page
date: 2026-06-21
issue: VIS-66 [GH#215]
---

# Quick Task: Consolidate to one community page

## Problem
Two community pages exist:
- `/` — the homepage, titled "Developer Community for Mentorship, Projects & Learning"
  (CommunityHero, PillarsGrid, CommunityStats, newsletter, FAQ). The canonical community landing.
- `/community` — the "Community Hub" (Discord channel directory + Get Involved + stats bar).

They overlap heavily (community stats, Discord CTA, Get Involved, FAQ). The reporter
asked to keep one to avoid complexity. The homepage cannot be redirected (site root),
so `/community` is the secondary that folds into the homepage.

## Change
- Add a permanent 301: `/community` → `/` in `next.config.ts`.
- Repoint the ~23 legacy newsletter/digest slugs that previously 301'd to `/community`
  so they target `/` directly (avoids a redirect chain). The homepage hosts the
  newsletter signup form, so it is the better destination anyway.
- Delete the dead route `src/app/community/page.tsx` and its only consumers
  `src/components/community/{CommunityGetInvolved,CommunityStatsBar}.tsx`.
- Remove the "Community Hub" entry from `MORE_LINKS` in `headerNavLinks.js`.
- Repoint user-facing `/community` links to the real community destination:
  - `Features.tsx` "Community" card → Discord invite.
  - `HomeFAQ.tsx`: add `id="faq"` to the FAQ section (the homepage now owns the FAQ),
    drop the self-referential "See all FAQs on the Community page" sub-link, and point
    the "Explore the Community" CTA → Discord invite.
- Remove `/community` from `sitemap.ts`.

## Acceptance Criteria
- [ ] One canonical community page exists (the homepage `/`).
- [ ] `/community` 301-redirects to `/`.
- [ ] No broken `/community` links remain in nav, footer, or page content.
- [ ] Legacy redirects no longer chain through `/community`.
- [ ] tsc + eslint clean (no new errors from this change).

## Source
https://github.com/AhsanAyaz/code-with-ahsan/issues/215
