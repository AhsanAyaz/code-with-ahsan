---
phase: 053-fix-calendar-not-configured
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/profile/page.tsx
autonomous: false

must_haves:
  truths:
    - "Mentor sees helpful message when calendar integration is not configured in production"
    - "Mentor can reconnect Google Calendar when OAuth token expires or is revoked"
    - "Calendar connection status is fetched and displayed accurately"
  artifacts:
    - path: "src/app/profile/page.tsx"
      provides: "Reconnect button and error handling for calendar auth"
      min_lines: 380
  key_links:
    - from: "src/app/profile/page.tsx"
      to: "/api/mentorship/calendar/auth"
      via: "authFetch in handleCalendarConnect"
      pattern: "authFetch.*calendar/auth"
    - from: "src/app/profile/page.tsx"
      to: "isCalendarConnected state"
      via: "fetch from /api/mentorship/availability"
      pattern: "googleCalendarConnected"

user_setup:
  - service: vercel
    why: "Set Google Calendar OAuth environment variables in production"
    env_vars:
      - name: GOOGLE_CLIENT_ID
        source: "Google Cloud Console -> APIs & Services -> Credentials -> OAuth 2.0 Client ID"
      - name: GOOGLE_CLIENT_SECRET
        source: "Google Cloud Console -> APIs & Services -> Credentials -> OAuth 2.0 Client ID"
      - name: GOOGLE_REDIRECT_URI
        source: "Should be https://codewithahsan.dev/api/mentorship/calendar/callback"
      - name: GOOGLE_CALENDAR_ENCRYPTION_KEY
        source: "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    dashboard_config:
      - task: "Add environment variables to Vercel project"
        location: "Vercel Dashboard -> Project Settings -> Environment Variables"
      - task: "Redeploy application after adding environment variables"
        location: "Vercel Dashboard -> Deployments -> Redeploy"
---

<objective>
Fix the "Calendar not configured" error in production by improving error handling and adding a Reconnect button for Google Calendar OAuth.

Purpose: Allow mentors to refresh their Google Calendar connection when tokens expire or when environment variables are properly configured in production.

Output: Enhanced profile page with better calendar connection UX and error messaging.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@src/app/profile/page.tsx
@src/lib/google-calendar.ts
@src/app/api/mentorship/calendar/auth/route.ts
</context>

<tasks>

<task type="auto">
  <name>Add Reconnect button and improve calendar error handling</name>
  <files>
    src/app/profile/page.tsx
  </files>
  <action>
Update the profile page to improve Google Calendar connection UX:

1. **Add Reconnect functionality:**
   - When calendar IS connected (`isCalendarConnected === true`), show connection status with a "Reconnect" button next to it
   - The Reconnect button uses the same `handleCalendarConnect` flow to refresh the OAuth token
   - This allows mentors to re-authenticate if their token expires or is revoked

2. **Improve error handling:**
   - Catch and display specific error messages from `/api/mentorship/calendar/auth`
   - If error is "Calendar integration not available" or 503 status, show user-friendly message explaining that admin needs to configure Google OAuth credentials
   - Store error message in state and display it below the connection status

3. **Visual improvements:**
   - Show green checkmark with "Connected" status
   - Show Reconnect button as `btn-outline btn-sm` next to the connected status
   - Display error messages in an alert box if auth fails

Example structure:
```tsx
{isCalendarConnected ? (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 text-success">
        <svg>...</svg>
        <span>Google Calendar connected</span>
      </div>
      <button
        className="btn btn-outline btn-sm"
        onClick={handleCalendarConnect}
        disabled={calendarConnecting}
      >
        Reconnect
      </button>
    </div>
  </div>
) : (
  <button onClick={handleCalendarConnect}>Connect</button>
)}
```

4. **Error state:**
   - Add `calendarError` state variable
   - Display error in alert-warning box if present
   - Clear error on successful connection
  </action>
  <verify>
1. Read src/app/profile/page.tsx and confirm:
   - Reconnect button exists when `isCalendarConnected === true`
   - Error state is captured from API responses
   - Error messages are displayed to users

