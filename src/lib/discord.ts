/**
 * Discord Bot Service for Mentorship Integration
 *
 * This module provides functions to interact with Discord for the mentorship program:
 * - Creating private channels for mentor-mentee sessions
 * - Sending DM notifications
 * - Managing channel permissions
 *
 * Requires environment variables:
 * - DISCORD_BOT_TOKEN: Bot token from Discord Developer Portal
 * - DISCORD_GUILD_ID: Your Discord server ID
 * - DISCORD_MENTORSHIP_CATEGORY_ID: (Optional) Category to create channels under
 */

import { createLogger } from "./logger";

// Create Discord-specific logger
const log = createLogger("discord");

interface ChannelResult {
  channelId: string;
  channelUrl: string;
}

interface DiscordMember {
  id: string;
  username: string;
}

// Discord API base URL
const DISCORD_API = "https://discord.com/api/v10";

/**
 * Get headers for Discord API requests
 */
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

/**
 * Get the guild ID from environment
 */
function getGuildId(): string {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) {
    throw new Error("DISCORD_GUILD_ID environment variable is not set");
  }
  log.debug(` Using Guild ID: ${guildId}`);
  return guildId;
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with automatic rate limit handling
 * Retries the request after waiting for the rate limit to clear (up to 3 retries)
 */
async function fetchWithRateLimit(
  url: string,
  options?: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const data = await response.json();
      const retryAfter = (data.retry_after || 1) * 1000; // Convert to ms
      log.debug(`Rate limited. Waiting ${retryAfter}ms before retry...`);

      if (attempt < maxRetries) {
        await sleep(retryAfter + 100); // Add 100ms buffer
        continue;
      }
    }

    return response;
  }

  // This shouldn't happen, but TypeScript needs it
  throw new Error("Max retries exceeded");
}

/**
 * Lookup a Discord user ID by their username in the guild
 * Returns null if not found
 */
export async function lookupMemberByUsername(
  username: string
): Promise<DiscordMember | null> {
  const guildId = getGuildId();
  log.debug(` Looking up member by username: ${username}`);

  try {
    // Search for members matching the username (with rate limit handling)
    const response = await fetchWithRateLimit(
      `${DISCORD_API}/guilds/${guildId}/members/search?query=${encodeURIComponent(username)}&limit=10`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      const errorText = await response.text();
      log.error(
        `Discord member search failed: ${response.status} - ${errorText}`
      );
      return null;
    }

    const members = await response.json();

    // Find exact username match (case-insensitive)
    const match = members.find(
      (m: { user: { username: string } }) =>
        m.user.username.toLowerCase() === username.toLowerCase()
    );

    if (match) {
      log.debug(`Found member: ${match.user.username} (ID: ${match.user.id})`);
      return {
        id: match.user.id,
        username: match.user.username,
      };
    }

    log.debug(` Member not found: ${username}`);
    return null;
  } catch (error) {
    log.error("Error looking up Discord member:", error);
    return null;
  }
}

// Maximum channels per category (Discord limit is 50, we use 45 for safety margin)
const MAX_CHANNELS_PER_CATEGORY = 45;

/**
 * Get or create a monthly category for mentorship channels
 * Creates categories like "Mentorship Jan 2026", "Mentorship Jan 2026 - Batch 2", etc.
 * Automatically creates a new batch when the current one approaches 50 channels.
 *
 * @returns Category ID to use for new channels, or null if creation failed
 */
