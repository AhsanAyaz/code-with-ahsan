---
phase: quick-48
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # Task 1: Shared components
  - src/components/ProfileMenu.tsx
  - src/components/mentorship/MentorCard.tsx
  - src/components/mentorship/dashboard/ActiveMatchesWidget.tsx
  - src/components/mentorship/dashboard/ActionRequiredWidget.tsx
  - src/components/mentorship/MentorRegistrationForm.tsx
  - src/components/mentorship/BookingsList.tsx
  - src/components/projects/ProjectCard.tsx
  - src/components/projects/ShowcaseCard.tsx
  - src/components/projects/TeamRoster.tsx
  - src/components/roadmaps/RoadmapCard.tsx
  # Task 2: Mentorship pages
  - src/app/mentorship/page.tsx
  - src/app/mentorship/mentors/page.tsx
  - src/app/mentorship/mentors/[username]/MentorProfileClient.tsx
  - src/app/mentorship/requests/page.tsx
  - src/app/mentorship/my-matches/page.tsx
  - src/app/mentorship/dashboard/[matchId]/layout.tsx
  - src/app/mentorship/book/[mentorId]/page.tsx
  # Task 3: Admin, projects, roadmaps, courses pages
  - src/app/admin/pending/page.tsx
  - src/app/admin/mentors/page.tsx
  - src/app/admin/mentees/page.tsx
  - src/app/admin/projects/page.tsx
  - src/app/projects/[id]/page.tsx
  - src/app/projects/my/page.tsx
  - src/app/roadmaps/[id]/page.tsx
  - src/app/courses/[course]/submissions/page.tsx
autonomous: true

must_haves:
  truths:
    - "Every user profile image in the app uses the ProfileAvatar component"
    - "When a profile image fails to load, initials are shown as fallback"
    - "Avatar sizes match the original design (no visual regressions)"
    - "No raw <img> or <Image> tags remain for profile/user photos"
  artifacts:
    - path: "src/components/ProfileAvatar.tsx"
      provides: "Shared profile avatar component with initials fallback"
      contains: "ProfileAvatar"
  key_links:
    - from: "All 25 files"
      to: "src/components/ProfileAvatar.tsx"
      via: "import ProfileAvatar"
      pattern: "import ProfileAvatar from"
---

<objective>
Replace all inline profile image implementations (both `<img>` tags and Next.js `<Image>` components) across 25 files with the centralized `ProfileAvatar` component. This eliminates duplicated image error handling, provides consistent initials fallback, and reduces code per avatar from ~10-15 lines to 1 line.

Purpose: Unify all profile image rendering to use a single component with automatic error handling and initials fallback. Currently each avatar instance has its own ternary (photoURL ? img : fallback) pattern, leading to inconsistent fallback behavior and duplicated code.

Output: 25 files updated, 0 raw profile image tags remaining, all avatars show initials when images fail.
</objective>

<execution_context>
@.planning/quick/48-replace-all-profile-image-implementation/048-PLAN.md
</execution_context>

