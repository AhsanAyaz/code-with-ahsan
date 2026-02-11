# Tier 1 Ship Blockers - Implementation Progress

**Branch:** `feature/v2.0-collaboration-roadmaps`
**Started:** 2026-02-09
**Review Source:** `.planning/PROJECTS-REVIEW.md`

---

## Completed (10/12)

### 1. Fix invitation API mismatch
- **File:** `src/app/projects/[id]/page.tsx:179-206`
- **Fix:** Frontend now parses `inviteInput` — if it contains `@` it sends `{ email }`, otherwise `{ discordUsername }`. Previously sent `emailOrDiscord` which the API didn't understand.

### 2. Add "Projects" to site navigation
- **File:** `src/data/headerNavLinks.js:9`
- **Fix:** Added `{ href: "/projects/discover", title: "Projects", icon: "projects" }` to `COMMUNITY_LINKS` array.

### 3. Wire up decline notification DM
- **File:** `src/app/api/projects/[id]/route.ts:143-175`
- **Fix:** Replaced `console.log` TODO with actual `sendDirectMessage()` call. Added `sendDirectMessage` to imports. Message includes project title, decline reason, and resubmission link.

### 4. Soft-delete declined projects
- **File:** `src/app/api/projects/[id]/route.ts:177-185`
- **Fix:** Changed `projectRef.delete()` to `projectRef.update({ status: "declined", declinedAt, declinedBy, declineReason })`.
- **File:** `src/types/mentorship.ts:114`
- **Fix:** Added `"declined"` to `ProjectStatus` union type.

### 5. Fix skill mismatch prop
- **File:** `src/app/projects/[id]/page.tsx:41-46, 529`
- **Fix:** Added `getSkillLevelFromRole()` helper that maps mentor→"advanced", mentee→"beginner". Replaced `undefined : undefined` tautology with actual derived value. Imported `MentorshipRole` type.

### 6. Enforce maxTeamSize in approval/acceptance
- **Files modified:**
  - `src/app/api/projects/[id]/applications/[userId]/route.ts` — Added member count query + capacity check before approval, added `memberCount: FieldValue.increment(1)` in batch
  - `src/app/api/projects/[id]/invitations/[userId]/route.ts` — Same capacity check + increment on acceptance
  - `src/app/api/projects/[id]/members/[memberId]/route.ts` — Added `memberCount: FieldValue.increment(-1)` on removal
  - `src/app/api/projects/route.ts:117` — Initialize `memberCount: 0` on project creation
  - `src/types/mentorship.ts:134` — Added `memberCount?: number` to `Project` interface

### 7. Add member self-removal (leave project) endpoint
- **File (new):** `src/app/api/projects/[id]/leave/route.ts`
- **Fix:** POST endpoint that validates userId, prevents creator from leaving (403), finds member by composite key, uses Firestore batch to atomically delete member + decrement memberCount, removes from Discord channel (non-blocking).
- **File:** `src/app/projects/[id]/page.tsx`
- **Fix:** Added `handleLeaveProject` function + "Leave Project" button visible only when `isMember && !isCreator`.

### 8. Add "My Projects" view (API filter + UI)
- **File:** `src/app/api/projects/route.ts`
- **Fix:** Added `?member=userId` query param support to GET handler. Queries `project_members` collection by userId, batch-fetches matching projects with `db.getAll()`.
- **File (new):** `src/app/projects/my/page.tsx`
- **Fix:** "My Projects" page with DaisyUI tabbed UI ("Created" / "Joined"), reuses ProjectCard, empty states with link to discover, redirects unauthenticated users.

### 9. Replace alert()/confirm() with DaisyUI modals/toasts
- **File (new):** `src/components/ui/Toast.tsx`
- **Fix:** ToastContainer with auto-dismiss (4s), supports success/error/info/warning types, positioned bottom-right.
- **File (new):** `src/components/ui/ConfirmModal.tsx`
- **Fix:** DaisyUI modal with customizable title, message, confirm label, and button styling. Includes backdrop click to cancel.
- **File:** `src/app/projects/[id]/page.tsx`
- **Fix:** Replaced all 10 `alert()` calls with `showToast()` and both `confirm()` calls with `showConfirm()` using destructive red styling. Zero browser dialogs remaining.

### 10. Add generateMetadata for Open Graph tags
- **File (new):** `src/app/projects/[id]/layout.tsx`
- **Fix:** Server component layout with `generateMetadata` that fetches project from Firestore. Includes OG tags (title, description, type, url, siteName), Twitter card, and tech stack as keywords. Truncates description to 160 chars. Nested inside parent MentorshipProvider layout.

---

## Not Started (2/12)

### 11. Make discovery/detail pages publicly readable (NOT in current task list — was item #10 in review)
- Requires Firestore rules update to allow unauthenticated reads on approved/active projects.

### 12. Server-side token verification (NOT in current task list — was item #2 in review)
- Major security fix: add `auth().verifyIdToken()` to all API routes.
- Deferred as it touches every endpoint and needs careful testing.

---

## Files Modified So Far

| File | Changes |
|------|---------|
| `src/app/projects/[id]/page.tsx` | Fixed invite payload, fixed skill mismatch prop, leave button, replaced all alert/confirm with Toast/ConfirmModal |
| `src/data/headerNavLinks.js` | Added Projects to community links |
| `src/app/api/projects/[id]/route.ts` | Wired decline DM, soft-delete, added sendDirectMessage import |
| `src/types/mentorship.ts` | Added "declined" to ProjectStatus, added memberCount to Project |
| `src/app/api/projects/[id]/applications/[userId]/route.ts` | maxTeamSize enforcement + memberCount increment |
| `src/app/api/projects/[id]/invitations/[userId]/route.ts` | maxTeamSize enforcement + memberCount increment |
| `src/app/api/projects/[id]/members/[memberId]/route.ts` | memberCount decrement on removal |
| `src/app/api/projects/route.ts` | Initialize memberCount: 0, added `?member=userId` filter |
| `src/app/api/projects/[id]/leave/route.ts` | **NEW** — Leave project endpoint |
| `src/app/projects/my/page.tsx` | **NEW** — My Projects page with Created/Joined tabs |
| `src/app/projects/[id]/layout.tsx` | **NEW** — Server layout with generateMetadata + OG tags |
| `src/components/ui/Toast.tsx` | **NEW** — Toast notification component |
| `src/components/ui/ConfirmModal.tsx` | **NEW** — Reusable confirmation modal |

---

## Resume Instructions

Tasks 1-10 complete. Remaining deferred items are #11 (Firestore rules) and #12 (server-side auth), both marked as out of scope for this sprint.
