---
phase: "06"
plan: "01"
subsystem: "projects-team"
tags: ["types", "validation", "discord", "security-rules", "infrastructure"]
requires: ["05-01", "05-02"]
provides: ["team-formation-types", "skill-matching", "discord-member-mgmt"]
affects: ["06-02", "06-03"]
tech-stack:
  added: ["lodash.debounce"]
  patterns: ["composite-keys", "skill-hierarchy", "permission-overwrites"]
key-files:
  created:
    - "src/lib/validation/skillMatch.ts"
  modified:
    - "src/types/mentorship.ts"
    - "src/lib/discord.ts"
    - "firestore.rules"
    - "package.json"
decisions:
  - id: "composite-application-keys"
    choice: "Application/Invitation IDs use {projectId}_{userId} composite pattern"
    context: "Ensures uniqueness and prevents duplicate applications/invitations"
  - id: "skill-hierarchy"
    choice: "Three-tier skill hierarchy: beginner (1) → intermediate (2) → advanced (3)"
    context: "Enables gap calculation for mismatch warnings (gap >= 2 = warning, gap == 1 = info)"
  - id: "non-blocking-discord-member-ops"
    choice: "addMemberToChannel and removeMemberFromChannel return boolean, not throw"
    context: "Follows existing Discord pattern - failures are logged but don't break application flow"
metrics:
  duration: "6 minutes"
  completed: "2026-02-02"
---

# Phase 06 Plan 01: Team Formation Foundation Summary

**One-liner:** Added ProjectApplication/ProjectInvitation types, skill mismatch detection with 3-tier hierarchy, Discord member management functions, and Firestore security rules for applications/invitations

## What Was Built

### 1. Application and Invitation Types (src/types/mentorship.ts)

Added core types for team formation workflow:

- **ApplicationStatus**: `pending | approved | declined`
- **InvitationStatus**: `pending | accepted | declined`
- **ProjectApplication**: User applies to join project
  - Composite key: `{projectId}_{userId}`
  - Denormalized userProfile for efficient rendering
  - Optional feedback field for decline reasons
- **ProjectInvitation**: Creator invites user to project
  - Composite key: `{projectId}_{userId}`
  - Tracks invitedBy (creator userId)
  - Timestamps for created/accepted/declined

### 2. Skill Mismatch Detection (src/lib/validation/skillMatch.ts)

Created `detectSkillMismatch` function:

- **Input**: User skill level (or undefined), project difficulty
- **Output**: SkillMismatch object with `hasWarning`, `message`, `severity`
- **Logic**:
  - No skill set → `info` severity
  - 2+ level gap (beginner → advanced) → `warning` severity
  - 1 level gap (beginner → intermediate) → `info` severity
  - Matching or higher level → no warning

### 3. Discord Member Management (src/lib/discord.ts)

Extended Discord integration with two new functions:

**addMemberToChannel(channelId, discordUsername)**

- Looks up member by username via existing `lookupMemberByUsername`
- Grants VIEW_CHANNEL (1024) + SEND_MESSAGES (2048) permissions
- Uses `fetchWithRateLimit` for rate limit handling
- Returns boolean (non-blocking on failure)

**removeMemberFromChannel(channelId, discordUsername)**

- Looks up member by username
- Deletes permission overwrite via DELETE to permissions endpoint
- Uses `fetchWithRateLimit` wrapper
- Returns boolean (non-blocking on failure)

### 4. Firestore Security Rules (firestore.rules)

Added access control for applications and invitations:

**project_applications rules:**

- Read: Applicant, project creator, or admin
- Create: Authenticated users (must set own userId, status = "pending")
- Update: Project creator or admin (for approve/decline)
- Delete: Applicant, project creator, or admin

**project_invitations rules:**

- Read: Invited user, creator, or admin
- Create: Project creator or admin only
- Update: Invited user (accept/decline), creator, or admin
- Delete: Invited user, creator, or admin

### 5. Dependencies

Installed `lodash.debounce` for future search debouncing in team member discovery UI.

