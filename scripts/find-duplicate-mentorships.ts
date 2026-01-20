#!/usr/bin/env npx ts-node
/**
 * Migration Script: Find Mentees with Multiple Active Mentorships
 *
 * This script identifies mentees who currently have more than one active mentorship,
 * which should not happen under the new one-mentor-per-mentee policy.
 * It sends a summary to Discord tagging the mentors to coordinate resolution.
 *
 * Usage:
 *   DRY_RUN=true NODE_ENV=development npx tsx scripts/find-duplicate-mentorships.ts  # Preview only
 *   NODE_ENV=development npx tsx scripts/find-duplicate-mentorships.ts               # Execute
 *
 * Requirements:
 * - FIREBASE_SERVICE_ACCOUNT or firebase credentials configured
 * - DISCORD_BOT_TOKEN and DISCORD_GUILD_ID for Discord notifications
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/firebaseAdmin";
import {
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
  approvedAt?: Date;
  discordChannelUrl?: string;
}

interface MentorshipProfile {
  displayName?: string;
  email?: string;
  discordUsername?: string;
}

interface MentorshipInfo {
  sessionId: string;
  mentorId: string;
  mentorName: string;
  mentorEmail: string;
  mentorDiscord?: string;
  approvedAt?: Date;
  discordChannelUrl?: string;
}

interface DuplicateGroup {
  menteeId: string;
  menteeName: string;
  menteeEmail: string;
  mentorships: MentorshipInfo[];
  oldestMentorship: MentorshipInfo;
  mentorshipsToRemove: MentorshipInfo[];
}

async function getProfile(uid: string): Promise<MentorshipProfile | null> {
  const doc = await db.collection("mentorship_profiles").doc(uid).get();
  if (!doc.exists) return null;
  return doc.data() as MentorshipProfile;
}

async function sendDuplicateSummaryToDiscord(
  duplicates: DuplicateGroup[]
): Promise<void> {
  console.log("\n📤 Sending summary to Discord channel...");

  const header = `📢 **Duplicate Mentorship Alert**\n\nThe following mentees have multiple active mentors. **Ideally, each mentee should have only one mentor.** Please coordinate to resolve:\n\n`;

  const sections: string[] = [];

  for (const dup of duplicates) {
    let section = `**🎓 Mentee: ${dup.menteeName}**\n`;

    // Identify the oldest (should keep) and newer ones (should remove)
    section += `✅ **Keep (oldest):** `;

    // Tag the oldest mentor
    const oldestMentor = dup.oldestMentorship;
    const oldestMember = oldestMentor.mentorDiscord
      ? await lookupMemberByUsername(oldestMentor.mentorDiscord)
      : null;
    const oldestMention = oldestMember
      ? `<@${oldestMember.id}>`
      : `**${oldestMentor.mentorName}**`;
    section += `${oldestMention} (approved ${oldestMentor.approvedAt?.toLocaleDateString() || "N/A"})\n`;

    // List mentors who should release the mentee
    section += `❌ **Should release:** `;
    const removeMentions: string[] = [];

    for (const ms of dup.mentorshipsToRemove) {
      const member = ms.mentorDiscord
        ? await lookupMemberByUsername(ms.mentorDiscord)
        : null;
      const mention = member ? `<@${member.id}>` : `**${ms.mentorName}**`;
      removeMentions.push(
        `${mention} (approved ${ms.approvedAt?.toLocaleDateString() || "N/A"})`
      );
    }
    section += removeMentions.join(", ");
    section += "\n";

    sections.push(section);
  }

  const footer = `\n---\n_Mentors: Please use the **Remove Mentee** button in your mentorship dashboard to release the mentee._\n_Dashboard: https://codewithahsan.dev/mentorship/my-matches_`;

  const stats = `**Total:** ${duplicates.length} mentee(s) with duplicate mentors\n\n`;

  const fullMessage = header + stats + sections.join("\n") + footer;

  // Discord has a 2000 character limit, split if needed
  if (fullMessage.length <= 2000) {
    await sendChannelMessage(SUMMARY_CHANNEL_ID, fullMessage);
  } else {
    // Send header first
    await sendChannelMessage(SUMMARY_CHANNEL_ID, header + stats);

    // Send each section separately if needed
    let currentBatch = "";
    for (const section of sections) {
      if ((currentBatch + section).length > 1900) {
        if (currentBatch) {
          await sendChannelMessage(SUMMARY_CHANNEL_ID, currentBatch);
        }
        currentBatch = section;
      } else {
        currentBatch += "\n" + section;
      }
    }
    if (currentBatch) {
      await sendChannelMessage(SUMMARY_CHANNEL_ID, currentBatch);
    }

    // Send footer
    await sendChannelMessage(SUMMARY_CHANNEL_ID, footer);
  }

  console.log("✅ Summary sent to Discord!");
}

async function main() {
  console.log("=".repeat(60));
  console.log("Find Duplicate Active Mentorships");
  console.log("=".repeat(60));
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no Discord message)" : "LIVE"}`);
  console.log("");

  console.log("Fetching all active mentorship sessions...\n");

  const snapshot = await db
    .collection("mentorship_sessions")
    .where("status", "==", "active")
    .get();

  const sessions: MentorshipSession[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      mentorId: data.mentorId,
      menteeId: data.menteeId,
      status: data.status,
      approvedAt: data.approvedAt?.toDate?.(),
      discordChannelUrl: data.discordChannelUrl,
    };
  });

  console.log(`Found ${sessions.length} active mentorship session(s)\n`);

  // Group by menteeId
  const menteeSessionMap = new Map<string, MentorshipSession[]>();

  for (const session of sessions) {
    const existing = menteeSessionMap.get(session.menteeId) || [];
    existing.push(session);
    menteeSessionMap.set(session.menteeId, existing);
  }

  // Find duplicates (mentees with more than 1 active session)
  const duplicates: DuplicateGroup[] = [];

  for (const [menteeId, menteeSessions] of menteeSessionMap.entries()) {
    if (menteeSessions.length > 1) {
      const menteeProfile = await getProfile(menteeId);

      const mentorships: MentorshipInfo[] = await Promise.all(
        menteeSessions.map(async (session) => {
          const mentorProfile = await getProfile(session.mentorId);
          return {
            sessionId: session.id,
            mentorId: session.mentorId,
            mentorName: mentorProfile?.displayName || "Unknown Mentor",
            mentorEmail: mentorProfile?.email || "N/A",
            mentorDiscord: mentorProfile?.discordUsername,
            approvedAt: session.approvedAt,
            discordChannelUrl: session.discordChannelUrl || "N/A",
          };
        })
      );

      // Sort by approvedAt (oldest first)
      mentorships.sort((a, b) => {
        if (!a.approvedAt) return 1;
        if (!b.approvedAt) return -1;
        return a.approvedAt.getTime() - b.approvedAt.getTime();
      });

      const oldestMentorship = mentorships[0];
      const mentorshipsToRemove = mentorships.slice(1);

      duplicates.push({
        menteeId,
        menteeName: menteeProfile?.displayName || "Unknown Mentee",
        menteeEmail: menteeProfile?.email || "N/A",
        mentorships,
        oldestMentorship,
        mentorshipsToRemove,
      });
    }
  }

  console.log("=".repeat(60));

  if (duplicates.length === 0) {
    console.log("✅ No duplicate active mentorships found!");
    console.log("   All mentees have at most one active mentor.");
    process.exit(0);
  }

  console.log(
    `⚠️  Found ${duplicates.length} mentee(s) with multiple active mentors:\n`
  );

  for (const dup of duplicates) {
    console.log(`\n📋 Mentee: ${dup.menteeName}`);
    console.log(`   Email: ${dup.menteeEmail}`);
    console.log(`   ID: ${dup.menteeId}`);
    console.log(`   Active mentorships (${dup.mentorships.length}):`);

    for (let i = 0; i < dup.mentorships.length; i++) {
      const ms = dup.mentorships[i];
      const isOldest = i === 0;
      const marker = isOldest ? "✅ KEEP" : "❌ REMOVE";

      console.log(`     ├─ [${marker}] Mentor: ${ms.mentorName}`);
      console.log(`     │  Discord: @${ms.mentorDiscord || "NOT SET"}`);
      console.log(`     │  Email: ${ms.mentorEmail}`);
      console.log(`     │  Session ID: ${ms.sessionId}`);
      console.log(`     │  Approved: ${ms.approvedAt?.toISOString() || "N/A"}`);
      console.log(`     │  Channel: ${ms.discordChannelUrl}`);
      console.log(`     │`);
    }
  }

  console.log("\n" + "=".repeat(60));

  // Send to Discord
  if (!DRY_RUN && isDiscordConfigured()) {
    await sendDuplicateSummaryToDiscord(duplicates);
  } else if (DRY_RUN) {
    console.log("\n🔵 DRY RUN: Would send summary to Discord channel");
    console.log(`   Channel: ${SUMMARY_CHANNEL_ID}`);
    console.log(`   ${duplicates.length} duplicate group(s)`);
  } else {
    console.log("\n⚠️  Discord not configured, skipping notification");
  }

  console.log("\n" + "=".repeat(60));
  console.log("Recommended Actions:");
  console.log("  1. Mentors marked ❌ REMOVE should release the mentee.");
  console.log(
    "  2. Use the 'Remove Mentee' button in the mentorship dashboard."
  );
  console.log("  3. The oldest mentorship (✅ KEEP) should be preserved.");
  console.log("=".repeat(60));

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
