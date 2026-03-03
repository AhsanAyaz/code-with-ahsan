---
phase: quick-065
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/courses/[course]/[post]/page.tsx
  - src/services/PostService.js
  - src/lib/utils/youtube.js
  - src/app/courses/[course]/[post]/error.tsx
autonomous: true
requirements: [FIX-TIMEOUT, FIX-NULL-SAFETY, FIX-ERROR-BOUNDARY]

must_haves:
  truths:
    - "Course post pages do not crash with client-side exception errors"
    - "Strapi API fetches time out gracefully instead of hanging until Vercel 504"
    - "Posts with undefined chapters return null navigation instead of throwing"
    - "Malformed YouTube URLs return a fallback object instead of undefined"
    - "Users see a friendly error page when something goes wrong on course post pages"
  artifacts:
    - path: "src/app/courses/[course]/[post]/page.tsx"
      provides: "Fetch calls with AbortController timeout"
      contains: "AbortController"
    - path: "src/services/PostService.js"
      provides: "Null-safe chapter lookup"
      contains: "if (!chapter)"
    - path: "src/lib/utils/youtube.js"
      provides: "Fallback return in catch block"
      contains: "return {"
    - path: "src/app/courses/[course]/[post]/error.tsx"
      provides: "Error boundary for graceful error handling"
      contains: "use client"
  key_links:
    - from: "src/app/courses/[course]/[post]/page.tsx"
      to: "Strapi API"
      via: "fetch with AbortController"
      pattern: "signal.*abort"
    - from: "src/services/PostService.js"
      to: "src/app/courses/[course]/[post]/page.tsx"
      via: "getNextAndPreviousPosts import"
      pattern: "chapter.*\\?"
---

<objective>
Fix course post pages crashing with client-side exception errors caused by three root issues: (1) Strapi API fetches have no timeout, causing Vercel FUNCTION_INVOCATION_TIMEOUT (504), (2) PostService.js crashes when chapter is undefined, and (3) youtube.js catch block returns nothing (undefined).

Purpose: Restore reliability of all /courses/[course]/[post] pages and prevent cascading client-side errors.
Output: Hardened fetch calls, null-safe PostService, fallback-returning youtube.js, and error.tsx boundary.
</objective>

<execution_context>
@/home/ahsan/.claude/get-shit-done/workflows/execute-plan.md
@/home/ahsan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/courses/[course]/[post]/page.tsx
@src/services/PostService.js
@src/lib/utils/youtube.js
@src/classes/Course.class.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add fetch timeouts, null safety, and fallback returns</name>
  <files>
    src/app/courses/[course]/[post]/page.tsx
    src/services/PostService.js
    src/lib/utils/youtube.js
  </files>
  <action>
1. In `src/app/courses/[course]/[post]/page.tsx` — Add AbortController with 10-second timeout to both Strapi fetch calls in `getCourseAndPost`:
   - Create `const controller = new AbortController()` and `const timeoutId = setTimeout(() => controller.abort(), 10000)` before the Promise.all
   - Pass `signal: controller.signal` in both fetch options objects (alongside existing headers and next options)
   - Add `clearTimeout(timeoutId)` in a finally block (or after the Promise.all resolves)
   - The existing try/catch already returns null on error, which triggers notFound() — so timeout errors are handled gracefully

2. In `src/services/PostService.js` — Add null guard for `chapter` on line 5:
   - After `const chapter = course.chapters.find(...)` (line 2-4), add:
     ```
     if (!chapter) {
       return { nextPost: null, previousPost: null }
     }
     ```
   - This prevents `chapter.posts` from throwing TypeError when the post's chapterId doesn't match any chapter

3. In `src/lib/utils/youtube.js` — Fix the catch block (line 44-46):
   - Replace `console.log(e, this)` with `console.warn('Failed to parse YouTube URL:', originalUrl, e)` (the `this` reference is wrong in an arrow function anyway)
   - Add a return statement in the catch block: `return { url: originalUrl || '', isYouTube: false, id: '', ts: 0 }` so callers always get a valid object instead of undefined
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx next build 2>&1 | tail -20</automated>
    <manual>Verify page.tsx has AbortController, PostService.js has chapter null guard, youtube.js catch returns fallback</manual>
  </verify>
  <done>All three files hardened: fetches timeout at 10s, undefined chapters return null navigation, malformed YouTube URLs return fallback object</done>
</task>

<task type="auto">
  <name>Task 2: Add error.tsx boundary for course post pages</name>
  <files>
    src/app/courses/[course]/[post]/error.tsx
  </files>
  <action>
Create `src/app/courses/[course]/[post]/error.tsx` as a client component error boundary. This is the first error.tsx in the project, keep it simple and consistent with the app's existing styling (Tailwind CSS, DaisyUI).

The component should:
- Be a `'use client'` component (required by Next.js for error boundaries)
- Accept `{ error, reset }` props (Next.js ErrorBoundary interface)
- Log the error to console for debugging: `console.error('Course post error:', error)`
- Display a centered card with:
  - A heading: "Something went wrong"
  - A message: "We couldn't load this course post. Please try again."
  - A "Try Again" button that calls `reset()` (use `btn btn-primary` DaisyUI class)
  - A "Go to Courses" link back to `/courses` (use `btn btn-outline` DaisyUI class)
- Use `page-padding` wrapper class (same as the page component uses)
- Use `min-h-[50vh]` with flex centering for the error card
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx next build 2>&1 | tail -20</automated>
    <manual>error.tsx exists at the correct path and exports a valid React component</manual>
  </verify>
  <done>Error boundary catches runtime errors on course post pages and shows a user-friendly recovery UI instead of a raw error screen</done>
</task>

</tasks>

<verification>
- `npx next build` completes without errors
- `src/app/courses/[course]/[post]/page.tsx` contains `AbortController` and `signal`
- `src/services/PostService.js` contains `if (!chapter)` guard
- `src/lib/utils/youtube.js` catch block contains a `return` statement with fallback object
- `src/app/courses/[course]/[post]/error.tsx` exists and is a client component
</verification>

<success_criteria>
- Build succeeds with all changes
- Strapi fetches abort after 10 seconds instead of hanging indefinitely
- PostService handles missing chapters without crashing
- YouTube URL parser always returns a valid object (never undefined)
- Course post pages show a friendly error UI on unhandled errors
</success_criteria>

<output>
After completion, create `.planning/quick/65-fix-course-post-pages-crashing-with-clie/65-SUMMARY.md`
</output>
