---
phase: quick-052
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .github/workflows/mentor-pending-reminders.yml
  - scripts/send-mentor-pending-reminders.ts
autonomous: true

must_haves:
  truths:
    - "GitHub Actions workflow runs daily at 7:00 AM CEST"
    - "Script queries mentors with pending mentorship requests"
    - "Reminders are sent via Discord DM to each mentor with pending requests"
    - "Script handles Firebase authentication in CI environment"
  artifacts:
    - path: ".github/workflows/mentor-pending-reminders.yml"
      provides: "GitHub Actions cron schedule configuration"
      min_lines: 40
    - path: "scripts/send-mentor-pending-reminders.ts"
      provides: "Script to query pending requests and send Discord reminders"
      min_lines: 100
  key_links:
    - from: ".github/workflows/mentor-pending-reminders.yml"
      to: "scripts/send-mentor-pending-reminders.ts"
      via: "npx tsx execution"
      pattern: "npx tsx scripts/send-mentor-pending-reminders\\.ts"
    - from: "scripts/send-mentor-pending-reminders.ts"
      to: "sendDirectMessage"
      via: "Discord DM notification"
      pattern: "sendDirectMessage"
---

<objective>
Create a GitHub Actions cron job that runs daily at 7:00 AM CEST to check all mentors with pending mentee requests and send Discord reminders to ensure mentees aren't left waiting.

Purpose: Proactive notification system to reduce mentee waiting time
Output: GitHub Actions workflow + TypeScript script for automated daily reminders
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

# Reference existing script pattern
@scripts/create-mentor-pending-channel.ts
@scripts/utils.ts

# Discord integration
@src/lib/discord.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create GitHub Actions workflow with cron schedule</name>
  <files>.github/workflows/mentor-pending-reminders.yml</files>
  <action>
Create GitHub Actions workflow file with:
- Name: "Mentor Pending Reminders"
- Trigger: cron schedule at 5:00 AM UTC (= 7:00 AM CEST in summer)
  - Use `0 5 * * *` cron expression
  - Note: CEST is UTC+2 (summer), CET is UTC+1 (winter). Using UTC+2 for simplicity.
- Also support manual trigger via workflow_dispatch
- Job: runs-on ubuntu-latest
- Steps:
  1. Checkout code
  2. Setup Node.js 20.x
  3. Install dependencies with caching
  4. Run script: `npx tsx scripts/send-mentor-pending-reminders.ts`
- Environment variables (from GitHub Secrets):
  - DISCORD_BOT_TOKEN
  - DISCORD_GUILD_ID
  - FIREBASE_SERVICE_ACCOUNT (JSON string)
  - NEXT_PUBLIC_FIREBASE_PROJECT_ID
- Set NODE_ENV=production
- Continue on error: false (fail if reminders fail to send)

Follow standard GitHub Actions best practices for caching and error handling.
  </action>
  <verify>
cat .github/workflows/mentor-pending-reminders.yml
# Verify cron schedule is 0 5 * * * (5 AM UTC)
# Verify all required env vars are included
# Verify uses npx tsx to run the script
  </verify>
  <done>
- GitHub Actions workflow file exists at .github/workflows/mentor-pending-reminders.yml
- Cron schedule set to 0 5 * * * (daily at 5 AM UTC = 7 AM CEST)
- All required environment variables configured from GitHub Secrets
- Manual trigger via workflow_dispatch supported
  </done>
</task>

<task type="auto">
  <name>Task 2: Create TypeScript script to send mentor reminders</name>
  <files>scripts/send-mentor-pending-reminders.ts</files>
  <action>
Create TypeScript script following the pattern from create-mentor-pending-channel.ts:

**Structure:**
1. Import dotenv and configure with .env.local
2. Import firebase-admin and Discord utilities (sendDirectMessage, isDiscordConfigured)
3. Initialize Firebase Admin:
   - In CI/production: Use admin.credential.applicationDefault() with FIREBASE_SERVICE_ACCOUNT env var
   - In development: Load from secure/code-with-ahsan-*-firebase-adminsdk-*.json
   - Parse FIREBASE_SERVICE_ACCOUNT JSON if it's a string (GitHub Secrets stores it as string)
4. Get Firestore db instance

**Main logic:**
1. Check isDiscordConfigured(), exit if not configured
2. Query all pending mentorship sessions:
   - Collection: mentorship_sessions
   - Where: status == "pending"
   - Get all documents
3. Group pending sessions by mentorId (create Map<string, string[]> of mentorId to menteeIds)
4. For each mentor with pending requests:
   - Fetch mentor profile from mentorship_profiles collection
   - Get mentor's discordUsername
   - Count pending requests
   - If discordUsername exists:
     - Call sendDirectMessage with message:
       ```
       👋 Hi {displayName}!

       You have {count} pending mentorship request{s}.

       Please review and respond to your mentees when you have a chance:
       https://codewithahsan.dev/mentorship/dashboard/sessions

       Your mentees are waiting to hear from you! 🚀
       ```
   - Log success/failure for each mentor
