---
phase: quick
plan: 001
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/mentorship/match/route.ts
  - src/app/api/mentorship/admin/sessions/regenerate-channel/route.ts
  - src/components/mentorship/SessionScheduler.tsx
  - src/app/api/mentorship/scheduled-sessions/route.ts
autonomous: true

must_haves:
  truths:
    - "Discord channel name uses actual mentee name, never generic 'Mentee'"
    - "Discord session notification shows time in mentor's timezone with abbreviation"
    - "Mentor sees their timezone abbreviation next to Time label when scheduling"
    - "mentorTimezone is stored with each scheduled session"
  artifacts:
    - path: "src/app/api/mentorship/match/route.ts"
      provides: "Improved displayName fallback using email prefix"
    - path: "src/app/api/mentorship/admin/sessions/regenerate-channel/route.ts"
      provides: "Improved displayName fallback using email prefix"
    - path: "src/components/mentorship/SessionScheduler.tsx"
      provides: "Sends mentorTimezone, shows TZ abbreviation on Time label"
    - path: "src/app/api/mentorship/scheduled-sessions/route.ts"
      provides: "Stores mentorTimezone, formats Discord time in mentor TZ"
  key_links:
    - from: "SessionScheduler.tsx"
      to: "/api/mentorship/scheduled-sessions"
      via: "POST body includes mentorTimezone field"
      pattern: "mentorTimezone.*Intl"
    - from: "scheduled-sessions/route.ts"
      to: "Discord message"
      via: "toLocaleTimeString with timeZone option"
      pattern: "toLocaleTimeString.*timeZone"
---

<objective>
Fix two bugs in the mentorship system:
1. Discord channel names falling back to generic "Mentee"/"Mentor" instead of using the actual user's name (with email prefix as fallback)
2. Discord session notifications showing UTC time instead of the mentor's local timezone

Purpose: Ensure Discord channel names are meaningful and session times are displayed correctly in notifications.
Output: Four modified files fixing both bugs.
</objective>

