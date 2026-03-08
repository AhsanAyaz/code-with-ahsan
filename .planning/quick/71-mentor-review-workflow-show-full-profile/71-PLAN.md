---
phase: quick-71
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/types/mentorship.ts
  - src/app/admin/pending/page.tsx
  - src/app/api/mentorship/admin/profiles/route.ts
  - src/lib/discord.ts
  - src/app/profile/page.tsx
autonomous: true
requirements: [QUICK-71]

must_haves:
  truths:
    - "Admin sees full profile details (bio, LinkedIn, major projects, CV, skills breakdown, Discord username) in the expandable section"
    - "Admin can request changes with feedback message that is sent as Discord DM to the mentor"
    - "Mentor profile status is set to changes_requested when admin requests changes"
    - "Mentor sees changes_requested status and admin feedback on their profile page"
    - "Mentor can update their profile and resubmit, which sets status back to pending"
  artifacts:
    - path: "src/app/admin/pending/page.tsx"
      provides: "Full profile details in expandable section, Request Changes button with feedback prompt"
    - path: "src/app/api/mentorship/admin/profiles/route.ts"
      provides: "changes_requested status support with feedback and Discord DM"
    - path: "src/lib/discord.ts"
      provides: "sendMentorChangesRequestedNotification function"
    - path: "src/app/profile/page.tsx"
      provides: "Changes requested banner with feedback and resubmit button"
  key_links:
    - from: "src/app/admin/pending/page.tsx"
      to: "/api/mentorship/admin/profiles"
      via: "PUT with status=changes_requested and feedback"
      pattern: "fetch.*admin/profiles.*changes_requested"
    - from: "src/app/api/mentorship/admin/profiles/route.ts"
      to: "src/lib/discord.ts"
      via: "sendMentorChangesRequestedNotification"
      pattern: "sendMentorChangesRequestedNotification"
    - from: "src/app/profile/page.tsx"
      to: "/api/mentorship/profile"
      via: "PUT with resubmit flag to reset status to pending"
      pattern: "fetch.*mentorship/profile.*status.*pending"
---

<objective>
Improve the admin mentor review workflow with three enhancements: (1) show full profile details in the expandable section, (2) add a "Request Changes" action with Discord DM notification, and (3) allow mentor resubmission after changes are requested.

Purpose: Admins currently see very little in the expandable profile section and can only accept/decline. They need to see everything the mentor submitted to make informed decisions, and they need a way to ask for corrections (e.g., wrong LinkedIn URL) without fully declining the application.

Output: Enhanced admin pending page, updated API with changes_requested status, Discord DM notification, and mentor-facing resubmission flow.
</objective>

<execution_context>
@/home/ahsan/.claude/get-shit-done/workflows/execute-plan.md
@/home/ahsan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<interfaces>
<!-- Key types and contracts the executor needs -->

From src/types/mentorship.ts:
```typescript
export interface MentorshipProfile {
  uid: string;
  username?: string;
  role: MentorshipRole;
  displayName: string;
  email: string;
  photoURL: string;
  discordUsername?: string;
  discordUsernameValidated?: boolean;
  status?: "pending" | "accepted" | "declined" | "disabled";
  skillLevel?: "beginner" | "intermediate" | "advanced";
  expertise?: string[];
  currentRole?: string;
  bio?: string;
  resumeURL?: string;
  cvUrl?: string;
  linkedinUrl?: string;
  majorProjects?: string;
  availability?: Record<string, string[]>;
  maxMentees?: number;
  isPublic?: boolean;
  // ...mentee fields omitted
}
```

From src/types/admin.ts:
```typescript
export interface ProfileWithDetails extends MentorshipProfile {
  cvUrl?: string;
  majorProjects?: string;
  adminNotes?: string;
  acceptedAt?: string;
  disabledSessionsCount?: number;
  avgRating?: number;
  ratingCount?: number;
}
```

From src/lib/discord.ts:
```typescript
export async function sendDirectMessage(discordUsername: string, message: string): Promise<boolean>;
// Pattern reference: sendRoadmapStatusNotification wraps sendDirectMessage with formatted message
```

Admin profiles API (PUT /api/mentorship/admin/profiles):
- Accepts: { uid, status, adminNotes, reactivateSessions, discordUsername }
- Valid statuses: ['pending', 'accepted', 'declined', 'disabled']
- Sends email notifications on status change

Profile API (PUT /api/mentorship/profile):
- Accepts: { uid, ...profileFields }
- Updates profile fields and sets updatedAt
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add changes_requested status, Discord DM notification, and API support</name>
  <files>
    src/types/mentorship.ts,
    src/app/api/mentorship/admin/profiles/route.ts,
    src/lib/discord.ts,
    src/app/api/mentorship/profile/route.ts
  </files>
  <action>
