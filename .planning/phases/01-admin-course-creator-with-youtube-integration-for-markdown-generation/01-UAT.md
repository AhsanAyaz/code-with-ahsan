---
status: complete
phase: 01-admin-course-creator-with-youtube-integration-for-markdown-generation
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md
started: "2026-03-11T03:30:00Z"
updated: "2026-03-11T03:45:00Z"
---

## Current Test

[testing complete]

## Tests

### 1. Admin Courses Navigation
expected: Navigate to /admin. The sidebar/navigation shows a "Courses" link. Clicking it takes you to /admin/courses.
result: pass

### 2. Course List Loads
expected: On /admin/courses, you see a table of existing courses with columns: Order (up/down arrows), Name (with slug below), Chapters, Posts, Published date, Visible toggle, and Delete button. All existing courses appear sorted by visibility order.
result: pass

### 3. YouTube Video Fetch with Chapters
expected: In the "Add New Course" form, select "YouTube Video" mode, enter a video ID (e.g. tqjJrXd27m4), click Fetch. Video thumbnail appears, title auto-fills into Course Name, slug auto-generates, chapters are listed with editable titles and timestamps.
result: pass

### 4. Create Course from Video
expected: After fetching a video, review/edit the name, slug, description, and chapters. Click "Create Course". Success toast appears, form resets, and the new course appears in the table above.
result: pass

### 5. Course Appears on Public Site
expected: Navigate to /courses. The newly created course appears in the grid with its YouTube thumbnail as the banner image on a black background. Grid shows 3 cards per row on desktop.
result: pass

### 6. Toggle Course Visibility
expected: On /admin/courses, click the visibility toggle on a course. Toast confirms the change. Navigate to /courses — the hidden course no longer appears. Toggle it back on — it reappears.
result: pass

### 7. Reorder Courses
expected: On /admin/courses, use the up/down arrows to move a course. A "Save Order" button appears. Click it. Toast confirms. Navigate to /courses — courses appear in the new order.
result: pass

### 8. Delete Course
expected: On /admin/courses, click Delete on a course. Confirmation dialog appears. Confirm deletion. Course disappears from the table and from /courses.
result: pass

### 9. YouTube Playlist Fetch
expected: Select "YouTube Playlist" mode, enter a playlist ID, click Fetch. A list of videos in the playlist appears with titles and positions. Each will become a post in the course.
result: issue
reported: "with playlist, each item seems to be pointing to the first video of the playlist"
severity: major

## Summary

total: 9
passed: 8
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Each playlist post links to its own YouTube video"
  status: resolved
  reason: "User reported: with playlist, each item seems to be pointing to the first video of the playlist"
  severity: major
  test: 9
  root_cause: "createCourse() used course-level videoId for all posts instead of per-chapter videoId"
  artifacts:
    - path: "src/lib/course-mdx.ts"
      issue: "videoUrl always used course videoId, ignored chapter.videoId"
  missing: []
  fix: "commit 025509a — each post now uses chapter.videoId || videoId"