async function getOrCreateMonthlyCategory(): Promise<string | null> {
  const guildId = getGuildId();

  // Format: "Mentorship Jan 2026"
  const now = new Date();
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const baseNamePrefix = `Mentorship ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  log.debug(`Looking for category with prefix: ${baseNamePrefix}`);

  try {
    // Get all channels in the guild
    const response = await fetchWithRateLimit(
      `${DISCORD_API}/guilds/${guildId}/channels`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      log.error(
        `Failed to fetch guild channels: ${response.status} - ${await response.text()}`
      );
      return null;
    }

    const channels = await response.json();

    // Find all categories matching this month (base name or with batch suffix)
    const monthCategories = channels.filter(
      (ch: { type: number; name: string }) =>
        ch.type === 4 &&
        (ch.name.toLowerCase() === baseNamePrefix.toLowerCase() ||
          ch.name
            .toLowerCase()
            .startsWith(baseNamePrefix.toLowerCase() + " - batch"))
    );

    // Sort by batch number (base name = batch 1, then Batch 2, Batch 3, etc.)
    monthCategories.sort((a: { name: string }, b: { name: string }) => {
      const getBatchNum = (name: string): number => {
        const match = name.match(/batch\s*(\d+)/i);
        return match ? parseInt(match[1], 10) : 1;
      };
      return getBatchNum(a.name) - getBatchNum(b.name);
    });

    // Check the latest batch for available space
    if (monthCategories.length > 0) {
      const latestCategory = monthCategories[monthCategories.length - 1];

      // Count channels in this category
      const channelsInCategory = channels.filter(
        (ch: { parent_id?: string }) => ch.parent_id === latestCategory.id
      ).length;

      log.debug(
        `Latest category: ${latestCategory.name} has ${channelsInCategory}/${MAX_CHANNELS_PER_CATEGORY} channels`
      );

      if (channelsInCategory < MAX_CHANNELS_PER_CATEGORY) {
        // Still has space, use this category
        return latestCategory.id;
      }

      // Need a new batch
      const currentBatch =
        latestCategory.name.toLowerCase() === baseNamePrefix.toLowerCase()
          ? 1
          : parseInt(
              latestCategory.name.match(/batch\s*(\d+)/i)?.[1] || "1",
              10
            );
      const newBatchNum = currentBatch + 1;
      const newCategoryName = `${baseNamePrefix} - Batch ${newBatchNum}`;

      log.debug(`Creating new batch category: ${newCategoryName}`);
      return await createCategory(guildId, newCategoryName);
    }

    // No category exists for this month, create the first one (no batch suffix)
    log.debug(`Creating new category: ${baseNamePrefix}`);
    return await createCategory(guildId, baseNamePrefix);
  } catch (error) {
    log.error(`Error getting/creating monthly category: ${error}`);
    return null;
  }
}

/**
 * Helper to create a category with standard permissions
 */
async function createCategory(
  guildId: string,
  categoryName: string
): Promise<string | null> {
  // Category permission: @everyone cannot view (private by default)
  const permissionOverwrites = [
    {
      id: guildId, // @everyone role
      type: 0,
      allow: "0",
      deny: "1024", // VIEW_CHANNEL denied
    },
  ];

  const createResponse = await fetch(
    `${DISCORD_API}/guilds/${guildId}/channels`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        name: categoryName,
        type: 4, // GUILD_CATEGORY
        permission_overwrites: permissionOverwrites,
      }),
    }
  );

  if (!createResponse.ok) {
    log.error(
      `Failed to create category: ${createResponse.status} - ${await createResponse.text()}`
    );
    return null;
  }

  const newCategory = await createResponse.json();
  log.debug(
    `Created new category: ${newCategory.name} (ID: ${newCategory.id})`
  );
  return newCategory.id;
}

/**
 * Create a private text channel for a mentorship session
 *
 * @param mentorName - Display name of the mentor
 * @param menteeName - Display name of the mentee
 * @param matchId - Unique ID of the mentorship match
 * @param mentorDiscordUsername - Discord username of mentor (optional)
 * @param menteeDiscordUsername - Discord username of mentee (optional)
 * @returns Channel result with ID and URL, or null if creation failed
 */
export async function createMentorshipChannel(
  mentorName: string,
  menteeName: string,
  matchId: string,
  mentorDiscordUsername?: string,
  menteeDiscordUsername?: string
): Promise<ChannelResult | null> {
  log.debug(`Creating mentorship channel for ${mentorName} <-> ${menteeName}`);
  log.debug(
    `Discord usernames - Mentor: ${mentorDiscordUsername || "not set"}, Mentee: ${menteeDiscordUsername || "not set"}`
  );

  const guildId = getGuildId();

  // Use dynamic monthly category instead of static env var
  const categoryId = await getOrCreateMonthlyCategory();

  // Create URL-safe channel name
  const sanitize = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 20);

  const channelName = `mentorship-${sanitize(mentorName)}-${sanitize(menteeName)}`;

  // Permission overwrites for the channel
  // Default: @everyone cannot view, bot can manage
  const permissionOverwrites: Array<{
    id: string;
    type: number;
    allow: string;
    deny?: string;
  }> = [
    {
      id: guildId, // @everyone role has same ID as guild
      type: 0, // Role
      allow: "0",
      deny: "1024", // VIEW_CHANNEL denied
    },
  ];

  // Look up mentor and mentee by username and add permissions
  let mentorMemberId: string | null = null;
  let menteeMemberId: string | null = null;

  if (mentorDiscordUsername) {
    const mentor = await lookupMemberByUsername(mentorDiscordUsername);
    if (mentor) {
      mentorMemberId = mentor.id;
      permissionOverwrites.push({
        id: mentor.id,
        type: 1, // Member
        allow: "3072", // VIEW_CHANNEL + SEND_MESSAGES
      });
    }
  }

  if (menteeDiscordUsername) {
    const mentee = await lookupMemberByUsername(menteeDiscordUsername);
    if (mentee) {
      menteeMemberId = mentee.id;
      permissionOverwrites.push({
        id: mentee.id,
        type: 1, // Member
        allow: "3072", // VIEW_CHANNEL + SEND_MESSAGES
      });
    }
  }

  try {
    const channelPayload: Record<string, unknown> = {
      name: channelName,
      type: 0, // GUILD_TEXT
      topic: `Mentorship session between ${mentorName} and ${menteeName} | ID: ${matchId}`,
      permission_overwrites: permissionOverwrites,
    };

    // If category ID is specified, create channel under that category
    if (categoryId) {
      channelPayload.parent_id = categoryId;
    }

    const response = await fetchWithRateLimit(
      `${DISCORD_API}/guilds/${guildId}/channels`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(channelPayload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      log.error(
        `[Discord] Channel creation failed: ${response.status} - ${errorText}`
      );
      return null;
    }

    const channel = await response.json();
    log.debug(`Channel created: ${channel.name} (ID: ${channel.id})`);

    // Build mention string for users who were found
    const mentorMention = mentorMemberId
      ? `<@${mentorMemberId}>`
      : `**${mentorName}**`;
    const menteeMention = menteeMemberId
      ? `<@${menteeMemberId}>`
      : `**${menteeName}**`;

    // Send welcome message with @mentions
    await sendChannelMessage(
      channel.id,
      `🎉 **Welcome to your mentorship channel!**\n\n` +
        `${mentorMention} (mentor) and ${menteeMention} (mentee), this is your private space to communicate.\n\n` +
        `Feel free to:\n` +
        `• Share resources and code snippets\n` +
        `• Schedule sessions\n` +
        `• Ask questions and provide guidance\n\n` +
        `Happy mentoring! 🚀`
    );

    const result: ChannelResult = {
      channelId: channel.id,
      channelUrl: `https://discord.com/channels/${guildId}/${channel.id}`,
    };

    log.debug(` Channel ready: ${result.channelUrl}`);
    return result;
  } catch (error) {
    log.error("[Discord] Error creating channel:", error);
    return null;
  }
}

