#!/usr/bin/env npx ts-node
/**
 * Send Discord Reminders to Mentors with Pending Requests
 *
 * This script queries all pending mentorship sessions, groups them by mentor,
 * and sends a Discord DM to each mentor with the count of pending requests.
 *
 * Usage:
 *   npx tsx scripts/send-mentor-pending-reminders.ts                          # Development
 *   NODE_ENV=production npx tsx scripts/send-mentor-pending-reminders.ts      # Production
 *
 * Requirements:
 * - DISCORD_BOT_TOKEN environment variable
 * - DISCORD_GUILD_ID environment variable
 * - FIREBASE_SERVICE_ACCOUNT (production) or firebase credentials (dev)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as admin from "firebase-admin";
import {
  sendDirectMessage,
  isDiscordConfigured,
} from "../src/lib/discord";
import { maskName, maskEmail, maskDiscord } from "./utils";

// Initialize Firebase Admin
if (!admin.apps.length) {
  if (process.env.NODE_ENV === "production") {
    // Production/CI: Use FIREBASE_SERVICE_ACCOUNT env var
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
    // Development: Load from secure directory
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serviceAccount = require("../secure/code-with-ahsan-45496-firebase-adminsdk-7axo0-3127308aba.json");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✅ Firebase Admin initialized (development mode)");
    } catch (e) {
      console.error("❌ Could not load local service account:", e);
      process.exit(1);
    }
  }
}

const db = admin.firestore();

interface MentorshipSession {
  id: string;
  mentorId: string;
  menteeId: string;
  status: string;
}

interface MentorshipProfile {
  uid: string;
  displayName?: string;
  email?: string;
  discordUsername?: string;
}

/**
 * Main function to send reminders
 */
async function main() {
  console.log("=".repeat(60));
  console.log("Mentor Pending Reminders - Daily Notification Job");
  console.log("=".repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("");

  // Check Discord configuration
  if (!isDiscordConfigured()) {
    console.error("❌ Discord is not configured. Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID.");
    process.exit(1);
  }

  console.log("✅ Discord configured");
  console.log("");

  // Step 1: Query all pending mentorship sessions
  console.log("Step 1: Querying pending mentorship sessions...");

  let pendingSessions: MentorshipSession[];
  try {
    const snapshot = await db
      .collection("mentorship_sessions")
      .where("status", "==", "pending")
      .get();

    pendingSessions = snapshot.docs.map((doc) => ({
      id: doc.id,
      mentorId: doc.data().mentorId,
      menteeId: doc.data().menteeId,
      status: doc.data().status,
    }));

    console.log(`✅ Found ${pendingSessions.length} pending mentorship session(s)`);
  } catch (error) {
    console.error("❌ Failed to query pending sessions:", error);
    process.exit(1);
  }

  if (pendingSessions.length === 0) {
    console.log("✅ No pending sessions - no reminders needed.");
    console.log("=".repeat(60));
    process.exit(0);
  }

  // Step 2: Group pending sessions by mentorId
  console.log("");
  console.log("Step 2: Grouping sessions by mentor...");

  const mentorToMentees = new Map<string, string[]>();

  for (const session of pendingSessions) {
    const menteeIds = mentorToMentees.get(session.mentorId) || [];
    menteeIds.push(session.menteeId);
    mentorToMentees.set(session.mentorId, menteeIds);
  }

  console.log(`✅ Grouped into ${mentorToMentees.size} mentor(s) with pending requests`);

  // Step 3: Send reminders to each mentor
  console.log("");
  console.log("Step 3: Sending Discord reminders...");
  console.log("");

  let notifiedCount = 0;
  let failedCount = 0;

  for (const [mentorId, menteeIds] of mentorToMentees) {
    try {
      // Fetch mentor profile
      const mentorDoc = await db.collection("mentorship_profiles").doc(mentorId).get();

      if (!mentorDoc.exists) {
        console.error(`⚠️  Mentor ${mentorId} not found in mentorship_profiles`);
        failedCount++;
        continue;
      }

      const mentor = {
        uid: mentorDoc.id,
        ...mentorDoc.data(),
      } as MentorshipProfile;

      const pendingCount = menteeIds.length;
      const discordUsername = mentor.discordUsername;

      console.log(`Processing: ${maskName(mentor.displayName)} (${maskEmail(mentor.email)})`);
      console.log(`  Discord: ${maskDiscord(discordUsername)}`);
      console.log(`  Pending requests: ${pendingCount}`);

      if (!discordUsername) {
        console.log(`  ⚠️  No Discord username - skipping`);
        failedCount++;
        continue;
      }

      // Build the reminder message
      const pluralS = pendingCount === 1 ? "" : "s";
      const message =
        `👋 Hi ${mentor.displayName}!\n\n` +
        `You have ${pendingCount} pending mentorship request${pluralS}.\n\n` +
        `Please review and respond to your mentees when you have a chance:\n` +
        `https://codewithahsan.dev/mentorship/dashboard/sessions\n\n` +
        `Your mentees are waiting to hear from you! 🚀`;

      // Send Discord DM
      const success = await sendDirectMessage(discordUsername, message);

      if (success) {
        console.log(`  ✅ DM sent successfully`);
        notifiedCount++;
      } else {
        console.log(`  ❌ Failed to send DM`);
        failedCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing mentor ${mentorId}:`, error);
      failedCount++;
    }

    console.log("");
  }

  // Step 4: Print summary
  console.log("=".repeat(60));
  console.log("Summary:");
  console.log(`  Total pending sessions: ${pendingSessions.length}`);
  console.log(`  Mentors with pending requests: ${mentorToMentees.size}`);
  console.log(`  Reminders sent successfully: ${notifiedCount}`);
  console.log(`  Failed/Skipped: ${failedCount}`);
  console.log("=".repeat(60));

  if (notifiedCount > 0) {
    console.log("✅ Reminder job completed successfully");
    process.exit(0);
  } else {
    console.log("⚠️  No reminders sent - all mentors skipped or failed");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
