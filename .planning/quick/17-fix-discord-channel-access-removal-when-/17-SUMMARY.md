---
phase: quick-017
plan: 01
subsystem: discord-integration
tags: [discord, logging, error-handling, observability]
dependency_graph:
  requires: []
  provides:
    - Discord permission removal with 404 handling
    - Structured logging for Discord operations
    - Visible success/failure tracking for channel access revocation
  affects:
    - src/lib/discord.ts
    - src/app/api/projects/[id]/members/[memberId]/route.ts
    - src/app/api/projects/[id]/leave/route.ts
tech_stack:
  added: []
  patterns:
    - Treat 404 as idempotent success in Discord API calls
    - Structured winston logger with metadata for traceability
    - Non-blocking Discord operations with result logging
key_files:
  created: []
  modified:
    - src/lib/discord.ts: Enhanced removeMemberFromChannel with 404 handling and structured logs
    - src/app/api/projects/[id]/members/[memberId]/route.ts: Added result tracking and structured logging
    - src/app/api/projects/[id]/leave/route.ts: Added result tracking and structured logging
decisions:
  - title: "Treat 404 as success in Discord permission removal"
    context: "When deleting a permission overwrite, a 404 response means the overwrite doesn't exist"
    choice: "Return true for 404 responses since the desired state (no permissions) is achieved"
    alternatives: ["Treat 404 as error", "Special return value for 404"]
    rationale: "Idempotent operations are safer - if the permission doesn't exist, the goal is already met"
  - title: "Use warn level for user-not-found logs"
    context: "When a Discord user leaves the server, lookupMemberByUsername fails"
    choice: "Log as warning (not error) since it's expected behavior"
    alternatives: ["Log as error", "Silently ignore"]
    rationale: "Users leaving Discord is normal - not an error condition, but worth tracking"
  - title: "Include channelId in all Discord operation logs"
    context: "Debugging Discord failures requires knowing which channel was affected"
    choice: "Add channelId and discordUsername to all log messages as structured metadata"
    alternatives: ["Log only error messages", "Use unstructured log strings"]
    rationale: "Structured logs with context enable better debugging and monitoring"
metrics:
  duration: 1
  completed_date: 2026-02-11
  task_count: 2
  file_count: 3
  commit_count: 2
---

# Quick Task 017: Fix Discord Channel Access Removal Logging and Error Handling

**One-liner:** Enhanced Discord permission removal with 404 idempotency, structured logging, and visible success/failure tracking for member removals.

## Objective

Fix Discord channel access removal to ensure permission overwrites are properly handled with robust error handling and observability. Previous implementation (quick-016) fixed username resolution and creator protection, but the core issue persisted: `removeMemberFromChannel` return values were discarded, failures were logged inconsistently (mix of console.error and winston), and there was no confirmation that Discord API calls actually succeeded.

## What Was Built

### Task 1: Improve removeMemberFromChannel error handling
**Files:** `src/lib/discord.ts`
**Commit:** `8e1545b`

Enhanced `removeMemberFromChannel` function with:
1. **404 as success**: When Discord returns 404 for permission overwrite deletion, treat it as success since the desired state (no permissions) is already achieved. This makes the operation idempotent.
2. **Warn-level logging for missing users**: Changed user-not-found log from `log.error` to `log.warn` since users leaving Discord is expected behavior, not an error.
3. **Structured metadata**: Added `channelId` and `discordUsername` as structured log metadata to all log calls for better traceability.

**Before:**
```typescript
if (!member) {
  log.error(`[Discord] Cannot remove member - user not found: ${discordUsername}`);
  return false;
}
// ...
if (response.status === 204) {
  return true;
} else {
  log.error(`[Discord] Failed to remove member from channel: ${response.status} - ${errorText}`);
  return false;
}
```

**After:**
```typescript
if (!member) {
  log.warn(
    `[Discord] Cannot remove member - user not found in guild`,
    { channelId, discordUsername }
  );
  return false;
}
// ...
if (response.status === 204) {
  return true;
} else if (response.status === 404) {
  log.warn(
    `[Discord] Permission overwrite not found (404) - user may not have had channel access`,
    { channelId, discordUsername }
  );
  return true; // Desired state achieved
} else {
  log.error(
    `[Discord] Failed to remove member from channel: ${response.status} - ${errorText}`,
    { channelId, discordUsername }
  );
  return false;
}
```

