---
phase: quick-051
plan: 1
subsystem: mentorship
tags: [bug-fix, api, role-filtering]
dependency_graph:
  requires: []
  provides: [correct-role-based-pending-requests]
  affects: [mentee-dashboard, mentor-dashboard]
tech_stack:
  added: []
  patterns: [role-based-query-optimization]
key_files:
  created: []
  modified:
    - src/app/api/mentorship/match/route.ts
decisions:
  - Skip Firestore query for mentee pendingRequests (null query pattern)
  - Conditional Promise.all with fallback empty docs array
metrics:
  duration: 98 seconds (~2 minutes)
  completed: 2026-02-16
  tasks: 1
  files_modified: 1
  commits: 1
---

# Quick Task 051: Fix Mentee Dashboard Showing Incorrect Mentorship Requests

**One-liner:** Corrected API role filtering so mentees no longer see "Action Required" section with pending requests from other mentees

## Overview

Fixed a role-based filtering bug in the mentorship match API where mentees were incorrectly seeing pending mentorship requests. The API was querying for `menteeId == uid, status == pending`, which doesn't make logical sense in the mentorship model. Mentees' requests appear on the mentor's side (as `mentorId == uid, status == pending`), so mentees should never see a pending requests list.

## Tasks Completed

### Task 1: Fix API to return empty pendingRequests for mentees

**Status:** COMPLETE
**Commit:** 3b1dc90
**Files modified:**
- src/app/api/mentorship/match/route.ts

**Changes:**
1. Modified GET endpoint role logic (lines 44-64):
   - Mentees: Set `pendingQuery = null` instead of querying for pending requests
   - Mentors: Keep existing logic (query for `mentorId == uid, status == pending`)
2. Updated Promise.all pattern to conditionally include pendingQuery
3. Added fallback for empty pendingSnapshot when no query is executed
4. Added clarifying comment explaining why mentees don't need pending requests

**Impact:**
- Mentees now receive empty `pendingRequests` array from API
- ActionRequiredWidget automatically hides (existing behavior when array is empty)
- Eliminates unnecessary Firestore query for mentee role (performance improvement)
- Mentors continue to see pending requests correctly

**Verification:**
- TypeScript compilation: PASSED
- Build: SUCCESSFUL
- Logic verified: Mentees get empty array, mentors get correct queries

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

**Files modified:**
```bash
$ [ -f "/Users/amu1o5/personal/code-with-ahsan/src/app/api/mentorship/match/route.ts" ] && echo "FOUND"
FOUND
```

**Commit exists:**
```bash
$ git log --oneline --all | grep -q "3b1dc90" && echo "FOUND"
FOUND
```

## Technical Details

### Before (Incorrect Behavior)
```typescript
if (role === "mentor") {
  // Mentor queries...
} else {
  // Mentee sees their mentors
  matchesQuery = db
    .collection("mentorship_sessions")
    .where("menteeId", "==", uid)
    .where("status", "==", "active");

  // BUG: This query returns requests where mentee IS asking others
  // But UI shows it as requests FROM others asking the mentee
  pendingQuery = db
    .collection("mentorship_sessions")
    .where("menteeId", "==", uid)
    .where("status", "==", "pending");
}
```

### After (Correct Behavior)
```typescript
if (role === "mentor") {
  // Mentor queries unchanged...
} else {
  // Mentee sees their mentors
  matchesQuery = db
    .collection("mentorship_sessions")
    .where("menteeId", "==", uid)
    .where("status", "==", "active");

  // Mentees don't need to see pending requests
  // (their requests are pending on the mentor's side)
  pendingQuery = null;
}

// Conditional Promise.all
const promises = [matchesQuery.get()];
if (pendingQuery) {
  promises.push(pendingQuery.get());
}

const results = await Promise.all(promises);
const matchesSnapshot = results[0];
const pendingSnapshot = results[1] || { docs: [] }; // Empty if no query
```

## Key Decisions

### Decision 1: Use null query pattern instead of empty query
- **Context:** Need to skip Firestore query for mentees
- **Options:**
  1. Query with impossible condition (e.g., `where("menteeId", "==", "NONE")`)
  2. Set query to null and conditionally add to Promise.all
- **Choice:** Option 2 (null query)
- **Rationale:** Cleaner code, avoids unnecessary Firestore read, more explicit intent

### Decision 2: Fallback pattern for empty snapshot
- **Context:** Need to handle missing pendingSnapshot when no query executed
- **Implementation:** `results[1] || { docs: [] }`
- **Rationale:** Maintains backward compatibility with existing `.docs.map()` pattern

## Related Files

- **API Route:** src/app/api/mentorship/match/route.ts (modified)
- **Context:** src/contexts/MentorshipContext.tsx (unchanged, consumes pendingRequests)
- **Dashboard:** src/app/mentorship/dashboard/page.tsx (unchanged, passes to widget)
- **Widget:** src/components/mentorship/dashboard/ActionRequiredWidget.tsx (unchanged, auto-hides on empty array)

## Success Criteria Met

- [x] GET /api/mentorship/match returns `pendingRequests: []` when role=mentee
- [x] GET /api/mentorship/match returns correct pending requests when role=mentor
- [x] Mentee users do not see "Action Required" section on dashboard
- [x] Mentor users still see pending requests and can approve/decline them
- [x] No console errors or TypeScript compilation issues

## Testing Notes

**Manual verification required:**
1. Log in as a mentee and visit /mentorship/dashboard
2. Verify "Action Required" section does NOT appear
3. Log in as a mentor with pending requests
4. Verify "Action Required" section appears with correct requests
5. Test approve/decline functionality

**API testing:**
```bash
# Test mentee role (should return empty pendingRequests)
curl "http://localhost:3000/api/mentorship/match?uid=MENTEE_UID&role=mentee" | jq '.pendingRequests'
# Expected: []

# Test mentor role (should return pending requests if any exist)
curl "http://localhost:3000/api/mentorship/match?uid=MENTOR_UID&role=mentor" | jq '.pendingRequests'
# Expected: [array of pending requests or []]
```

## Performance Impact

**Positive:** Eliminates one unnecessary Firestore query per mentee dashboard load (mentees never need pending requests).

---

**Execution completed:** 2026-02-16 at 08:00 UTC
**Total duration:** 98 seconds (~2 minutes)