/**
 * Send a message to a Discord channel
 * Exported for use in session/goal notifications
 */
export async function sendChannelMessage(
  channelId: string,
  content: string
): Promise<boolean> {
  log.debug(` Sending message to channel ${channelId}...`);
  try {
    const response = await fetch(
      `${DISCORD_API}/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ content }),
      }
    );

    if (response.ok) {
      log.debug(`Message sent successfully to channel ${channelId}`);
      return true;
    } else {
      const errorText = await response.text();
      log.error(
        `[Discord] Failed to send message to channel ${channelId}: ${response.status} - ${errorText}`
      );
      return false;
    }
  } catch (error) {
    log.error("[Discord] Error sending channel message:", error);
    return false;
  }
}

/**
 * Send a direct message to a Discord user by their username
 *
 * @param discordUsername - The recipient's Discord username
 * @param message - The message content
 * @returns true if sent successfully, false otherwise
 */
export async function sendDirectMessage(
  discordUsername: string,
  message: string
): Promise<boolean> {
  log.debug(` Sending DM to: ${discordUsername}`);

  try {
    // Look up the user
    const member = await lookupMemberByUsername(discordUsername);
    if (!member) {
      log.warn(`[Discord] Cannot send DM - user not found: ${discordUsername}`);
      return false;
    }

    // Create DM channel
    const dmChannelResponse = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ recipient_id: member.id }),
    });

    if (!dmChannelResponse.ok) {
      log.error("Failed to create DM channel:", await dmChannelResponse.text());
      return false;
    }

    const dmChannel = await dmChannelResponse.json();

    // Send message
    const messageResponse = await fetch(
      `${DISCORD_API}/channels/${dmChannel.id}/messages`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ content: message }),
      }
    );

    log.debug(` DM sent successfully to ${discordUsername}`);
    return messageResponse.ok;
  } catch (error) {
    log.error("[Discord] Error sending DM:", error);
    return false;
  }
}

/**
 * Archive a mentorship channel (when session is completed)
 * This renames the channel with [ARCHIVED] prefix and removes send permissions
 *
 * @param channelId - The Discord channel ID
 * @param reason - Optional custom message explaining why the channel was archived
 * @returns true if archived successfully, false otherwise
 */
export async function archiveMentorshipChannel(
  channelId: string,
  reason?: string
): Promise<boolean> {
  log.debug(` Archiving channel: ${channelId}`);

  try {
    // Get current channel info
    const channelResponse = await fetch(
      `${DISCORD_API}/channels/${channelId}`,
      {
        headers: getHeaders(),
      }
    );

    if (!channelResponse.ok) {
      log.error("Failed to get channel:", await channelResponse.text());
      return false;
    }

    const channel = await channelResponse.json();

    // Update channel: rename with archived prefix
    const updateResponse = await fetch(`${DISCORD_API}/channels/${channelId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        name: `archived-${channel.name}`.slice(0, 100),
        topic: `[ARCHIVED] ${channel.topic || ""}`.slice(0, 1024),
      }),
    });

    if (!updateResponse.ok) {
      log.error("Failed to archive channel:", await updateResponse.text());
      return false;
    }

    // Send archive message (use custom reason or default completion message)
    const archiveMessage =
      reason ||
      `📦 **This mentorship session has been completed.**\n\n` +
        `This channel is now archived. Thank you for being part of the mentorship program!`;

    await sendChannelMessage(channelId, archiveMessage);

    log.debug(` Channel archived successfully: ${channelId}`);
    return true;
  } catch (error) {
    log.error("[Discord] Error archiving channel:", error);
    return false;
  }
}

