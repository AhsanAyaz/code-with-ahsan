---
phase: tools-seo-indexability-uplift
plan: 04
title: Bulk-fill empty post descriptions per course
type: execute
wave: 3
depends_on: [01, 02, 03]
autonomous: false   # HUMAN-REVIEW: each course's batch needs user approval on the drafted descriptions
files_modified:
  - src/content/courses/<course-slug>/posts/*.mdx   # per sub-PR
  - src/content/courses.generated.json
---

<objective>
Fill the empty `description:` frontmatter field on 126 posts identified by the audit. Description is the single highest-leverage SEO criterion in the rubric — `summary.criteriaFails.description = 126` is the dominant FAIL.

Ship as 10 sub-PRs (one per course) so each batch is reviewable in <5 min and a bad batch is independently revertible.
</objective>

<context>
Courses ordered by failing-post count (audit 2026-05-29):

| # | Course | Failing posts |
|---|---|---|
| 1 | `react-19-crash-course-for-beginners-2026-learn-in-90-minutes` | 23 |
| 2 | `angular-nestjs-fullstack-course` | 22 |
| 3 | `angular-in-90ish-minutes` | 20 |
| 4 | `react-redux-toolkit` | 15 |
| 5 | `mern-stack-crash-course` | 15 |
| 6 | `js-beginners-series` | 10 |
| 7 | `google-agent-development-kit-for-beginners` | 8 |
| 8 | `design-patterns-javascript` | 7 |
| 9 | `web-dev-basics` | 6 |
| 10 | `web-dev-bootcamp` | 6 |

Source signal for drafting each description:
- Post `title` (what the lesson is).
- Post `videoUrl` — YouTube video title is the strongest hint (fetch via oEmbed if needed: `https://www.youtube.com/oembed?url=<encoded videoUrl>&format=json`).
- Course `name` + `description` (topic + tech stack context).

Description rules:
- 120–160 chars (audit rubric pass threshold = 120).
- Lead with the outcome / topic, not "In this video".
- Mention the tech stack explicitly (React, Angular, NestJS, JavaScript, etc.).
- End with a benefit or scope hint when room allows.
- Quote-safe YAML (escape internal single quotes; use double-quoted YAML strings if needed).

Example:
```yaml
# Before
description: ''
# After
description: "Learn how to compose React 19 components with the new use() hook for async data, including loading states and error boundaries with Suspense."
```
</context>

<workflow>

For each course (in priority order above):

1. Read the course's mdx post files.
2. For each post with empty `description`, fetch YouTube oEmbed for the videoUrl (if API rate-limit tolerates) and draft a description.
3. Present the draft batch to the user as a markdown table (post slug → proposed description).
4. On user approval: apply edits via `Edit` tool, run `npm run audit:seo`, commit with message `chore(seo): fill descriptions for <course-slug> (N posts)`.
5. Open one PR per course. Don't bundle.

If oEmbed is rate-limited or returns non-200, fall back to inferring from the post title alone. Flag the post as "low-confidence" in the user-review table and let the user adjust.

</workflow>

<verification>

After all 10 sub-PRs merge:

1. `npm run audit:seo`: `summary.criteriaFails.description = 0`.
2. `summary.posts.fail` drops by ≥126.
3. GSC re-validation 4 weeks later: `Crawled - currently not indexed` is flat or down; `Indexed` is up.

</verification>

<notes>
This plan is the **only** non-autonomous one in the phase. The user must approve each course batch because:
- Descriptions are user-facing copy.
- AI-drafted descriptions need a quick human sanity-check for tone / accuracy (e.g. avoiding inventing a feature the video doesn't cover).
- One bad batch shouldn't block the others.

If the user prefers to draft descriptions themselves and just wants the script to flag empties, this plan converts to "report-only" — drop the autonomous=false flag and skip the drafting step.
</notes>
