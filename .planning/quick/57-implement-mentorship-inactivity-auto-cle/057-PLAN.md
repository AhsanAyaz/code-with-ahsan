---
phase: quick-057
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/types/mentorship.ts
  - src/lib/email.ts
  - src/app/api/cron/mentorship-inactivity-warning/route.ts
  - src/app/api/cron/mentorship-inactivity-cleanup/route.ts
  - vercel.json
autonomous: true
requirements: []

must_haves:
  truths:
    - "MentorshipMatch type includes inactivityWarningAt optional Date field"
    - "Warning cron rejects requests missing valid CRON_SECRET bearer token"
    - "Warning cron sends Discord message and sets inactivityWarningAt for sessions inactive 35+ days with no prior warning"
    - "Cleanup cron archives and cancels sessions where warning was sent 7+ days ago and still no new activity"
    - "Both crons operate per-session with try/catch so one failure does not abort the job"
    - "vercel.json schedules both crons daily"
  artifacts:
    - path: "src/types/mentorship.ts"
      provides: "inactivityWarningAt field on MentorshipMatch"
      contains: "inactivityWarningAt"
    - path: "src/lib/email.ts"
      provides: "sendMentorshipInactivityWarningEmail function"
      exports: ["sendMentorshipInactivityWarningEmail"]
    - path: "src/app/api/cron/mentorship-inactivity-warning/route.ts"
      provides: "Warning cron endpoint"
      exports: ["GET"]
    - path: "src/app/api/cron/mentorship-inactivity-cleanup/route.ts"
      provides: "Cleanup cron endpoint"
      exports: ["GET"]
    - path: "vercel.json"
      provides: "Cron schedule configuration"
      contains: "mentorship-inactivity-warning"
  key_links:
    - from: "src/app/api/cron/mentorship-inactivity-warning/route.ts"
      to: "src/lib/discord.ts"
      via: "sendChannelMessage import"
      pattern: "sendChannelMessage"
    - from: "src/app/api/cron/mentorship-inactivity-cleanup/route.ts"
      to: "src/lib/discord.ts"
      via: "archiveMentorshipChannel import"
      pattern: "archiveMentorshipChannel"
    - from: "src/app/api/cron/mentorship-inactivity-cleanup/route.ts"
      to: "src/lib/email.ts"
      via: "sendMentorshipRemovedEmail import"
      pattern: "sendMentorshipRemovedEmail"
---

<objective>
Implement mentorship inactivity auto-cleanup with two Vercel cron jobs. A warning job flags sessions inactive for 35+ days and notifies both parties. A cleanup job archives and cancels sessions that remained inactive for 7 days after the warning.

Purpose: Automatically reclaim inactive mentorship slots and Discord channels without manual admin intervention.
Output: Two secured cron API routes, an inactivity warning email function, an updated MentorshipMatch type, and vercel.json scheduling.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/types/mentorship.ts
@src/lib/email.ts
@src/lib/discord.ts
@src/app/api/mentorship/dashboard/[matchId]/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add inactivityWarningAt to MentorshipMatch and add warning email function</name>
  <files>
    src/types/mentorship.ts
    src/lib/email.ts
  </files>
  <action>
In `src/types/mentorship.ts`, add `inactivityWarningAt?: Date;` to the `MentorshipMatch` interface after the `cancelledBy` line (line 94).

In `src/lib/email.ts`, add a new exported async function after `sendMentorshipRemovedEmail`. Follow the exact same pattern as that function: accept `(mentor: MentorshipProfile, mentee: MentorshipProfile)`, call `sendEmail` with a subject and `wrapEmailHtml(content, subject)`. Return `Promise<boolean>`.