/**
 * Unarchive a mentorship channel
 * This removes the [ARCHIVED] prefix from name/topic and ensures participants have access
 */
export async function unarchiveMentorshipChannel(
  channelId: string,
  mentorDiscordId?: string,
  menteeDiscordId?: string
): Promise<{ success: boolean; channelUrl?: string }> {
  log.debug(` Unarchiving channel: ${channelId}`);
  const guildId = getGuildId();

  try {
    // Get current channel info
    const channelResponse = await fetch(
      `${DISCORD_API}/channels/${channelId}`,
      { headers: getHeaders() }
    );

    if (!channelResponse.ok) {
      log.error("Failed to get channel:", await channelResponse.text());
      return { success: false };
    }

    const channel = await channelResponse.json();
    let newName = channel.name.replace(/^archived-/, "");
    // If it didn't have archived- prefix, maybe just ensure permissions? 
    // But let's assume we want to clean it up.

    let newTopic = channel.topic?.replace(/^\[ARCHIVED\]\s*/, "") || "";

    // Prepare permission updates if IDs provided
    // We need to fetch existing overwrites first if we want to preserve others, 
    // but typically we just want to ensure these two have access.
    // However, PATCH /channels/{id} expects the FULL list of overwrites if provided, 
    // OR we can use PUT /channels/{id}/permissions/{trigger_id} for individual updates.
    // Using individual PUTs is safer to not wipe other permissions (like bots/mods).

    // 1. Rename and update topic
    const updateResponse = await fetch(`${DISCORD_API}/channels/${channelId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        name: newName,
        topic: newTopic,
      }),
    });

    if (!updateResponse.ok) {
      log.error("Failed to unarchive channel (rename):", await updateResponse.text());
      return { success: false };
    }
    
    // 2. Restore permissions for Mentor
    if (mentorDiscordId) {
      await fetch(`${DISCORD_API}/channels/${channelId}/permissions/${mentorDiscordId}`, {
         method: "PUT",
         headers: getHeaders(),
         body: JSON.stringify({
           allow: "3072", // VIEW_CHANNEL + SEND_MESSAGES
           deny: "0",
           type: 1 // Member
         })
      });
    }

    // 3. Restore permissions for Mentee
    if (menteeDiscordId) {
      await fetch(`${DISCORD_API}/channels/${channelId}/permissions/${menteeDiscordId}`, {
         method: "PUT",
         headers: getHeaders(),
         body: JSON.stringify({
           allow: "3072", // VIEW_CHANNEL + SEND_MESSAGES
           deny: "0",
           type: 1 // Member
         })
      });
    }

    
    const channelUrl = `https://discord.com/channels/${guildId}/${channelId}`;
    await sendChannelMessage(channelId, "♻️ **This channel has been restored/unarchived.**");

    log.debug(` Channel unarchived successfully: ${channelId}`);
    return { success: true, channelUrl };

  } catch (error) {
    log.error("[Discord] Error unarchiving channel:", error);
    return { success: false };
  }
}


/**
 * Get a Discord channel by ID to check if it exists
 * returns null if not found (404) or other error
 */
export async function getChannel(channelId: string): Promise<any | null> {
  const channelUrl = `${DISCORD_API}/channels/${channelId}`;
  log.debug(` Checking if channel exists: ${channelId}`);

  try {
    const response = await fetchWithRateLimit(channelUrl, {
      headers: getHeaders(),
    });

    if (response.ok) {
      return await response.json();
    } else if (response.status === 404) {
      log.debug(` Channel ${channelId} not found (404)`);
      return null;
    } else {
      const errorText = await response.text();
      log.error(` Failed to get channel ${channelId}: ${response.status} - ${errorText}`);
      return null;
    }
  } catch (error) {
    log.error(` Error getting channel ${channelId}:`, error);
    return null;
  }
}

/**
 * Check if Discord integration is properly configured
 */
export function isDiscordConfigured(): boolean {
  const configured = !!(
    process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID
  );
  if (!configured) {
    log.debug("Not configured - missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID");
  }
  return configured;
}

// Discord role IDs for automatic assignment
export const DISCORD_MENTOR_ROLE_ID = "1422193153397493893";
export const DISCORD_MENTEE_ROLE_ID = "1445734846730338386";

// The #find-a-mentor channel ID for completion announcements
const FIND_A_MENTOR_CHANNEL_ID = "1419645845258768385";

/**
 * Assign a Discord role to a user
 * This is a fire-and-forget operation - failures are logged but do not throw
 *
 * @param discordUsername - The user's Discord username
 * @param roleId - The role ID to assign
 * @returns true if role was assigned successfully, false otherwise
 */
export async function assignDiscordRole(
  discordUsername: string,
  roleId: string
): Promise<boolean> {
  log.debug(`Assigning role ${roleId} to user ${discordUsername}`);

  try {
    // Look up the member by username
    const member = await lookupMemberByUsername(discordUsername);
    if (!member) {
      log.warn(
        `[Discord] Cannot assign role - user not found: ${discordUsername}`
      );
      return false;
    }

    const guildId = getGuildId();

    // Assign the role using Discord API
    // PUT /guilds/{guild_id}/members/{user_id}/roles/{role_id}
    // Returns 204 No Content on success
    const response = await fetchWithRateLimit(
      `${DISCORD_API}/guilds/${guildId}/members/${member.id}/roles/${roleId}`,
      {
        method: "PUT",
        headers: getHeaders(),
      }
    );

    if (response.status === 204) {
      log.debug(
        `Successfully assigned role ${roleId} to ${discordUsername} (ID: ${member.id})`
      );
      return true;
    } else {
      const errorText = await response.text();
      log.error(
        `[Discord] Failed to assign role ${roleId} to ${discordUsername}: ${response.status} - ${errorText}`
      );
      return false;
    }
  } catch (error) {
    log.error(
      `[Discord] Error assigning role ${roleId} to ${discordUsername}:`,
      error
    );
    return false;
  }
}

/**
 * Send a completion announcement to the #find-a-mentor channel
 * Celebrates when a mentor-mentee pair completes their mentorship
 *
 * @param mentorName - Display name of the mentor
 * @param menteeName - Display name of the mentee
 * @param mentorDiscordUsername - Discord username of mentor (optional, for @mention)
 * @param menteeDiscordUsername - Discord username of mentee (optional, for @mention)
 */
export async function sendMentorshipCompletionAnnouncement(
  mentorName: string,
  menteeName: string,
  mentorDiscordUsername?: string,
  menteeDiscordUsername?: string
): Promise<boolean> {
  log.debug(
    `Sending completion announcement for ${mentorName} <-> ${menteeName}`
  );

  try {
    // Look up members for @mentions
    let mentorMention = `**${mentorName}**`;
    let menteeMention = `**${menteeName}**`;

    if (mentorDiscordUsername) {
      const mentor = await lookupMemberByUsername(mentorDiscordUsername);
      if (mentor) {
        mentorMention = `<@${mentor.id}>`;
      }
    }

    if (menteeDiscordUsername) {
      const mentee = await lookupMemberByUsername(menteeDiscordUsername);
      if (mentee) {
        menteeMention = `<@${mentee.id}>`;
      }
    }

    const message =
      `🎓 **Mentorship Completed!** 🎉\n\n` +
      `Congratulations to ${mentorMention} (mentor) and ${menteeMention} (mentee) ` +
      `on completing their mentorship journey!\n\n` +
      `Thank you for being part of the Code with Ahsan mentorship program. ` +
      `Your dedication to growth and learning is inspiring! 🚀\n\n` +
      `---\n` +
      `*Looking for a mentor? Check out our available mentors at https://codewithahsan.dev/mentorship*`;

    const success = await sendChannelMessage(FIND_A_MENTOR_CHANNEL_ID, message);

    if (success) {
      log.debug(` Completion announcement sent to #find-a-mentor`);
    } else {
      log.error(`[Discord] Failed to send completion announcement`);
    }

    return success;
  } catch (error) {
    log.error("[Discord] Error sending completion announcement:", error);
    return false;
  }
}
