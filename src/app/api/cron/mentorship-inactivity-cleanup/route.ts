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
            mentorDoc.data() as { uid: string; displayName: string; email: string; role: "mentor" | "mentee" },
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