<execution_context>
@/home/ahsan/.claude/get-shit-done/workflows/execute-plan.md
@/home/ahsan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/mentorship/SessionScheduler.tsx
@src/app/api/mentorship/scheduled-sessions/route.ts
@src/app/api/mentorship/match/route.ts
@src/app/api/mentorship/admin/sessions/regenerate-channel/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Discord channel name fallback</name>
  <files>
    src/app/api/mentorship/match/route.ts
    src/app/api/mentorship/admin/sessions/regenerate-channel/route.ts
  </files>
  <action>
    In `src/app/api/mentorship/match/route.ts` at line 381-382, change the fallback logic for channel creation:
    - Replace `mentorProfileData.displayName || "Mentor"` with `mentorProfileData.displayName || mentorProfileData.email?.split("@")[0] || "Mentor"`
    - Replace `menteeData?.displayName || "Mentee"` with `menteeData?.displayName || menteeData?.email?.split("@")[0] || "Mentee"`

    In `src/app/api/mentorship/admin/sessions/regenerate-channel/route.ts` at lines 57-58, apply the same fix:
    - Replace `mentorProfile?.displayName || 'Unknown Mentor'` with `mentorProfile?.displayName || mentorProfile?.email?.split("@")[0] || "Unknown Mentor"`
    - Replace `menteeProfile?.displayName || 'Unknown Mentee'` with `menteeProfile?.displayName || menteeProfile?.email?.split("@")[0] || "Unknown Mentee"`

    This ensures if displayName is empty/undefined, the email prefix (e.g., "john" from "john@example.com") is used before falling back to generic names.
  </action>
  <verify>
    Run `npx tsc --noEmit` to confirm no type errors. Grep for the old patterns to ensure they are all replaced:
    `grep -rn '"Mentee"' src/app/api/mentorship/match/route.ts src/app/api/mentorship/admin/sessions/regenerate-channel/route.ts`
    The generic "Mentee" and "Mentor" strings should only appear as the LAST fallback in a chain, not the first fallback.
  </verify>
  <done>
    Both files use email prefix as intermediate fallback: `displayName || email.split("@")[0] || "GenericName"`. No direct `displayName || "Mentee"` patterns remain.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add timezone to session scheduling and Discord notification</name>
  <files>
    src/components/mentorship/SessionScheduler.tsx
    src/app/api/mentorship/scheduled-sessions/route.ts
  </files>
  <action>
    **Frontend (SessionScheduler.tsx):**

    1. At the top of the component function (after hooks, before JSX), compute the mentor's timezone:
       ```
       const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
       const tzAbbreviation = new Date().toLocaleTimeString("en-US", { timeZoneName: "short" }).split(" ").pop() || "";
       ```

    2. In `handleSubmit`, add `mentorTimezone: userTimezone` to the POST body JSON alongside the existing fields (sessionId, scheduledAt, duration, agenda, templateId).

    3. Update the "Time *" label (around line 274) to show the timezone abbreviation. Change:
       `<span className="label-text font-semibold">Time *</span>`
       to:
       `<span className="label-text font-semibold">Time * <span className="font-normal text-base-content/60">({tzAbbreviation})</span></span>`

    **Backend (scheduled-sessions/route.ts):**

    1. In the POST handler, destructure `mentorTimezone` from the request body alongside the existing fields.

    2. Add `mentorTimezone: mentorTimezone || null` to the `sessionData` object that gets stored in Firestore.

    3. Fix the Discord notification time formatting (lines 80-89). Replace the current `toLocaleTimeString("en-US", ...)` call with timezone-aware formatting:
       ```typescript
       const timeFormatOptions: Intl.DateTimeFormatOptions = {
         hour: "2-digit",
         minute: "2-digit",
         ...(mentorTimezone ? { timeZone: mentorTimezone } : {}),
       };
       const formattedTime = sessionDate.toLocaleTimeString("en-US", timeFormatOptions);

       // Get timezone abbreviation for display
       const tzLabel = mentorTimezone
         ? sessionDate.toLocaleTimeString("en-US", { timeZone: mentorTimezone, timeZoneName: "short" }).split(" ").pop()
         : "";
       ```

    4. Update the Discord message template to include timezone. Change:
       `` `**Time:** ${formattedTime}\n` ``
       to:
       `` `**Time:** ${formattedTime}${tzLabel ? ` (${tzLabel})` : ""}\n` ``

    Do NOT install any timezone libraries -- the built-in `Intl` API with IANA timezone names handles everything needed here. Node.js on Vercel supports `Intl.DateTimeFormat` with timezone options.
  </action>
  <verify>
    Run `npx tsc --noEmit` to confirm no type errors.
    Run `npm run build` to confirm the build succeeds.
    Grep to verify:
    - `grep -n "mentorTimezone" src/components/mentorship/SessionScheduler.tsx` shows the timezone being sent
    - `grep -n "mentorTimezone" src/app/api/mentorship/scheduled-sessions/route.ts` shows it being stored and used
    - `grep -n "timeZone" src/app/api/mentorship/scheduled-sessions/route.ts` shows timezone-aware formatting
  </verify>
  <done>
    - Frontend sends `mentorTimezone` (IANA string like "Europe/Berlin") with every session creation
    - Frontend shows timezone abbreviation (e.g., "CET") next to the "Time *" label
    - Backend stores `mentorTimezone` in the scheduled session document
    - Discord notification formats time using the stored mentor timezone and appends the abbreviation (e.g., "08:00 PM (CET)")
    - No new dependencies added
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` -- no type errors
2. `npm run build` -- build succeeds
3. Grep confirms no remaining bare `"Mentee"` or `"Mentor"` fallbacks without email prefix intermediate
4. Grep confirms `mentorTimezone` flows from frontend to backend to Discord message
</verification>

<success_criteria>
- Discord channel creation uses email prefix as fallback before generic names in both match and regenerate-channel routes
- Session scheduling sends and stores mentor's IANA timezone
- Time picker label shows timezone abbreviation
- Discord notification shows time in mentor's timezone with abbreviation
- Build passes with no errors
</success_criteria>

<output>
After completion, create `.planning/quick/001-fix-discord-channel-name-and-timezone/001-SUMMARY.md`
</output>
