---
phase: quick-003
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/mentorship/admin/page.tsx
  - src/app/mentorship/dashboard/page.tsx
autonomous: true

must_haves:
  truths:
    - "Admin sees a Profile button on each mentor card in the All Mentors tab"
    - "Clicking the admin Profile button opens the mentor's public profile page in a new tab"
    - "Mentor sees a View My Profile link/button on their dashboard"
    - "Clicking the mentor's View My Profile opens their public profile page"
    - "Profile buttons only appear for mentors (not mentees) on admin dashboard"
  artifacts:
    - path: "src/app/mentorship/admin/page.tsx"
      provides: "Profile button on All Mentors tab cards"
      contains: "mentorship/mentors/"
    - path: "src/app/mentorship/dashboard/page.tsx"
      provides: "View My Profile navigation card for mentors"
      contains: "mentorship/mentors/"
  key_links:
    - from: "admin Profile button"
      to: "/mentorship/mentors/[username]"
      via: "Link with target=_blank using p.username || p.uid"
      pattern: "mentorship/mentors/"
    - from: "mentor dashboard View My Profile card"
      to: "/mentorship/mentors/[username]"
      via: "Link using profile.username || user.uid"
      pattern: "mentorship/mentors/"
---

<objective>
Add profile preview buttons in two locations: (1) a "Profile" button on each mentor card in the admin dashboard's All Mentors tab, and (2) a "View My Profile" navigation card on the mentor dashboard.

Purpose: Allow admins to quickly view a mentor's public profile, and allow mentors to preview how their profile appears to mentees.
Output: Updated admin page and mentor dashboard with profile links.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/app/mentorship/admin/page.tsx
@src/app/mentorship/dashboard/page.tsx
@src/app/mentorship/mentors/[username]/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Profile button to admin All Mentors tab cards</name>
  <files>src/app/mentorship/admin/page.tsx</files>
  <action>
In the All Mentors tab card rendering (around line 1394-1420, inside the `flex items-center gap-2 flex-wrap` div that contains the mentor name, status badge, role badge, relationship count badge, and Restore button), add a "Profile" link button.

Add a Link component (already imported) right after the relationship count badge (the `{activeRelationshipCount} {relationshipLabel}` badge, around line 1406) and before the Restore button conditional:

```tsx
{activeTab === "all-mentors" && (
  <Link
    href={`/mentorship/mentors/${p.username || p.uid}`}
    target="_blank"
    rel="noopener noreferrer"
    className="btn btn-ghost btn-sm btn-circle"
    title="View public profile"
  >
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  </Link>
)}
```

This uses an external-link icon (arrow pointing out of a box) which is the standard pattern for "opens in new tab". The button only shows on the All Mentors tab (not All Mentees) since mentee profiles don't have public pages. Use `btn-ghost btn-sm btn-circle` to keep it compact and consistent with the existing inline button styles.

Note: The `Link` component is already imported at the top of the file. The `p` variable refers to the `ProfileWithDetails` object which extends `MentorshipProfile` and includes `username?: string` and `uid: string`.
  </action>
  <verify>Run `npx next build 2>&1 | tail -20` or `npx tsc --noEmit` to verify no TypeScript errors. Visually confirm the icon button appears next to mentor cards in the All Mentors tab.</verify>
  <done>Each mentor card in the admin All Mentors tab has a small external-link icon button that opens the mentor's public profile page in a new tab. The button does not appear on the All Mentees tab.</done>
</task>

<task type="auto">
  <name>Task 2: Add View My Profile card to mentor dashboard</name>
  <files>src/app/mentorship/dashboard/page.tsx</files>
  <action>
In the mentor dashboard's Navigation Cards grid (the `grid md:grid-cols-3 gap-4` div starting around line 270), add a "View My Profile" card. Add it in the mentor-only section, right after the "Pending Requests" card (after the closing of the `{profile.role === "mentor" && (...)}` block for Pending Requests, around line 314) and before the "My Matches" Link.

Insert a new mentor-only navigation card:

```tsx
{profile.role === "mentor" && (
  <Link
    href={`/mentorship/mentors/${(profile as any).username || user.uid}`}
    target="_blank"
    rel="noopener noreferrer"
    className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
  >
    <div className="card-body">
      <h3 className="card-title">
        <span className="text-2xl">👤</span> View My Profile
      </h3>
      <p className="text-base-content/70 text-sm">
        Preview your public mentor profile
      </p>
    </div>
  </Link>
)}
```

Note: The `profile` variable is typed as `MentorshipProfile` which has `username?: string`. Check the imported `MentorshipProfile` type -- if `username` is present on the type (it is, per `types/mentorship.ts` line 14), cast is not needed. Use `profile.username || user.uid` directly. Only use `(profile as any).username` if the type imported via MentorshipContext doesn't include `username`. Verify by checking the type definition before deciding.

This card opens in a new tab so the mentor can see their profile as others would see it, without losing their dashboard context. It follows the same card styling pattern as all other navigation cards (shadow-xl, hover:shadow-2xl, transition-shadow).
  </action>
  <verify>Run `npx tsc --noEmit` to verify no TypeScript errors. Visually confirm the "View My Profile" card appears on the mentor dashboard but NOT on the mentee dashboard.</verify>
  <done>Mentors see a "View My Profile" navigation card on their dashboard that opens their public profile page in a new tab. Mentees do not see this card.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` -- no TypeScript errors
2. Admin dashboard > All Mentors tab: each mentor card shows an external-link icon button
3. Admin dashboard > All Mentees tab: no profile icon button appears
4. Clicking admin profile button opens `/mentorship/mentors/{username}` in new tab
5. Mentor dashboard: "View My Profile" card visible in navigation grid
6. Mentee dashboard: "View My Profile" card NOT visible
7. Clicking mentor's "View My Profile" opens their public profile in new tab
</verification>

<success_criteria>
- Admin can view any mentor's public profile from the All Mentors tab via icon button
- Mentors can preview their own public profile from their dashboard
- No TypeScript errors, existing functionality unaffected
- Links open in new tabs (target="_blank")
</success_criteria>

<output>
After completion, create `.planning/quick/003-add-profile-preview-buttons-1-add-a-prof/003-SUMMARY.md`
</output>
