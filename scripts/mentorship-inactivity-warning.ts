#!/usr/bin/env npx ts-node
/**
 * Mentorship Inactivity Warning
 *
 * Finds active mentorship sessions where the Discord channel has had no human
 * (non-bot) messages in the last 35 days and sends a warning that the channel
 * will be archived after 7 more days of inactivity.
 *
 * Inactivity is determined by checking Discord channel message history directly,
 * NOT by any system-tracked lastContactAt field.
 *
 * Usage:
 *   npx tsx scripts/mentorship-inactivity-warning.ts                          # Development
 *   NODE_ENV=production npx tsx scripts/mentorship-inactivity-warning.ts      # Production
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
  getLastChannelActivityDate,
  isDiscordConfigured,
} from "../src/lib/discord";
import {
  sendMentorshipInactivityWarningEmail,
} from "../src/lib/email";
import { maskName, maskEmail } from "./utils";

const INACTIVITY_DAYS = 35;
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
  console.log("Mentorship Inactivity Warning Job");
  console.log("=".repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Threshold: ${INACTIVITY_DAYS} days of Discord channel inactivity`);
  console.log("");

  if (!isDiscordConfigured()) {
    console.error("❌ Discord is not configured. Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID.");
    process.exit(1);
  }
  console.log("✅ Discord configured");
  console.log("");

  const inactivityCutoff = new Date(Date.now() - INACTIVITY_DAYS * MS_PER_DAY);

  // Query all active sessions that haven't been warned yet
  console.log("Step 1: Querying active mentorship sessions...");
  const snapshot = await db
    .collection("mentorship_sessions")
    .where("status", "==", "active")
    .get();

  const unwarnedSessions = snapshot.docs.filter((doc) => !doc.data().inactivityWarningAt);
  console.log(`✅ Found ${snapshot.size} active session(s), ${unwarnedSessions.length} not yet warned`);
  console.log("");

  if (unwarnedSessions.length === 0) {
    console.log("✅ No sessions to check - nothing to do.");
    console.log("=".repeat(60));
    process.exit(0);
  }

  console.log("Step 2: Checking Discord channel activity...");
  console.log("");

  let warned = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of unwarnedSessions) {
    const data = doc.data();
    const channelId: string | undefined = data.discordChannelId;
    const sessionId = doc.id;

    try {
      let lastActivityDate: Date | null = null;

      if (channelId) {
        // Primary: check actual Discord channel message history
        lastActivityDate = await getLastChannelActivityDate(channelId);
        console.log(
          `Session ${sessionId}: channel ${channelId} — last human message: ${
            lastActivityDate ? lastActivityDate.toISOString() : "none"
          }`
        );
      } else {
        // Fallback for sessions without a Discord channel: use approvedAt
        lastActivityDate = data.approvedAt?.toDate?.() ?? null;
        console.log(
          `Session ${sessionId}: no Discord channel — using approvedAt: ${
            lastActivityDate ? lastActivityDate.toISOString() : "none"
          }`
        );
      }

      // If no date could be determined, or activity is recent, skip
      if (!lastActivityDate || lastActivityDate > inactivityCutoff) {
        console.log(`  → Active or undetermined, skipping`);
        skipped++;
        continue;
      }

      console.log(`  → Inactive for ${INACTIVITY_DAYS}+ days, sending warning...`);

      // Send Discord warning
      if (channelId) {
        await sendChannelMessage(
          channelId,
          `⚠️ **Inactivity Notice** — This mentorship channel has had no activity for ${INACTIVITY_DAYS} days.\n\n` +
          `If no messages are sent within the next **7 days**, this channel will be archived and the mentorship marked as cancelled.\n\n` +
          `To keep this mentorship active, simply send a message here. 💬`
        );
      }

      // Mark as warned in Firestore
      await doc.ref.update({
        inactivityWarningAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Send warning emails to both parties
      const [mentorDoc, menteeDoc] = await Promise.all([
        db.collection("mentorship_profiles").doc(data.mentorId).get(),
        db.collection("mentorship_profiles").doc(data.menteeId).get(),
      ]);

      if (mentorDoc.exists && menteeDoc.exists) {
        const mentor = { uid: mentorDoc.id, ...mentorDoc.data() } as MentorshipProfile;
        const mentee = { uid: menteeDoc.id, ...menteeDoc.data() } as MentorshipProfile;
        console.log(
          `  → Emailing ${maskName(mentor.displayName)} (${maskEmail(mentor.email)}) ` +
          `and ${maskName(mentee.displayName)} (${maskEmail(mentee.email)})`
        );
        await sendMentorshipInactivityWarningEmail(mentor, mentee);
      }

      console.log(`  ✅ Warning sent`);
      warned++;
    } catch (err) {
      console.error(`  ❌ Failed to process session ${sessionId}:`, err);
      failed++;
    }

    console.log("");
  }

  console.log("=".repeat(60));
  console.log("Summary:");
  console.log(`  Sessions checked: ${unwarnedSessions.length}`);
  console.log(`  Warnings sent:    ${warned}`);
  console.log(`  Still active:     ${skipped}`);
  console.log(`  Errors:           ${failed}`);
  console.log("=".repeat(60));

  process.exit(failed > 0 && warned === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
