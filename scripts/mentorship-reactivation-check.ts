#!/usr/bin/env npx ts-node
/**
 * Mentorship Reactivation Check
 *
 * Scans mentorship sessions that were cancelled due to inactivity and checks
 * whether their archived Discord channel has seen new human activity since
 * cancellation. If it has, the mentorship is automatically reactivated:
 *
 *   1. Discord channel is unarchived and permissions restored
 *   2. Firestore session is set back to "active"
 *   3. A @here notification with a dashboard link is posted in the channel
 *
 * Usage:
 *   npx tsx scripts/mentorship-reactivation-check.ts             # execute
 *   npx tsx scripts/mentorship-reactivation-check.ts --dry-run   # safe preview
 *   DRY_RUN=true npx tsx scripts/mentorship-reactivation-check.ts
 *
 * Requirements:
 * - DISCORD_BOT_TOKEN
 * - DISCORD_GUILD_ID
 * - FIREBASE_SERVICE_ACCOUNT (production) or local credentials (dev)
 * - NEXT_PUBLIC_SITE_URL
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as admin from "firebase-admin";
import {
  getLastChannelActivityDate,
  unarchiveMentorshipChannel,
  sendChannelMessageWithComponents,
  isDiscordConfigured,
} from "../src/lib/discord";
import { maskName, maskEmail } from "./utils";

const DRY_RUN =
  process.argv.includes("--dry-run") || process.env.DRY_RUN === "true";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://codewithahsan.dev";

// Initialize Firebase Admin
if (!admin.apps.length) {
  if (process.env.NODE_ENV === "production") {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      console.error(
        "❌ FIREBASE_SERVICE_ACCOUNT environment variable is not set"
      );
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
  discordUsername?: string;
  roles: string[];
}

async function main() {
  console.log("=".repeat(60));
  console.log("Mentorship Reactivation Check");
  console.log("=".repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Mode:      ${DRY_RUN ? "DRY RUN (no changes)" : "EXECUTE"}`);
  console.log("");

  if (!isDiscordConfigured()) {
    console.error(
      "❌ Discord not configured. Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID."
    );
    process.exit(1);
  }
  console.log("✅ Discord configured");
  console.log("");

  // Query sessions cancelled due to inactivity that have a Discord channel
  console.log("Step 1: Querying sessions cancelled by inactivity...");
  const snapshot = await db
    .collection("mentorship_sessions")
    .where("status", "==", "cancelled")
    .where("cancellationReason", "==", "inactivity")
    .get();

  // Filter in-memory to those with a discordChannelId
  const candidates = snapshot.docs.filter(
    (doc) => !!doc.data().discordChannelId
  );

  console.log(
    `✅ Found ${snapshot.size} inactivity-cancelled session(s), ${candidates.length} with Discord channels`
  );
  console.log("");

  if (candidates.length === 0) {
    console.log("✅ Nothing to process.");
    console.log("=".repeat(60));
    process.exit(0);
  }

  console.log("Step 2: Checking for new activity in archived channels...");
  console.log("");

  let checked = 0;
  let reactivated = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of candidates) {
    const data = doc.data();
    const sessionId = doc.id;
    const channelId: string = data.discordChannelId;
    const cancelledAt: Date | null =
      data.cancelledAt?.toDate?.() ?? null;

    checked++;

    try {
      const lastActivity = await getLastChannelActivityDate(channelId);

      console.log(
        `Session ${sessionId} | channel ${channelId}` +
          `\n  cancelled: ${cancelledAt?.toISOString() ?? "unknown"}` +
          `\n  last human message: ${lastActivity?.toISOString() ?? "none"}`
      );

      const hasNewActivity =
        lastActivity !== null &&
        (cancelledAt === null || lastActivity > cancelledAt);

      if (!hasNewActivity) {
        console.log("  → No new activity. Skipping.");
        skipped++;
        console.log("");
        continue;
      }

      console.log("  → New activity detected since cancellation!");

      if (DRY_RUN) {
        console.log(
          "  [DRY RUN] Would unarchive channel, reactivate session, send notification."
        );
        reactivated++;
        console.log("");
        continue;
      }

      // Fetch mentor and mentee profiles for permission restoration
      const [mentorDoc, menteeDoc] = await Promise.all([
        db.collection("mentorship_profiles").doc(data.mentorId).get(),
        db.collection("mentorship_profiles").doc(data.menteeId).get(),
      ]);

      const mentor = mentorDoc.exists
        ? ({ uid: mentorDoc.id, ...mentorDoc.data() } as MentorshipProfile)
        : null;
      const mentee = menteeDoc.exists
        ? ({ uid: menteeDoc.id, ...menteeDoc.data() } as MentorshipProfile)
        : null;

      if (mentor) {
        console.log(
          `  mentor: ${maskName(mentor.displayName)} (${maskEmail(mentor.email)})`
        );
      }
      if (mentee) {
        console.log(
          `  mentee: ${maskName(mentee.displayName)} (${maskEmail(mentee.email)})`
        );
      }

      // 1. Unarchive Discord channel
      console.log("  → Unarchiving Discord channel...");
      const unarchiveResult = await unarchiveMentorshipChannel(
        channelId,
        mentor?.discordUsername,
        mentee?.discordUsername
      );

      if (!unarchiveResult.success) {
        console.error("  ❌ Failed to unarchive channel. Skipping reactivation.");
        errors++;
        console.log("");
        continue;
      }
      console.log("  ✅ Channel unarchived");

      // 2. Reactivate session in Firestore
      console.log("  → Reactivating session in Firestore...");
      await doc.ref.update({
        status: "active",
        reactivatedAt: new Date(),
        cancellationReason: admin.firestore.FieldValue.delete(),
        cancelledAt: admin.firestore.FieldValue.delete(),
        cancelledBy: admin.firestore.FieldValue.delete(),
      });
      console.log("  ✅ Session reactivated");

      // 3. Send notification with link button
      const dashboardUrl = `${SITE_URL}/mentorship/dashboard/${sessionId}`;
      await sendChannelMessageWithComponents(
        channelId,
        `♻️ **This mentorship has been automatically reactivated!**\n\n@here We detected new activity in this channel and have restored your mentorship session. Welcome back!`,
        [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 5,
                label: "View Dashboard",
                url: dashboardUrl,
              },
            ],
          },
        ]
      );
      console.log("  ✅ Notification sent");

      reactivated++;
    } catch (err) {
      console.error(`  ❌ Error processing session ${sessionId}:`, err);
      errors++;
    }

    console.log("");
  }

  console.log("=".repeat(60));
  console.log("Summary:");
  console.log(`  Checked:      ${checked}`);
  console.log(`  Reactivated:  ${reactivated}`);
  console.log(`  Skipped:      ${skipped}`);
  console.log(`  Errors:       ${errors}`);
  if (DRY_RUN) {
    console.log("  (Dry run — no changes were made)");
  }
  console.log("=".repeat(60));

  process.exit(errors > 0 && reactivated === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
