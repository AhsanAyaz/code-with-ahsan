---
phase: quick-19
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/discord.ts
  - src/app/api/roadmaps/route.ts
  - src/app/api/roadmaps/[id]/route.ts
  - src/app/mentorship/admin/page.tsx
autonomous: true
must_haves:
  truths:
    - "Moderator notification includes clickable roadmap URL for review"
    - "Admin can delete any roadmap regardless of status"
    - "Creator receives Discord DM when roadmap is approved or changes requested"
  artifacts:
    - path: "src/lib/discord.ts"
      provides: "sendRoadmapSubmissionNotification with roadmap URL in message"
    - path: "src/app/api/roadmaps/route.ts"
      provides: "creatorProfile includes discordUsername"
    - path: "src/app/api/roadmaps/[id]/route.ts"
      provides: "DELETE handler allows admin to delete any status"
    - path: "src/app/mentorship/admin/page.tsx"
      provides: "Delete button in admin roadmaps tab"
  key_links:
    - from: "src/lib/discord.ts"
      to: "Discord channel"
      via: "sendRoadmapSubmissionNotification"
      pattern: "codewithahsan\\.dev/roadmaps/"
    - from: "src/app/api/roadmaps/route.ts"
      to: "Firestore"
      via: "creatorProfile denormalization"
      pattern: "discordUsername.*creatorData"
---

<objective>
Fix three roadmap notification and admin issues: (1) add roadmap URL to moderator Discord notification, (2) enable admin deletion of any roadmap, (3) fix creator DM notifications by including discordUsername in creatorProfile.

Purpose: Moderators need a direct link to review submitted roadmaps. Admins need to delete roadmaps. Creator DMs are silently failing because discordUsername is missing from the denormalized profile.
Output: Working notifications with links, admin delete functionality, and functioning creator DMs.
</objective>