### Task 2: Add structured logging to member endpoints
**Files:** `src/app/api/projects/[id]/members/[memberId]/route.ts`, `src/app/api/projects/[id]/leave/route.ts`
**Commit:** `6f19dd5`

Enhanced both member removal and leave endpoints with:
1. **Structured logger import**: Added `createLogger("projects")` to both endpoints
2. **Result tracking**: Captured `removeMemberFromChannel` return value and logged success/failure with full context (username, channelId, projectId)
3. **Missing username warning**: Added explicit log when Discord username is missing so root cause is visible
4. **Replaced console.error**: All `console.error` calls replaced with `log.error` for consistency with codebase standards

**Before:**
```typescript
try {
  await removeMemberFromChannel(
    projectData.discordChannelId,
    discordUsername
  );
} catch (discordError) {
  console.error("Discord member removal failed:", discordError);
}
```

**After:**
```typescript
if (!discordUsername) {
  log.warn(
    `No Discord username found for member ${memberUserId} in project ${projectId} - cannot revoke channel access`
  );
}
// ...
try {
  const removed = await removeMemberFromChannel(
    projectData.discordChannelId,
    discordUsername
  );
  if (!removed) {
    log.warn(
      `Discord permission removal failed for ${discordUsername} in channel ${projectData.discordChannelId} (project: ${projectId})`
    );
  } else {
    log.info(
      `Discord permission removed for ${discordUsername} in channel ${projectData.discordChannelId} (project: ${projectId})`
    );
  }
} catch (discordError) {
  log.error("Discord member removal failed", { error: discordError });
}
```

## Verification Results

All verification criteria passed:
- ✅ `npx tsc --noEmit` passes with no errors
- ✅ `grep -r "console.error"` in both endpoints returns NO results
- ✅ Code review confirms:
  - `removeMemberFromChannel` return value is captured and logged in both endpoints
  - 404 response treated as success (idempotent)
  - All logs use structured winston logger with service tag "projects" or "discord"
  - Missing Discord username is explicitly warned about

## Success Criteria Met

All success criteria satisfied:
- ✅ Non-creator member removal triggers logged Discord API call with visible success/failure outcome
- ✅ Non-creator member leave triggers logged Discord API call with visible success/failure outcome
- ✅ If Discord username not found in guild, warning is logged (not silent failure)
- ✅ If Discord permission overwrite doesn't exist (404), treated as success (idempotent)
- ✅ No `console.error` calls remain in either endpoint - all use structured logger
- ✅ TypeScript compilation passes

## Deviations from Plan

None - plan executed exactly as written.

## Impact

### Observability Improvements
- Discord operation outcomes are now visible in structured logs
- Success and failure cases are explicitly tracked
- Missing Discord usernames are detected and logged
- All Discord errors include contextual metadata (channelId, username, projectId)

### Reliability Improvements
- 404 responses treated as success makes operations idempotent
- Non-blocking Discord operations preserve Firestore integrity
- Structured logging enables better monitoring and debugging

### Developer Experience
- Consistent logging pattern across codebase (no more console.error)
- Clear log levels (info for success, warn for expected issues, error for unexpected failures)
- Structured metadata makes log queries easier

## Testing Notes

Manual testing recommended:
1. Remove a member who has left Discord server (should log warning but succeed)
2. Remove a member whose permission overwrite was manually deleted (should log 404 as success)
3. Remove a member with missing Discord username (should log warning about missing username)
4. Remove a valid member (should log success with username and channel)
5. Verify all operations appear in structured logs (not console)

## Related Work

- **Quick-016**: Fixed Discord username resolution and creator protection (prerequisite)
- **Phase 06-01**: Introduced Discord channel member operations (original implementation)
- **Phase 06-02**: Added member removal/leave endpoints

## Self-Check

Verifying all claimed files and commits exist:

**Files:**
- ✅ FOUND: src/lib/discord.ts
- ✅ FOUND: src/app/api/projects/[id]/members/[memberId]/route.ts
- ✅ FOUND: src/app/api/projects/[id]/leave/route.ts

**Commits:**
- ✅ FOUND: 8e1545b (Task 1: removeMemberFromChannel error handling)
- ✅ FOUND: 6f19dd5 (Task 2: structured logging in endpoints)

## Self-Check: PASSED

All files and commits verified. Quick task 017 complete.
