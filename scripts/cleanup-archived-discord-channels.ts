#!/usr/bin/env npx ts-node
/**
 * Cleanup Archived Discord Channels
 *
 * Finds Discord channels whose name starts with "archived-" and deletes them
 * if they have had no messages in the last 30 days.
 *
 * Usage:
 *   npx tsx scripts/cleanup-archived-discord-channels.ts                          # Development
 *   NODE_ENV=production npx tsx scripts/cleanup-archived-discord-channels.ts      # Production
 *
 * Requirements:
 * - DISCORD_BOT_TOKEN
 * - DISCORD_GUILD_ID
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import {
  deleteDiscordChannel,
  isDiscordConfigured,
} from "../src/lib/discord";

const DISCORD_API = "https://discord.com/api/v10";
const ARCHIVE_AGE_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getHeaders(): HeadersInit {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is not set");
  }
  return {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };
}

function getGuildId(): string {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) {
    throw new Error("DISCORD_GUILD_ID environment variable is not set");
  }
  return guildId;
}

/**
 * Sleep for rate limit handling
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with basic rate limit handling (retry on 429)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const waitMs = retryAfter ? parseFloat(retryAfter) * 1000 : 5000;
      console.log(`  Rate limited, waiting ${Math.ceil(waitMs / 1000)}s...`);
      await sleep(waitMs);
      continue;
    }

    return response;
  }

  throw new Error(`Failed after ${maxRetries} retries due to rate limiting`);
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

interface DiscordMessage {
  id: string;
  timestamp: string;
}

/**
 * Fetch all guild channels
 */
async function getGuildChannels(): Promise<DiscordChannel[]> {
  const guildId = getGuildId();
  const response = await fetchWithRetry(
    `${DISCORD_API}/guilds/${guildId}/channels`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch guild channels: ${response.status} - ${errorText}`
    );
  }

  return response.json();
}

/**
 * Get the timestamp of the last message in a channel.
 * Returns null if no messages exist.
 */
async function getLastMessageTimestamp(
  channelId: string
): Promise<Date | null> {
  const response = await fetchWithRetry(
    `${DISCORD_API}/channels/${channelId}/messages?limit=1`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    if (response.status === 403 || response.status === 404) {
      // Cannot access channel or it doesn't exist
      return null;
    }
    const errorText = await response.text();
    console.warn(
      `  Warning: Failed to fetch messages for channel ${channelId}: ${response.status} - ${errorText}`
    );
    return null;
  }

  const messages: DiscordMessage[] = await response.json();
  if (messages.length === 0) {
    return null;
  }

  return new Date(messages[0].timestamp);
}

async function main() {
  console.log("=".repeat(60));
  console.log("Cleanup Archived Discord Channels");
  console.log("=".repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Archive age threshold: ${ARCHIVE_AGE_DAYS} days`);
  console.log("");

  if (!isDiscordConfigured()) {
    console.error(
      "Discord is not configured. Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID."
    );
    process.exit(1);
  }
  console.log("Discord configured");
  console.log("");

  // Step 1: Fetch all guild channels
  console.log("Step 1: Fetching guild channels...");
  const allChannels = await getGuildChannels();
  console.log(`  Found ${allChannels.length} total channels`);

  // Step 2: Filter to archived channels (name starts with "archived-")
  const archivedChannels = allChannels.filter((ch) =>
    ch.name.startsWith("archived-")
  );
  console.log(`  Found ${archivedChannels.length} archived channels`);
  console.log("");

  if (archivedChannels.length === 0) {
    console.log("No archived channels found - nothing to do.");
    console.log("=".repeat(60));
    process.exit(0);
  }

  // Step 3: Check each archived channel's last message age
  console.log("Step 2: Checking channel activity...");
  console.log("");

  const cutoffDate = new Date(Date.now() - ARCHIVE_AGE_DAYS * MS_PER_DAY);
  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  for (const channel of archivedChannels) {
    try {
      const lastMessageDate = await getLastMessageTimestamp(channel.id);

      if (lastMessageDate === null || lastMessageDate <= cutoffDate) {
        // No messages or last message is older than threshold - delete
        const ageStr = lastMessageDate
          ? `${Math.floor((Date.now() - lastMessageDate.getTime()) / MS_PER_DAY)} days old`
          : "no messages";
        console.log(
          `  ${channel.name} (${channel.id}): ${ageStr} - deleting...`
        );

        const success = await deleteDiscordChannel(
          channel.id,
          "Automated cleanup: archived channel older than 30 days"
        );

        if (success) {
          deleted++;
          console.log(`    Deleted`);
        } else {
          failed++;
          console.log(`    Failed to delete`);
        }
      } else {
        const daysAgo = Math.floor(
          (Date.now() - lastMessageDate.getTime()) / MS_PER_DAY
        );
        console.log(
          `  ${channel.name} (${channel.id}): last message ${daysAgo} days ago - skipping`
        );
        skipped++;
      }

      // Small delay between API calls to be respectful of rate limits
      await sleep(500);
    } catch (err) {
      console.error(
        `  Failed to process channel ${channel.name} (${channel.id}):`,
        err
      );
      failed++;
    }
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("Summary:");
  console.log(`  Archived channels found: ${archivedChannels.length}`);
  console.log(`  Deleted: ${deleted}`);
  console.log(`  Skipped (recent activity): ${skipped}`);
  console.log(`  Errors: ${failed}`);
  console.log("=".repeat(60));

  process.exit(failed > 0 && deleted === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