<context>
@src/lib/discord.ts
@src/app/api/roadmaps/route.ts
@src/app/api/roadmaps/[id]/route.ts
@src/app/mentorship/admin/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix moderator notification URL and creator DM discordUsername</name>
  <files>src/lib/discord.ts, src/app/api/roadmaps/route.ts</files>
  <action>
  Two changes:

  **1. Add roadmap URL to sendRoadmapSubmissionNotification (src/lib/discord.ts lines 1354-1403):**

  Update the message template in both branches (isNewVersion and not) to include a direct link.

  For new submissions:
  ```
  `**New Roadmap Submitted for Review**\n\n` +
  `**Title:** ${title}\n` +
  `**Submitted by:** ${creatorName}\n` +
  `**Review:** https://codewithahsan.dev/roadmaps/${roadmapId}\n\n` +
  `<@&${MODERATOR_ROLE_ID}> — Please review this roadmap submission.`
  ```

  For new versions (isNewVersion):
  ```
  `**New Roadmap Version Submitted for Review**\n\n` +
  `**Title:** ${title}\n` +
  `**Submitted by:** ${creatorName}\n` +
  `**Review:** https://codewithahsan.dev/roadmaps/${roadmapId}?preview=draft\n\n` +
  `<@&${MODERATOR_ROLE_ID}> — Please review this updated roadmap.`
  ```

  Note: For new versions, append `?preview=draft` so moderators see the draft version.

  **2. Include discordUsername in creatorProfile denormalization (src/app/api/roadmaps/route.ts line 167-171):**

  The POST handler creates the roadmap with `creatorProfile` but does NOT include `discordUsername`. Change:

  ```typescript
  creatorProfile: {
    displayName: creatorData?.displayName || "",
    photoURL: creatorData?.photoURL || "",
    username: creatorData?.username,
    discordUsername: creatorData?.discordUsername,
  },
  ```

  This is the root cause of creator DMs not sending - `roadmapData?.creatorProfile?.discordUsername` is always undefined because it was never stored. The `discordUsername` field exists in MentorshipProfile and the Roadmap type already has it in the creatorProfile interface.
  </action>
  <verify>
  - `grep -n "codewithahsan.dev/roadmaps" src/lib/discord.ts` shows URLs in both message branches
  - `grep -n "discordUsername" src/app/api/roadmaps/route.ts` shows discordUsername in creatorProfile object
  - `npx tsc --noEmit` passes (type check)
  </verify>
  <done>
  - Moderator notification messages include direct roadmap URL (with ?preview=draft for version updates)
  - New roadmaps store discordUsername in creatorProfile, enabling DM notifications to work
  </done>
</task>

<task type="auto">
  <name>Task 2: Enable admin delete for any roadmap status and add delete button to admin UI</name>
  <files>src/app/api/roadmaps/[id]/route.ts, src/app/mentorship/admin/page.tsx</files>
  <action>
  Two changes:

  **1. Update DELETE handler to allow admin deletion of any status (src/app/api/roadmaps/[id]/route.ts lines 703-790):**

  Currently the DELETE handler blocks deletion of approved roadmaps (line 763):
  ```typescript
  if (roadmapData?.status === "approved") {
    return NextResponse.json({ error: "Cannot delete approved roadmap" ... });
  }
  ```

  Change the permission logic: Keep canEditRoadmap check (creator or admin), but only block approved roadmap deletion for NON-admins. Admins should be able to delete any roadmap.

  Replace the status check block (lines 762-771) with:
  ```typescript
  // Non-admin users cannot delete approved roadmaps
  if (roadmapData?.status === "approved" && !permissionUser.isAdmin) {
    return NextResponse.json(
      {
        error: "Cannot delete approved roadmap",
        message: "Only admins can delete approved roadmaps.",
      },
      { status: 403 }
    );
  }
  ```

  Also add cleanup: when deleting, also delete the versions subcollection documents. After `await roadmapRef.delete()`, add:
  ```typescript
  // Clean up versions subcollection
  const versionsSnapshot = await db.collection("roadmaps").doc(id).collection("versions").get();
  const batch = db.batch();
  versionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  if (versionsSnapshot.docs.length > 0) {
    await batch.commit();
  }
  ```

  Wait - the parent doc is already deleted so subcollection refs might not work. Instead, delete versions BEFORE deleting the main doc. Move the versions cleanup before `await roadmapRef.delete()`.

  **2. Add Delete button to admin roadmaps UI (src/app/mentorship/admin/page.tsx):**

  a) Add a `handleDeleteRoadmap` function near the other roadmap handlers (after ~line 796):
  ```typescript
  const handleDeleteRoadmap = async (roadmapId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return;

    setRoadmapActionLoading(roadmapId);
    try {
      const response = await authFetch(`/api/roadmaps/${roadmapId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete roadmap");
      }
      toast.success("Roadmap deleted");
      setRoadmaps(prev => prev.filter(r => r.id !== roadmapId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete roadmap");
    } finally {
      setRoadmapActionLoading(null);
    }
  };
  ```

  b) Add a Delete button in the card-actions div (after the Request Changes button, around line 2648):
  ```tsx
  <button
    className="btn btn-error btn-sm"
    onClick={() => handleDeleteRoadmap(roadmap.id, roadmap.title)}
    disabled={roadmapActionLoading === roadmap.id}
  >
    Delete
  </button>
  ```
  </action>
  <verify>
  - `grep -n "handleDeleteRoadmap" src/app/mentorship/admin/page.tsx` shows the handler and button
  - `grep -n "isAdmin" src/app/api/roadmaps/[id]/route.ts` shows admin bypass for approved deletion
  - `npx tsc --noEmit` passes (type check)
  - `npm run build` succeeds
  </verify>
  <done>
  - Admin can delete roadmaps of any status (pending, draft, approved) from the admin dashboard
  - Non-admin creators can still only delete draft/pending roadmaps
  - Delete button appears in admin UI with confirmation dialog
  - Versions subcollection is cleaned up on delete
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no type errors
- `npm run build` completes successfully
- In src/lib/discord.ts, sendRoadmapSubmissionNotification includes `codewithahsan.dev/roadmaps/${roadmapId}` in message
- In src/app/api/roadmaps/route.ts, creatorProfile object includes discordUsername field
- In src/app/api/roadmaps/[id]/route.ts, DELETE handler allows admin to delete approved roadmaps
- In src/app/mentorship/admin/page.tsx, Delete button exists in roadmaps tab card-actions
</verification>

<success_criteria>
1. Moderator Discord notification for new roadmap submissions includes a direct URL to the roadmap
2. Moderator Discord notification for new versions includes URL with ?preview=draft
3. New roadmaps store discordUsername in creatorProfile, enabling future DM notifications
4. Admin can delete any roadmap (including approved) from the dashboard
5. Delete button with confirmation dialog appears in admin roadmaps tab
6. TypeScript compilation and build succeed
</success_criteria>

<output>
After completion, create `.planning/quick/19-fix-roadmap-notifications-add-direct-lin/19-SUMMARY.md`
</output>