## Technical Decisions

### Composite Key Pattern

Application and invitation IDs use `{projectId}_{userId}` composite keys. This ensures:

- Prevents duplicate applications from same user
- Prevents duplicate invitations to same user
- Natural document ID for efficient lookups
- No need for separate uniqueness constraints

### Skill Hierarchy Model

Three-tier system (beginner=1, intermediate=2, advanced=3) enables numeric gap calculation:

- Gap >= 2: Strong warning (beginner applying to advanced)
- Gap == 1: Informational (one level stretch)
- Gap <= 0: No warning (user at or above level)

This is simple, extensible, and provides clear guidance.

### Discord Permission Management Pattern

New functions follow existing Discord patterns:

- Use `lookupMemberByUsername` for member resolution
- Use `fetchWithRateLimit` for automatic retry on 429
- Return boolean instead of throwing (non-blocking)
- Log errors with `log.error` but don't interrupt flow

### Firestore Rules with get() Pattern

Rules use `get()` to check project ownership:

```
get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.creatorId == request.auth.uid
```

This enforces ownership checks without duplicating data, following the pattern from project_members rules.

## Deviations from Plan

None - plan executed exactly as written.

## Testing & Verification

**Verification completed:**

- ✅ `npx tsc --noEmit` passes with zero errors
- ✅ `npm run build` succeeds
- ✅ New types importable: `import { ProjectApplication, ProjectInvitation } from "@/types/mentorship"`
- ✅ New Discord functions exportable: `import { addMemberToChannel, removeMemberFromChannel } from "@/lib/discord"`
- ✅ Skill mismatch function exportable: `import { detectSkillMismatch } from "@/lib/validation/skillMatch"`
- ✅ `npm ls lodash.debounce` shows package installed
- ✅ Firestore rules syntax valid (no compilation errors)

## Integration Points

### For Phase 06 Plan 02 (Application API):

- Import `ProjectApplication`, `ApplicationStatus` types
- Use `detectSkillMismatch` when user applies to project
- Call `addMemberToChannel` when application approved
- Use Firestore rules for access control

### For Phase 06 Plan 03 (Invitation API):

- Import `ProjectInvitation`, `InvitationStatus` types
- Call `addMemberToChannel` when invitation accepted
- Call `removeMemberFromChannel` when member leaves
- Use Firestore rules for access control

### For Future Search UI:

- Use `lodash.debounce` for search input debouncing
- Wrap search handler: `debounce(handleSearch, 300)`

## Success Criteria Met

- ✅ ProjectApplication and ProjectInvitation interfaces defined with composite key pattern
- ✅ detectSkillMismatch correctly flags beginner→advanced as warning
- ✅ Discord member management functions use existing fetchWithRateLimit and lookupMemberByUsername
- ✅ Firestore rules enforce proper access control for applications and invitations
- ✅ lodash.debounce installed for future search debouncing
- ✅ No regressions in existing code (build passes)

## Next Phase Readiness

**Phase 06 Plan 02 (Application API) is ready:**

- Types available for import
- Skill mismatch detection ready to use
- Discord member management ready for approval flow
- Firestore rules in place for access control

**No blockers for next plan.**

## Files Changed

**Created:**

- `src/lib/validation/skillMatch.ts` - Skill mismatch detection logic

**Modified:**

- `src/types/mentorship.ts` - Added ProjectApplication and ProjectInvitation types
- `src/lib/discord.ts` - Added addMemberToChannel and removeMemberFromChannel functions
- `firestore.rules` - Added project_applications and project_invitations security rules
- `package.json` + `package-lock.json` - Added lodash.debounce dependency

## Commits

| Commit  | Message                                                                 |
| ------- | ----------------------------------------------------------------------- |
| 6daf637 | feat(06-01): add application/invitation types and install lodash.debounce |
| bc7bf1f | feat(06-01): add skill mismatch detection, Discord member management, and Firestore rules |

---

**Duration:** 6 minutes
**Completed:** 2026-02-02
**Status:** ✅ All success criteria met