<context>
@src/components/ProfileAvatar.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace profile images in shared components (10 files)</name>
  <files>
    src/components/ProfileMenu.tsx
    src/components/mentorship/MentorCard.tsx
    src/components/mentorship/dashboard/ActiveMatchesWidget.tsx
    src/components/mentorship/dashboard/ActionRequiredWidget.tsx
    src/components/mentorship/MentorRegistrationForm.tsx
    src/components/mentorship/BookingsList.tsx
    src/components/projects/ProjectCard.tsx
    src/components/projects/ShowcaseCard.tsx
    src/components/projects/TeamRoster.tsx
    src/components/roadmaps/RoadmapCard.tsx
  </files>
  <action>
    For each file, replace the DaisyUI avatar wrapper pattern (`<div className="avatar"><div className="w-XX ...">...ternary...</div></div>`) OR the inline `<Image>`/`<img>` with a single `<ProfileAvatar>` call.

    **Import:** Add `import ProfileAvatar from "@/components/ProfileAvatar";` to each file. Remove `import Image from "next/image"` ONLY IF no other usage of `<Image>` remains in the file. Remove `import { useState } from "react"` ONLY IF imageError state was the only usage (check ActiveMatchesWidget.tsx especially).

    **Size mapping** (Tailwind class -> ProfileAvatar size prop):
    - `w-6 h-6` (24px) -> `size="xs"`
    - `w-8 h-8` (32px) -> `size="sm"`
    - `w-10 h-10` (40px) -> `size="md"`
    - `w-12 h-12` (48px) -> `size="lg"`
    - `w-16 h-16` (64px) -> `size="xl"`
    - `w-20 h-20` (80px) -> `size={80}`
    - `w-5 h-5` (20px) -> `size={20}`

    **Ring mapping:** If the inner div has `ring ring-primary ring-offset-base-100 ring-offset-2` (or similar), add `ring` prop. NOTE: Some avatars use `ring-secondary` or `ring-success` color instead of primary. The ProfileAvatar only supports `ring-primary`. For non-primary ring colors, wrap `<ProfileAvatar>` in a plain div and apply the ring manually, e.g. `<div className="ring ring-success ring-offset-base-100 ring-offset-2 rounded-full"><ProfileAvatar ... /></div>`. However, if the color difference is only secondary/success, prefer simplifying to just `ring` (primary) for consistency -- the ring color is a minor detail.

    **File-specific instructions:**

    1. **ProfileMenu.tsx** (line 94-110): Replace the entire `<div className="avatar">` block. Remove `imageError` state and `Image` import (check if Image is used elsewhere first). The MatchCard sub-component manages its own imageError state -- that will be removed too.
       ```tsx
       <ProfileAvatar photoURL={currentUser?.photoURL} displayName={currentUser?.displayName} email={currentUser?.email} size="md" />
       ```

    2. **ActiveMatchesWidget.tsx** (line 12-34): This has a sub-component `MatchCard` with its own `useState` for `imageError`. Replace the entire avatar block in MatchCard. Remove the `imageError` state, `hasValidPhoto` variable, `Image` import, and `useState` import (if no other state).
       ```tsx
       <ProfileAvatar photoURL={match.partnerProfile?.photoURL} displayName={match.partnerProfile?.displayName} size="lg" ring />
       ```

    3. **ActionRequiredWidget.tsx** (line 54-66): Replace avatar block. Note: uses `(req as any).menteeProfile` pattern.
       ```tsx
       <ProfileAvatar photoURL={(req as any).menteeProfile?.photoURL} displayName={(req as any).menteeProfile?.displayName} size="md" />
       ```

    4. **MentorCard.tsx** (line 232-245): Replace avatar block.
       ```tsx
       <ProfileAvatar photoURL={mentor.photoURL} displayName={mentor.displayName} size="xl" ring />
       ```

    5. **MentorRegistrationForm.tsx** (line 384-400): Replace avatar block. Uses `w-20 h-20` which needs custom size.
       ```tsx
       <ProfileAvatar photoURL={photoURL} displayName={displayName} size={80} ring />
       ```
       Where `displayName` comes from whatever variable holds the user's name in that scope (check the component).

    6. **BookingsList.tsx** (line 188-193): This one is NOT wrapped in a DaisyUI avatar div. It's a simple conditional `{partner?.photoURL && (<img .../>)}`. Replace with:
       ```tsx
       <ProfileAvatar photoURL={partner?.photoURL} displayName={partner?.displayName} size="sm" />
       ```
       Note: Always render the avatar (remove the `&&` conditional). ProfileAvatar handles missing photos gracefully with initials.

    7. **ProjectCard.tsx** (line 56-63): Uses `<Image>` with `width={24} height={24}`. Replace with:
       ```tsx
       <ProfileAvatar photoURL={project.creatorProfile?.photoURL} displayName={project.creatorProfile?.displayName} size="xs" />
       ```
       Remove the `&& (` conditional -- always show avatar.

    8. **ShowcaseCard.tsx** (line 46-53): Uses `<Image>` with `width={20} height={20}`. Replace with:
       ```tsx
       <ProfileAvatar photoURL={project.creatorProfile?.photoURL} displayName={project.creatorProfile?.displayName} size={20} />
       ```
       Remove conditional.

    9. **TeamRoster.tsx** (line 37-44): Uses `<Image>` with `width={48} height={48}`. Replace with:
       ```tsx
       <ProfileAvatar photoURL={member.userProfile?.photoURL} displayName={member.userProfile?.displayName} size="lg" />
       ```
       Remove conditional.

    10. **RoadmapCard.tsx** (line 37-44): Uses `<Image>` with `width={24} height={24}`. Replace with:
        ```tsx
        <ProfileAvatar photoURL={roadmap.creatorProfile?.photoURL} displayName={roadmap.creatorProfile?.displayName} size="xs" />
        ```
        Remove conditional.

    **IMPORTANT cleanup per file:**
    - Remove `eslint-disable-next-line @next/next/no-img-element` comments that were above `<img>` tags
    - Remove unused `Image` imports from `next/image` (only if no other `<Image>` usage)
    - Remove unused `useState` imports (only if no other state in the component)
    - Remove any `imageError`/`hasValidPhoto` state variables that become unused
    - Keep the `rounded-full` class on any parent wrapper if it was applying to something other than the avatar image

    **DO NOT touch:**
    - `src/app/logic-buddy/LogicBuddyClient.tsx` -- its avatars are for the AI bot (`/static/images/avatar.jpeg`), not user profiles
    - `src/app/api/mentorship/announcement-image/*` -- server-side OG image generation, not UI
    - `src/components/mentorship/MentorAnnouncementCard.tsx` -- passes photoURL as data to API, not rendering an image
    - `src/app/mentorship/onboarding/page.tsx` -- only passes photoURL as form data, no image rendering
    - `src/app/profile/page.tsx` -- only passes photoURL as data, no image rendering
  </action>
  <verify>
    Run `npx tsc --noEmit` to check for TypeScript errors.
    Run `grep -rn 'className="avatar"' src/components/` to confirm no DaisyUI avatar wrappers remain in shared components.
    Run `grep -rn '<img' src/components/ProfileMenu.tsx src/components/mentorship/MentorCard.tsx src/components/mentorship/dashboard/ActiveMatchesWidget.tsx src/components/mentorship/dashboard/ActionRequiredWidget.tsx src/components/mentorship/MentorRegistrationForm.tsx src/components/mentorship/BookingsList.tsx src/components/projects/ProjectCard.tsx src/components/projects/ShowcaseCard.tsx src/components/projects/TeamRoster.tsx src/components/roadmaps/RoadmapCard.tsx` to confirm no raw img tags remain.
  </verify>
  <done>
    All 10 shared component files use ProfileAvatar. No raw `<img>` or `<Image>` tags for profile photos remain in these files. TypeScript compiles without errors.
  </done>
