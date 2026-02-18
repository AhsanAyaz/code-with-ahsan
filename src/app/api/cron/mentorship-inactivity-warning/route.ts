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
            menteeDoc.data() as { uid: string; displayName: string; email: string; role: "mentor" | "mentee" },
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
