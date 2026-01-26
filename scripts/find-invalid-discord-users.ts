#!/usr/bin/env npx ts-node
/**
 * Script: Find Profiles With Invalid Discord Usernames
 *
 * This script identifies mentors AND mentees who have set a Discord username
 * but that username does not exist on the Discord server.
 * It sends a summary to Discord tagging profiles that need attention.
 *
 * Usage:
 *   DRY_RUN=true NODE_ENV=development npx tsx scripts/find-invalid-discord-users.ts  # Preview only
 *   NODE_ENV=development npx tsx scripts/find-invalid-discord-users.ts               # Execute
 *
 * Requirements:
 * - FIREBASE_SERVICE_ACCOUNT or firebase credentials configured
 * - DISCORD_BOT_TOKEN and DISCORD_GUILD_ID for Discord notifications
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { db } from "../src/lib/firebaseAdminLazy";
import {
  sendChannelMessage,
  isDiscordConfigured,
  lookupMemberByUsername,
} from "../src/lib/discord";
import { maskName, maskEmail, maskDiscord } from "./utils";

const DRY_RUN = process.env.DRY_RUN === "true";
const SUMMARY_CHANNEL_ID = "1445678445408288850";

// Output directory for CSV files
const OUTPUT_DIR = path.join(__dirname, "output");

interface MentorshipProfile {
  uid: string;
  displayName?: string;
  email?: string;
  discordUsername?: string;
  role?: string;
  status?: string;
}

interface InvalidDiscordEntry {
  uid: string;
  name: string;
  email: string | null;
  role: string;
  discordUsername: string;
  status: string;
}

async function getAllProfilesWithDiscord(): Promise<MentorshipProfile[]> {
  // Get all profiles that have a discordUsername set
  const snapshot = await db.collection("mentorship_profiles").get();

  return snapshot.docs
    .map((doc) => ({
      uid: doc.id,
      displayName: doc.data().displayName,
      email: doc.data().email,
      discordUsername: doc.data().discordUsername,
      role: doc.data().role,
      status: doc.data().status,
    }))
    .filter((profile) => profile.discordUsername); // Only include profiles with Discord usernames
}

async function sendInvalidDiscordSummaryToDiscord(
  invalidMentors: InvalidDiscordEntry[],
  invalidMentees: InvalidDiscordEntry[]
): Promise<void> {
  console.log("\n📤 Sending summary to Discord channel...");

  const total = invalidMentors.length + invalidMentees.length;
  const header = `📢 **Invalid Discord Usernames Report**\n\nFound **${total}** profile(s) with Discord usernames that do not exist on our server.\n\n`;

  const sections: string[] = [];

  // Mentors section
  if (invalidMentors.length > 0) {
    let mentorSection = "**🎓 Mentors with invalid Discord:**\n";
    for (const entry of invalidMentors) {
      mentorSection += `• ${entry.name} (@${entry.discordUsername}) - ${entry.status}\n`;
    }
    sections.push(mentorSection);
  }

  // Mentees section
  if (invalidMentees.length > 0) {
    let menteeSection = "**👨‍🎓 Mentees with invalid Discord:**\n";
    for (const entry of invalidMentees) {
      menteeSection += `• ${entry.name} (@${entry.discordUsername}) - ${entry.status}\n`;
    }
    sections.push(menteeSection);
  }

  const footer = `\n---\n_These users should update their Discord username at https://codewithahsan.dev/mentorship/settings_\n_Discord invite: https://codewithahsan.dev/discord_`;

  const fullMessage = header + sections.join("\n") + footer;

  // Discord has a 2000 character limit, split if needed
  if (fullMessage.length <= 2000) {
    await sendChannelMessage(SUMMARY_CHANNEL_ID, fullMessage);
  } else {
    // Send header first
    await sendChannelMessage(SUMMARY_CHANNEL_ID, header);

    // Send each section separately if needed
    for (const section of sections) {
      if (section.length > 1900) {
        // Split large sections
        const lines = section.split("\n");
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
      } else {
        await sendChannelMessage(SUMMARY_CHANNEL_ID, section);
      }
    }

    // Send footer
    await sendChannelMessage(SUMMARY_CHANNEL_ID, footer);
  }

  console.log("✅ Summary sent to Discord!");
}

/**
 * Write invalid Discord entries to a CSV file
 */