5. Print summary: Total mentors notified, total pending requests

**Error handling:**
- Wrap main logic in try/catch
- Log errors with console.error
- Exit with process.exit(1) on fatal errors
- Continue processing other mentors if one fails

**Logging:**
- Use console.log for progress
- Mask sensitive data (reuse maskName, maskEmail, maskDiscord from utils.ts)
- Print summary at end

Use TypeScript types for MentorshipSession and MentorshipProfile (inline definitions).
  </action>
  <verify>
# Dry run in development
cd /Users/amu1o5/personal/code-with-ahsan
npx tsx scripts/send-mentor-pending-reminders.ts

# Check script output:
# - Should connect to Firebase
# - Should check Discord configuration
# - Should query pending mentorships
# - Should group by mentor
# - Should attempt to send DMs
# - Should print summary
  </verify>
  <done>
- Script exists at scripts/send-mentor-pending-reminders.ts
- Successfully queries pending mentorship sessions from Firestore
- Groups pending requests by mentor
- Sends Discord DMs to each mentor with pending count and dashboard link
- Handles both CI (FIREBASE_SERVICE_ACCOUNT env) and dev environments
- Logs progress with masked sensitive data
- Continues processing if individual DM fails
- Prints summary of notifications sent
  </done>
</task>

<task type="auto">
  <name>Task 3: Test workflow locally and update documentation</name>
  <files>scripts/README-create-mentor-pending-channel.md</files>
  <action>
1. Create README documentation for the new reminders script:
   - Title: "Automated Mentor Reminders"
   - Describe the GitHub Actions cron job (runs daily at 7 AM CEST)
   - Document the manual script usage:
     ```bash
     # Dry run (development environment)
     npx tsx scripts/send-mentor-pending-reminders.ts

     # Production (requires env vars)
     DISCORD_BOT_TOKEN=xxx DISCORD_GUILD_ID=xxx FIREBASE_SERVICE_ACCOUNT='{"..."}' npx tsx scripts/send-mentor-pending-reminders.ts
     ```
   - List required environment variables
   - Explain the grouping logic (one DM per mentor with count)
   - Note that it's non-intrusive (only sends if pending requests exist)

2. Test the script locally with actual Firebase data:
   - Run: `npx tsx scripts/send-mentor-pending-reminders.ts`
   - Verify it queries mentorship_sessions correctly
   - Verify it groups by mentor
   - Verify Discord DM format is correct
   - Check error handling for missing Discord usernames

3. Validate GitHub Actions workflow syntax:
   - Use `cat .github/workflows/mentor-pending-reminders.yml` to review
   - Ensure cron schedule is correct: `0 5 * * *`
   - Verify all secrets are properly referenced
   - Confirm NODE_ENV=production is set

Document any findings or edge cases discovered during testing.
  </action>
  <verify>
# Verify README exists
ls scripts/README-create-mentor-pending-channel.md

# Verify workflow syntax is valid YAML
cat .github/workflows/mentor-pending-reminders.yml | grep "cron:"

# Run script locally to test
npx tsx scripts/send-mentor-pending-reminders.ts
  </verify>
  <done>
- README documentation created explaining the automated reminders system
- Script tested locally and verified to work with Firebase
- GitHub Actions workflow syntax validated
- Cron schedule confirmed: 0 5 * * * (5 AM UTC = 7 AM CEST)
- All environment variables properly configured
- Edge cases documented (missing Discord usernames, no pending requests)
  </done>
</task>

</tasks>

<verification>
1. GitHub Actions workflow file exists and is valid YAML
2. Cron schedule is set to run daily at 5 AM UTC (7 AM CEST)
3. Script successfully queries pending mentorship sessions
4. Script groups requests by mentor and sends one DM per mentor
5. Script handles both CI and development environments
6. Discord DMs include pending count and dashboard link
7. Error handling gracefully handles missing Discord usernames
8. Documentation exists for manual script usage
</verification>

<success_criteria>
- [ ] GitHub Actions workflow created at .github/workflows/mentor-pending-reminders.yml
- [ ] Workflow scheduled with cron: 0 5 * * * (daily at 7 AM CEST)
- [ ] Script created at scripts/send-mentor-pending-reminders.ts
- [ ] Script queries all pending mentorship sessions from Firestore
- [ ] Script groups pending requests by mentorId
- [ ] Script sends Discord DM to each mentor with pending count
- [ ] DM includes direct link to dashboard sessions page
- [ ] Script handles Firebase authentication for both dev and CI
- [ ] Error handling prevents one failure from blocking others
- [ ] Documentation created with usage instructions
- [ ] Local testing confirms script works correctly
</success_criteria>

<output>
After completion, create `.planning/quick/52-create-github-actions-cron-job-that-runs/052-SUMMARY.md`
</output>
