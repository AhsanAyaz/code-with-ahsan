---
phase: tools-seo-indexability-uplift
plan: "02"
title: Course + BreadcrumbList JSON-LD
wave: 1
status: shipped
shipped_at: 2026-05-29
pr: 181
commit: e13fcc2
metrics:
  course_pages_with_course_ld: 11
  pages_with_breadcrumb_ld: 244
  files_changed: 6
  insertions: 219
  deletions: 15
---

# Plan 02 — Course + BreadcrumbList JSON-LD

**Shipped:** PR [#181](https://github.com/AhsanAyaz/code-with-ahsan/pull/181) (Wave 1 — combined with Plan 01).

## What landed

- `src/lib/seo/courseSchema.ts` — extracts Course schema builder (refactor of inline emission on course page); adds `hasCourseInstance` with `courseMode: "online"`.
- `src/lib/seo/breadcrumbSchema.ts` — `buildBreadcrumbLd` helper.
- `src/app/courses/[course]/page.tsx` — Course JSON-LD on 11 course pages; 3-item breadcrumb (Home → Courses → Course).
- `src/app/courses/[course]/[post]/page.tsx` — 4-item breadcrumb (Home → Courses → Course → Post) on 233 post pages.
- Tests: 6 `courseSchema` + 3 `breadcrumbSchema` — all pass.

## Coverage

| Schema | Pages emitting |
|---|---|
| `Course` JSON-LD | 11 (all `/courses/[slug]` pages) |
| `BreadcrumbList` JSON-LD | 244 (11 course pages + 233 post pages) |

## Verification

- Vitest: 9/9 pass (6 course + 3 breadcrumb)
- Audit: course pages no longer lack site-hierarchy markup; ready for Google Rich Results Test validation.

## Deviations

None.