```typescript
export async function sendMentorshipInactivityWarningEmail(
  mentor: MentorshipProfile,
  mentee: MentorshipProfile,
): Promise<boolean> {
  const subject = `⚠️ Mentorship Inactivity Warning`;
  const content = `
    <h2>Mentorship Inactivity Notice</h2>
    <div class="highlight">
      <p>The mentorship between <strong>${mentor.displayName}</strong> (mentor) and <strong>${mentee.displayName}</strong> (mentee) has been inactive for 35 days.</p>
    </div>
    <p>If no activity occurs in the Discord channel within the next <strong>7 days</strong>, the channel will be archived and the mentorship will be marked as cancelled.</p>
    <p>To keep this mentorship active, please send a message in your Discord channel.</p>
    <a href="${getSiteUrl()}/mentorship/dashboard" class="button">Go to Mentorship Dashboard</a>
  `;
  // Send to both mentor and mentee
  const mentorResult = await sendEmail(mentor.email, subject, wrapEmailHtml(content, subject));
  const menteeResult = await sendEmail(mentee.email, subject, wrapEmailHtml(content, subject));
  return mentorResult && menteeResult;
}
```
  </action>
  <verify>Run `npx tsc --noEmit` from the project root. No type errors on modified files.</verify>
  <done>MentorshipMatch has inactivityWarningAt field. sendMentorshipInactivityWarningEmail is exported from email.ts and TypeScript is happy.</done>
</task>

<task type="auto">
  <name>Task 2: Create mentorship-inactivity-warning cron route</name>
  <files>
    src/app/api/cron/mentorship-inactivity-warning/route.ts
  </files>
  <action>
Create `src/app/api/cron/mentorship-inactivity-warning/route.ts`. The directory does not exist yet — create it.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendChannelMessage } from "@/lib/discord";
import { sendMentorshipInactivityWarningEmail } from "@/lib/email";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron:inactivity-warning");

const INACTIVITY_DAYS = 35;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const cutoff = new Date(now - INACTIVITY_DAYS * MS_PER_DAY);

  let warned = 0;

  try {
    const snapshot = await db
      .collection("mentorship_sessions")
      .where("status", "==", "active")
      .get();

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();

        // Skip if already warned
        if (data.inactivityWarningAt) continue;

        // Determine last activity date
        const lastActivity: Date | null = data.lastContactAt?.toDate?.() ?? data.approvedAt?.toDate?.() ?? null;
        if (!lastActivity || lastActivity > cutoff) continue;

        const channelId: string | undefined = data.discordChannelId;

        // Send Discord warning
        if (channelId) {
          await sendChannelMessage(
            channelId,
            "⚠️ This mentorship channel has been inactive for 35 days. If no activity occurs in the next 7 days, this channel will be archived and the mentorship will be marked as cancelled. To keep this mentorship active, please send a message in this channel."
          );
        }

        // Mark as warned
        await doc.ref.update({ inactivityWarningAt: FieldValue.serverTimestamp() });

        // Send emails to mentor and mentee
        const [mentorDoc, menteeDoc] = await Promise.all([
          db.collection("mentorship_profiles").doc(data.mentorId).get(),
          db.collection("mentorship_profiles").doc(data.menteeId).get(),
        ]);

        if (mentorDoc.exists && menteeDoc.exists) {
          await sendMentorshipInactivityWarningEmail(
            mentorDoc.data() as { uid: string; displayName: string; email: string; role: "mentor" | "mentee" },
            menteeDoc.data() as { uid: string; displayName: string; email: string; role: "mentor" | "mentee" }
          );
        }

        warned++;
        log.info(`Warned session ${doc.id}`);
      } catch (err) {
        log.error(`Failed to process session ${doc.id}`, err);
      }
    }
  } catch (err) {
    log.error("Failed to query sessions", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ warned });
}
```
  </action>
  <verify>Run `npx tsc --noEmit`. No errors. File exists at `src/app/api/cron/mentorship-inactivity-warning/route.ts`.</verify>
  <done>Warning cron route exists, rejects unauthorized requests with 401, and processes inactive sessions without a prior warning, returning `{ warned: N }`.</done>
</task>

<task type="auto">
  <name>Task 3: Create mentorship-inactivity-cleanup cron route and vercel.json</name>
  <files>
    src/app/api/cron/mentorship-inactivity-cleanup/route.ts
    vercel.json
  </files>
  <action>
Create `src/app/api/cron/mentorship-inactivity-cleanup/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendChannelMessage, archiveMentorshipChannel } from "@/lib/discord";
import { sendMentorshipRemovedEmail } from "@/lib/email";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron:inactivity-cleanup");