1. In `src/types/mentorship.ts`, add `"changes_requested"` to the MentorshipProfile status union type:
   ```
   status?: "pending" | "accepted" | "declined" | "disabled" | "changes_requested";
   ```
   Also add two new optional fields to MentorshipProfile:
   ```
   changesFeedback?: string;       // Admin feedback when requesting changes
   changesFeedbackAt?: Date;       // When changes were requested
   ```

2. In `src/lib/discord.ts`, add a new function `sendMentorChangesRequestedNotification` following the pattern of `sendRoadmapStatusNotification`:
   ```typescript
   export async function sendMentorChangesRequestedNotification(
     discordUsername: string,
     mentorName: string,
     feedback: string
   ): Promise<boolean>
   ```
   Message format:
   ```
   Hi {mentorName}, changes have been requested on your mentor application.

   Feedback from admin: {feedback}

   Please update your profile and resubmit at https://codewithahsan.dev/profile
   ```
   Guard against empty discordUsername (return false with log.warn). Wrap in try/catch, log errors, return false on failure.

3. In `src/app/api/mentorship/admin/profiles/route.ts`:
   - Add `"changes_requested"` to the valid statuses array (line ~102): `['pending', 'accepted', 'declined', 'disabled', 'changes_requested']`
   - Import `sendMentorChangesRequestedNotification` from `@/lib/discord`
   - Accept `feedback` from the request body (alongside uid, status, etc.)
   - When `status === 'changes_requested'`:
     - Require feedback (min 10 chars, same pattern as roadmap request-changes)
     - Store `changesFeedback` and `changesFeedbackAt: new Date()` in the profile update
     - After updating Firestore, fire-and-forget call `sendMentorChangesRequestedNotification` with the mentor's discordUsername, displayName, and feedback
   - Update the response message for changes_requested: `"Changes requested successfully"`

4. In `src/app/api/mentorship/profile/route.ts` PUT handler:
   - After the existing profile update logic, check if the request body contains `resubmit: true`
   - If resubmit is true AND the current profile status is `changes_requested`, additionally update `status: "pending"` and clear `changesFeedback` and `changesFeedbackAt` (set to null/delete)
   - This allows mentors to resubmit after editing their profile
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
    - MentorshipProfile type includes changes_requested status and feedback fields
    - Admin API accepts changes_requested status with feedback, sends Discord DM
    - Profile API supports resubmit flag to reset status from changes_requested to pending
    - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Enhance admin pending page UI with full profile details and Request Changes button</name>
  <files>src/app/admin/pending/page.tsx</files>
  <action>
1. **Expand the "View Full Profile Details" collapse section** (currently at line ~358). Replace the current sparse content with a comprehensive grid showing ALL profile fields available on ProfileWithDetails. Add these sections in a 2-column grid (md:grid-cols-2):

   - **Discord Username**: Show `p.discordUsername` with validation badge (green check if `p.discordUsernameValidated`, warning if not). Show the inline edit functionality that already exists.
   - **LinkedIn**: Show `p.linkedinUrl` as a clickable link (open in new tab), or "Not provided" if missing.
   - **Bio**: Show `p.bio` (full text, span 2 columns if long). Already partially there but may be conditional.
   - **Major Projects**: Show `p.majorProjects` (whitespace-pre-wrap, span 2 columns). Already partially there.
   - **CV/Resume**: Show `p.cvUrl` as link. Already there.
   - **Skills/Expertise**: Show `p.expertise` as badge tags (already shown in card header, but repeat here for completeness with full list).
   - **Max Mentees**: Show `p.maxMentees` value.
   - **Availability**: Show days from `p.availability` object keys as comma-separated list.
   - **Public Profile**: Show `p.isPublic` as Yes/No.
   - **Username**: Show `p.username`.
   - **Registration Date**: Already there, keep it.
   - **Skill Level**: Show `p.skillLevel` with appropriate badge color.

   Use consistent styling: `<h4 className="font-semibold text-sm mb-1">Label</h4>` for labels, `<p className="text-sm text-base-content/70">` for values. Show "Not provided" in italic for missing optional fields.

2. **Add "Request Changes" button** alongside Accept and Decline in the action buttons area (line ~286). Only show when `p.status === "pending"` or `p.status === "changes_requested"`:
   ```jsx
   <button
     className="btn btn-warning btn-sm"
     disabled={actionLoading === p.uid}
     onClick={() => handleRequestChanges(p.uid)}
   >
     {actionLoading === p.uid ? <span className="loading loading-spinner loading-xs"></span> : "Request Changes"}
   </button>
   ```

3. **Add `handleRequestChanges` function** following the exact pattern from `src/app/admin/roadmaps/page.tsx` handleRequestChanges:
   - Use `prompt()` to get feedback from admin with message "Please describe what changes are needed (min 10 characters):"
   - Validate feedback length >= 10 chars, show toast error if too short
   - Call PUT `/api/mentorship/admin/profiles` with `{ uid, status: "changes_requested", feedback }`
   - On success: remove from profiles list (same as accept/decline), show toast "Changes requested - mentor notified via Discord"
   - On failure: show toast error

