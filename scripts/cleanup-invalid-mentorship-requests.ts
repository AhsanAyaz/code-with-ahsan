#!/usr/bin/env npx ts-node
/**
 * Script: Cleanup Invalid Mentorship Requests to Non-Approved Mentors
 *
 * This script finds mentorship sessions (pending, active, etc.) where the mentor
 * is NOT approved (status !== 'accepted') and deletes them. This cleans up
 * sessions that were created before the browse filter fix.
 *
 * Usage:
 *   DRY_RUN=true NODE_ENV=development npx tsx scripts/cleanup-invalid-mentorship-requests.ts   # Preview only
 *   NODE_ENV=development npx tsx scripts/cleanup-invalid-mentorship-requests.ts                 # Execute (delete sessions + Discord summary)
 *
 * Requirements:
 * - DISCORD_BOT_TOKEN environment variable (for sending summary)
 * - DISCORD_GUILD_ID environment variable
 * - FIREBASE_SERVICE_ACCOUNT or firebase credentials configured
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as admin from "firebase-admin";

// Initialize Firebase Admin directly (avoiding src/lib/firebaseAdmin side-effects)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const serviceAccount = require("../secure/code-with-ahsan-45496-firebase-adminsdk-7axo0-3127308aba.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

import { sendChannelMessage, isDiscordConfigured } from "../src/lib/discord";

const DRY_RUN = process.env.DRY_RUN === "true";
const SUMMARY_CHANNEL_ID = "1445678445408288850";

interface MentorshipSession {
  id: string;
  mentorId: string;
  menteeId: string;
  status: string;
}

interface MentorshipProfile {
  displayName?: string;
  email?: string;
  status?: "pending" | "accepted" | "declined" | "disabled";
}

interface InvalidSession {
  sessionId: string;
  sessionStatus: string;
  mentorId: string;
  mentorName: string;
  mentorStatus: string;
  menteeId: string;
  menteeName: string;
}

async function getAllSessions(): Promise<MentorshipSession[]> {
  const snapshot = await db.collection("mentorship_sessions").get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    mentorId: doc.data().mentorId,
    menteeId: doc.data().menteeId,
    status: doc.data().status,
  }));
}

async function getProfile(uid: string): Promise<MentorshipProfile | null> {
  const doc = await db.collection("mentorship_profiles").doc(uid).get();
  if (!doc.exists) return null;
  return doc.data() as MentorshipProfile;
}

async function deleteSessions(
  entries: InvalidSession[],
): Promise<{ deleted: number; failed: number }> {
  let deleted = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      console.log(`  🗑️  Deleting: ${entry.sessionId} (${entry.menteeName} → ${entry.mentorName})`);
      await db.collection("mentorship_sessions").doc(entry.sessionId).delete();
      deleted++;
      console.log(`     ✅ Deleted!`);
    } catch (error) {
      failed++;
      console.log(`     ❌ Failed to delete: ${error}`);
    }
  }

  return { deleted, failed };
}

async function sendSummaryToDiscord(
  entries: InvalidSession[],
  deletedCount: number,
): Promise<void> {
  console.log("\n📤 Sending summary to Discord channel...");

  const header = `📢 **Invalid Mentorship Sessions Cleaned Up**\n\n`;
  const stats = `Deleted **${deletedCount}** session(s) with non-approved mentors.\n\n`;

  let sessionSection = "";
  if (entries.length > 0) {
    sessionSection = "**🗑️ Sessions deleted:**\n";
    for (const entry of entries) {
      sessionSection += `• **${entry.menteeName}** → ${entry.mentorName} (${entry.mentorStatus})\n`;
    }
    sessionSection += "\n";
  }

  const footer = `\n---\n_Sessions were deleted because mentors were not approved (pending/declined/disabled)_`;

  const fullMessage = header + stats + sessionSection + footer;

  // Discord has a 2000 character limit, split if needed
  if (fullMessage.length <= 2000) {
    await sendChannelMessage(SUMMARY_CHANNEL_ID, fullMessage);
  } else {
    await sendChannelMessage(SUMMARY_CHANNEL_ID, header + stats);

    if (sessionSection) {
      const lines = sessionSection.split("\n");
      let chunk = "";
      for (const line of lines) {
        if ((chunk + line + "\n").length > 1900) {
          await sendChannelMessage(SUMMARY_CHANNEL_ID, chunk);
          chunk = "";
        }
        chunk += line + "\n";
      }
      if (chunk) {
        await sendChannelMessage(SUMMARY_CHANNEL_ID, chunk);
      }
    }

    await sendChannelMessage(SUMMARY_CHANNEL_ID, footer);
  }

  console.log("✅ Summary sent to Discord!");
}

async function main() {
  console.log("=".repeat(60));
  console.log("Cleanup Invalid Mentorship Requests (Non-Approved Mentors)");
  console.log("=".repeat(60));
  console.log(
    `Mode: ${DRY_RUN ? "DRY RUN (no deletions/Discord)" : "LIVE EXECUTION"}`,
  );
  console.log("");

  if (!isDiscordConfigured() && !DRY_RUN) {
    console.warn(
      "⚠️  Discord is not configured. Summary won't be sent to Discord.",
    );
  }

  console.log("Fetching all mentorship sessions...\n");
  const sessions = await getAllSessions();

  if (sessions.length === 0) {
    console.log("✅ No mentorship sessions found.");
    process.exit(0);
  }

  console.log(
    `Found ${sessions.length} mentorship session(s). Checking mentor statuses...\n`,
  );

  const invalidSessions: InvalidSession[] = [];
  const validSessions: InvalidSession[] = [];

  // Build a cache of profiles to avoid repeated lookups
  const profileCache = new Map<string, MentorshipProfile | null>();

  // Process all sessions
  console.log("--- CHECKING SESSIONS ---");
  for (const session of sessions) {
    // Get mentor profile (with caching)
    if (!profileCache.has(session.mentorId)) {
      profileCache.set(session.mentorId, await getProfile(session.mentorId));
    }
    const mentorProfile = profileCache.get(session.mentorId);

    // Get mentee profile (with caching)
    if (!profileCache.has(session.menteeId)) {
      profileCache.set(session.menteeId, await getProfile(session.menteeId));
    }
    const menteeProfile = profileCache.get(session.menteeId);

    const mentorName = mentorProfile?.displayName || "Unknown";
    const menteeName = menteeProfile?.displayName || "Unknown";
    const mentorStatus = mentorProfile?.status || "unknown";

    const entry: InvalidSession = {
      sessionId: session.id,
      sessionStatus: session.status,
      mentorId: session.mentorId,
      mentorName,
      mentorStatus,
      menteeId: session.menteeId,
      menteeName,
    };

    // Check if mentor is NOT accepted
    if (mentorStatus !== "accepted") {
      console.log(
        `  ❌ ${menteeName} → ${mentorName}: Mentor status is ${mentorStatus.toUpperCase()} (session: ${session.status})`,
      );
      invalidSessions.push(entry);
    } else {
      console.log(
        `  ✅ ${menteeName} → ${mentorName}: OK`,
      );
      validSessions.push(entry);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Summary:");
  console.log(
    `  ✅ Valid sessions (mentor approved): ${validSessions.length}`,
  );
  console.log(`  ❌ Invalid sessions (mentor NOT approved): ${invalidSessions.length}`);
  console.log("=".repeat(60));

  // Output invalid sessions
  if (invalidSessions.length > 0) {
    console.log("\n📋 INVALID SESSIONS to delete:\n");
    console.log("Mentee Name | Mentor Name | Mentor Status | Session Status");
    console.log("-".repeat(60));
    for (const entry of invalidSessions) {
      console.log(
        `${entry.menteeName} | ${entry.mentorName} | ${entry.mentorStatus} | ${entry.sessionStatus}`,
      );
    }

    console.log("\n📊 CSV Format:\n");
    console.log("SessionId,SessionStatus,MentorId,MentorName,MentorStatus,MenteeId,MenteeName");
    for (const entry of invalidSessions) {
      console.log(
        `"${entry.sessionId}","${entry.sessionStatus}","${entry.mentorId}","${entry.mentorName}","${entry.mentorStatus}","${entry.menteeId}","${entry.menteeName}"`,
      );
    }
  }

  // Delete sessions and send Discord summary if not dry run
  if (!DRY_RUN && invalidSessions.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("🗑️  Deleting Invalid Sessions...");
    console.log("=".repeat(60));

    const { deleted, failed } = await deleteSessions(invalidSessions);

    console.log("\n🗑️  Deletion Summary:");
    console.log(`  ✅ Deleted: ${deleted}`);
    console.log(`  ❌ Failed: ${failed}`);

    // Send summary to Discord
    if (isDiscordConfigured() && deleted > 0) {
      await sendSummaryToDiscord(invalidSessions, deleted);
    }
  } else if (DRY_RUN) {
    console.log("\n🔵 DRY RUN: Would delete:");
    console.log(`   ${invalidSessions.length} session(s)`);
    console.log("\n🔵 DRY RUN: Would send summary to Discord channel");
    console.log(`   Channel: ${SUMMARY_CHANNEL_ID}`);
  }

  if (invalidSessions.length === 0) {
    console.log("\n✅ All sessions have approved mentors! Nothing to clean up.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
