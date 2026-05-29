---
phase: tools-seo-indexability-uplift
plan: "03"
title: Trim duplicated course suffix from Google ADK post titles
wave: 2
status: shipped
shipped_at: 2026-05-29
pr: 182
commit: 94fcfd4
metrics:
  title_fails_before: 82
  title_fails_after: 74
  posts_fixed: 8
  course_name_chars_before: 79
  course_name_chars_after: 42
---

# Plan 03 — Trim ADK post titles for SERP

**Shipped:** PR [#182](https://github.com/AhsanAyaz/code-with-ahsan/pull/182).

## Problem

Course `name` and chapter `name` carried the full post-1 title ("Building your first AI Agent - Google Agent Development Kit for Beginners (Part 1)"). Page metadata then appended ` - <course name>` again, producing 167–183 char effective SERP titles that Google truncated with visible duplication ~70 chars in.

## What landed

- Course `name`: → "Google Agent Development Kit for Beginners" (42 chars)
- 8 post titles trimmed to ≤25 chars each:
  - `First AI Agent (Part 1)`
  - `Function Calling (Part 2)`
  - `Sessions & State (Part 5)`
  - …and 5 more
- `src/content/courses.generated.json` regenerated.

## Metric impact

| Metric | Before | After |
|---|---|---|
| `criteriaFails.title` | 82 | 74 |
| ADK effective SERP titles | 167–183 chars | 60–67 chars (PASS) |

74 remaining title FAILs are out of plan scope (react-19 + web-dev-basics — separate phase candidate).

## Deviations

None.
