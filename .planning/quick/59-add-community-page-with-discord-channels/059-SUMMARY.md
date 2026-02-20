---
phase: quick-059
plan: 01
subsystem: community
tags: [community, discord, faq, navigation, homepage]
dependency_graph:
  requires: []
  provides: [community-hub-page, home-faq-component]
  affects: [homepage, nav-desktop, nav-mobile, features-section]
tech_stack:
  added: []
  patterns: [daisy-ui-collapse-faq, daisy-ui-card-grid, server-component-static-data]
key_files:
  created:
    - src/app/community/page.tsx
    - src/components/HomeFAQ.tsx
  modified:
    - src/app/page.tsx
    - src/data/headerNavLinks.js
    - src/components/LayoutWrapper.tsx
    - src/components/MobileNav.tsx
    - src/components/Features.tsx
decisions:
  - Static hardcoded data arrays for channel categories and FAQs (no external fetch needed)
  - Server component for /community page (no interactivity required at page level)
  - Client component for HomeFAQ (follows existing homepage component pattern)
  - DaisyUI collapse/radio pattern for FAQ accordions (consistent with community page)
metrics:
  duration: 148s
  completed: 2026-02-20
  tasks: 3
  files: 7
---

# Phase quick-059: Add Community Page with Discord Channels Summary

**One-liner:** Community hub page with 8 Discord channel category cards, dual FAQ accordions (8-item on /community, 5-item on homepage), and nav/Features card wired to /community.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Revamp /community page into a community hub | 4810b44 | src/app/community/page.tsx |
| 2 | Add HomeFAQ section to homepage | a108ede | src/components/HomeFAQ.tsx, src/app/page.tsx |
| 3 | Update nav links and Features card | 44bd2bc | src/data/headerNavLinks.js, src/components/LayoutWrapper.tsx, src/components/MobileNav.tsx, src/components/Features.tsx |

## What Was Built

### Task 1: /community page revamp
- Replaced old `getAllPeople` people-listing page with a full community hub
- **Hero section:** "Join the CodeWithAhsan Community" heading, sub-copy about 3,000+ developers, two CTAs (Join Discord external + Browse Channels anchor scroll)
- **Discord Channels section (id="channels"):** Responsive 3-column grid of 8 channel category cards, each showing emoji, name, description, channel list with # prefix, and "Join Channel" btn. Zero to Website card also has a secondary "Visit Z2W" link.
- **FAQ section (id="faq"):** 8-item DaisyUI collapse accordion with radio input pattern so only one item expands at a time.

### Task 2: HomeFAQ component
- Created `src/components/HomeFAQ.tsx` as a `"use client"` component
- Shows 5 FAQs (questions 1, 2, 3, 4, 8: community overview, free join, channels, mentorship, Logic Buddy)
- Heading row has "Got Questions?" + "See all FAQs" link to `/community#faq`
- "Explore the Community" CTA button at the bottom linking to `/community`
- Inserted between `<Features />` and Newsletter section in `src/app/page.tsx`

### Task 3: Nav and Features card updates
- Added `{ href: "/community", title: "Community Hub", icon: "community" }` to `COMMUNITY_LINKS` at index 3 (between Roadmaps and Discord)
- Added `🏘️` icon rendering for `icon === "community"` in both LayoutWrapper (desktop) and MobileNav (mobile)
- Changed Features.tsx Community card `href` from `"https://discord.gg/KSPpuxD8SG"` to `"/community"`

## Verification

- `npx tsc --noEmit` — zero errors (verified after each task)
- `npx next build` — build succeeded, /community rendered as static page
- COMMUNITY_LINKS array: Mentorship, Projects, Roadmaps, Community Hub, Discord, Logic Buddy
- Discord entry still present with external flag pointing to discord.gg

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

Files verified:
- [x] `src/app/community/page.tsx` — exists, contains hero + 8 channel cards + 8 FAQ items
- [x] `src/components/HomeFAQ.tsx` — exists, 5 FAQ items + CTA
- [x] `src/app/page.tsx` — HomeFAQ imported and inserted between Features and Newsletter
- [x] `src/data/headerNavLinks.js` — Community Hub entry at index 3
- [x] `src/components/LayoutWrapper.tsx` — community icon rendered
- [x] `src/components/MobileNav.tsx` — community icon rendered
- [x] `src/components/Features.tsx` — href changed to /community

Commits verified:
- [x] 4810b44 — Task 1
- [x] a108ede — Task 2
- [x] 44bd2bc — Task 3

## Self-Check: PASSED
