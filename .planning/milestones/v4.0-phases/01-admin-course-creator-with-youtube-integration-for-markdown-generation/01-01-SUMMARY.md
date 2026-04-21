---
phase: 01-admin-course-creator-with-youtube-integration-for-markdown-generation
plan: "01"
subsystem: api
tags: [youtube, googleapis, gray-matter, mdx, filesystem, admin, courses]

requires: []
provides:
  - Course MDX read/write/delete utilities (src/lib/course-mdx.ts)
  - GET/POST /api/admin/courses — list and create courses
  - DELETE /api/admin/courses/[slug] — remove a course
  - GET /api/admin/courses/youtube — fetch YouTube video/playlist metadata with chapter parsing
affects:
  - 01-admin-course-creator (UI layer that calls these API routes)

tech-stack:
  added: []
  patterns:
    - "Admin API token auth: check x-admin-token header against process.env.ADMIN_TOKEN (simpler than Firestore sessions — these are local-dev-only APIs)"
    - "Course MDX CRUD: read/write/delete via fs + gray-matter in src/content/courses/{slug}/"
    - "Auto-increment IDs: scan all existing MDX files for max course/chapter/post ID before creating"
    - "YouTube chapters: regex parse description lines matching H:MM:SS or MM:SS Title"

key-files:
  created:
    - src/lib/course-mdx.ts
    - src/app/api/admin/courses/route.ts
    - src/app/api/admin/courses/[slug]/route.ts
    - src/app/api/admin/courses/youtube/route.ts
  modified: []

key-decisions:
  - "Use process.env.ADMIN_TOKEN (simple env var) for course API auth — not Firestore sessions — because these routes are local-dev-only and don't need distributed session management"
  - "createCourse puts all posts in a single chapter (chapterOrder 0) — YouTube video = one logical chapter with timestamped posts"
  - "Build-courses-index failures are non-fatal in API routes — course files are written, index rebuild can happen manually if execSync fails"

patterns-established:
  - "Course post file naming: 000-{order:3}-{slug}.mdx (chapterOrder 0 for single-chapter YouTube courses)"
  - "getMaxIds() must be called before any createCourse to ensure monotonically increasing IDs across all courses"

requirements-completed: [COURSE-01, COURSE-02, COURSE-03, COURSE-04]

duration: 15min
completed: "2026-03-11"
---

# Phase 01 Plan 01: Course API Layer Summary

**YouTube chapter-timestamp to MDX pipeline: googleapis video metadata extraction, filesystem CRUD for course/post MDX files, and admin-authenticated REST API routes**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-11T02:33:20Z
- **Completed:** 2026-03-11T02:48:00Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments

- `src/lib/course-mdx.ts` exports `listCourses`, `createCourse`, `deleteCourse`, `getMaxIds` — all file I/O using gray-matter for MDX frontmatter
- YouTube API route parses chapter timestamps from video descriptions (regex matching `H:MM:SS Title` and `MM:SS Title` patterns) and supports playlist item fetching
- Three REST API routes with admin token auth cover full course lifecycle: list, create (with auto-regeneration of courses.generated.json), and delete

## Task Commits

1. **Task 1: Create course MDX utility library and YouTube API route** - `a040d32` (feat)
2. **Task 2: Create course list and delete API routes** - `4431686` (feat)

## Files Created/Modified

- `src/lib/course-mdx.ts` - Course MDX read/write/delete utilities; exports listCourses, createCourse, deleteCourse, getMaxIds
- `src/app/api/admin/courses/route.ts` - GET (list courses) and POST (create course with validation) handlers
- `src/app/api/admin/courses/[slug]/route.ts` - DELETE handler; returns 404 for non-existent slugs
- `src/app/api/admin/courses/youtube/route.ts` - GET handler for video metadata + chapter timestamp parsing, and playlist item fetching

## Decisions Made

- Used `process.env.ADMIN_TOKEN` (simple env var check) for course API authentication rather than the Firestore session pattern used by other admin routes. These APIs are local-dev-only — the admin runs `npm run dev` locally to manage courses — so distributed sessions are unnecessary overhead.
- YouTube courses are mapped to a single chapter with `chapterOrder: 0`. Each chapter timestamp becomes a post, not a separate MDX chapter object. This matches the `angular-in-90ish-minutes` course pattern which has one chapter with 20 posts.
- `execSync` errors during index rebuild are caught and logged but not returned as API failures — the MDX files are the source of truth, not the generated JSON.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. `YT_API_KEY` is already configured per plan context.

## Next Phase Readiness

- API layer is complete and type-checks cleanly (`npx tsc --noEmit` passes)
- `listCourses()` confirmed returning all 9 existing courses
- Admin UI (next plan) can consume these routes with `x-admin-token` header
- `process.env.ADMIN_TOKEN` must be set in `.env.local` for routes to authenticate (same env var used by other admin endpoints)

---
*Phase: 01-admin-course-creator-with-youtube-integration-for-markdown-generation*
*Completed: 2026-03-11*
