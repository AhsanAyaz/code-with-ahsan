---
phase: tools-seo-indexability-uplift
created: 2026-05-29
trigger: GSC Coverage report 2026-05-28 — 44 indexed / 353 not-indexed; `Crawled - currently not indexed` trending up (57 → 66 in one week); 126/233 course posts have empty `description` frontmatter.
prior_work:
  - "PR #179: sitemap hygiene — dropped /resources + /submissions from sitemap, added noindex on both routes."
  - "PR #180: audit framework — added `npm run audit:seo` + docs/SEO_CONTENT_RUBRIC.md + Claude skill `seo-content-audit`."
---

# Phase: SEO Indexability Uplift

## Why

Two PRs landed the **structural** side (sitemap + tooling). This phase lands the **content + schema** side: the rich-result schema upgrade for 232 video posts, redundant-suffix cleanup in 8 ADK post titles, the course-level `Course` / `BreadcrumbList` schema, and the bulk description fills that the audit rubric flagged as the dominant FAIL criterion (126 posts).

All 4 plans below target the levers identified in the 2026-05-29 audit baseline (`summary.criteriaFails.description = 126`, `summary.criteriaFails.title = 82`, `summary.criteriaFails.schema (WARN) = 232 video posts`).

## Scope

| # | Plan | Type | Files / Posts | Wave |
|---|---|---|---|---|
| 01 | `VideoObject` JSON-LD on video posts | Code | 1 file, lifts all 232 video posts | 1 |
| 02 | `Course` + `BreadcrumbList` JSON-LD on course pages | Code | 2 files, 11 courses + 233 posts | 1 |
| 03 | Trim duplicated course suffix from 8 ADK post titles | Content | 8 mdx files | 2 |
| 04 | Bulk-fill empty post descriptions per course (×10 courses) | Content | ≤126 mdx files | 3 (one PR per course) |

Wave 1 (plans 01 + 02) is pure code — safe to ship in parallel, no content auth needed.
Wave 2 (plan 03) is content but tiny + clearly mechanical.
Wave 3 (plan 04) is content with editorial judgement — split into 10 sub-PRs, one per course, drafted from the YouTube video title/description and reviewed by the user before merge.

## Out of scope

- Adding transcripts to video posts (separate effort, requires YouTube API or manual work; not blocking indexing).
- Adding missing course banners (`design-patterns-javascript`, `js-beginners-series`) — handled as separate one-off commits.
- 404 / 5xx triage from GSC URL exports — separate phase pending fresh GSC export.

## Success criteria

1. `npm run audit:seo`: `summary.criteriaFails.description` drops from 126 → 0 (after plan 04 across all 10 courses).
2. `summary.criteriaFails.title` drops from 82 → at most 74 (after plan 03 closes the 8 ADK posts).
3. `summary.posts.warn` for `schema` check drops from 232 → 0 (after plan 01 emits VideoObject).
4. `/courses/[slug]` pages emit `Course` JSON-LD (validated via Google Rich Results Test).
5. GSC Coverage report 4 weeks after merge: `Crawled - currently not indexed` is flat or down, `Indexed` is up.

## Tracking

- Per-plan PR linked back in each `*-SUMMARY.md`.
- GSC re-validation requested in GSC UI after waves 1–2 merge.
- Re-baseline audit (`npm run audit:seo`) at end of each wave, store JSON in commit message.
