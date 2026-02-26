---
phase: quick-064
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/mentorship/match/route.ts
autonomous: true
requirements: [FIX-UNKNOWN-MENTEE]

must_haves:
  truths:
    - "Mentor dashboard ActionRequiredWidget shows mentee display name instead of 'Unknown Mentee'"
    - "Mentor dashboard ActionRequiredWidget shows mentee profile avatar"
    - "Existing match/pendingRequests response shape is preserved (no breaking changes)"
  artifacts:
    - path: "src/app/api/mentorship/match/route.ts"
      provides: "Enriched pendingRequests with menteeProfile data"
      contains: "menteeProfile"
  key_links:
    - from: "src/app/api/mentorship/match/route.ts"
      to: "mentorship_profiles collection"
      via: "Firestore doc fetch per pending request menteeId"
      pattern: "mentorship_profiles.*menteeId"
    - from: "src/components/mentorship/dashboard/ActionRequiredWidget.tsx"
      to: "menteeProfile.displayName"
      via: "pendingRequests array items enriched by match API"
      pattern: "menteeProfile\\?.displayName"
---

<objective>
Fix "Unknown Mentee" display on mentor dashboard by enriching pendingRequests in the /api/mentorship/match GET endpoint with mentee profile data.

Purpose: The ActionRequiredWidget shows "Unknown Mentee" because the match API returns raw mentorship_sessions data without fetching the mentee's profile. The /api/mentorship/requests/route.ts already does this correctly — apply the same pattern.

Output: Updated match route that includes menteeProfile in each pendingRequest item.
</objective>

<execution_context>
@/home/ahsan/.claude/get-shit-done/workflows/execute-plan.md
@/home/ahsan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/api/mentorship/match/route.ts (the endpoint to fix — GET handler lines 17-88)
@src/app/api/mentorship/requests/route.ts (reference implementation — lines 23-53 show the enrichment pattern)
@src/components/mentorship/dashboard/ActionRequiredWidget.tsx (consumer — line 55-58 accesses menteeProfile)
@src/contexts/MentorshipContext.tsx (calls /api/mentorship/match and stores pendingRequests)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Enrich pendingRequests with mentee profile data in match API</name>
  <files>src/app/api/mentorship/match/route.ts</files>
  <action>
In the GET handler of src/app/api/mentorship/match/route.ts, replace the simple pendingRequests mapping (lines 74-78) with an enriched version that fetches mentee profiles, following the exact pattern from /api/mentorship/requests/route.ts.

Current code (lines 74-78):
```ts
const pendingRequests = pendingSnapshot.docs.map((doc) => ({
  id: doc.id,
  ...doc.data(),
  requestedAt: doc.data().requestedAt?.toDate?.() || null,
}));
```

Replace with Promise.all + async map that:
1. For each pending doc, fetch the mentee profile from `mentorship_profiles` collection using `doc.data().menteeId`
2. Attach a `menteeProfile` object with these fields (matching the requests route pattern):
   - displayName
   - photoURL
   - email
   - discordUsername
   - education
   - skillsSought
   - careerGoals
   - mentorshipGoals
   - learningStyle
3. If the mentee profile doc does not exist, set menteeProfile to null
4. Keep the existing fields (id, spread data, requestedAt conversion)

The replacement code should be:
```ts
const pendingRequests = await Promise.all(
  pendingSnapshot.docs.map(async (doc) => {
    const matchData = doc.data();

    // Fetch mentee profile
    const menteeDoc = await db
      .collection("mentorship_profiles")
      .doc(matchData.menteeId)
      .get();

    const menteeProfile = menteeDoc.exists ? menteeDoc.data() : null;

    return {
      id: doc.id,
      ...matchData,
      requestedAt: matchData.requestedAt?.toDate?.() || null,
      menteeProfile: menteeProfile
        ? {
            displayName: menteeProfile.displayName,
            photoURL: menteeProfile.photoURL,
            email: menteeProfile.email,
            discordUsername: menteeProfile.discordUsername,
            education: menteeProfile.education,
            skillsSought: menteeProfile.skillsSought,
            careerGoals: menteeProfile.careerGoals,
            mentorshipGoals: menteeProfile.mentorshipGoals,
            learningStyle: menteeProfile.learningStyle,
          }
        : null,
    };
  })
);
```

Do NOT change the matches mapping (lines 66-72) — only the pendingRequests mapping.
Do NOT change any other part of the file (POST, PUT handlers).
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx tsc --noEmit src/app/api/mentorship/match/route.ts 2>&1 | head -20</automated>
    <manual>Verify the pendingRequests now includes menteeProfile by checking the code structure matches the requests/route.ts pattern</manual>
  </verify>
  <done>The /api/mentorship/match GET endpoint returns pendingRequests enriched with menteeProfile data (displayName, photoURL, email, discordUsername, education, skillsSought, careerGoals, mentorshipGoals, learningStyle). The ActionRequiredWidget will display the mentee's actual display name and avatar instead of "Unknown Mentee".</done>
</task>

</tasks>

<verification>
1. TypeScript compilation: `npx tsc --noEmit` passes without errors
2. Code inspection: the pendingRequests mapping in GET handler now fetches from mentorship_profiles and attaches menteeProfile object
3. The menteeProfile field shape matches what ActionRequiredWidget.tsx expects at lines 55-58: `(req as any).menteeProfile?.displayName` and `(req as any).menteeProfile?.photoURL`
</verification>

<success_criteria>
- The match API GET handler enriches pendingRequests with menteeProfile containing displayName, photoURL, and other profile fields
- TypeScript compiles without errors
- No changes to POST or PUT handlers
- Pattern matches the proven implementation in /api/mentorship/requests/route.ts
</success_criteria>

<output>
After completion, create `.planning/quick/64-fix-unknown-mentee-on-mentor-dashboard/64-SUMMARY.md`
</output>
