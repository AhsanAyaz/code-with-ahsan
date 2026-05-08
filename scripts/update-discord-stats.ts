#!/usr/bin/env npx ts-node
/**
 * Sync Discord Guild Member Count to Firestore
 *
 * This script fetches the Discord guild's approximate member count via the
 * Discord API and writes it to Firestore under platform_stats/discord so
 * the /api/stats route can surface a live (vs. static) Discord count.
 *
 * Usage:
 *   npx tsx scripts/update-discord-stats.ts                          # Development
 *   NODE_ENV=production npx tsx scripts/update-discord-stats.ts      # Production
 *
 * Requirements:
 * - DISCORD_BOT_TOKEN environment variable
 * - DISCORD_GUILD_ID environment variable
 * - FIREBASE_SERVICE_ACCOUNT (production) or firebase credentials (dev)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

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

/**
 * Main function to fetch Discord member count and write to Firestore
 */
async function main() {
  console.log("=".repeat(60));
  console.log("Update Discord Stats - Daily Sync Job");
  console.log("=".repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("");

  // Validate required env vars
  const discordBotToken = process.env.DISCORD_BOT_TOKEN;
  const discordGuildId = process.env.DISCORD_GUILD_ID;

  if (!discordBotToken) {
    console.error("❌ DISCORD_BOT_TOKEN environment variable is not set");
    process.exit(1);
  }

  if (!discordGuildId) {
    console.error("❌ DISCORD_GUILD_ID environment variable is not set");
    process.exit(1);
  }

  console.log("✅ Discord env vars present");
  console.log("");

  // Step 1: Fetch guild info from Discord API
  console.log("Step 1: Fetching Discord guild member count...");

  const url = `https://discord.com/api/v10/guilds/${discordGuildId}?with_counts=true`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${discordBotToken}`,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "(could not read body)");
    console.error(
      `❌ Discord API error: ${res.status} ${res.statusText}\nResponse body: ${body}`
    );
    process.exit(1);
  }

  const guildData = (await res.json()) as Record<string, unknown>;
  const approximateMemberCount = guildData["approximate_member_count"];

  if (
    typeof approximateMemberCount !== "number" ||
    !Number.isFinite(approximateMemberCount)
  ) {
    console.error(
      `❌ approximate_member_count missing or invalid in Discord API response: ${JSON.stringify(approximateMemberCount)}`
    );
    process.exit(1);
  }

  console.log(`✅ Discord guild approximate member count: ${approximateMemberCount}`);
  console.log("");

  // Step 2: Write to Firestore platform_stats/discord
  console.log("Step 2: Writing member count to Firestore...");

  await db.collection("platform_stats").doc("discord").set(
    {
      memberCount: approximateMemberCount,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log("✅ Firestore platform_stats/discord updated");
  console.log("");

  // Summary
  console.log("=".repeat(60));
  console.log("Summary:");
  console.log(`  Member count written: ${approximateMemberCount}`);
  console.log(`  Completed at: ${new Date().toISOString()}`);
  console.log("=".repeat(60));
  console.log("✅ Discord stats sync completed successfully");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
