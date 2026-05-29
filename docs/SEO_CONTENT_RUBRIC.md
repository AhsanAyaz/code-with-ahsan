# SEO Content Rubric

How we grade course + post quality for search indexing. Every new course or post must clear this bar before merge.

## Quick check

```bash
npm run audit:seo            # human-readable summary + bottom-15 weakest posts
npm run audit:seo -- --top 30
npm run audit:seo -- --warn-as-fail   # exits non-zero on WARN
npm run audit:seo:json       # only print path to JSON report
```

Output: `.seo-audit/audit-<YYYY-MM-DD>.json` (gitignored).

The script reads `src/content/courses.generated.json` and the underlying `.mdx` files. Run `npm run content:build` first (the `audit:seo` script does this for you).

## Rubric

### Course (`src/content/courses/<slug>/course.mdx`)

| Check | Pass | Warn | Fail |
|---|---|---|---|
| `name` length | 25–70 chars | 15–80 | other |
| `description` length | ≥ 200 | ≥ 100 | < 100 |
| `banner.url` | present | — | missing |
| `chapters` count | ≥ 1 | — | 0 |

### Post (`src/content/courses/<slug>/posts/*.mdx`)

| Check | Pass | Warn | Fail |
|---|---|---|---|
| **effective SERP title** (`<title> - <course name>`) | 25–70 chars | 15–80 | other |
| `description` | ≥ 120 chars | ≥ 60 | < 60 |
| body word count *(article posts only)* | ≥ 150 | ≥ 50 | < 50 |
| body for video posts | ≥ 50 word summary/transcript | empty | (never fails) |
| media | thumbnail set | videoUrl only | neither |
| schema (page output) | `Article` (article) OR `Article + VideoObject` (video w/ description + YouTube URL) | video w/ empty description or non-YouTube videoUrl (VideoObject suppressed) | — |
| `publishedAt` | present | — | missing |

Score = pass(2) + warn(1) + fail(0). 6 checks × 2 = max 12 per post.

## Author checklist

When adding a new post, fill in the frontmatter:

```yaml
---
slug: my-post-slug
title: A clear, specific lesson title          # 25–70 chars when joined with course name
description: A 1–2 sentence summary of what the learner will achieve. Include the topic + the tech stack so it can rank for long-tail queries. # ≥ 120 chars
type: video                                    # or "article"
videoUrl: https://www.youtube.com/watch?v=...
thumbnail: https://res.cloudinary.com/.../thumb.jpg   # OG image. Sitemap + OG card needs this.
publishedAt: '2026-05-29T00:00:00.000Z'
chapterId: 123
chapterOrder: 4
order: 7
---

A short written summary or transcript (≥ 50 words) lifts a video post out of "Crawled - currently not indexed" because the page is no longer an empty shell to crawlers. Even 2-3 bullet points of what the video covers helps.
```

For a course (`course.mdx`), fill:

- `name`
- `description` (≥ 200 chars)
- `banner.url`
- `chapters` array with ordered chapter objects

## Known systemic gaps (2026-05-29 snapshot)

- **126 / 233 posts have empty `description`** — biggest indexing lever.
- ~~**232 / 233 posts are `type: video`** but page emits `Article` JSON-LD only — should emit `VideoObject` for video rich results.~~ ✅ **Closed by Plan 01 (2026-05-29)** — `/courses/[slug]/[post]` now emits `VideoObject` alongside `Article` whenever post type is video, videoUrl is a YouTube URL, and description is non-empty. Posts with empty description still suppress VideoObject until Plan 04 fills them.
- **8 Google ADK posts** carry full course suffix in the post title (`... - Google Agent Development Kit for Beginners Part N`), then the page metadata appends ` - <course name>` again → 160+ char SERP title. Strip the redundant suffix from `title:` in the mdx frontmatter.
- **2 courses missing `banner.url`** (`design-patterns-javascript`, `js-beginners-series`).
- **3 courses missing/short `description`** (`angular-in-90ish-minutes`, `react-redux-toolkit`, `angular-nestjs-fullstack-course`).

Track follow-ups via `npm run audit:seo` over time — score should trend up.

## Why these thresholds

- **Description ≥ 120**: Google truncates SERP meta descriptions ~155–160 chars on desktop. < 60 = essentially missing.
- **SERP title 25–70**: < 30 chars under-uses pixel width; > 70 truncates with ellipsis.
- **Body ≥ 150 words (article)**: Empirical floor below which "Crawled - currently not indexed" hits.
- **Video summary ≥ 50 words**: Minimum to give crawlers something to read; can be a bulleted topic list.
- **Schema**: `VideoObject` lets Google show video rich results (thumbnail, duration in SERP).

## When to update the rubric

Bump thresholds upward (never downward) as content quality improves. Keep `audit:seo` exit code in CI advisory only — do not block PRs on it yet (too many existing failures). Switch to blocking once `summary.posts.fail === 0`.
