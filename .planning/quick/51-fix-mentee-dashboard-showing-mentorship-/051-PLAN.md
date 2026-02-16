---
phase: quick-051
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/mentorship/match/route.ts
autonomous: true

must_haves:
  truths:
    - "Mentees do not see 'Action Required' section on dashboard"
    - "Mentors still see pending mentorship requests from mentees"
    - "Mentors can approve/decline requests normally"
  artifacts:
    - path: "src/app/api/mentorship/match/route.ts"
      provides: "GET endpoint returns empty pendingRequests array for mentees"
      min_lines: 560
  key_links:
    - from: "src/app/api/mentorship/match/route.ts"
      to: "src/contexts/MentorshipContext.tsx"
      via: "pendingRequests state populated from API response"
      pattern: "setPendingRequests.*data\\.pendingRequests"
    - from: "src/contexts/MentorshipContext.tsx"
      to: "src/app/mentorship/dashboard/page.tsx"
      via: "pendingRequests prop from useMentorship()"
      pattern: "pendingRequests.*=.*useMentorship"
    - from: "src/app/mentorship/dashboard/page.tsx"
      to: "src/components/mentorship/dashboard/ActionRequiredWidget.tsx"
      via: "requests prop"
      pattern: "requests=\\{pendingRequests\\}"
---

<objective>
Fix mentee dashboard showing incorrect mentorship requests. Mentees should NOT see the "Action Required" section with pending requests from other mentees. Only mentors should see pending requests that need approval.

Purpose: Correct role-based filtering to prevent mentees from seeing irrelevant pending requests
Output: API returns empty pendingRequests array for mentees, dashboard correctly hides Action Required widget
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

# Current behavior analysis
@src/app/api/mentorship/match/route.ts (lines 30-76 - GET endpoint with role filtering)
@src/contexts/MentorshipContext.tsx (lines 85-103 - refreshMatches fetches from API)
@src/app/mentorship/dashboard/page.tsx (lines 360-365 - ActionRequiredWidget receives pendingRequests)
@src/components/mentorship/dashboard/ActionRequiredWidget.tsx (lines 37-39 - hides if requests empty)
</context>

<tasks>

<task type="auto">
  <name>Fix API to return empty pendingRequests for mentees</name>
  <files>src/app/api/mentorship/match/route.ts</files>
  <action>
Modify the GET endpoint in `/api/mentorship/match/route.ts` to return an empty array for pendingRequests when role is "mentee".

Current logic (lines 30-76):
- Lines 44-55: Both mentors AND mentees query for pending requests
- This is incorrect - mentees should not see pending requests at all

Fix:
1. Keep the mentor logic unchanged (lines 33-43):
   - matchesQuery: mentorId == uid, status == "active"
   - pendingQuery: mentorId == uid, status == "pending"

2. Change the mentee logic (lines 44-55) to:
   - matchesQuery: menteeId == uid, status == "active" (keep as-is)
   - pendingQuery: Return empty array (no database query needed)

Implementation approach:
```typescript
if (role === "mentor") {
  // Mentor sees their mentees
  matchesQuery = db
    .collection("mentorship_sessions")
    .where("mentorId", "==", uid)
    .where("status", "==", "active");

  pendingQuery = db
    .collection("mentorship_sessions")
    .where("mentorId", "==", uid)
    .where("status", "==", "pending");
} else {
  // Mentee sees their mentors
  matchesQuery = db
    .collection("mentorship_sessions")
    .where("menteeId", "==", uid)
    .where("status", "==", "active");

  // Mentees don't need to see pending requests
  // (their requests are pending on the mentor's side)
  pendingQuery = null; // Skip query
}

// Adjust Promise.all to handle null pendingQuery
const promises = [matchesQuery.get()];
if (pendingQuery) {
  promises.push(pendingQuery.get());
}

const results = await Promise.all(promises);
const matchesSnapshot = results[0];
const pendingSnapshot = results[1] || { docs: [] }; // Empty if no query
```

This ensures:
- Mentors see pending requests from mentees (requests where mentorId == uid, status == pending)
- Mentees see empty pendingRequests array (no Action Required widget shown)
- No unnecessary Firestore query for mentees
- Backward compatible with existing code (always returns { matches, pendingRequests })
  </action>
  <verify>
Manual testing:
1. Log in as a mentee (Jawwad) and visit /mentorship/dashboard
2. Verify "Action Required" section does NOT appear
3. Log in as a mentor with pending requests and visit /mentorship/dashboard
4. Verify "Action Required" section DOES appear with correct requests
5. Verify mentor can still approve/decline requests

API verification:
```bash
# Test mentee role (should return empty pendingRequests)
curl "http://localhost:3000/api/mentorship/match?uid=MENTEE_UID&role=mentee" | jq '.pendingRequests'
# Expected: []

# Test mentor role (should return pending requests if any exist)
curl "http://localhost:3000/api/mentorship/match?uid=MENTOR_UID&role=mentor" | jq '.pendingRequests'
# Expected: [array of pending requests or []]
```
  </verify>
  <done>
- Mentee dashboard no longer shows "Action Required" section with incorrect requests
- Mentor dashboard continues to show pending requests correctly
- API returns empty pendingRequests array for role=mentee
- API returns correct pendingRequests for role=mentor
- ActionRequiredWidget automatically hides when requests array is empty (existing behavior)
  </done>
</task>

</tasks>

<verification>
1. Check API response structure for both roles
2. Verify mentee dashboard does not display Action Required widget
3. Verify mentor dashboard still displays pending requests
4. Test approve/decline functionality still works for mentors
</verification>

<success_criteria>
- GET /api/mentorship/match returns `pendingRequests: []` when role=mentee
- GET /api/mentorship/match returns correct pending requests when role=mentor
- Mentee users do not see "Action Required" section on dashboard
- Mentor users still see pending requests and can approve/decline them
- No console errors or TypeScript compilation issues
</success_criteria>

<output>
After completion, create `.planning/quick/51-fix-mentee-dashboard-showing-mentorship-/051-SUMMARY.md`
</output>
