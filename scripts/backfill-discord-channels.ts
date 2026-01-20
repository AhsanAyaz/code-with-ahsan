#!/usr/bin/env npx ts-node
/**
 * Migration Script: Backfill Discord Channels for Active Mentorships
 *
 * This script finds all active mentorship sessions that are missing Discord channels
 * and creates channels for them.
 *
 * Usage:
 *   DRY_RUN=true NODE_ENV=development npx tsx scripts/backfill-discord-channels.ts   # Preview only
 *   NODE_ENV=development npx tsx scripts/backfill-discord-channels.ts                 # Execute for real
 *
 * Requirements:
 * - DISCORD_BOT_TOKEN environment variable
 * - DISCORD_GUILD_ID environment variable
 * - FIREBASE_SERVICE_ACCOUNT or firebase credentials configured
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/firebaseAdmin";
import {
  createMentorshipChannel,
  sendDirectMessage,
  sendChannelMessage,
  isDiscordConfigured,
  lookupMemberByUsername,
} from "../src/lib/discord";

const DRY_RUN = process.env.DRY_RUN === "true";
const SUMMARY_CHANNEL_ID = "1445678445408288850";

interface MentorshipSession {
  id: string;
  mentorId: string;
  menteeId: string;
  status: string;
  discordChannelId?: string;
  discordChannelUrl?: string;
}

interface MentorshipProfile {
  displayName?: string;
  email?: string;
  discordUsername?: string;
}

interface SuccessEntry {
  mentorName: string;
  mentorDiscord: string;
  menteeName: string;
  menteeDiscord: string;
  channelUrl: string;
}

interface SkipEntry {
  mentorName: string;
  mentorDiscord: string | null;
  menteeName: string;
  menteeDiscord: string | null;
  reason: "mentor_missing" | "mentee_missing" | "both_missing";
}

async function getActiveMentorshipsWithoutChannels(): Promise<
  MentorshipSession[]
> {
  const snapshot = await db
    .collection("mentorship_sessions")
    .where("status", "==", "active")
    .get();

  const sessions: MentorshipSession[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    // Include if no channel ID or URL
    if (!data.discordChannelId || !data.discordChannelUrl) {
      sessions.push({
        id: doc.id,
        mentorId: data.mentorId,
        menteeId: data.menteeId,
        status: data.status,
        discordChannelId: data.discordChannelId,
        discordChannelUrl: data.discordChannelUrl,
      });
    }
  }

  return sessions;
}

async function getProfile(uid: string): Promise<MentorshipProfile | null> {
  const doc = await db.collection("mentorship_profiles").doc(uid).get();
  if (!doc.exists) return null;
  return doc.data() as MentorshipProfile;
}

async function sendSummaryToDiscord(
  successEntries: SuccessEntry[],
  skipEntries: SkipEntry[]
): Promise<void> {
  console.log("\n📤 Sending summary to Discord channel...");

  // Build success section - tag mentors with their channel
  let successSection = "";
  if (successEntries.length > 0) {
    successSection = "**✅ Channels Created:**\n";
    for (const entry of successEntries) {
      const mentorMember = await lookupMemberByUsername(entry.mentorDiscord);
      const mentorMention = mentorMember
        ? `<@${mentorMember.id}>`
        : `**${entry.mentorName}** (@${entry.mentorDiscord})`;
      successSection += `• ${mentorMention} ↔ **${entry.menteeName}** - ${entry.channelUrl}\n`;
    }
  }

  // Build skip section - organized by issue type
  let skipSection = "";
  if (skipEntries.length > 0) {
    const mentorMissing = skipEntries.filter(
      (e) => e.reason === "mentor_missing"
    );
    const menteeMissing = skipEntries.filter(
      (e) => e.reason === "mentee_missing"
    );
    const bothMissing = skipEntries.filter((e) => e.reason === "both_missing");

    if (mentorMissing.length > 0) {
      skipSection += "\n**⚠️ Mentors: Please set your Discord username:**\n";
      for (const entry of mentorMissing) {
        skipSection += `• **${entry.mentorName}** (mentee: ${entry.menteeName})\n`;
      }
    }

    if (menteeMissing.length > 0) {
      skipSection +=
        "\n**⚠️ Mentors: Ask your mentee to set their Discord username:**\n";
      for (const entry of menteeMissing) {
        const mentorMember = entry.mentorDiscord
          ? await lookupMemberByUsername(entry.mentorDiscord)
          : null;
        const mentorMention = mentorMember
          ? `<@${mentorMember.id}>`
          : `**${entry.mentorName}**`;
        skipSection += `• ${mentorMention} → mentee **${entry.menteeName}** needs to set Discord\n`;
      }
    }

    if (bothMissing.length > 0) {
      skipSection += "\n**⚠️ Both mentor and mentee missing Discord:**\n";
      for (const entry of bothMissing) {
        skipSection += `• **${entry.mentorName}** ↔ **${entry.menteeName}**\n`;
      }
    }
  }

  // Compose final message
  const header = `📢 **Discord Channel Backfill Complete**\n\n`;
  const stats = `**Summary:** ${successEntries.length} created, ${skipEntries.length} skipped\n\n`;
  const footer = `\n---\n_Please update your profiles at https://codewithahsan.dev/mentorship to resolve any issues._`;

  const fullMessage = header + stats + successSection + skipSection + footer;

  // Discord has a 2000 character limit, split if needed
  if (fullMessage.length <= 2000) {
    await sendChannelMessage(SUMMARY_CHANNEL_ID, fullMessage);
  } else {
    // Send in parts
    await sendChannelMessage(
      SUMMARY_CHANNEL_ID,
      header + stats + successSection
    );
    if (skipSection) {
      await sendChannelMessage(
        SUMMARY_CHANNEL_ID,
        "**Skipped (continued):**\n" + skipSection + footer
      );
    }
  }

  console.log("✅ Summary sent to Discord!");
}

async function main() {
  console.log("=".repeat(60));
  console.log("Discord Channel Backfill Script");
  console.log("=".repeat(60));
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE EXECUTION"}`);
  console.log("");

  if (!isDiscordConfigured()) {
    console.error(
      "❌ Discord is not configured. Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID."
    );
    process.exit(1);
  }

  console.log("Fetching active mentorships without Discord channels...\n");
  const sessions = await getActiveMentorshipsWithoutChannels();

  if (sessions.length === 0) {
    console.log("✅ All active mentorships already have Discord channels!");
    process.exit(0);
  }

  console.log(`Found ${sessions.length} mentorship(s) needing channels:\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  const successEntries: SuccessEntry[] = [];
  const skipEntries: SkipEntry[] = [];

  for (const session of sessions) {
    console.log(`\n--- Session: ${session.id} ---`);

    // Fetch profiles
    const [mentorProfile, menteeProfile] = await Promise.all([
      getProfile(session.mentorId),
      getProfile(session.menteeId),
    ]);

    if (!mentorProfile || !menteeProfile) {
      console.log(`  ⚠️  Skipping: Missing profile(s)`);
      console.log(`      Mentor: ${mentorProfile ? "OK" : "MISSING"}`);
      console.log(`      Mentee: ${menteeProfile ? "OK" : "MISSING"}`);
      skipCount++;
      continue;
    }

    const mentorDiscord = mentorProfile.discordUsername;
    const menteeDiscord = menteeProfile.discordUsername;

    if (!mentorDiscord || !menteeDiscord) {
      console.log(`  ⚠️  Skipping: Missing Discord username(s)`);
      console.log(
        `      Mentor Discord: ${mentorDiscord || "NOT SET"} (${mentorProfile.displayName})`
      );
      console.log(
        `      Mentee Discord: ${menteeDiscord || "NOT SET"} (${menteeProfile.displayName})`
      );

      // Track for summary
      let reason: "mentor_missing" | "mentee_missing" | "both_missing";
      if (!mentorDiscord && !menteeDiscord) {
        reason = "both_missing";
      } else if (!mentorDiscord) {
        reason = "mentor_missing";
      } else {
        reason = "mentee_missing";
      }

      skipEntries.push({
        mentorName: mentorProfile.displayName || "Unknown Mentor",
        mentorDiscord: mentorDiscord || null,
        menteeName: menteeProfile.displayName || "Unknown Mentee",
        menteeDiscord: menteeDiscord || null,
        reason,
      });

      skipCount++;
      continue;
    }

    console.log(
      `  👨‍🏫 Mentor: ${mentorProfile.displayName} (@${mentorDiscord})`
    );
    console.log(
      `  👨‍🎓 Mentee: ${menteeProfile.displayName} (@${menteeDiscord})`
    );

    if (DRY_RUN) {
      console.log(`  🔵 DRY RUN: Would create channel and update Firestore`);
      successEntries.push({
        mentorName: mentorProfile.displayName || "Mentor",
        mentorDiscord,
        menteeName: menteeProfile.displayName || "Mentee",
        menteeDiscord,
        channelUrl: "[DRY RUN]",
      });
      successCount++;
      continue;
    }

    // Create the channel
    try {
      const result = await createMentorshipChannel(
        mentorProfile.displayName || "Mentor",
        menteeProfile.displayName || "Mentee",
        session.id,
        mentorDiscord,
        menteeDiscord
      );

      if (!result) {
        console.log(`  ❌ Failed to create channel`);
        errorCount++;
        continue;
      }

      // Update Firestore
      await db.collection("mentorship_sessions").doc(session.id).update({
        discordChannelId: result.channelId,
        discordChannelUrl: result.channelUrl,
      });

      console.log(`  ✅ Channel created: ${result.channelUrl}`);

      // Track for summary
      successEntries.push({
        mentorName: mentorProfile.displayName || "Mentor",
        mentorDiscord,
        menteeName: menteeProfile.displayName || "Mentee",
        menteeDiscord,
        channelUrl: result.channelUrl,
      });

      // Send DM to mentee
      await sendDirectMessage(
        menteeDiscord,
        `🔗 **Your mentorship channel is ready!**\n\n` +
          `A Discord channel has been created for your mentorship with **${mentorProfile.displayName}**.\n` +
          `Join here: ${result.channelUrl}`
      ).catch((err) => console.log(`  ⚠️  DM failed: ${err.message}`));

      successCount++;
    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Summary:");
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ⚠️  Skipped: ${skipCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log("=".repeat(60));

  // Send summary to Discord channel (only if not dry run)
  if (!DRY_RUN && (successEntries.length > 0 || skipEntries.length > 0)) {
    await sendSummaryToDiscord(successEntries, skipEntries);
  } else if (DRY_RUN) {
    console.log("\n🔵 DRY RUN: Would send summary to Discord channel");
    console.log(`   Channel: ${SUMMARY_CHANNEL_ID}`);
    console.log(`   ${successEntries.length} success entries`);
    console.log(`   ${skipEntries.length} skip entries`);
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