2. Run: `npm run build` (should compile without errors)
  </verify>
  <done>
- Profile page shows Reconnect button when calendar is connected
- Error messages from calendar auth API are displayed to users
- Code compiles successfully with TypeScript
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Configure Google Calendar OAuth credentials in production</name>
  <action>Configure Google Calendar OAuth credentials in Vercel production environment</action>
  <instructions>
**Required Environment Variables:**

1. Go to Vercel Dashboard -> codewithahsan project -> Settings -> Environment Variables

2. Add the following variables (Production environment):
   - `GOOGLE_CLIENT_ID`: OAuth 2.0 Client ID from Google Cloud Console
   - `GOOGLE_CLIENT_SECRET`: OAuth 2.0 Client Secret from Google Cloud Console
   - `GOOGLE_REDIRECT_URI`: `https://codewithahsan.dev/api/mentorship/calendar/callback`
   - `GOOGLE_CALENDAR_ENCRYPTION_KEY`: Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

3. **If you don't have Google OAuth credentials yet:**
   - Go to Google Cloud Console (console.cloud.google.com)
   - Enable Google Calendar API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://codewithahsan.dev/api/mentorship/calendar/callback`
   - Copy Client ID and Client Secret

4. After adding variables, trigger a redeploy from Vercel dashboard

5. Test the calendar connection on production:
   - Visit https://codewithahsan.dev/profile as a mentor
   - Click "Connect Google Calendar" button
   - Should redirect to Google OAuth consent screen (not show "Calendar not configured" error)
  </instructions>
  <resume-signal>Type "configured" when environment variables are set and redeployed, or "skip" to test locally first</resume-signal>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Verify calendar connection and reconnect flow</name>
  <what-built>
Enhanced Google Calendar connection UI with:
- Reconnect button for refreshing OAuth tokens
- Better error handling and messaging
- Environment variable setup instructions
  </what-built>
  <how-to-verify>
**Test Calendar Connection Flow:**

1. **As a logged-in mentor**, visit https://codewithahsan.dev/profile (or http://localhost:3000/profile in dev)

2. **Verify Reconnect button appears when connected:**
   - If calendar already connected: Should see green checkmark "Google Calendar connected" AND a "Reconnect" button next to it
   - Click Reconnect: Should redirect to Google OAuth consent screen

3. **Test fresh connection (if not connected):**
   - Click "Connect Google Calendar"
   - Should redirect to Google OAuth consent screen (NOT show "Calendar not configured" error)
   - After approving: Should redirect back to profile with success toast
   - Should see connected status with Reconnect button

4. **Verify error messaging:**
   - If environment variables are NOT configured, should see helpful error message explaining that admin needs to set up OAuth credentials
   - Error should be displayed in an alert box (not just console)

5. **Check screenshot context:**
   - The original "Calendar not configured" issue (from booking with muzammil Khan) should no longer appear
   - Calendar events should be created successfully when mentees book sessions

**Expected Behavior:**
- ✅ Reconnect button visible when calendar connected
- ✅ OAuth flow works without "Calendar not configured" error
- ✅ Helpful error messages when credentials missing
- ✅ Mentors can refresh their calendar token at any time
  </how-to-verify>
  <resume-signal>Type "approved" if calendar connection works correctly, or describe any issues</resume-signal>
</task>

</tasks>

<verification>
1. Profile page compiles without TypeScript errors
2. Reconnect button appears when calendar is connected
3. Error messages are displayed when auth fails
4. OAuth flow works in production (after env vars configured)
5. Calendar events are created for bookings
</verification>

<success_criteria>
- Mentor can click Reconnect to refresh Google Calendar OAuth token
- Helpful error messages appear when calendar integration not configured
- Production deployment has all required Google OAuth environment variables
- Calendar connection status is accurately displayed
- Original "Calendar not configured" issue in booking flow is resolved
</success_criteria>

<output>
After completion, create `.planning/quick/53-fix-calendar-not-configured-issue-in-pro/053-SUMMARY.md`
</output>
