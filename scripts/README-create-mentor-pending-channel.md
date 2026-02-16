# Create Discord Channel for Mentor's Pending Mentees

This script finds all pending mentorship requests for a specific mentor and creates a Discord channel with all the pending mentees added.

## Features

- ✅ Finds mentor by display name
- ✅ Gets all pending mentorship requests for that mentor
- ✅ Looks up Discord usernames and validates them against the server
- ✅ **Adds the mentor to the channel** (with full permissions)
- ✅ Creates a Discord channel with all valid mentees added
- ✅ **Tags (mentions) both mentor and mentees** in the welcome message
- ✅ Sends a welcome message to the channel
- ✅ Dry run mode to preview before execution
- ✅ Clear reporting of missing Discord usernames

## Usage

### Dry Run (Preview Only)

```bash
DRY_RUN=true MENTOR_NAME="Asad Ullah Khalid" NODE_ENV=development npx tsx scripts/create-mentor-pending-channel.ts
```

This will show you:
- How many pending mentorships exist
- Which mentees have valid Discord accounts
- Which mentees are missing Discord info
- What the channel would be named
- Who would be added to the channel

### Live Execution

```bash
MENTOR_NAME="Asad Ullah Khalid" NODE_ENV=development npx tsx scripts/create-mentor-pending-channel.ts
```

This will actually:
1. Create the Discord channel
2. Add all valid mentees to the channel
3. Send a welcome message
4. Report the channel URL

## Requirements

- `DISCORD_BOT_TOKEN` - Discord bot token (from .env.local)
- `DISCORD_GUILD_ID` - Discord server ID (from .env.local)
- `MENTOR_NAME` - Display name of the mentor (passed as env var)
- Firebase credentials configured

## Example Output (Dry Run)

```
============================================================
Create Discord Channel for Mentor's Pending Mentees
============================================================
Mode: DRY RUN (no changes)
Mentor: Asad Ullah Khalid

Step 1: Finding mentor...
✅ Found mentor: Asad Ullah Khalid (PUsoqaYRuvbHrligaQ8nzQTgnD42)
   Email: asadkhalid305@gmail.com
   Discord: asadkhalid305

Step 2: Finding pending mentorships...
✅ Found 50 pending mentorship(s)

Step 3: Looking up mentor Discord ID...
  ✅ Mentor Asad Ullah Khalid (@asadkhalid305) - Discord ID: 650030197592293415

Step 4: Fetching mentee profiles...
  ✅ Abdul Rehman Rais (@abdulrehman04419) - Discord ID: 1072518922701643876
  ✅ Shah Fahid (@mrfahid.) - Discord ID: 1112808902728351865
  ...
  ⚠️  Jafary Mdegela (@jafarynm) - Not found on server

Summary:
  Total pending mentees: 50
  Mentees with valid Discord: 43
  Mentees without Discord: 7

Step 5: Creating Discord channel...
🔵 DRY RUN: Would create channel:
   Name: pending-mentees-asad-ullah-khalid
   Topic: Pending mentees for Asad Ullah Khalid | 43 mentees
   Mentor: Asad Ullah Khalid (@asadkhalid305) ✅
   Mentees: 43

✅ Dry run complete. Run without DRY_RUN=true to execute.
```

## Notes

- The script only creates a channel, it does NOT create any mentorship relationships
- **Both the mentor and all mentees are added to the channel** and tagged in the welcome message
- Mentees without Discord usernames set or not found on the server will be skipped
- The channel will be private and only visible to the mentor and added mentees
- The channel name is sanitized to be URL-safe (lowercase, hyphens instead of spaces)
- The welcome message uses Discord mentions (`@username`) to notify all participants

## Cleanup

This is a one-time script. The channel will persist until manually deleted or archived.
