#!/usr/bin/env npx ts-node
/**
 * Cleanup Archived Discord Channels
 *
 * Two-step process:
 *   --mode list    → List archived channels and their age (no destructive action)
 *   --mode delete  → Actually delete archived channels older than 30 days
 *
 * Usage:
 *   npx tsx scripts/cleanup-archived-discord-channels.ts --mode list
 *   npx tsx scripts/cleanup-archived-discord-channels.ts --mode delete
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function getLastMessageTimestamp(
  channelId: string
): Promise<Date | null> {
  const response = await fetchWithRetry(
    `${DISCORD_API}/channels/${channelId}/messages?limit=1`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    if (response.status === 403 || response.status === 404) {
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

function parseMode(): "list" | "delete" {
  const modeArg = process.argv.find((arg) => arg.startsWith("--mode"));
  if (!modeArg) {
    // Check next arg after --mode
    const idx = process.argv.indexOf("--mode");
    if (idx !== -1 && process.argv[idx + 1]) {
      const val = process.argv[idx + 1];
      if (val === "list" || val === "delete") return val;
    }
    return "list"; // default to safe mode
  }

  if (modeArg.includes("=")) {
    const val = modeArg.split("=")[1];
    if (val === "list" || val === "delete") return val;
  }

  // Check the argument after --mode
  const idx = process.argv.indexOf("--mode");
  if (idx !== -1 && process.argv[idx + 1]) {
    const val = process.argv[idx + 1];
    if (val === "list" || val === "delete") return val;
  }

  return "list";
}

async function main() {
  const mode = parseMode();

  console.log("=".repeat(60));
  console.log(`Archived Discord Channel Cleanup — ${mode.toUpperCase()} mode`);
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

  // Fetch all guild channels
  console.log("Fetching guild channels...");
  const allChannels = await getGuildChannels();
  console.log(`  Found ${allChannels.length} total channels`);

  // Filter to archived channels
  const archivedChannels = allChannels.filter((ch) =>
    ch.name.startsWith("archived-")
  );
  console.log(`  Found ${archivedChannels.length} archived channels`);
  console.log("");

  if (archivedChannels.length === 0) {
    console.log("No archived channels found — nothing to do.");
    console.log("=".repeat(60));
    process.exit(0);
  }

  // Check each channel's last message age
  console.log("Checking channel activity...");
  console.log("");

  const cutoffDate = new Date(Date.now() - ARCHIVE_AGE_DAYS * MS_PER_DAY);
  const eligible: { channel: DiscordChannel; ageStr: string }[] = [];
  const recent: { channel: DiscordChannel; daysAgo: number }[] = [];

  for (const channel of archivedChannels) {
    try {
      const lastMessageDate = await getLastMessageTimestamp(channel.id);

      if (lastMessageDate === null || lastMessageDate <= cutoffDate) {
        const ageStr = lastMessageDate
          ? `${Math.floor((Date.now() - lastMessageDate.getTime()) / MS_PER_DAY)} days since last message`
          : "no messages";
        eligible.push({ channel, ageStr });
      } else {
        const daysAgo = Math.floor(
          (Date.now() - lastMessageDate.getTime()) / MS_PER_DAY
        );
        recent.push({ channel, daysAgo });
      }

      await sleep(500);
    } catch (err) {
      console.error(
        `  Error checking ${channel.name} (${channel.id}):`,
        err
      );
    }
  }

  // Print report
  console.log("─".repeat(60));
  console.log(`ELIGIBLE FOR DELETION (inactive ${ARCHIVE_AGE_DAYS}+ days):`);
  console.log("─".repeat(60));
  if (eligible.length === 0) {
    console.log("  (none)");
  } else {
    for (const { channel, ageStr } of eligible) {
      console.log(`  ${channel.name}  (${channel.id})  — ${ageStr}`);
    }
  }

  console.log("");
  console.log("─".repeat(60));
  console.log("SKIPPED (recent activity):");
  console.log("─".repeat(60));
  if (recent.length === 0) {
    console.log("  (none)");
  } else {
    for (const { channel, daysAgo } of recent) {
      console.log(
        `  ${channel.name}  (${channel.id})  — last message ${daysAgo} days ago`
      );
    }
  }
  console.log("");

  // In list mode, stop here
  if (mode === "list") {
    console.log("=".repeat(60));
    console.log(
      `LIST COMPLETE: ${eligible.length} channels eligible for deletion, ${recent.length} skipped`
    );
    console.log(
      "Run with --mode delete to actually delete the eligible channels."
    );
    console.log("=".repeat(60));
    process.exit(0);
  }

  // Delete mode — actually delete eligible channels
  console.log("=".repeat(60));
  console.log(`DELETING ${eligible.length} channels...`);
  console.log("=".repeat(60));
  console.log("");

  let deleted = 0;
  let failed = 0;

  for (const { channel, ageStr } of eligible) {
    try {
      console.log(`  Deleting ${channel.name} (${ageStr})...`);
      const success = await deleteDiscordChannel(
        channel.id,
        "Automated cleanup: archived channel older than 30 days"
      );

      if (success) {
        deleted++;
        console.log(`    ✓ Deleted`);
      } else {
        failed++;
        console.log(`    ✗ Failed to delete`);
      }

      await sleep(500);
    } catch (err) {
      console.error(`    ✗ Error deleting ${channel.name}:`, err);
      failed++;
    }
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("DELETE COMPLETE:");
  console.log(`  Deleted: ${deleted}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${recent.length}`);
  console.log("=".repeat(60));

  process.exit(failed > 0 && deleted === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
