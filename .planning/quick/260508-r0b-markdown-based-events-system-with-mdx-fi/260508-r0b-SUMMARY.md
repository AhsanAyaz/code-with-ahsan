---
phase: quick-260508-r0b
plan: 01
subsystem: content-pipeline / events
tags: [mdx, content-as-code, events, build-pipeline, daisyui, next-app-router]
dependency_graph:
  requires: []
  provides: [MDX-driven events listing, filterable event cards, dynamic event detail route, build-time event indexer]
  affects: [src/app/events/page.tsx, src/lib/content/localContent.ts, src/lib/content/contentProvider.ts]
tech_stack:
  added: [gray-matter (already dep), events.generated.json pipeline]
  patterns: [content-as-code MDX indexer, server-component + client filter/sort split, dedicatedRoute redirect pattern]
key_files:
  created:
    - scripts/content/build-events-index.js
    - src/content/events.generated.json
    - src/content/events/cwa-promptathon-2026/event.mdx
    - src/content/events/hackstack-2023/event.mdx
    - src/components/events/EventCard.tsx
    - src/components/events/EventsListClient.tsx
    - src/app/events/[event-slug]/page.tsx
  modified:
    - src/types/content.ts (added EventContent/EventType/EventStatus)
    - src/lib/content/localContent.ts (added getLocalEvents/getLocalEventBySlug)
    - src/lib/content/contentProvider.ts (added getEvents/getEventBySlug)
    - src/app/events/page.tsx (replaced hardcoded list with MDX-driven server component)
    - package.json (added build:events script, updated prebuild chain)
decisions:
  - "Events are local-only (no Strapi branch) — mirrors course pattern for simplicity since no CMS is used for events"
  - "dedicatedRoute redirect pattern: [event-slug] 308-redirects to external route; existing static routes take Next.js priority"
  - "LegitMarkdown (react-markdown) used for event body rendering — consistent with courses pipeline, avoids mdx-bundler complexity"
  - "Imports moved to top of localContent.ts to comply with ESLint import ordering"
metrics:
  duration: "~4 minutes"
  completed: "2026-05-08"
  tasks: 2
  files_changed: 11
---

# Quick Task 260508-r0b: Markdown-Based Events System Summary

**One-liner:** MDX-driven events pipeline with gray-matter indexer, typed content provider, filterable/sortable listing page, and dynamic detail route with dedicatedRoute redirect support.

## What Was Built

Replaced the hardcoded `/events` page (2 inline objects) with a fully content-as-code events system mirroring the existing courses pipeline.

### Build Pipeline

`scripts/content/build-events-index.js` reads `src/content/events/*/event.mdx`, validates required frontmatter fields (slug, title, description, type, date, status), and writes `src/content/events.generated.json` with shape `{ generatedAt, source: 'mdx', count, events: [...] }`. Events are sorted by `date DESC` then `visibilityOrder DESC`.

The `prebuild` script now chains: `npm run content:build && npm run build:events` — both course and event indexes are regenerated on every `npm run build`.

### Frontmatter Contract

Every `src/content/events/<slug>/event.mdx` must include:
```yaml
slug, title, description, type, date, status  # required — build throws if missing
```
Optional: `endDate`, `location`, `speaker`, `bannerImage`, `dedicatedRoute`, `isVisible`, `visibilityOrder`.

### How to Add a New Event

Single step: create `src/content/events/<slug>/event.mdx` with valid frontmatter. The next build automatically picks it up. No app code changes needed.

### Components and Routes

| File | Role |
|------|------|
| `EventCard.tsx` | Presentational card with type badge, status badge, date, location, speaker, "View Event" link |
| `EventsListClient.tsx` | Client component: filter by type (7 options), sort by date (newest/oldest), event count display |
| `src/app/events/page.tsx` | Async server component — fetches events via `getEvents()`, delegates UI to EventsListClient |
| `src/app/events/[event-slug]/page.tsx` | Dynamic detail route — 308-redirects if `dedicatedRoute` is set, else renders MDX body via LegitMarkdown |

### Existing Routes Preserved

`/events/cwa-promptathon/` and `/events/hackstack/` static route trees are untouched. Next.js resolves static segments before `[event-slug]`, so they continue to serve the existing dedicated pages. The MDX sample events use `dedicatedRoute` to surface the existing routes from the new listing page.

## Files Created/Modified

| File | Lines | Change |
|------|-------|--------|
| `scripts/content/build-events-index.js` | 72 | Created |
| `src/content/events.generated.json` | ~50 | Generated |
| `src/content/events/cwa-promptathon-2026/event.mdx` | 18 | Created |
| `src/content/events/hackstack-2023/event.mdx` | 16 | Created |
| `src/components/events/EventCard.tsx` | 52 | Created |
| `src/components/events/EventsListClient.tsx` | 67 | Created |
| `src/app/events/[event-slug]/page.tsx` | 62 | Created |
| `src/types/content.ts` | +22 | Modified |
| `src/lib/content/localContent.ts` | +16 | Modified |
| `src/lib/content/contentProvider.ts` | +14 | Modified |
| `src/app/events/page.tsx` | 30 (was 95) | Replaced |
| `package.json` | +2 | Modified |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Code quality] Moved imports to top of localContent.ts**
- **Found during:** Task 1 implementation
- **Issue:** Plan suggested appending imports at bottom of file; TypeScript/ESLint expects imports at top
- **Fix:** Added `eventsData` import and `EventContent` type import alongside existing top-of-file imports; removed duplicate imports that were appended at bottom
- **Files modified:** `src/lib/content/localContent.ts`
- **Commit:** 63b360d

### Known Limitations

**Turbopack build fails in worktree context** — `npm run build` fails due to pre-existing `turbopack.root: ".."` relative path in `next.config.ts` resolving incorrectly inside the git worktree. This is not caused by this task's changes (the same failure occurs on any worktree build). Verification was confirmed via `npx tsc --noEmit` (TypeScript clean) and `npm run lint` (no errors on new files). The events indexer script (`npm run build:events`) ran successfully and produced the correct output.

## Known Stubs

None — all event data flows from MDX files through the build pipeline to the UI.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes introduced.

## Self-Check

### Files created/exist:
- scripts/content/build-events-index.js: FOUND
- src/content/events.generated.json: FOUND (2 events)
- src/content/events/cwa-promptathon-2026/event.mdx: FOUND
- src/content/events/hackstack-2023/event.mdx: FOUND
- src/components/events/EventCard.tsx: FOUND
- src/components/events/EventsListClient.tsx: FOUND
- src/app/events/[event-slug]/page.tsx: FOUND

### Commits:
- 63b360d: Task 1 — infrastructure, build script, MDX files
- a39a499: Task 2 — components, listing page, detail route

## Self-Check: PASSED
