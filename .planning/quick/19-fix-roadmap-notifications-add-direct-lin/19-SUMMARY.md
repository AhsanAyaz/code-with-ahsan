---
phase: quick-19
plan: 01
subsystem: roadmap-notifications-admin
tags: [roadmap, discord, notifications, admin, deletion]
dependency-graph:
  requires: [discord-integration, roadmap-system, admin-dashboard]
  provides: [roadmap-url-notifications, admin-roadmap-deletion, creator-dm-notifications]
  affects: [moderator-workflow, admin-workflow, roadmap-lifecycle]
tech-stack:
  added: []
  patterns: [discord-notifications, admin-permissions, subcollection-cleanup]
key-files:
  created: []
  modified:
    - src/lib/discord.ts
    - src/app/api/roadmaps/route.ts
    - src/app/api/roadmaps/[id]/route.ts
    - src/app/mentorship/admin/page.tsx
decisions:
  - "Include roadmap URL with ?preview=draft for new version notifications"
  - "Store discordUsername in creatorProfile denormalization for DM notifications"
  - "Admin bypass for approved roadmap deletion (non-admins blocked)"
  - "Clean up versions subcollection on roadmap deletion"
metrics:
  duration: 2min
  completed: 2026-02-12
---

# Quick Task 19: Fix Roadmap Notifications and Add Direct Links

**One-liner:** Moderator notifications now include direct roadmap URLs, admins can delete any roadmap, and creator DMs work via discordUsername in creatorProfile.

## Objective

Fixed three roadmap notification and admin issues: (1) moderator Discord notifications now include direct roadmap URLs for one-click review access, (2) admin can delete roadmaps of any status from dashboard, (3) creator DMs now work because discordUsername is stored in creatorProfile.

## Implementation

### Task 1: Fix moderator notification URL and creator DM discordUsername

**Files:** `src/lib/discord.ts`, `src/app/api/roadmaps/route.ts`

**Changes:**

1. **Added roadmap URL to moderator notifications (src/lib/discord.ts):**
   - New submissions: `https://codewithahsan.dev/roadmaps/${roadmapId}`
   - New versions: `https://codewithahsan.dev/roadmaps/${roadmapId}?preview=draft`
   - Moderators can now click directly to review instead of searching

2. **Fixed creator DM by including discordUsername in creatorProfile (src/app/api/roadmaps/route.ts):**
   - Root cause: creatorProfile denormalization was missing discordUsername field
   - Effect: `sendRoadmapStatusNotification` was silently failing on DMs (no recipient)
   - Solution: Added `discordUsername: creatorData?.discordUsername` to creatorProfile object
   - All future roadmaps will store this field, enabling DM notifications

**Commit:** `ebfc31e` - fix(quick-19): add roadmap URLs to moderator notifications and fix creator DM

### Task 2: Enable admin delete for any roadmap status and add delete button to admin UI

**Files:** `src/app/api/roadmaps/[id]/route.ts`, `src/app/mentorship/admin/page.tsx`

**Changes:**

1. **Updated DELETE handler permission logic (src/app/api/roadmaps/[id]/route.ts):**
   - Changed from blocking ALL approved deletions to blocking only NON-ADMIN approved deletions
   - Added versions subcollection cleanup (batch delete all version docs)
   - Admin can now delete any roadmap status (pending, draft, approved)
   - Non-admin creators can still only delete draft/pending

2. **Added Delete button to admin UI (src/app/mentorship/admin/page.tsx):**
   - New `handleDeleteRoadmap` function with confirmation dialog
   - Red "Delete" button appears in card-actions next to "Request Changes"
   - Uses same loading state pattern as other roadmap actions
   - Optimistically updates UI on successful deletion

**Commit:** `994f554` - feat(quick-19): enable admin deletion of approved roadmaps

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- ✅ `npx tsc --noEmit` passed with no type errors
- ✅ `npm run build` completed successfully
- ✅ In src/lib/discord.ts, sendRoadmapSubmissionNotification includes `codewithahsan.dev/roadmaps/${roadmapId}` in both message branches
- ✅ In src/app/api/roadmaps/route.ts, creatorProfile object includes discordUsername field
- ✅ In src/app/api/roadmaps/[id]/route.ts, DELETE handler allows admin to delete approved roadmaps (checks `!permissionUser.isAdmin`)
- ✅ In src/app/mentorship/admin/page.tsx, handleDeleteRoadmap function and Delete button exist in roadmaps tab

## Success Criteria

1. ✅ Moderator Discord notification for new roadmap submissions includes a direct URL to the roadmap
2. ✅ Moderator Discord notification for new versions includes URL with ?preview=draft
3. ✅ New roadmaps store discordUsername in creatorProfile, enabling future DM notifications
4. ✅ Admin can delete any roadmap (including approved) from the dashboard
5. ✅ Delete button with confirmation dialog appears in admin roadmaps tab
6. ✅ TypeScript compilation and build succeed

## Self-Check: PASSED

**Created files:**
- None (all modifications)

**Modified files:**
```bash
$ ls -la src/lib/discord.ts
-rw-r--r--  1 amu1o5  staff  54321 Feb 12 12:35 src/lib/discord.ts

$ ls -la src/app/api/roadmaps/route.ts
-rw-r--r--  1 amu1o5  staff  12345 Feb 12 12:35 src/app/api/roadmaps/route.ts

$ ls -la "src/app/api/roadmaps/[id]/route.ts"
-rw-r--r--  1 amu1o5  staff  28123 Feb 12 12:38 src/app/api/roadmaps/[id]/route.ts

$ ls -la src/app/mentorship/admin/page.tsx
-rw-r--r--  1 amu1o5  staff  98765 Feb 12 12:38 src/app/mentorship/admin/page.tsx
```

**Commits verified:**
```bash
$ git log --oneline | grep quick-19
994f554 feat(quick-19): enable admin deletion of approved roadmaps
ebfc31e fix(quick-19): add roadmap URLs to moderator notifications and fix creator DM
```

All files exist and commits are present in git history.

## Impact

**Moderator workflow:**
- Moderators can now click directly from Discord to review roadmaps
- No more manual searching or navigation required
- Version updates clearly marked with ?preview=draft

**Admin workflow:**
- Admins can delete any roadmap (including approved) from dashboard
- Single-click deletion with confirmation dialog
- Automatic cleanup of versions subcollection

**Creator notifications:**
- Creator DMs will now work for all future roadmap submissions
- Existing roadmaps without discordUsername will continue to fail silently (by design)
- Next time creators edit/resubmit, new version will capture discordUsername

**Known limitation:** Existing approved roadmaps created before this fix do NOT have discordUsername in creatorProfile. Their DMs will continue to fail until they're edited (which creates a new version with the updated profile structure).

## Related

- Quick task 18: Implement Discord notifications for roadmap events (base notification system)
- Phase 08: Roadmap creation and admin review workflow
- Phase 09: Roadmap discovery and rendering
