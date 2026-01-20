#!/usr/bin/env npx ts-node
/**
 * Script: Find Profiles Without Discord Usernames & Send Reminder Emails
 *
 * This script identifies mentors AND mentees in active mentorship sessions who
 * have not set their Discord username in their profile settings. It can optionally
 * send reminder emails with instructions on how to set it up.
 *
 * Usage:
 *   DRY_RUN=true NODE_ENV=development npx tsx scripts/find-mentees-without-discord.ts   # Preview only
 *   NODE_ENV=development npx tsx scripts/find-mentees-without-discord.ts                 # Execute (send emails + Discord summary)
 *
 * Requirements:
 * - MAILGUN_API_KEY environment variable (for sending emails)
 * - DISCORD_BOT_TOKEN environment variable (for sending summary)
 * - DISCORD_GUILD_ID environment variable
 * - FIREBASE_SERVICE_ACCOUNT or firebase credentials configured
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/firebaseAdmin";
import { sendChannelMessage, isDiscordConfigured } from "../src/lib/discord";
// Note: email module is dynamically imported to ensure env vars are loaded first

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
  discordUsername?: string;
}

interface ProfileMissingDiscord {
  odId: string;
  name: string;
  email: string | null;
  role: "mentor" | "mentee";
  // For mentees, include their mentor info
  mentorName?: string;
  mentorEmail?: string;
  // For mentors, include count of affected mentees
  menteeCount?: number;
}

async function getActiveMentorships(): Promise<MentorshipSession[]> {
  const snapshot = await db
    .collection("mentorship_sessions")
    .where("status", "==", "active")
    .get();

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

async function sendReminderEmails(
  mentorEntries: ProfileMissingDiscord[],
  menteeEntries: ProfileMissingDiscord[],
): Promise<{ sent: number; failed: number }> {
  // Dynamic import to ensure env vars are loaded
  const { sendDiscordUsernameReminderEmail } = await import("../src/lib/email");

  let sent = 0;
  let failed = 0;

  // Send to mentors
  for (const entry of mentorEntries) {
    if (!entry.email) {
      console.log(`  ⚠️  Skipping ${entry.name}: No email address`);
      failed++;
      continue;
    }

    console.log(`  📧 Sending to mentor: ${entry.name} (${entry.email})`);
    const success = await sendDiscordUsernameReminderEmail(
      { displayName: entry.name, email: entry.email },
      "mentor",
    );

    if (success) {
      sent++;
      console.log(`     ✅ Sent!`);
    } else {
      failed++;
      console.log(`     ❌ Failed to send`);
    }
  }

  // Send to mentees
  for (const entry of menteeEntries) {
    if (!entry.email) {
      console.log(`  ⚠️  Skipping ${entry.name}: No email address`);
      failed++;
      continue;
    }

    console.log(`  📧 Sending to mentee: ${entry.name} (${entry.email})`);
    const success = await sendDiscordUsernameReminderEmail(
      { displayName: entry.name, email: entry.email },
      "mentee",
      entry.mentorName,
    );

    if (success) {
      sent++;
      console.log(`     ✅ Sent!`);
    } else {
      failed++;
      console.log(`     ❌ Failed to send`);
    }
  }

  return { sent, failed };
}

async function sendSummaryToDiscord(
  mentorEntries: ProfileMissingDiscord[],
  menteeEntries: ProfileMissingDiscord[],
  emailsSent: number,
): Promise<void> {
  console.log("\n📤 Sending summary to Discord channel...");

  const header = `📢 **Discord Username Reminder Emails Sent**\n\n`;
  const stats = `Sent **${emailsSent}** reminder email(s) to users missing Discord usernames.\n\n`;

  let mentorSection = "";
  if (mentorEntries.length > 0) {
    mentorSection = "**🎓 Mentors emailed:**\n";
    for (const entry of mentorEntries) {
      if (entry.email) {
        mentorSection += `• **${entry.name}** - ${entry.menteeCount} active mentee(s)\n`;
      }
    }
    mentorSection += "\n";
  }

  let menteeSection = "";
  if (menteeEntries.length > 0) {
    menteeSection = "**👨‍🎓 Mentees emailed:**\n";
    for (const entry of menteeEntries) {
      if (entry.email) {
        menteeSection += `• **${entry.name}** → Mentor: ${entry.mentorName}\n`;
      }
    }
  }

  const footer = `\n---\n_Users should update their Discord username at https://codewithahsan.dev/mentorship/settings_`;

  const fullMessage = header + stats + mentorSection + menteeSection + footer;

  // Discord has a 2000 character limit, split if needed
  if (fullMessage.length <= 2000) {
    await sendChannelMessage(SUMMARY_CHANNEL_ID, fullMessage);
  } else {
    await sendChannelMessage(SUMMARY_CHANNEL_ID, header + stats);

    if (mentorSection) {
      await sendChannelMessage(SUMMARY_CHANNEL_ID, mentorSection);
    }

    if (menteeSection) {
      const lines = menteeSection.split("\n");
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
  console.log("Find Profiles Without Discord Username");
  console.log("=".repeat(60));
  console.log(
    `Mode: ${DRY_RUN ? "DRY RUN (no emails/Discord)" : "LIVE EXECUTION"}`,
  );
  console.log("");

  if (!isDiscordConfigured() && !DRY_RUN) {
    console.warn(
      "⚠️  Discord is not configured. Summary won't be sent to Discord.",
    );
  }

  console.log("Fetching active mentorship sessions...\n");
  const sessions = await getActiveMentorships();

  if (sessions.length === 0) {
    console.log("✅ No active mentorship sessions found.");
    process.exit(0);
  }

  console.log(
    `Found ${sessions.length} active mentorship session(s). Checking profiles...\n`,
  );

  const mentorsMissingDiscord: ProfileMissingDiscord[] = [];
  const menteesMissingDiscord: ProfileMissingDiscord[] = [];

  // Track unique IDs and mentor mentee counts
  const processedMentors = new Map<
    string,
    { profile: MentorshipProfile; menteeCount: number }
  >();
  const processedMentees = new Set<string>();

  // First pass: collect all mentors and count their mentees
  for (const session of sessions) {
    const mentorProfile = await getProfile(session.mentorId);
    if (mentorProfile) {
      const existing = processedMentors.get(session.mentorId);
      if (existing) {
        existing.menteeCount++;
      } else {
        processedMentors.set(session.mentorId, {
          profile: mentorProfile,
          menteeCount: 1,
        });
      }
    }
  }

  // Process mentors
  console.log("--- MENTORS ---");
  for (const [mentorId, { profile, menteeCount }] of processedMentors) {
    const discordUsername = profile.discordUsername;
    const name = profile.displayName || "Unknown";
    const email = profile.email || null;

    if (!discordUsername) {
      console.log(
        `  ❌ ${name}: Discord username NOT SET (${email || "no email"}) - ${menteeCount} mentee(s)`,
      );
      mentorsMissingDiscord.push({
        odId: mentorId,
        name,
        email,
        role: "mentor",
        menteeCount,
      });
    } else {
      console.log(`  ✅ ${name}: @${discordUsername}`);
    }
  }

  // Process mentees
  console.log("\n--- MENTEES ---");
  for (const session of sessions) {
    if (processedMentees.has(session.menteeId)) {
      continue;
    }
    processedMentees.add(session.menteeId);

    const [mentorProfile, menteeProfile] = await Promise.all([
      getProfile(session.mentorId),
      getProfile(session.menteeId),
    ]);

    if (!menteeProfile) {
      console.log(`  ⚠️  Mentee ${session.menteeId}: Profile not found`);
      continue;
    }

    const discordUsername = menteeProfile.discordUsername;
    const name = menteeProfile.displayName || "Unknown";
    const email = menteeProfile.email || null;

    if (!discordUsername) {
      console.log(
        `  ❌ ${name}: Discord username NOT SET (${email || "no email"})`,
      );
      menteesMissingDiscord.push({
        odId: session.menteeId,
        name,
        email,
        role: "mentee",
        mentorName: mentorProfile?.displayName || "Unknown Mentor",
        mentorEmail: mentorProfile?.email || undefined,
      });
    } else {
      console.log(`  ✅ ${name}: @${discordUsername}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Summary:");
  console.log(
    `  ✅ Mentors with Discord: ${processedMentors.size - mentorsMissingDiscord.length}`,
  );
  console.log(`  ❌ Mentors without Discord: ${mentorsMissingDiscord.length}`);
  console.log(
    `  ✅ Mentees with Discord: ${processedMentees.size - menteesMissingDiscord.length}`,
  );
  console.log(`  ❌ Mentees without Discord: ${menteesMissingDiscord.length}`);
  console.log("=".repeat(60));

  // Output mentors missing Discord
  if (mentorsMissingDiscord.length > 0) {
    console.log("\n📋 MENTORS to contact (for email):\n");
    console.log("Name | Email | Active Mentees");
    console.log("-".repeat(60));
    for (const entry of mentorsMissingDiscord) {
      console.log(
        `${entry.name} | ${entry.email || "N/A"} | ${entry.menteeCount}`,
      );
    }

    console.log("\n📊 CSV Format (Mentors):\n");
    console.log("Name,Email,ActiveMentees");
    for (const entry of mentorsMissingDiscord) {
      console.log(
        `"${entry.name}","${entry.email || ""}","${entry.menteeCount}"`,
      );
    }
  }

  // Output mentees missing Discord
  if (menteesMissingDiscord.length > 0) {
    console.log("\n📋 MENTEES to contact (for email):\n");
    console.log("Name | Email | Mentor | Mentor Email");
    console.log("-".repeat(60));
    for (const entry of menteesMissingDiscord) {
      console.log(
        `${entry.name} | ${entry.email || "N/A"} | ${entry.mentorName} | ${entry.mentorEmail || "N/A"}`,
      );
    }

    console.log("\n📊 CSV Format (Mentees):\n");
    console.log("Name,Email,MentorName,MentorEmail");
    for (const entry of menteesMissingDiscord) {
      console.log(
        `"${entry.name}","${entry.email || ""}","${entry.mentorName}","${entry.mentorEmail || ""}"`,
      );
    }
  }

  // Send emails and Discord summary if not dry run
  if (
    !DRY_RUN &&
    (mentorsMissingDiscord.length > 0 || menteesMissingDiscord.length > 0)
  ) {
    console.log("\n" + "=".repeat(60));
    console.log("📧 Sending Reminder Emails...");
    console.log("=".repeat(60));

    const { sent, failed } = await sendReminderEmails(
      mentorsMissingDiscord,
      menteesMissingDiscord,
    );

    console.log("\n📧 Email Summary:");
    console.log(`  ✅ Sent: ${sent}`);
    console.log(`  ❌ Failed: ${failed}`);

    // Send summary to Discord
    if (isDiscordConfigured() && sent > 0) {
      await sendSummaryToDiscord(
        mentorsMissingDiscord,
        menteesMissingDiscord,
        sent,
      );
    }
  } else if (DRY_RUN) {
    console.log("\n🔵 DRY RUN: Would send emails to:");
    console.log(`   ${mentorsMissingDiscord.length} mentor(s)`);
    console.log(`   ${menteesMissingDiscord.length} mentee(s)`);
    console.log("\n🔵 DRY RUN: Would send summary to Discord channel");
    console.log(`   Channel: ${SUMMARY_CHANNEL_ID}`);
  }

  if (
    mentorsMissingDiscord.length === 0 &&
    menteesMissingDiscord.length === 0
  ) {
    console.log("\n✅ All profiles have their Discord username set!");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
