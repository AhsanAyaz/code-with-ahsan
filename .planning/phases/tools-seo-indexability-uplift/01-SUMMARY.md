---
phase: tools-seo-indexability-uplift
plan: "01"
title: VideoObject JSON-LD on video posts
wave: 1
status: shipped
shipped_at: 2026-05-29
pr: 181
commit: a10ac45
metrics:
  schema_warns_before: 232
  schema_warns_after: 0
  posts_lifted: 232
  files_changed: 6
  insertions: 266
  deletions: 13
---

# Plan 01 — VideoObject JSON-LD on video posts

**Shipped:** PR [#181](https://github.com/AhsanAyaz/code-with-ahsan/pull/181) (Wave 1 — combined with Plan 02).

## What landed

- `src/lib/seo/videoSchema.ts` — `extractYouTubeId` (covers `watch?v=`, `youtu.be`, `/embed/`, `/shorts/`, `&t=` / `&list=` / `?si=` suffixes); `buildVideoObjectLd` returns `null` when description or YouTube ID missing.
- `src/app/courses/[course]/[post]/page.tsx` — emits a second JSON-LD `<script>` block when `type: video` AND `description` non-empty AND `videoUrl` is YouTube. Existing `Article` block untouched.
- `src/__tests__/lib/seo/videoSchema.test.ts` — 18 vitest cases covering ID parsing edge cases + suppression rules.
- `scripts/content/audit-seo.js` — `checkSchema` reflects new emit contract (PASS when both schemas land, WARN when description/videoUrl gate suppresses VideoObject).
- `docs/SEO_CONTENT_RUBRIC.md` — strikethrough closed item.

## Metric impact

| Metric | Before | After |
|---|---|---|
| `schema` WARN posts | 232 | 0 |

Every video post that has a description now emits both `Article` + `VideoObject` JSON-LD. Posts with empty descriptions still emit only `Article` (suppression by design; Plan 04 backfilled descriptions for all 126 empty cases so all 232 video posts now emit both blocks).

## Verification

- Vitest: 18/18 pass
- Manual: `curl /courses/google-agent-development-kit-for-beginners/<post>` returned 2 JSON-LD blocks; `curl /courses/web-dev-bootcamp/web-development-bootcamp-day-1-5` (description was empty at time of test) returned 1 block — suppression working.

## Deviations

None.
