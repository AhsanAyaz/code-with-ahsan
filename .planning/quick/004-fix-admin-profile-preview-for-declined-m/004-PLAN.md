---
phase: quick
plan: 004
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/mentorship/mentors/[username]/route.ts
  - src/app/mentorship/mentors/[username]/page.tsx
  - src/app/mentorship/mentors/[username]/MentorProfileClient.tsx
  - src/app/mentorship/admin/page.tsx
autonomous: true

must_haves:
  truths:
    - "Admin can click profile preview on a declined mentor and see their full profile"
    - "Non-admin users still see 'mentor not found' for declined mentors"
    - "Accepted/public mentors still work exactly as before for all users"
  artifacts:
    - path: "src/app/api/mentorship/mentors/[username]/route.ts"
      provides: "Admin-gated bypass of status/public checks"
      contains: "x-admin-token"
    - path: "src/app/mentorship/mentors/[username]/MentorProfileClient.tsx"
      provides: "Client-side admin token passing on fetch"
      contains: "isAdminPreview"
  key_links:
    - from: "src/app/mentorship/admin/page.tsx"
      to: "/mentorship/mentors/{username}?admin=1"
      via: "Link href with query param"
      pattern: "admin=1"
    - from: "src/app/mentorship/mentors/[username]/MentorProfileClient.tsx"
      to: "/api/mentorship/mentors/{username}"
      via: "fetch with x-admin-token header"
      pattern: "x-admin-token"
    - from: "src/app/api/mentorship/mentors/[username]/route.ts"
      to: "admin_sessions collection"
      via: "Firestore token validation"
      pattern: "admin_sessions"
---

<objective>
Fix admin profile preview for declined mentors so admins can view their profiles from the admin dashboard.

Purpose: The profile preview button added in quick-003 links to `/mentorship/mentors/{username}`, but declined mentors fail the `status === "accepted"` check in both the server page and API route, showing "Mentor Not Found". Admins need to bypass this check with proper authentication.

Output: Admin-authenticated profile viewing that bypasses public visibility checks while keeping non-admin access restricted.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/app/api/mentorship/mentors/[username]/route.ts
@src/app/mentorship/mentors/[username]/page.tsx
@src/app/mentorship/mentors/[username]/MentorProfileClient.tsx
@src/app/mentorship/admin/page.tsx
@src/app/api/mentorship/admin/auth/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add admin token validation to mentor profile API and server page</name>
  <files>
    src/app/api/mentorship/mentors/[username]/route.ts
    src/app/mentorship/mentors/[username]/page.tsx
  </files>
  <action>
**API route** (`src/app/api/mentorship/mentors/[username]/route.ts`):

1. Read the `x-admin-token` header from the request.
2. If present, validate it against Firestore `admin_sessions` collection (same logic as `/api/mentorship/admin/auth` GET handler): fetch doc by token ID, check it exists and `expiresAt` is in the future.
3. Store result in a boolean `isAdminRequest`.
4. Modify the two visibility checks (lines 37-49):
   - Change `if (profileData?.status !== "accepted")` to `if (profileData?.status !== "accepted" && !isAdminRequest)`
   - Change `if (profileData?.isPublic === false)` to `if (profileData?.isPublic === false && !isAdminRequest)`
5. When `isAdminRequest` is true and the mentor is declined, still return the full mentor object (same shape). Add a `status` field to the returned mentor object so the client can display it. Add `status: profileData.status` to the mentor response object.

**Server page** (`src/app/mentorship/mentors/[username]/page.tsx`):