</task>

<task type="auto">
  <name>Task 2: Replace profile images in mentorship pages (7 files)</name>
  <files>
    src/app/mentorship/page.tsx
    src/app/mentorship/mentors/page.tsx
    src/app/mentorship/mentors/[username]/MentorProfileClient.tsx
    src/app/mentorship/requests/page.tsx
    src/app/mentorship/my-matches/page.tsx
    src/app/mentorship/dashboard/[matchId]/layout.tsx
    src/app/mentorship/book/[mentorId]/page.tsx
  </files>
  <action>
    Same replacement pattern as Task 1. For each file, add `import ProfileAvatar from "@/components/ProfileAvatar";` and replace avatar blocks.

    **File-specific instructions:**

    1. **mentorship/page.tsx** (line 201-209): w-16 ring -> `size="xl" ring`
       ```tsx
       <ProfileAvatar photoURL={mentor.photoURL} displayName={mentor.displayName} size="xl" ring />
       ```

    2. **mentorship/mentors/page.tsx** (line 122-130): w-16 ring -> `size="xl" ring`
       ```tsx
       <ProfileAvatar photoURL={mentor.photoURL} displayName={mentor.displayName} size="xl" ring />
       ```

    3. **MentorProfileClient.tsx** (line 541-550): w-32 h-32 (128px) ring with ring-offset-4 -> `size={128} ring`
       ```tsx
       <ProfileAvatar photoURL={mentor.photoURL} displayName={mentor.displayName} size={128} ring />
       ```

    4. **requests/page.tsx** (line 214-224): w-16 ring (ring-secondary) -> `size="xl" ring`
       Use `ring` prop (primary is fine, consistent).
       ```tsx
       <ProfileAvatar photoURL={request.menteeProfile?.photoURL} displayName={request.menteeProfile?.displayName} size="xl" ring />
       ```

    5. **my-matches/page.tsx** (line 152-162 and line 239-249): TWO avatar instances.
       - First (line 152): w-12, no ring -> `size="lg"`
         ```tsx
         <ProfileAvatar photoURL={match.partnerProfile?.photoURL} displayName={match.partnerProfile?.displayName} size="lg" />
         ```
       - Second (line 239): w-16, ring (ring-success) -> `size="xl" ring`
         ```tsx
         <ProfileAvatar photoURL={match.partnerProfile?.photoURL} displayName={match.partnerProfile?.displayName} size="xl" ring />
         ```

    6. **dashboard/[matchId]/layout.tsx** (line 358-367): w-16 ring -> `size="xl" ring`
       ```tsx
       <ProfileAvatar photoURL={currentMatchDetails.partner.photoURL} displayName={currentMatchDetails.partner.displayName} size="xl" ring />
       ```

    7. **book/[mentorId]/page.tsx** (line 84-89): w-16 h-16, no ring, no DaisyUI avatar wrapper. Simple conditional.
       ```tsx
       <ProfileAvatar photoURL={mentor.photoURL} displayName={mentor.displayName} size="xl" />
       ```
       Remove the `{mentor.photoURL && (...)}` conditional -- always show avatar.

    **Cleanup:** Same rules as Task 1 -- remove unused Image imports, eslint-disable comments, unused state variables.
  </action>
  <verify>
    Run `npx tsc --noEmit` to check for TypeScript errors.
    Run `grep -rn 'className="avatar"' src/app/mentorship/` to confirm no DaisyUI avatar wrappers remain in mentorship pages.
    Run `grep -rn '<img' src/app/mentorship/page.tsx src/app/mentorship/mentors/page.tsx src/app/mentorship/mentors/\[username\]/MentorProfileClient.tsx src/app/mentorship/requests/page.tsx src/app/mentorship/my-matches/page.tsx src/app/mentorship/dashboard/\[matchId\]/layout.tsx src/app/mentorship/book/\[mentorId\]/page.tsx` to confirm no raw img tags.
  </verify>
  <done>
    All 7 mentorship page files use ProfileAvatar. No raw `<img>` or `<Image>` tags for profile photos remain. TypeScript compiles clean.
  </done>
