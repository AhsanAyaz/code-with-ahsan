#!/usr/bin/env npx ts-node
/**
 * Mentorship Inactivity Cleanup
 *
 * Finds active mentorship sessions that were warned about inactivity 7+ days ago
 * and checks whether the Discord channel has had any human activity since the warning.
 *
 * - If NO new activity since warning: archive the channel, cancel the mentorship.
 * - If activity detected since warning: reset the warning (clear inactivityWarningAt).
 *
 * Usage:
 *   npx tsx scripts/mentorship-inactivity-cleanup.ts                          # Development
 *   NODE_ENV=production npx tsx scripts/mentorship-inactivity-cleanup.ts      # Production
 *
 * Requirements:
 * - DISCORD_BOT_TOKEN
 * - DISCORD_GUILD_ID
 * - FIREBASE_SERVICE_ACCOUNT (production) or local credentials (dev)
 * - MAILGUN_API_KEY (optional — emails skipped if not set)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as admin from "firebase-admin";
import {
  sendChannelMessage,
  archiveMentorshipChannel,
  getLastChannelActivityDate,
  isDiscordConfigured,
} from "../src/lib/discord";
import { sendMentorshipRemovedEmail } from "../src/lib/email";
import { maskName, maskEmail } from "./utils";

const WARNING_GRACE_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Initialize Firebase Admin
if (!admin.apps.length) {
  if (process.env.NODE_ENV === "production") {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      console.error("❌ FIREBASE_SERVICE_ACCOUNT environment variable is not set");
      process.exit(1);
    }
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      console.log("✅ Firebase Admin initialized (production mode)");
    } catch (e) {
      console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", e);
      process.exit(1);
    }
  } else {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serviceAccount = require("../secure/code-with-ahsan-45496-firebase-adminsdk-7axo0-3127308aba.json");
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.log("✅ Firebase Admin initialized (development mode)");
    } catch (e) {
      console.error("❌ Could not load local service account:", e);
      process.exit(1);
    }
  }
}

const db = admin.firestore();

interface MentorshipProfile {
  uid: string;
  displayName: string;
  email: string;
  role: "mentor" | "mentee";
}

async function main() {
  console.log("=".repeat(60));
  console.log("Mentorship Inactivity Cleanup Job");
  console.log("=".repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Grace period: ${WARNING_GRACE_DAYS} days after warning`);
  console.log("");

  if (!isDiscordConfigured()) {
    console.error("❌ Discord is not configured. Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID.");
    process.exit(1);
  }
  console.log("✅ Discord configured");
  console.log("");

  const warningCutoff = new Date(Date.now() - WARNING_GRACE_DAYS * MS_PER_DAY);

  // Query all active sessions that have been warned
  console.log("Step 1: Querying warned mentorship sessions...");
  const snapshot = await db
    .collection("mentorship_sessions")
    .where("status", "==", "active")
    .get();

  const warnedSessions = snapshot.docs.filter((doc) => {
    const warnedAt: Date | null = doc.data().inactivityWarningAt?.toDate?.() ?? null;
    // Only sessions warned more than 7 days ago
    return warnedAt !== null && warnedAt <= warningCutoff;
  });

  console.log(`✅ Found ${snapshot.size} active session(s), ${warnedSessions.length} past their grace period`);
  console.log("");

  if (warnedSessions.length === 0) {
    console.log("✅ No sessions to process - nothing to do.");
    console.log("=".repeat(60));
    process.exit(0);
  }

  console.log("Step 2: Checking Discord channel activity since warning...");
  console.log("");

  let archived = 0;
  let reset = 0;
  let failed = 0;

  for (const doc of warnedSessions) {
    const data = doc.data();
    const channelId: string | undefined = data.discordChannelId;
    const sessionId = doc.id;
    const warnedAt: Date = data.inactivityWarningAt.toDate();

    try {
      let lastActivityDate: Date | null = null;

      if (channelId) {
        lastActivityDate = await getLastChannelActivityDate(channelId);
        console.log(
          `Session ${sessionId}: channel ${channelId} — last human message: ${
            lastActivityDate ? lastActivityDate.toISOString() : "none"
          } | warned at: ${warnedAt.toISOString()}`
        );
      } else {
        // No Discord channel — use approvedAt as reference, nothing to check
        lastActivityDate = null;
        console.log(`Session ${sessionId}: no Discord channel — will archive`);
      }

      const hasActivitySinceWarning =
        lastActivityDate !== null && lastActivityDate > warnedAt;

      if (hasActivitySinceWarning) {
        // Activity detected after warning — reset the warning timer
        console.log(`  → Activity found after warning, resetting warning timer`);
        await doc.ref.update({
          inactivityWarningAt: admin.firestore.FieldValue.delete(),
        });
        reset++;
        console.log(`  ✅ Warning reset`);
      } else {
        // Still inactive — archive and cancel
        console.log(`  → Still inactive, archiving channel and cancelling mentorship...`);

        if (channelId) {
          await sendChannelMessage(
            channelId,
            `🔒 **This channel is being archived** due to ${WARNING_GRACE_DAYS + 35} days of inactivity.\n\n` +
            `The mentorship has been marked as **cancelled**. If you believe this was in error, please contact an admin.`
          );
          await archiveMentorshipChannel(channelId, "Archived due to inactivity");
        }

        await doc.ref.update({
          status: "cancelled",
          cancellationReason: "inactivity",
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          inactivityWarningAt: admin.firestore.FieldValue.delete(),
        });

        // Email the mentee
        const [mentorDoc, menteeDoc] = await Promise.all([
          db.collection("mentorship_profiles").doc(data.mentorId).get(),
          db.collection("mentorship_profiles").doc(data.menteeId).get(),
        ]);

        if (mentorDoc.exists && menteeDoc.exists) {
          const mentor = { uid: mentorDoc.id, ...mentorDoc.data() } as MentorshipProfile;
          const mentee = { uid: menteeDoc.id, ...menteeDoc.data() } as MentorshipProfile;
          console.log(
            `  → Emailing mentee ${maskName(mentee.displayName)} (${maskEmail(mentee.email)})`
          );
          await sendMentorshipRemovedEmail(mentee, mentor);
        }

        console.log(`  ✅ Archived and cancelled`);
        archived++;
      }
    } catch (err) {
      console.error(`  ❌ Failed to process session ${sessionId}:`, err);
      failed++;
    }

    console.log("");
  }

  console.log("=".repeat(60));
  console.log("Summary:");
  console.log(`  Sessions processed: ${warnedSessions.length}`);
  console.log(`  Archived/cancelled: ${archived}`);
  console.log(`  Warning reset:      ${reset}`);
  console.log(`  Errors:             ${failed}`);
  console.log("=".repeat(60));

  process.exit(failed > 0 && archived === 0 && reset === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
