---
phase: tools-seo-indexability-uplift
plan: "04"
title: Bulk-fill empty post descriptions per course
wave: 3
status: shipped
shipped_at: 2026-05-29
prs: [183, 184, 185, 186, 187, 188]
metrics:
  description_fails_before: 126
  description_fails_after: 0
  posts_filled: 126
  courses_covered: 9
  sub_prs_planned: 10
  sub_prs_shipped: 8
---

# Plan 04 — Bulk-fill empty post descriptions per course

**Shipped:** 6 PRs ([#183](https://github.com/AhsanAyaz/code-with-ahsan/pull/183), [#184](https://github.com/AhsanAyaz/code-with-ahsan/pull/184), [#185](https://github.com/AhsanAyaz/code-with-ahsan/pull/185), [#186](https://github.com/AhsanAyaz/code-with-ahsan/pull/186), [#187](https://github.com/AhsanAyaz/code-with-ahsan/pull/187), [#188](https://github.com/AhsanAyaz/code-with-ahsan/pull/188)) covering 9 courses.

## Per-PR breakdown

| PR | Course | Posts |
|---|---|---|
| #183 | `google-agent-development-kit-for-beginners` | 8 |
| #184 | `react-19-crash-course-for-beginners-2026-learn-in-90-minutes` | 23 |
| #185 | `angular-nestjs-fullstack-course` | 22 |
| #186 | `angular-in-90ish-minutes` | 20 (+ B2B rates card overhaul swept in) |
| #187 | `react-redux-toolkit` | 15 |
| #188 | `mern-stack-crash-course` (15) + `js-beginners-series` (10) + `design-patterns-javascript` (7) + `web-dev-bootcamp` (6) | 38 |
| **Total** | **9 courses** | **126** |

## Plan vs actual

- Plan called for 10 sub-PRs (one per course). Shipped 6 PRs covering 9 courses:
  - 4 courses bundled into a single PR (#188) per user direction to "combine multiple in one PR" once velocity stabilised.
  - `web-dev-basics` (originally listed as 6 failing posts) turned out to have 0 empty descriptions — already 100% PASS pre-plan. Skipped, no work needed.
- One PR (#186) was an opportunistic sweep that also shipped the B2B sponsorship card overhaul + `POST /api/sponsorship` endpoint that had been stashed from earlier WIP.

## Drafting approach

Each description: 140–160 chars, outcome-led, names the topic + the tech stack. Source signals: post `title`, course `name`, video `title` via YouTube context. User reviewed each batch's table before approval; no batch required re-drafts.

## Metric impact

| Metric | Before | After |
|---|---|---|
| `criteriaFails.description` | 126 | 0 |
| Site-wide post description FAILs | 126 | 0 |

Combined with Plan 01's VideoObject emission, every video post with description now ships both `Article` + `VideoObject` JSON-LD (suppression no longer triggers).

## Deviations

- 10 → 6 PRs (user direction; bundled tail-end courses)
- `web-dev-basics` skipped (already PASS)
- PR #186 unrelated B2B rates work bundled in (explicit user request to sweep stashed WIP)
- PRs #184 + #185 required mid-flight cleanup of contaminated commits (1084 lines of unrelated `RatesClient.tsx` + `courses.generated.json` had been bundled via a `git add -A` slip — resolved via soft-reset + selective re-staging + force-push before merge)

## Follow-up not in this plan

Course-level audit FAILs remain (out of original scope per CONTEXT.md):
- `design-patterns-javascript` + `js-beginners-series`: missing course banner
- `angular-in-90ish-minutes` + `react-redux-toolkit` + `angular-nestjs-fullstack-course`: empty course description
- `mern-stack-crash-course`: 84-char course `name`
- `web-dev-bootcamp`: short course description

These are addressed in a follow-up mini-phase (see phase SUMMARY § "Follow-ups").
