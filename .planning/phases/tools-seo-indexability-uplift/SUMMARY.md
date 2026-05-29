---
phase: tools-seo-indexability-uplift
status: shipped
opened: 2026-05-29
shipped: 2026-05-29
plans:
  - { id: "01", title: "VideoObject JSON-LD", pr: 181, status: shipped }
  - { id: "02", title: "Course + BreadcrumbList JSON-LD", pr: 181, status: shipped }
  - { id: "03", title: "Trim ADK post titles", pr: 182, status: shipped }
  - { id: "04", title: "Bulk-fill post descriptions", prs: [183, 184, 185, 186, 187, 188], status: shipped }
prs: [181, 182, 183, 184, 185, 186, 187, 188]
related_prs:
  - { pr: 179, title: "Sitemap hygiene (prior work)" }
  - { pr: 180, title: "Audit framework (prior work)" }
success_criteria:
  - { id: 1, description: "description FAILs 126 → 0", actual: "0", met: true }
  - { id: 2, description: "title FAILs 82 → ≤74", actual: "74", met: true }
  - { id: 3, description: "schema WARN 232 → 0", actual: "0", met: true }
  - { id: 4, description: "Course JSON-LD on /courses/[slug]", actual: "11 pages emitting", met: true }
  - { id: 5, description: "GSC: 4-wk re-check, indexed up / not-indexed flat-or-down", actual: "pending", met: deferred }
follow_ups:
  - "Course-level cleanups: 2 missing banners, 3 empty course descriptions, 1 long course name, 1 short course description (mini-phase B)"
  - "Non-ADK post title FAILs: 74 across react-19 + web-dev-basics + others (separate phase candidate)"
  - "GSC re-validation: submit URL Inspection / Validate fixes in GSC after sitemap re-crawl; revisit metric 5 on 2026-06-26"
---

# Phase: tools-seo-indexability-uplift — SUMMARY

**Trigger:** GSC Coverage report 2026-05-28 — 44 indexed / 353 not-indexed; `Crawled - currently not indexed` trending 57 → 66 in one week; 126/233 course posts had empty `description` frontmatter.

**Prior work (not in this phase):** PR #179 sitemap hygiene; PR #180 audit framework + `npm run audit:seo`.

## What shipped

| Wave | Plan | Type | Output |
|---|---|---|---|
| 1 | 01 | Code | `VideoObject` JSON-LD on 232 video posts |
| 1 | 02 | Code | `Course` + `BreadcrumbList` JSON-LD (244 pages) |
| 2 | 03 | Content | ADK course + 8 post titles trimmed to <70 char SERP |
| 3 | 04 | Content | 126 post descriptions filled across 9 courses (6 PRs) |

Total PRs merged: 8 (#181–#188).

## Audit deltas

| Metric | Baseline (pre-phase) | Post-phase |
|---|---|---|
| `criteriaFails.description` | 126 | **0** |
| `criteriaFails.title` | 82 | **74** |
| `criteriaFails.schema` (WARN) | 232 | **0** |
| `criteriaFails.media` | 1 | 1 |
| Posts FAIL | 158 | 75 |
| Courses FAIL | 8 | 7 |

Phase reduced post-level FAILs by 52% (158 → 75). Remaining 75 are post title length (74) + 1 media — both out of original scope.

## Success criteria

All 4 in-scope criteria met. Criterion 5 (GSC re-check) deferred to 2026-06-26 per CONTEXT.md tracking guidance.

## Decisions worth keeping

- **Waves**: Code (Wave 1) shipped in one PR even when two plans touched overlapping files — single review pass beat coordination overhead.
- **Plan 04 batching**: Started at 1 course per PR (max reviewability), collapsed to 4-courses-per-PR by the tail when drafting cadence was steady. User direction drove the consolidation.
- **`web-dev-basics` skip**: Plan listed 6 failing posts but the actual audit (run pre-batch) showed 0 — saved one PR by skipping.
- **PR contamination recovery**: PRs #184 + #185 had unrelated changes bundled via `git add -A` mistake. Soft-reset + selective re-stage + force-push (with `--force-with-lease`) cleanly recovered; user explicitly prioritised this hygiene over batch velocity.

## Follow-ups

1. **Course-level cleanups (mini-phase B)** — 5 course-level FAILs remain (banners, descriptions, name length). Small mechanical batch, locks in 100% course PASS.
2. **Non-ADK title trims (future phase candidate)** — 74 post title FAILs concentrated in react-19, web-dev-basics. Higher impact than ADK trim was, but bigger blast radius (touches 74 mdx files + risks SERP CTR changes on already-indexed pages).
3. **GSC re-validation** — submit URL Inspection / Validate fixes in GSC after next sitemap re-crawl; re-check Coverage report on or after **2026-06-26** to validate metric 5.
