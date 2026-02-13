---
phase: quick-25
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/admin/projects/route.ts
  - src/app/api/admin/projects/[id]/route.ts
  - src/app/admin/mentees/page.tsx
autonomous: true
must_haves:
  truths:
    - "Admin projects page loads projects without 401 errors"
    - "Admin mentees page shows 'All Mentees' header (not 'All Mentors')"
    - "Admin mentees stats section shows 'Total Mentors' and 'Total Mentees' (not duplicate 'Total Mentors')"
  artifacts:
    - path: "src/app/api/admin/projects/route.ts"
      provides: "Admin-token session auth for projects GET endpoint"
      contains: "x-admin-token"
    - path: "src/app/api/admin/projects/[id]/route.ts"
      provides: "Admin-token session auth for project DELETE endpoint"
      contains: "x-admin-token"
    - path: "src/app/admin/mentees/page.tsx"
      provides: "Corrected mentees page with proper header and stats"
      contains: "All Mentees"
  key_links:
    - from: "src/app/admin/projects/page.tsx"
      to: "/api/admin/projects"
      via: "x-admin-token header from localStorage"
      pattern: "x-admin-token.*token"
---

<objective>
Fix two admin dashboard bugs:

1. **Projects page 401 loop:** The `/api/admin/projects` and `/api/admin/projects/[id]` routes use `verifyAuth()` which expects a Firebase ID token in the `Authorization: Bearer` header. But the admin pages send an `x-admin-token` header containing a custom admin session token (stored in `admin_sessions` Firestore collection). The API routes need to validate the `x-admin-token` session token instead of calling `verifyAuth()`.

2. **Mentees page wrong labels:** The mentees page (`src/app/admin/mentees/page.tsx`) has three text errors:
   - Line 434: Header says "All Mentors" instead of "All Mentees"
   - Line 446: Second stat shows "Total Mentors" instead of "Total Mentees"
   - Line 448: Second stat displays `totalMentors` instead of `totalMentees`

Purpose: Fix broken admin functionality so the admin can manage projects and view correct mentee information.
Output: Working admin projects page and corrected mentees page labels.
</objective>

<context>
@src/app/api/admin/projects/route.ts
@src/app/api/admin/projects/[id]/route.ts
@src/app/admin/mentees/page.tsx
@src/app/api/mentorship/admin/auth/route.ts (reference: admin session token verification pattern)
@src/app/admin/projects/page.tsx (reference: how admin token is sent from frontend)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix admin projects API auth to use x-admin-token session verification</name>
  <files>src/app/api/admin/projects/route.ts, src/app/api/admin/projects/[id]/route.ts</files>
  <action>
In both route files, replace the `verifyAuth()` Firebase ID token auth with admin session token verification matching the pattern used by `/api/mentorship/admin/auth` GET route:

1. Remove the `import { verifyAuth } from "@/lib/auth"` import.
2. Replace the auth block at the top of each handler with:
   - Read `x-admin-token` from `request.headers.get("x-admin-token")`
   - If no token, return 401 `{ error: "Admin authentication required" }`
   - Look up the token in `db.collection("admin_sessions").doc(token).get()`
   - If session doesn't exist, return 401
   - Check `expiresAt` from session data: if `expiresAt.toDate() < new Date()`, delete the expired session doc and return 401
   - If valid, proceed with the rest of the handler
3. Remove the secondary admin check that queries `mentorship_profiles` for `isAdmin` — the admin session token already proves admin access.

For `route.ts` (GET): Replace lines 8-35 (the verifyAuth + isAdmin block) with the admin session token check.
For `[id]/route.ts` (DELETE): Replace the equivalent auth block with the same pattern.

Do NOT change any other logic in these routes (query building, filtering, response format, deletion logic).
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no TypeScript errors. The admin projects page should no longer produce 401 errors when the admin is authenticated via AdminAuthGate.
  </verify>
  <done>
Both `/api/admin/projects` GET and `/api/admin/projects/[id]` DELETE authenticate using `x-admin-token` session verification instead of Firebase ID token auth. No 401 loop when admin is authenticated.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix mentees page header and stats labels</name>
  <files>src/app/admin/mentees/page.tsx</files>
  <action>
Fix three incorrect text values in the All Mentees admin page:

1. **Line 434** (h1 header): Change `"All Mentors"` to `"All Mentees"`

2. **Line 446** (second stat title): Change `"Total Mentors"` to `"Total Mentees"` — this is the second stat box in the summary stats section. The first stat correctly shows "Total Mentors" with `totalMentors`, and the second should show "Total Mentees" with `totalMentees`.

3. **Line 448** (second stat value): Change `{mentorshipSummary.totalMentors}` to `{mentorshipSummary.totalMentees}` — display the actual mentee count instead of duplicating the mentor count.

The `MentorshipSummary` type already has a `totalMentees` field (confirmed in `src/types/admin.ts`), so this is purely a text/variable fix.

Do NOT change any other part of the file.
  </action>
  <verify>
Run `npx tsc --noEmit` to confirm no TypeScript errors. Visually verify the mentees page shows "All Mentees" as the header and the stats section shows "Total Mentors: X" and "Total Mentees: Y" as separate counts.
  </verify>
  <done>
Mentees page header reads "All Mentees", stats section shows both "Total Mentors" and "Total Mentees" with correct respective counts.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. Admin projects page loads without 401 errors (requires valid admin session)
3. Admin mentees page header reads "All Mentees"
4. Admin mentees stats show "Total Mentors" and "Total Mentees" (not duplicate "Total Mentors")
</verification>

<success_criteria>
- Admin projects page fetches and displays projects without authentication errors
- Admin project deletion works without authentication errors
- Mentees page shows correct "All Mentees" header
- Mentees stats show distinct "Total Mentors" and "Total Mentees" counts
- TypeScript compilation succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/25-fix-two-admin-dashboard-issues-1-project/25-SUMMARY.md`
</output>