4. **Update `getStatusBadge`** to handle `"changes_requested"` status:
   ```jsx
   case "changes_requested":
     return <span className="badge badge-warning">Changes Requested</span>;
   ```

5. **Also fetch profiles with changes_requested status**: Update the initial fetch URL to include changes_requested profiles alongside pending. Change the fetch to `/api/mentorship/admin/profiles?role=mentor&status=pending` but ALSO add a second fetch for `status=changes_requested` and merge results. OR better: fetch without status filter and filter client-side to show pending + changes_requested. The simplest approach: make two parallel fetches (pending + changes_requested) and combine the results into the profiles state.
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
    - Expandable profile section shows all mentor profile fields (bio, LinkedIn, projects, CV, Discord, skills, availability, etc.)
    - Request Changes button appears for pending/changes_requested profiles
    - Admin can provide feedback via prompt(), mentor is notified via Discord DM
    - Changes_requested profiles also appear in the pending mentors list
    - Status badge shows "Changes Requested" with warning styling
  </done>
</task>

<task type="auto">
  <name>Task 3: Add changes_requested banner and resubmit button on mentor profile page</name>
  <files>src/app/profile/page.tsx</files>
  <action>
1. **Add a prominent alert banner** when `profile.status === "changes_requested"`. Place it after the header section (line ~258) and before the Skill Level card. Use DaisyUI alert-warning:
   ```jsx
   {profile.status === "changes_requested" && (
     <div className="alert alert-warning shadow-lg">
       <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
       </svg>
       <div>
         <h3 className="font-bold">Changes Requested</h3>
         <p className="text-sm">An admin has requested changes to your mentor application. Please review the feedback below, update your profile, and resubmit.</p>
         {profile.changesFeedback && (
           <div className="mt-2 p-3 bg-warning/20 rounded-lg">
             <p className="text-sm font-semibold">Admin Feedback:</p>
             <p className="text-sm mt-1">{profile.changesFeedback}</p>
           </div>
         )}
       </div>
     </div>
   )}
   ```

2. **Add a "Resubmit Application" button** at the bottom of the form card (after the form, before the Mentor Announcement section). Only show when `profile.status === "changes_requested"`:
   ```jsx
   {profile.status === "changes_requested" && (
     <div className="mt-6 pt-4 border-t border-base-300">
       <button
         className="btn btn-primary btn-block"
         onClick={handleResubmit}
         disabled={isSubmitting}
       >
         {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : "Resubmit Application for Review"}
       </button>
       <p className="text-xs text-base-content/60 text-center mt-2">
         This will submit your updated profile for admin review
       </p>
     </div>
   )}
   ```

3. **Add `handleResubmit` function**:
   ```typescript
   const handleResubmit = async () => {
     if (!user) return;
     setIsSubmitting(true);
     try {
       const response = await fetch("/api/mentorship/profile", {
         method: "PUT",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ uid: user.uid, resubmit: true }),
       });
       if (response.ok) {
         await refreshProfile();
         toast.success("Your application has been resubmitted for review!");
       } else {
         const error = await response.json();
         toast.error("Failed to resubmit: " + error.error);
       }
     } catch (error) {
       console.error("Error resubmitting:", error);
       toast.error("An error occurred. Please try again.");
     } finally {
       setIsSubmitting(false);
     }
   };
   ```

4. **Ensure the MentorshipProfile type in MentorshipContext** also includes the new fields. Check `src/contexts/MentorshipContext.tsx` - if it imports MentorshipProfile from `@/types/mentorship`, no changes needed. If it defines its own interface, add `changesFeedback?: string` and `status` with `changes_requested` to it.
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx tsc --noEmit 2>&1 | head -30 && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Mentor sees warning banner with admin feedback when status is changes_requested
    - Resubmit button appears below the profile form
    - Clicking resubmit resets status to pending and clears feedback
    - Application builds successfully without errors
  </done>
</task>

</tasks>

<verification>
1. TypeScript compilation passes: `npx tsc --noEmit`
2. Build succeeds: `npm run build`
3. Verify the full flow:
   - Admin visits /admin/pending, sees full profile details in expandable section
   - Admin clicks "Request Changes", enters feedback
   - API sets status to changes_requested, stores feedback, sends Discord DM
   - Mentor visits /profile, sees warning banner with feedback
   - Mentor edits profile and clicks "Resubmit Application"
   - Status resets to pending, mentor reappears in admin pending list
</verification>

<success_criteria>
- Admin expandable profile shows all mentor fields (bio, LinkedIn, CV, projects, Discord, skills, availability, etc.)
- Request Changes button sends feedback to mentor via Discord DM
- Mentor profile status changes to changes_requested with stored feedback
- Mentor sees feedback banner and can resubmit (status resets to pending)
- Application builds and TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/71-mentor-review-workflow-show-full-profile/71-SUMMARY.md`
</output>
