#!/usr/bin/env npx tsx
/**
 * Quick Script: Resend Mentorship Summary to Discord
 *
 * This script re-sends the summary of the last backfill to a Discord channel
 * with proper @mentions (now with rate limit handling).
 *
 * Usage:
 *   NODE_ENV=development npx tsx scripts/resend-summary.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/firebaseAdmin";
import {
  sendChannelMessage,
  isDiscordConfigured,
  lookupMemberByUsername,
} from "../src/lib/discord";

const SUMMARY_CHANNEL_ID = "1445678445408288850";

interface MentorshipProfile {
  displayName?: string;
  discordUsername?: string;
}

async function getProfile(uid: string): Promise<MentorshipProfile | null> {
  const doc = await db.collection("mentorship_profiles").doc(uid).get();
  if (!doc.exists) return null;
  return doc.data() as MentorshipProfile;
}

async function main() {
  console.log("=".repeat(60));
  console.log("Resend Mentorship Summary to Discord");
  console.log("=".repeat(60));

  if (!isDiscordConfigured()) {
    console.error("❌ Discord is not configured.");
    process.exit(1);
  }

  // Fetch all active sessions
  const activeSessions = await db
    .collection("mentorship_sessions")
    .where("status", "==", "active")
    .get();

  interface SuccessEntry {
    mentorName: string;
    mentorDiscord: string;
    menteeName: string;
    channelUrl: string;
  }

  interface SkipEntry {
    mentorName: string;
    mentorDiscord: string | null;
    menteeName: string;
    menteeDiscord: string | null;
    reason: "mentor_missing" | "mentee_missing" | "both_missing";
  }

  const successEntries: SuccessEntry[] = [];
  const skipEntries: SkipEntry[] = [];

  console.log(`\nProcessing ${activeSessions.size} active sessions...\n`);

  for (const doc of activeSessions.docs) {
    const data = doc.data();

    const [mentorProfile, menteeProfile] = await Promise.all([
      getProfile(data.mentorId),
      getProfile(data.menteeId),
    ]);

    if (!mentorProfile || !menteeProfile) continue;

    const mentorDiscord = mentorProfile.discordUsername;
    const menteeDiscord = menteeProfile.discordUsername;
    const hasChannel = !!(data.discordChannelId && data.discordChannelUrl);

    if (hasChannel) {
      // Session has a channel - add to success
      successEntries.push({
        mentorName: mentorProfile.displayName || "Mentor",
        mentorDiscord: mentorDiscord || "",
        menteeName: menteeProfile.displayName || "Mentee",
        channelUrl: data.discordChannelUrl,
      });
    } else if (!mentorDiscord || !menteeDiscord) {
      // Missing Discord username
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
    }
  }

  console.log(
    `Found ${successEntries.length} with channels, ${skipEntries.length} skipped\n`
  );

  // Build success section with @mentions
  let successSection = "";
  if (successEntries.length > 0) {
    successSection = "**✅ Active Mentorships with Discord Channels:**\n";
    for (const entry of successEntries) {
      if (entry.mentorDiscord) {
        const mentorMember = await lookupMemberByUsername(entry.mentorDiscord);
        const mentorMention = mentorMember
          ? `<@${mentorMember.id}>`
          : `**${entry.mentorName}** (@${entry.mentorDiscord})`;
        successSection += `• ${mentorMention} ↔ **${entry.menteeName}**\n`;
        console.log(`  ✓ ${entry.mentorName} ↔ ${entry.menteeName}`);
      }
    }
  }

  // Build skip section
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

  // Compose and send message
  const header = `📢 **Mentorship Discord Status Summary**\n\n`;
  const stats = `**Summary:** ${successEntries.length} active with channels, ${skipEntries.length} pending setup\n\n`;
  const footer = `\n---\n_Update your profile at https://codewithahsan.dev/mentorship to set your Discord username._`;

  const fullMessage = header + stats + successSection + skipSection + footer;

  console.log("\n📤 Sending summary to Discord...");

  // Discord has a 2000 character limit, split if needed
  if (fullMessage.length <= 2000) {
    await sendChannelMessage(SUMMARY_CHANNEL_ID, fullMessage);
  } else {
    await sendChannelMessage(
      SUMMARY_CHANNEL_ID,
      header + stats + successSection
    );
    if (skipSection) {
      await sendChannelMessage(
        SUMMARY_CHANNEL_ID,
        "**Pending Setup (continued):**\n" + skipSection + footer
      );
    }
  }

  console.log("✅ Summary sent to Discord!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
