---
phase: quick-065
plan: 01
subsystem: courses
tags: [bugfix, null-safety, timeout, error-boundary, strapi]
dependency_graph:
  requires: []
  provides: [FIX-TIMEOUT, FIX-NULL-SAFETY, FIX-ERROR-BOUNDARY]
  affects:
    - src/app/courses/[course]/[post]/page.tsx
    - src/services/PostService.js
    - src/lib/utils/youtube.js
    - src/app/courses/[course]/[post]/error.tsx
tech_stack:
  added: []
  patterns:
    - AbortController with setTimeout for fetch timeouts
    - Next.js error.tsx boundary for route-level error handling
key_files:
  created:
    - src/app/courses/[course]/[post]/error.tsx
  modified:
    - src/app/courses/[course]/[post]/page.tsx
    - src/services/PostService.js
    - src/lib/utils/youtube.js
decisions:
  - "10-second AbortController timeout on both Strapi fetches in getCourseAndPost — timeout AbortError caught by existing outer try/catch which returns null, triggering notFound()"
  - "Null guard for chapter before chapter.posts.findIndex — returns {nextPost: null, previousPost: null} when post's chapterId doesn't match any chapter"
  - "youtube.js catch returns fallback object with originalUrl to prevent callers receiving undefined from getEmbedUrl"
  - "error.tsx uses 'use client' + useEffect for error logging (Next.js error boundary requirement)"
metrics:
  duration: ~3 min
  completed: 2026-03-03
  tasks_completed: 2
  files_modified: 3
  files_created: 1
---

# Quick Task 65: Fix Course Post Pages Crashing with Client Errors — Summary

**One-liner:** Hardened course post pages with AbortController timeouts on Strapi fetches, null-safe chapter lookup in PostService, fallback return in youtube.js catch block, and a Next.js error.tsx boundary.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add fetch timeouts, null safety, and fallback returns | 462a424 | page.tsx, PostService.js, youtube.js |
| 2 | Add error.tsx boundary for course post pages | c165cc2 | error.tsx (new) |

## What Was Built

### Task 1: Three-file hardening

**`src/app/courses/[course]/[post]/page.tsx`**
- Added `AbortController` + `setTimeout(() => controller.abort(), 10000)` before `Promise.all`
- Passed `signal: controller.signal` to both Strapi fetch calls
- `clearTimeout(timeoutId)` in a `finally` block after the inner `Promise.all`
- Abort errors propagate to the outer `catch` which returns `null`, triggering `notFound()`

**`src/services/PostService.js`**
- Added null guard for `chapter` immediately after the `.find()` call
- Returns `{ nextPost: null, previousPost: null }` when `post.chapterId` doesn't match any chapter in the course
- Prevents `TypeError: Cannot read properties of undefined (reading 'findIndex')`

**`src/lib/utils/youtube.js`**
- Replaced `console.log(e, this)` (invalid `this` in arrow function) with `console.warn('Failed to parse YouTube URL:', originalUrl, e)`
- Added `return { url: originalUrl || '', isYouTube: false, id: '', ts: 0 }` in catch block
- Callers (including `Course.class.js`) now always receive a valid object, never `undefined`

### Task 2: Error boundary

**`src/app/courses/[course]/[post]/error.tsx`** (new file)
- `'use client'` component required by Next.js for error boundaries
- Accepts `{ error, reset }` props per Next.js `ErrorBoundary` interface
- Logs error to console via `useEffect`
- Displays centered card with "Something went wrong" heading
- "Try Again" button (calls `reset()`, `btn btn-primary`)
- "Go to Courses" link to `/courses` (`btn btn-outline`)
- Uses `page-padding` wrapper and `min-h-[50vh] flex items-center justify-center`

## Verification

All success criteria met:

- `npx next build` completes without errors
- `src/app/courses/[course]/[post]/page.tsx` contains `AbortController` and `signal`
- `src/services/PostService.js` contains `if (!chapter)` guard
- `src/lib/utils/youtube.js` catch block contains `return { url: originalUrl || '', isYouTube: false, id: '', ts: 0 }`
- `src/app/courses/[course]/[post]/error.tsx` exists and starts with `'use client'`

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- FOUND: src/app/courses/[course]/[post]/page.tsx
- FOUND: src/services/PostService.js
- FOUND: src/lib/utils/youtube.js
- FOUND: src/app/courses/[course]/[post]/error.tsx

Commits exist:
- FOUND: 462a424 (Task 1)
- FOUND: c165cc2 (Task 2)