1. Add `searchParams: Promise<{ admin?: string }>` to the `PageProps` interface.
2. In `MentorProfilePage`, read the `admin` search param.
3. If `admin === "1"`, pass `isAdminPreview={true}` prop to `MentorProfileClient`. The server-side `getMentorData()` will still return null for declined mentors (that's fine - the client will refetch with the admin token).
4. Pass the prop: `<MentorProfileClient username={username} initialMentor={mentor} isAdminPreview={searchParams.admin === "1"} />`

Do NOT modify `getMentorData()` on the server side - it runs without auth context and should remain public-only. The client-side fetch with the admin token handles the admin case.
  </action>
  <verify>
    Run `npx tsc --noEmit` to confirm no type errors. Visually inspect the API route to confirm the admin bypass is conditional and the non-admin path is unchanged.
  </verify>
  <done>
    API route returns mentor data for declined mentors when valid admin token is provided. Returns 404 for declined mentors without admin token (unchanged behavior).
  </done>
</task>

<task type="auto">
  <name>Task 2: Update client component and admin page link</name>
  <files>
    src/app/mentorship/mentors/[username]/MentorProfileClient.tsx
    src/app/mentorship/admin/page.tsx
  </files>
  <action>
**MentorProfileClient** (`src/app/mentorship/mentors/[username]/MentorProfileClient.tsx`):

1. Add `isAdminPreview?: boolean` to the `MentorProfileClientProps` interface.
2. In the `useEffect` that fetches mentor data (around line 58-83):
   - Change the early return condition: if `initialMentor` exists, don't refetch. But if `isAdminPreview` is true AND `initialMentor` is null, DO fetch (this is the declined mentor case).
   - The current condition `if (initialMentor) return;` already handles this correctly - when initialMentor is null for declined mentors, it will proceed to fetch.
   - When `isAdminPreview` is true, read the admin token from `localStorage.getItem("mentorship_admin_token")` and include it as `headers: { "x-admin-token": token }` in the fetch call.
   - If no token is found in localStorage when `isAdminPreview` is true, set error to "Admin authentication required".
3. Add a visual indicator when viewing as admin preview: if `isAdminPreview` is true and mentor data loaded successfully, show a small banner at the top: `<div className="alert alert-warning mb-4"><span>Admin Preview - This profile is not publicly visible</span></div>`. Only show this banner when the mentor status is not "accepted" (add `status` to the `MentorProfileDetails` type if needed, or check via a new `mentorStatus` field in the response).

**Admin page** (`src/app/mentorship/admin/page.tsx`):

1. Find the profile Link (around line 1409-1420) that currently links to `/mentorship/mentors/${p.username || p.uid}`.
2. Change the href to include the admin query param: `` href={`/mentorship/mentors/${p.username || p.uid}?admin=1`} ``
3. Update the title attribute from "View public profile" to "View profile (admin)".

**Type check:** If `MentorProfileDetails` (in `@/types/mentorship`) doesn't have a `status` field, add it as optional: `status?: string`. Check the type file first.
  </action>
  <verify>
    Run `npx tsc --noEmit` to confirm no type errors. Run `npm run build` to confirm the build succeeds.
  </verify>
  <done>
    - Clicking profile preview on a declined mentor in the admin dashboard opens the profile page with `?admin=1`
    - The client fetches with the admin token header, bypassing the visibility check
    - A warning banner shows "Admin Preview - This profile is not publicly visible"
    - Non-admin visitors to the same URL without a valid token still see "mentor not found"
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. `npm run build` succeeds
3. Manual test: As admin, toggle "Show Declined" on All Mentors tab, click profile button on a declined mentor - profile loads with admin preview banner
4. Manual test: Open the same declined mentor URL in an incognito window (no admin token) - shows "Mentor Not Found"
5. Manual test: Click profile button on an accepted mentor - works as before, no admin preview banner
</verification>

<success_criteria>
- Admins can view declined mentor profiles via the admin dashboard profile button
- Non-admin users cannot access declined mentor profiles
- Accepted mentor profiles work unchanged for all users
- Admin preview shows a visual indicator that the profile is not publicly visible
- No TypeScript errors, build passes
</success_criteria>

<output>
After completion, create `.planning/quick/004-fix-admin-profile-preview-for-declined-m/004-SUMMARY.md`
</output>
