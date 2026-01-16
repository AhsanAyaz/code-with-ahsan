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
 * Lookup a Discord user ID by their username in the guild
 * Returns null if not found
 */
export async function lookupMemberByUsername(
  username: string
): Promise<DiscordMember | null> {
  const guildId = getGuildId();
  log.debug(` Looking up member by username: ${username}`);

  try {
    // Search for members matching the username
    const response = await fetch(
      `${DISCORD_API}/guilds/${guildId}/members/search?query=${encodeURIComponent(username)}&limit=10`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      log.error(
        "Discord member search failed:",
        response.status,
        await response.text()
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
  const categoryId = process.env.DISCORD_MENTORSHIP_CATEGORY_ID;

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

    const response = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(channelPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error(
        "[Discord] Channel creation failed:",
        response.status,
        errorText
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
        `[Discord] Failed to send message to channel ${channelId}:`,
        response.status,
        errorText
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
 * @returns true if archived successfully, false otherwise
 */
export async function archiveMentorshipChannel(
  channelId: string
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

    // Send archive message
    await sendChannelMessage(
      channelId,
      `📦 **This mentorship session has been completed.**\n\n` +
        `This channel is now archived. Thank you for being part of the mentorship program!`
    );

    log.debug(` Channel archived successfully: ${channelId}`);
    return true;
  } catch (error) {
    log.error("[Discord] Error archiving channel:", error);
    return false;
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

// The #find-a-mentor channel ID for completion announcements
const FIND_A_MENTOR_CHANNEL_ID = "1419645845258768385";

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
