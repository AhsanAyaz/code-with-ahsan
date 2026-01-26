#!/usr/bin/env npx ts-node
/**
 * Script: Mark Profiles With Invalid Discord Usernames
 *
 * This script validates Discord usernames and updates profiles with:
 * - discordUsernameValidated: true (if valid)
 * - discordUsernameValidated: false (if invalid)
 *
 * Usage:
 *   DRY_RUN=true NODE_ENV=development npx tsx scripts/mark-invalid-discord-users.ts  # Preview only
 *   NODE_ENV=development npx tsx scripts/mark-invalid-discord-users.ts               # Execute
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/firebaseAdminLazy";
import {
  isDiscordConfigured,
  lookupMemberByUsername,
} from "../src/lib/discord";

const DRY_RUN = process.env.DRY_RUN === "true";

interface MentorshipProfile {
  uid: string;
  displayName?: string;
  email?: string;
  discordUsername?: string;
  role?: string;
  status?: string;
}

async function getAllProfilesWithDiscord(): Promise<MentorshipProfile[]> {
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
    .filter((profile) => profile.discordUsername);
}

async function main() {
  console.log("=".repeat(60));
  console.log("Mark Profiles With Invalid Discord Usernames");
  console.log("=".repeat(60));
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no database updates)" : "LIVE"}`);
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

  let validCount = 0;
  let invalidCount = 0;
  let errorCount = 0;

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const discordUsername = profile.discordUsername!;
    const name = profile.displayName || "Unknown";

    process.stdout.write(
      `  [${i + 1}/${profiles.length}] ${name} (@${discordUsername})... `
    );

    try {
      const member = await lookupMemberByUsername(discordUsername);
      const isValid = !!member;

      if (isValid) {
        console.log("✅ Valid");
        validCount++;
      } else {
        console.log("❌ Invalid");
        invalidCount++;
      }

      // Update the profile
      if (!DRY_RUN) {
        await db.collection("mentorship_profiles").doc(profile.uid).update({
          discordUsernameValidated: isValid,
        });
      }
    } catch (error) {
      console.log(`⚠️  Error: ${error}`);
      errorCount++;
    }

    // Small delay to avoid rate limiting
    if (i < profiles.length - 1) {
      await delay(100);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Summary:");
  console.log(`  ✅ Valid (marked true): ${validCount}`);
  console.log(`  ❌ Invalid (marked false): ${invalidCount}`);
  console.log(`  ⚠️  Errors: ${errorCount}`);
  console.log("=".repeat(60));

  if (DRY_RUN) {
    console.log("\n🔵 DRY RUN: No database changes were made.");
    console.log("   Run without DRY_RUN=true to apply changes.");
  } else {
    console.log("\n✅ Database updated successfully!");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