function writeCsvFile(
  invalidMentors: InvalidDiscordEntry[],
  invalidMentees: InvalidDiscordEntry[]
): string | null {
  if (invalidMentors.length === 0 && invalidMentees.length === 0) {
    return null;
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `invalid-discord-users-${timestamp}.csv`;
  const filepath = path.join(OUTPUT_DIR, filename);

  const allEntries = [...invalidMentors, ...invalidMentees];
  const csvHeader = "Name,Email,DiscordUsername,Role,Status,UID";
  const csvRows = allEntries.map(
    (entry) =>
      `"${entry.name}","${entry.email || ""}","${entry.discordUsername}","${entry.role}","${entry.status}","${entry.uid}"`
  );

  const csvContent = [csvHeader, ...csvRows].join("\n");
  fs.writeFileSync(filepath, csvContent, "utf-8");

  return filepath;
}

async function main() {
  console.log("=".repeat(60));
  console.log("Find Profiles With Invalid Discord Usernames");
  console.log("=".repeat(60));
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no Discord message)" : "LIVE"}`);
  console.log("");

  if (!isDiscordConfigured()) {
    console.error(
      "❌ Discord is not configured. Please set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID."
    );
    process.exit(1);
  }

  console.log("Fetching all profiles with Discord usernames...\n");
  const profiles = await getAllProfilesWithDiscord();

  if (profiles.length === 0) {
    console.log("✅ No profiles with Discord usernames found.");
    process.exit(0);
  }

  console.log(
    `Found ${profiles.length} profile(s) with Discord usernames. Validating...\n`
  );

  const invalidMentors: InvalidDiscordEntry[] = [];
  const invalidMentees: InvalidDiscordEntry[] = [];
  let validCount = 0;

  // Add a small delay between Discord API calls to avoid rate limiting
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const discordUsername = profile.discordUsername!;
    const name = profile.displayName || "Unknown";
    const role = profile.role || "unknown";
    const status = profile.status || "unknown";

    const maskedName = maskName(name);
    const maskedDiscord = maskDiscord(discordUsername);

    process.stdout.write(
      `  [${i + 1}/${profiles.length}] Checking ${maskedName} (@${maskedDiscord})... `
    );

    try {
      const member = await lookupMemberByUsername(discordUsername);

      if (member) {
        console.log("✅ Valid");
        validCount++;
      } else {
        console.log("❌ NOT FOUND");
        const entry: InvalidDiscordEntry = {
          uid: profile.uid,
          name,
          email: profile.email || null,
          role,
          discordUsername,
          status,
        };

        if (role === "mentor") {
          invalidMentors.push(entry);
        } else {
          invalidMentees.push(entry);
        }
      }
    } catch (error) {
      console.log(`⚠️  Error: ${error}`);
    }

    // Small delay to avoid rate limiting
    if (i < profiles.length - 1) {
      await delay(100);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Summary:");
  console.log(`  ✅ Valid Discord usernames: ${validCount}`);
  console.log(`  ❌ Invalid mentor usernames: ${invalidMentors.length}`);
  console.log(`  ❌ Invalid mentee usernames: ${invalidMentees.length}`);
  console.log("=".repeat(60));

  // Output invalid mentors
  if (invalidMentors.length > 0) {
    console.log("\n📋 MENTORS with invalid Discord usernames:\n");
    console.log("Name | Email | Discord Username | Status");
    console.log("-".repeat(80));
    for (const entry of invalidMentors) {
      console.log(
        `${maskName(entry.name)} | ${maskEmail(entry.email || undefined)} | @${maskDiscord(entry.discordUsername)} | ${entry.status}`
      );
    }

    console.log("\n📊 CSV Format (Mentors):\n");
    console.log("Name,Email,DiscordUsername,Status,UID");
    for (const entry of invalidMentors) {
      console.log(
        `"${maskName(entry.name)}","${maskEmail(entry.email || undefined)}","${maskDiscord(entry.discordUsername)}","${entry.status}","${entry.uid}"`
      );
    }
  }

  // Output invalid mentees
  if (invalidMentees.length > 0) {
    console.log("\n📋 MENTEES with invalid Discord usernames:\n");
    console.log("Name | Email | Discord Username | Status");
    console.log("-".repeat(80));
    for (const entry of invalidMentees) {
      console.log(
        `${maskName(entry.name)} | ${maskEmail(entry.email || undefined)} | @${maskDiscord(entry.discordUsername)} | ${entry.status}`
      );
    }

    console.log("\n📊 CSV Format (Mentees):\n");
    console.log("Name,Email,DiscordUsername,Status,UID");
    for (const entry of invalidMentees) {
      console.log(
        `"${maskName(entry.name)}","${maskEmail(entry.email || undefined)}","${maskDiscord(entry.discordUsername)}","${entry.status}","${entry.uid}"`
      );
    }
  }

  // Send to Discord
  if (
    !DRY_RUN &&
    isDiscordConfigured() &&
    (invalidMentors.length > 0 || invalidMentees.length > 0)
  ) {
    await sendInvalidDiscordSummaryToDiscord(invalidMentors, invalidMentees);
  } else if (DRY_RUN) {
    console.log("\n🔵 DRY RUN: Would send summary to Discord channel");
    console.log(`   Channel: ${SUMMARY_CHANNEL_ID}`);
    console.log(
      `   ${invalidMentors.length + invalidMentees.length} invalid profile(s)`
    );
  }

  if (invalidMentors.length === 0 && invalidMentees.length === 0) {
    console.log("\n✅ All Discord usernames are valid!");
  } else {
    // Write CSV file
    const csvPath = writeCsvFile(invalidMentors, invalidMentees);
    if (csvPath) {
      console.log(`\n📁 CSV file saved: ${csvPath}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("Recommended Actions:");
    console.log(
      "  1. Reach out to these users to update their Discord username"
    );
    console.log("  2. Ask them to join the Discord server first if they haven't");
    console.log("     Discord invite: https://codewithahsan.dev/discord");
    console.log("=".repeat(60));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
