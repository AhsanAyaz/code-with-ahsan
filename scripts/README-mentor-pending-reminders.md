# Automated Mentor Reminders

## Overview

This system automatically sends daily Discord reminders to mentors who have pending mentorship requests, helping ensure mentees aren't left waiting for a response.

## GitHub Actions Cron Job

The reminder system runs automatically via GitHub Actions:

- **Schedule:** Daily at 7:00 AM CEST (5:00 AM UTC)
- **Workflow:** `.github/workflows/mentor-pending-reminders.yml`
- **Script:** `scripts/send-mentor-pending-reminders.ts`

### How It Works

1. Query all pending mentorship sessions from Firestore
2. Group pending requests by mentor
3. Send one Discord DM per mentor with:
   - Count of pending requests
   - Direct link to dashboard sessions page
   - Friendly reminder message
4. Log results with masked sensitive data
5. Continue processing even if individual DMs fail (non-blocking)

### Manual Trigger

You can manually trigger the workflow from GitHub Actions:

1. Go to **Actions** → **Mentor Pending Reminders**
2. Click **Run workflow**
3. Select branch and confirm

## Manual Script Usage

### Development (Local Testing)

```bash
# Dry run - uses .env.local and local Firebase credentials
npx tsx scripts/send-mentor-pending-reminders.ts
```

### Production (CI/Server)

```bash
# Requires environment variables
NODE_ENV=production \
DISCORD_BOT_TOKEN=xxx \
DISCORD_GUILD_ID=xxx \
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}' \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=code-with-ahsan-45496 \
npx tsx scripts/send-mentor-pending-reminders.ts
```

## Required Environment Variables

| Variable | Description | Source |
|----------|-------------|--------|
| `DISCORD_BOT_TOKEN` | Discord bot authentication token | Discord Developer Portal |
| `DISCORD_GUILD_ID` | Discord server ID | Discord server settings |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK service account JSON (stringified) | Firebase Console |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Firebase Console |

## Script Logic

### Grouping by Mentor

The script groups all pending requests by mentor to send **one consolidated DM per mentor**, not one per mentee. This prevents notification spam.

Example:
- Mentor A has 5 pending requests → 1 DM: "You have 5 pending mentorship requests."
- Mentor B has 1 pending request → 1 DM: "You have 1 pending mentorship request."

### Non-Intrusive Design

The script only sends DMs to mentors who:
1. Have pending mentorship requests
2. Have a Discord username set in their profile
3. Are active members of the Discord server

If no pending requests exist, the script exits gracefully without sending any notifications.

### Error Handling

The script handles common edge cases:

- **Missing Discord username:** Logs a warning and skips that mentor
- **User not found on Discord:** Logs error and continues with other mentors
- **DM send failure:** Logs error but doesn't stop processing other mentors
- **Firebase connection errors:** Fatal - exits with error code

All sensitive data (names, emails, Discord usernames) are masked in logs using utility functions from `scripts/utils.ts`.

## Discord Message Format

```
👋 Hi [Mentor Name]!

You have [N] pending mentorship request(s).

Please review and respond to your mentees when you have a chance:
https://codewithahsan.dev/mentorship/dashboard/sessions

Your mentees are waiting to hear from you! 🚀
```

## Testing

### Local Development Test

```bash
# Uses real Firebase data but development credentials
npx tsx scripts/send-mentor-pending-reminders.ts
```

Expected output:
```
============================================================
Mentor Pending Reminders - Daily Notification Job
============================================================
Timestamp: 2026-02-16T09:14:25.480Z

✅ Discord configured

Step 1: Querying pending mentorship sessions...
✅ Found 222 pending mentorship session(s)

Step 2: Grouping sessions by mentor...
✅ Grouped into 20 mentor(s) with pending requests

Step 3: Sending Discord reminders...

Processing: As***d (as***@gmail.com)
  Discord: as***
  Pending requests: 51
  ✅ DM sent successfully

...

============================================================
Summary:
  Total pending sessions: 222
  Mentors with pending requests: 20
  Reminders sent successfully: 18
  Failed/Skipped: 2
============================================================
✅ Reminder job completed successfully
```

## Performance Metrics

Based on production testing:

- **Query time:** ~1-2 seconds for 200+ pending sessions
- **Processing time:** ~0.5 seconds per mentor (includes Discord API calls)
- **Total runtime:** ~15-20 seconds for 20 mentors
- **Discord API rate limiting:** Handled automatically with built-in retry logic

## Monitoring

### Success Indicators

- Exit code 0
- Summary shows `Reminders sent successfully: N` where N > 0
- No fatal errors in logs

### Failure Indicators

- Exit code 1
- Summary shows all mentors failed/skipped
- Fatal error in logs (Firebase connection, Discord not configured)

### GitHub Actions Logs

Check workflow execution logs:
1. Go to **Actions** → **Mentor Pending Reminders**
2. Click on latest run
3. Expand **Send mentor reminders** step
4. Review summary table and error logs

## Troubleshooting

### "Discord is not configured"

Ensure GitHub Secrets are set:
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`

### "FIREBASE_SERVICE_ACCOUNT environment variable is not set"

Ensure `FIREBASE_SERVICE_ACCOUNT` secret is set in GitHub with valid JSON.

### "Cannot send DM - user not found"

The Discord username in the mentor's profile doesn't match any member in the server. This is logged but not fatal - script continues with other mentors.

### "No Discord username - skipping"

Mentor hasn't set their Discord username in their mentorship profile. Encourage mentors to complete their profiles.

## Related Scripts

- `scripts/create-mentor-pending-channel.ts` - Creates temporary Discord channels for mentors with pending mentees (manual, one-time)
- `scripts/utils.ts` - Shared utility functions for masking sensitive data

## Maintenance

### Changing the Schedule

Edit `.github/workflows/mentor-pending-reminders.yml`:

```yaml
schedule:
  - cron: '0 5 * * *'  # Change time here (UTC)
```

Cron format: `minute hour day month weekday`

Examples:
- `0 5 * * *` - 5:00 AM UTC daily
- `0 9 * * 1-5` - 9:00 AM UTC weekdays only
- `0 */6 * * *` - Every 6 hours

### Customizing the Message

Edit the message template in `scripts/send-mentor-pending-reminders.ts`:

```typescript
const message =
  `👋 Hi ${mentor.displayName}!\n\n` +
  `You have ${pendingCount} pending mentorship request${pluralS}.\n\n` +
  `Please review and respond to your mentees when you have a chance:\n` +
  `https://codewithahsan.dev/mentorship/dashboard/sessions\n\n` +
  `Your mentees are waiting to hear from you! 🚀`;
```

## Future Enhancements

Potential improvements:
- Configurable reminder frequency per mentor (daily, weekly, etc.)
- Escalation for very old pending requests (>7 days)
- Summary statistics sent to admin channel
- Opt-out preference for mentors who prefer email reminders
- Timezone-aware scheduling based on mentor location