</task>

<task type="auto">
  <name>Task 3: Replace profile images in admin, projects, roadmaps, and courses pages (8 files)</name>
  <files>
    src/app/admin/pending/page.tsx
    src/app/admin/mentors/page.tsx
    src/app/admin/mentees/page.tsx
    src/app/admin/projects/page.tsx
    src/app/projects/[id]/page.tsx
    src/app/projects/my/page.tsx
    src/app/roadmaps/[id]/page.tsx
    src/app/courses/[course]/submissions/page.tsx
  </files>
  <action>
    Same replacement pattern. Add `import ProfileAvatar from "@/components/ProfileAvatar";` and replace all avatar blocks.

    **Admin pages have "streamer mode" with `getAnonymizedDisplayName()` helper.** When replacing avatars in admin pages (pending, mentors, mentees), pass the anonymized display name to ProfileAvatar so initials match the displayed name:
    ```tsx
    <ProfileAvatar
      photoURL={p.photoURL}
      displayName={getAnonymizedDisplayName(p.displayName, p.uid, isStreamerMode)}
      size="xl"
      ring
    />
    ```

    **File-specific instructions:**

    1. **admin/pending/page.tsx** -- 3 avatar instances:
       - Line 193: Main card avatar, w-16 ring -> `size="xl" ring`, use anonymized name
       - Line 458: Review modal avatar, w-16 ring -> `size="xl" ring`, use anonymized name for `reviewMentor`
       - Line 535: Mentee review avatar, w-10, no ring -> `size="md"`, use `review.menteeName` for displayName, `review.menteePhoto` for photoURL

    2. **admin/mentors/page.tsx** -- 5 avatar instances:
       - Line 584: Main card avatar, w-16 ring -> `size="xl" ring`, anonymized name
       - Line 894: Mentorship partner avatar, w-12, no ring -> `size="lg"`, use `mentorship.partnerProfile?.displayName`
       - Line 1033: Review modal avatar, w-16 ring -> `size="xl" ring`, anonymized name
       - Line 1110: Mentee review avatar, w-10, no ring -> `size="md"`, `review.menteePhoto`/`review.menteeName`
       - Line 1436: Mentorship detail avatar, w-12, no ring -> `size="lg"`, `mentorship.partnerProfile`

    3. **admin/mentees/page.tsx** -- 5 avatar instances:
       - Line 574: Main card avatar, w-16 ring -> `size="xl" ring`, anonymized name
       - Line 859: Mentorship partner avatar, w-12, no ring -> `size="lg"`
       - Line 998: Review modal avatar, w-16 ring -> `size="xl" ring`, anonymized name
       - Line 1075: Mentee review avatar, w-10, no ring -> `size="md"`
       - Line 1379: Mentorship detail avatar, w-12, no ring -> `size="lg"`

    4. **admin/projects/page.tsx** (line 302-307): w-10, no ring, uses fallback src `/default-avatar.png`. Replace with:
       ```tsx
       <ProfileAvatar photoURL={project.creatorProfile?.photoURL} displayName={project.creatorProfile?.displayName} size="md" />
       ```
       No need for `/default-avatar.png` -- ProfileAvatar shows initials as fallback.

    5. **projects/[id]/page.tsx** -- 3 avatar instances:
       - Line 624: Creator section, `<Image>` width={48} -> `size="lg"`. Remove conditional.
       - Line 796: Application card, `<Image>` width={40} -> `size="md"`. Remove conditional.
       - Line 932: Invitation card, `<Image>` width={32} -> `size="sm"`. Remove conditional.

    6. **projects/my/page.tsx** (line 321-327): Uses `<Image>` width={24} in DaisyUI avatar wrapper -> `size="xs"`. Remove conditional.

    7. **roadmaps/[id]/page.tsx** -- 2 avatar instances:
       - Line 237: Creator section, `<Image>` width={48} -> `size="lg"`. Remove conditional.
       - Line 305: Related mentor card, `<Image>` width={48} -> `size="lg"`. Remove conditional.

    8. **courses/[course]/submissions/page.tsx** (line 211-215): `<img>` w-10 h-10 rounded-full -> `size="md"`. Remove eslint-disable comment.
       ```tsx
       <ProfileAvatar photoURL={sub.by.photoURL} displayName={sub.by.name} size="md" />
       ```

    **Cleanup:** Remove all DaisyUI `<div className="avatar">` wrappers around the replaced avatars, along with the inner sizing divs. Remove unused Image imports (only if no other `<Image>` usage remains in the file -- be careful, `projects/[id]/page.tsx` likely uses `<Image>` elsewhere). Remove eslint-disable comments for img elements.
  </action>
  <verify>
    Run `npx tsc --noEmit` to check for TypeScript errors.
    Run `npm run build` to verify the full build passes (catches SSR issues, unused imports, etc.).
    Run `grep -rn 'className="avatar"' src/app/admin/ src/app/projects/ src/app/roadmaps/ src/app/courses/` to confirm no DaisyUI avatar wrappers remain.
    Run `grep -rn 'import ProfileAvatar' src/` to count total imports -- should be 25+ (the component itself plus all consumers).
  </verify>
  <done>
    All 8 files updated. Full build passes. No raw `<img>` or `<Image>` tags for profile photos remain anywhere in the codebase (excluding LogicBuddy AI avatar and API routes). Every profile avatar shows initials as fallback when images fail to load.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` -- TypeScript compilation passes
2. `npm run build` -- Full Next.js build succeeds
3. `grep -rn 'className="avatar"' src/` -- Only LogicBuddyClient.tsx should have DaisyUI avatar wrappers (for AI bot, not user profiles)
4. `grep -rn 'import ProfileAvatar' src/` -- Should show 25+ files importing the component
5. Visual spot-check: Load the app and verify avatars render correctly on dashboard, mentor cards, admin pages
</verification>

<success_criteria>
- All 25 files updated to use ProfileAvatar component
- Zero raw `<img>` or `<Image>` tags for user profile photos (excluding AI bot avatar in LogicBuddy)
- TypeScript compilation and Next.js build both pass
- All avatars show initials fallback when photoURL is missing or fails to load
- Existing avatar sizes preserved (no visual regression)
</success_criteria>

<output>
After completion, create `.planning/quick/48-replace-all-profile-image-implementation/048-SUMMARY.md`
</output>