const INACTIVITY_DAYS = 35;
const WARNING_GRACE_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const inactivityCutoff = new Date(now - INACTIVITY_DAYS * MS_PER_DAY);
  const warningCutoff = new Date(now - WARNING_GRACE_DAYS * MS_PER_DAY);

  let archived = 0;

  try {
    const snapshot = await db
      .collection("mentorship_sessions")
      .where("status", "==", "active")
      .get();

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();

        // Must have been warned
        if (!data.inactivityWarningAt) continue;

        // Warning must be older than 7 days
        const warnedAt: Date | null = data.inactivityWarningAt?.toDate?.() ?? null;
        if (!warnedAt || warnedAt > warningCutoff) continue;

        // Must still be inactive (no new activity since warning)
        const lastActivity: Date | null = data.lastContactAt?.toDate?.() ?? data.approvedAt?.toDate?.() ?? null;
        if (!lastActivity || lastActivity > inactivityCutoff) continue;

        const channelId: string | undefined = data.discordChannelId;

        // Send final Discord message before archiving
        if (channelId) {
          await sendChannelMessage(
            channelId,
            "🔒 This mentorship channel is being archived due to 42 days of inactivity. The mentorship has been marked as cancelled."
          );
          await archiveMentorshipChannel(channelId, "Archived due to inactivity");
        }

        // Update Firestore
        await doc.ref.update({
          status: "cancelled",
          cancellationReason: "inactivity",
          cancelledAt: FieldValue.serverTimestamp(),
          inactivityWarningAt: FieldValue.delete(),
        });

        // Send removal email to mentee
        const [mentorDoc, menteeDoc] = await Promise.all([
          db.collection("mentorship_profiles").doc(data.mentorId).get(),
          db.collection("mentorship_profiles").doc(data.menteeId).get(),
        ]);

        if (mentorDoc.exists && menteeDoc.exists) {
          await sendMentorshipRemovedEmail(
            menteeDoc.data() as { uid: string; displayName: string; email: string; role: "mentor" | "mentee" },
            mentorDoc.data() as { uid: string; displayName: string; email: string; role: "mentor" | "mentee" }
          );
        }

        archived++;
        log.info(`Archived session ${doc.id}`);
      } catch (err) {
        log.error(`Failed to process session ${doc.id}`, err);
      }
    }
  } catch (err) {
    log.error("Failed to query sessions", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ archived });
}
```

Create `vercel.json` in the project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/mentorship-inactivity-warning",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/mentorship-inactivity-cleanup",
      "schedule": "0 10 * * *"
    }
  ]
}
```
  </action>
  <verify>Run `npx tsc --noEmit`. No errors. Both files exist. `cat vercel.json` shows two cron entries.</verify>
  <done>Cleanup cron route rejects unauthorized requests, archives sessions that have been warned for 7+ days and are still inactive, and updates Firestore status to "cancelled". vercel.json schedules both crons daily at 09:00 and 10:00 UTC.</done>
</task>

</tasks>

<verification>
Run `npx tsc --noEmit` from the project root. Zero type errors across all five modified/created files.

Spot-check file existence:
- `src/types/mentorship.ts` contains `inactivityWarningAt?: Date`
- `src/lib/email.ts` exports `sendMentorshipInactivityWarningEmail`
- `src/app/api/cron/mentorship-inactivity-warning/route.ts` exists
- `src/app/api/cron/mentorship-inactivity-cleanup/route.ts` exists
- `vercel.json` exists with two cron entries
</verification>

<success_criteria>
- TypeScript compilation passes with no errors
- Warning cron: returns 401 without correct CRON_SECRET, returns `{ warned: N }` on success
- Cleanup cron: returns 401 without correct CRON_SECRET, returns `{ archived: N }` on success
- Both crons handle per-session errors without aborting the full job
- vercel.json configures both crons to run daily
</success_criteria>

<output>
After completion, create `.planning/quick/57-implement-mentorship-inactivity-auto-cle/057-SUMMARY.md`
</output>
