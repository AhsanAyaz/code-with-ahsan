---
phase: quick-061
plan: 01
subsystem: seo
tags: [seo, robots, sitemap, metadata, next.js, google-search-console]
dependency_graph:
  requires: []
  provides: [SEO-01]
  affects: [public/robots.txt, public/sitemap.xml, src/app/layout.tsx, src/app/admin/layout.tsx, src/app/profile/layout.tsx]
tech_stack:
  added: []
  patterns: [Next.js metadataBase, robots metadata directive, XML sitemap]
key_files:
  created:
    - src/app/mentorship/dashboard/layout.tsx
  modified:
    - src/app/layout.tsx
    - public/robots.txt
    - public/sitemap.xml
    - src/app/admin/layout.tsx
    - src/app/profile/layout.tsx
    - src/app/mentorship/book/[mentorId]/layout.tsx
decisions:
  - "Create separate server layout for mentorship/dashboard to export noindex metadata (client component cannot export metadata)"
  - "Add metadataBase to root layout so Next.js resolves all relative OG and canonical URLs correctly"
  - "Use 16 disallow rules in robots.txt for comprehensive auth-route blocking"
metrics:
  duration: 5 min
  completed: 2026-02-23
  tasks_completed: 2
  files_modified: 7
  files_created: 1
---

# Quick Task 61: Fix SEO Indexing Issues (Google Search Console) Summary

**One-liner:** Fixed 346-vs-30 Google indexing problem by adding metadataBase, comprehensive robots.txt blocking 16 auth routes, noindex on 4 auth-only layouts, and cleaned sitemap to remove 15 auth-gated URLs while adding /events page with lastmod/priority metadata.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix root metadata, robots.txt, noindex on auth layouts | 0dd79a9 | src/app/layout.tsx, public/robots.txt, src/app/admin/layout.tsx, src/app/profile/layout.tsx, src/app/mentorship/book/[mentorId]/layout.tsx, src/app/mentorship/dashboard/layout.tsx (new) |
| 2 | Clean sitemap to remove auth pages, add /events | b8b8129 | public/sitemap.xml |

## Changes Made

### Task 1: Metadata, robots.txt, noindex

**Root layout (`src/app/layout.tsx`):**
- Added `metadataBase: new URL('https://codewithahsan.dev')` — critical fix so Next.js can resolve relative OG image URLs and canonical tags
- Added `alternates: { canonical: '/' }` for root page canonical
- Added `openGraph` defaults: siteName, type, locale, url
- Added `robots: { index: true, follow: true }` as inheritable default

**robots.txt (`public/robots.txt`):**
- Replaced minimal 3-line file with comprehensive 16-rule file
- Blocks: /api/, /admin/, /mentorship/dashboard/, /mentorship/requests, /mentorship/goals, /mentorship/my-matches, /mentorship/onboarding, /mentorship/book/, /mentorship/admin, /projects/my, /projects/new, /projects/*/edit, /roadmaps/my, /roadmaps/new, /roadmaps/*/edit, /profile

**Auth-only layouts (noindex added):**
- `src/app/admin/layout.tsx` — added `robots: { index: false, follow: false }`
- `src/app/profile/layout.tsx` — added `robots: { index: false, follow: false }`
- `src/app/mentorship/book/[mentorId]/layout.tsx` — added `robots: { index: false, follow: false }`
- `src/app/mentorship/dashboard/layout.tsx` (NEW) — server component wrapper with `robots: { index: false, follow: false }` (required because `[matchId]/layout.tsx` is a client component and cannot export metadata)

### Task 2: Sitemap cleanup

**Removed from sitemap (~15 auth-gated URLs):**
- `/admin` and all `/admin/*` sub-pages (pending, mentors, mentees, projects, roadmaps)
- `/mentorship/admin`, `/mentorship/dashboard`, `/mentorship/goals`, `/mentorship/my-matches`, `/mentorship/requests`, `/mentorship/onboarding`
- `/profile`
- `/projects/my`, `/projects/new`
- `/roadmaps/my`, `/roadmaps/new`

**Added to sitemap:**
- `/events` (recently created events listing page, was missing)

**Format improvements:**
- Fixed all malformed multi-line `<loc>` tags (URLs now on single lines)
- Added `<lastmod>2026-02-23` to all 249 URLs
- Added `<changefreq>`: weekly (homepage/courses/events), monthly (static pages), yearly (individual lessons)
- Added `<priority>`: 1.0 (homepage), 0.8 (main sections), 0.6 (sub-pages), 0.4 (lessons)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Created new server layout for mentorship dashboard noindex**

- **Found during:** Task 1
- **Issue:** `src/app/mentorship/dashboard/[matchId]/layout.tsx` is a `"use client"` component. React/Next.js does not allow exporting `metadata` from client components.
- **Fix:** Created new `src/app/mentorship/dashboard/layout.tsx` as a server component that exports the noindex metadata. This wraps the `[matchId]` layout segment and propagates the noindex directive to all dashboard routes.
- **Files modified:** `src/app/mentorship/dashboard/layout.tsx` (new file)
- **Commit:** 0dd79a9

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | PASS |
| XML valid | `xmllint --noout public/sitemap.xml` | PASS (XML valid) |
| No auth pages in sitemap | `grep -cE '/(admin|profile|...)' public/sitemap.xml` | 0 matches |
| metadataBase set | `grep metadataBase src/app/layout.tsx` | FOUND |
| noindex in admin+profile | `grep 'index.*false' admin/layout.tsx profile/layout.tsx` | FOUND in both |
| Disallow count | `grep -c 'disallow' public/robots.txt` | 16 (required 13+) |

## Self-Check: PASSED

All created/modified files verified to exist and contain expected content. Both commits confirmed in git log.
