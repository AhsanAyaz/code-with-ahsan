---
phase: quick-11
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/profile/layout.tsx
  - src/app/profile/page.tsx
  - src/app/mentorship/settings/page.tsx
  - src/components/ProfileMenu.tsx
  - src/components/mentorship/DiscordValidationBanner.tsx
  - src/app/mentorship/dashboard/page.tsx
  - src/app/mentorship/requests/page.tsx
  - src/lib/email.ts
  - scripts/find-mentees-without-discord.ts
  - scripts/find-invalid-discord-users.ts
  - public/sitemap.xml
autonomous: true
must_haves:
  truths:
    - "Visiting /profile shows the settings page with full functionality"
    - "ProfileMenu dropdown shows a Profile link above Logout"
    - "All old /mentorship/settings links now point to /profile"
    - "Old /mentorship/settings route no longer exists"
  artifacts:
    - path: "src/app/profile/page.tsx"
      provides: "Profile/settings page at /profile route"
    - path: "src/app/profile/layout.tsx"
      provides: "MentorshipProvider wrapper for profile page"
    - path: "src/components/ProfileMenu.tsx"
      provides: "Dropdown with Profile link and Logout"
  key_links:
    - from: "src/components/ProfileMenu.tsx"
      to: "/profile"
      via: "Next.js Link component"
      pattern: "href.*\"/profile\""
    - from: "src/app/profile/layout.tsx"
      to: "MentorshipProvider"
      via: "context wrapper"
      pattern: "MentorshipProvider"
---

<objective>
Move the settings page from /mentorship/settings to /profile and add a Profile link to the ProfileMenu dropdown.

Purpose: Profile settings should be a global route, not nested under mentorship. This is the first step before a bigger refactor into sections later.
Output: /profile route with existing settings functionality, updated ProfileMenu, all old links updated.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/mentorship/settings/page.tsx
@src/app/mentorship/layout.tsx
@src/components/ProfileMenu.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create /profile route and move settings page</name>
  <files>
    src/app/profile/layout.tsx
    src/app/profile/page.tsx
    src/app/mentorship/settings/page.tsx
  </files>
  <action>
1. Create `src/app/profile/layout.tsx`:
   - Wrap children in `MentorshipProvider` (required because the settings page uses `useMentorship()` hook).
   - Use a simple layout without the mentorship-specific header banner or confidentiality notice. Just provide the context wrapper and a clean container:
     ```
     <MentorshipProvider>
       <div className="min-h-screen bg-base-200">
         <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
       </div>
     </MentorshipProvider>
     ```
   - Import MentorshipProvider from `@/contexts/MentorshipContext`.
   - Add metadata: title "Profile | Code with Ahsan".

2. Create `src/app/profile/page.tsx`:
   - Copy the ENTIRE content of `src/app/mentorship/settings/page.tsx` as-is.
   - Change the "Back to Dashboard" link from `/mentorship/dashboard` to `/mentorship/dashboard` (keep it - it still makes sense as the user might navigate from mentorship).
   - Keep ALL existing functionality intact (skill level, mentor/mentee forms, announcement card).

3. Delete `src/app/mentorship/settings/page.tsx` (remove the old route entirely).
  </action>
  <verify>
    - `ls src/app/profile/page.tsx src/app/profile/layout.tsx` confirms both files exist
    - `ls src/app/mentorship/settings/page.tsx` confirms old file is gone (should error)
    - `npm run build` compiles without errors (or at minimum `npx tsc --noEmit` passes)
  </verify>
  <done>
    /profile route exists with the settings page content wrapped in MentorshipProvider. Old /mentorship/settings route is removed.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add Profile link to ProfileMenu and update all references</name>
  <files>
    src/components/ProfileMenu.tsx
    src/components/mentorship/DiscordValidationBanner.tsx
    src/app/mentorship/dashboard/page.tsx
    src/app/mentorship/requests/page.tsx
    src/lib/email.ts
    scripts/find-mentees-without-discord.ts
    scripts/find-invalid-discord-users.ts
    public/sitemap.xml
  </files>
  <action>
1. Update `src/components/ProfileMenu.tsx`:
   - Add `import Link from "next/link"` at the top.
   - In the dropdown `<ul>` menu, add a Profile link BEFORE the Logout button:
     ```
     <li>
       <Link href="/profile" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
         <svg className="w-5 h-5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
         </svg>
         Profile
       </Link>
     </li>
     ```
   - The Profile link closes the dropdown on click (onClick={() => setIsOpen(false)}).

2. Update all `/mentorship/settings` references to `/profile`:
   - `src/components/mentorship/DiscordValidationBanner.tsx` line 50: Change href to `/profile`, change button text to "Update Profile"
   - `src/app/mentorship/dashboard/page.tsx` line 391: Change href to `/profile`
   - `src/app/mentorship/requests/page.tsx` line 175: Change href to `/profile`, change link text to "Update profile"
   - `src/lib/email.ts` lines 515 and 526: Change both URLs from `mentorship/settings` to `profile`, update anchor text from "Mentorship Settings" to "Profile Settings"
   - `scripts/find-mentees-without-discord.ts` line 167: Change URL from `/mentorship/settings` to `/profile`
   - `scripts/find-invalid-discord-users.ts` line 100: Change URL from `/mentorship/settings` to `/profile`
   - `public/sitemap.xml` line 96: Change `<loc>` from `mentorship/settings` to `profile`
  </action>
  <verify>
    - `grep -r "/mentorship/settings" src/ scripts/ public/` returns NO results (all references updated)
    - ProfileMenu.tsx contains both "Profile" link and "Logout" button
    - `npx tsc --noEmit` passes (no type errors from import changes)
  </verify>
  <done>
    ProfileMenu dropdown shows Profile link above Logout. All 8 files with /mentorship/settings references now point to /profile. Zero remaining references to the old route.
  </done>
</task>

</tasks>

<verification>
1. `grep -r "/mentorship/settings" .` returns zero matches (except possibly git history)
2. `grep -r '"/profile"' src/components/ProfileMenu.tsx` confirms Profile link exists
3. `npm run build` succeeds (full build verification)
4. Manual: Visit /profile - should show profile settings page with skill level, mentor/mentee form
5. Manual: Click avatar dropdown - should show "Profile" and "Logout" options
</verification>

<success_criteria>
- /profile route renders the settings page with all existing functionality (skill level, forms, announcements)
- ProfileMenu dropdown has two items: Profile (links to /profile) and Logout
- Zero references to /mentorship/settings remain in the codebase
- Old /mentorship/settings route is deleted
- Build passes with no errors
</success_criteria>

<output>
After completion, create `.planning/quick/11-move-settings-to-profile-route-and-add-p/11-SUMMARY.md`
</output>
