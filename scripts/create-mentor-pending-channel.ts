#!/usr/bin/env npx ts-node
/**
 * Create Discord Channel for Mentor's Pending Mentees
 *
 * This script finds all pending mentorship requests for a specific mentor
 * and creates a Discord channel with all the pending mentees added.
 *
 * Usage:
 *   DRY_RUN=true MENTOR_NAME="Asad Ullah Khalid" npx tsx scripts/create-mentor-pending-channel.ts   # Preview only
 *   MENTOR_NAME="Asad Ullah Khalid" npx tsx scripts/create-mentor-pending-channel.ts                 # Execute for real
 *
 * Requirements:
 * - DISCORD_BOT_TOKEN environment variable
 * - DISCORD_GUILD_ID environment variable
 * - MENTOR_NAME environment variable (display name of the mentor)
 * - FIREBASE_SERVICE_ACCOUNT or firebase credentials configured
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as admin from "firebase-admin";
import {
  lookupMemberByUsername,
  isDiscordConfigured,
} from "../src/lib/discord";

// Initialize Firebase Admin (avoid importing from firebaseAdmin to skip storage init)
if (!admin.apps.length) {
  if (process.env.NODE_ENV === "development") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serviceAccount = require("../secure/code-with-ahsan-45496-firebase-adminsdk-7axo0-3127308aba.json");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e) {
      console.error("Could not load local service account", e);
      process.exit(1);
    }
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
}

const db = admin.firestore();

const DRY_RUN = process.env.DRY_RUN === "true";
const MENTOR_NAME = process.env.MENTOR_NAME || "Asad Ullah Khalid";

// Discord API base URL
const DISCORD_API = "https://discord.com/api/v10";

interface MentorshipSession {
  id: string;
  mentorId: string;
  menteeId: string;
  status: string;
}

interface MentorshipProfile {
  uid: string;
  displayName?: string;
  email?: string;
  discordUsername?: string;
}

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
  return guildId;
}

/**
 * Find mentor by display name
 */
async function findMentorByName(name: string): Promise<MentorshipProfile | null> {
  console.log(`Searching for mentor: "${name}"`);

  const snapshot = await db
    .collection("mentorship_profiles")
    .where("role", "==", "mentor")
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data() as MentorshipProfile;
    if (data.displayName?.toLowerCase() === name.toLowerCase()) {
      return {
        ...data,
        uid: doc.id,
      };
    }
  }

  return null;
}

/**
 * Get all pending mentorships for a mentor
 */
async function getPendingMentorships(mentorId: string): Promise<MentorshipSession[]> {
  const snapshot = await db
    .collection("mentorship_sessions")
    .where("mentorId", "==", mentorId)
    .where("status", "==", "pending")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    mentorId: doc.data().mentorId,
    menteeId: doc.data().menteeId,
    status: doc.data().status,
  }));
}

/**
 * Get mentee profile by ID
 */
async function getMenteeProfile(uid: string): Promise<MentorshipProfile | null> {
  const doc = await db.collection("mentorship_profiles").doc(uid).get();
  if (!doc.exists) return null;
  return {
    uid: doc.id,
    ...doc.data(),
  } as MentorshipProfile;
}

/**
 * Create a Discord channel with permissions for specific members
 */
async function createChannelWithMembers(
  channelName: string,
  topic: string,
  memberDiscordIds: string[]
): Promise<{ channelId: string; channelUrl: string } | null> {
  const guildId = getGuildId();

  // Permission overwrites for the channel
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

  // Add each member with VIEW_CHANNEL + SEND_MESSAGES permissions
  for (const memberId of memberDiscordIds) {
    permissionOverwrites.push({
      id: memberId,
      type: 1, // Member
      allow: "3072", // VIEW_CHANNEL + SEND_MESSAGES
    });
  }

  try {
    const response = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        name: channelName,
        type: 0, // GUILD_TEXT
        topic: topic,
        permission_overwrites: permissionOverwrites,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to create channel: ${response.status} - ${errorText}`);
      return null;
    }

    const channel = await response.json();
    const channelUrl = `https://discord.com/channels/${guildId}/${channel.id}`;

    return {
      channelId: channel.id,
      channelUrl,
    };
  } catch (error) {
    console.error("Error creating channel:", error);
    return null;
  }
}

/**
 * Send a message to a Discord channel
 */
async function sendChannelMessage(
  channelId: string,
  content: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${DISCORD_API}/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ content }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Error sending channel message:", error);
    return false;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("Create Discord Channel for Mentor's Pending Mentees");
  console.log("=".repeat(60));
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE EXECUTION"}`);
  console.log(`Mentor: ${MENTOR_NAME}`);
  console.log("");

  if (!isDiscordConfigured()) {
    console.error(
      "❌ Discord is not configured. Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID."
    );
    process.exit(1);
  }

  // Step 1: Find the mentor
  console.log("Step 1: Finding mentor...");
  const mentor = await findMentorByName(MENTOR_NAME);

  if (!mentor) {
    console.error(`❌ Mentor not found: "${MENTOR_NAME}"`);
    console.log("\nAvailable mentors:");
    const mentorsSnapshot = await db
      .collection("mentorship_profiles")
      .where("role", "==", "mentor")
      .get();
    mentorsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`  - ${data.displayName} (${doc.id})`);
    });
    process.exit(1);
  }

  console.log(`✅ Found mentor: ${mentor.displayName} (${mentor.uid})`);
  console.log(`   Email: ${mentor.email}`);
  console.log(`   Discord: ${mentor.discordUsername || "NOT SET"}`);

  // Step 2: Find pending mentorships
  console.log("\nStep 2: Finding pending mentorships...");
  const pendingMentorships = await getPendingMentorships(mentor.uid);

  if (pendingMentorships.length === 0) {
    console.log("✅ No pending mentorships found for this mentor.");
    process.exit(0);
  }

  console.log(`✅ Found ${pendingMentorships.length} pending mentorship(s)\n`);

  // Step 3: Get mentor Discord info
  console.log("\nStep 3: Looking up mentor Discord ID...");
  let mentorDiscordId: string | null = null;
  if (mentor.discordUsername) {
    const mentorMember = await lookupMemberByUsername(mentor.discordUsername);
    if (mentorMember) {
      mentorDiscordId = mentorMember.id;
      console.log(`  ✅ Mentor ${mentor.displayName} (@${mentor.discordUsername}) - Discord ID: ${mentorMember.id}`);
    } else {
      console.log(`  ⚠️  Mentor ${mentor.displayName} (@${mentor.discordUsername}) - Not found on server`);
    }
  } else {
    console.log(`  ⚠️  Mentor ${mentor.displayName} - No Discord username set`);
  }

  // Step 4: Get mentee profiles and Discord info
  console.log("\nStep 4: Fetching mentee profiles...");
  const menteeProfiles: MentorshipProfile[] = [];
  const menteeDiscordIds: string[] = [];
  const menteeIdToDiscordId = new Map<string, string>(); // Map for proper mentions
  const missingDiscord: string[] = [];

  for (const session of pendingMentorships) {
    const menteeProfile = await getMenteeProfile(session.menteeId);
    if (menteeProfile) {
      menteeProfiles.push(menteeProfile);

      const discordUsername = menteeProfile.discordUsername;
      if (discordUsername) {
        const member = await lookupMemberByUsername(discordUsername);
        if (member) {
          menteeDiscordIds.push(member.id);
          menteeIdToDiscordId.set(menteeProfile.uid, member.id);
          console.log(`  ✅ ${menteeProfile.displayName} (@${discordUsername}) - Discord ID: ${member.id}`);
        } else {
          missingDiscord.push(menteeProfile.displayName || "Unknown");
          console.log(`  ⚠️  ${menteeProfile.displayName} (@${discordUsername}) - Not found on server`);
        }
      } else {
        missingDiscord.push(menteeProfile.displayName || "Unknown");
        console.log(`  ⚠️  ${menteeProfile.displayName} - No Discord username set`);
      }
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Total pending mentees: ${menteeProfiles.length}`);
  console.log(`  Mentees with valid Discord: ${menteeDiscordIds.length}`);
  console.log(`  Mentees without Discord: ${missingDiscord.length}`);

  if (missingDiscord.length > 0) {
    console.log(`\n⚠️  The following mentees will NOT be added to the channel:`);
    missingDiscord.forEach((name) => console.log(`     - ${name}`));
  }

  if (menteeDiscordIds.length === 0) {
    console.error("\n❌ No mentees with valid Discord usernames found. Cannot create channel.");
    process.exit(1);
  }

  // Step 5: Create Discord channel
  console.log("\nStep 5: Creating Discord channel...");

  const sanitize = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 50);

  const channelName = `pending-mentees-${sanitize(mentor.displayName || "mentor")}`;
  const topic = `Pending mentees for ${mentor.displayName} | ${menteeDiscordIds.length} mentees`;

  // Combine mentor and mentee Discord IDs for channel permissions
  const allMemberIds = mentorDiscordId
    ? [mentorDiscordId, ...menteeDiscordIds]
    : menteeDiscordIds;

  if (DRY_RUN) {
    console.log(`🔵 DRY RUN: Would create channel:`);
    console.log(`   Name: ${channelName}`);
    console.log(`   Topic: ${topic}`);
    console.log(`   Mentor: ${mentor.displayName} (@${mentor.discordUsername || "NOT SET"}) ${mentorDiscordId ? "✅" : "⚠️ NOT ON SERVER"}`);
    console.log(`   Mentees: ${menteeDiscordIds.length}`);
    menteeProfiles
      .filter(p => menteeIdToDiscordId.has(p.uid))
      .forEach((p) => console.log(`     - ${p.displayName} (@${p.discordUsername})`));
    console.log("\n✅ Dry run complete. Run without DRY_RUN=true to execute.");
    process.exit(0);
  }

  const result = await createChannelWithMembers(channelName, topic, allMemberIds);

  if (!result) {
    console.error("❌ Failed to create Discord channel");
    process.exit(1);
  }

  console.log(`✅ Channel created: ${result.channelUrl}`);

  // Step 6: Send welcome message with proper mentions
  console.log("\nStep 6: Sending welcome message...");

  // Build mentor mention
  const mentorMention = mentorDiscordId
    ? `<@${mentorDiscordId}>`
    : `**${mentor.displayName}**`;

  // Build mentee mentions using the map
  const menteeMentions = menteeProfiles
    .map((p) => {
      const discordId = menteeIdToDiscordId.get(p.uid);
      return discordId ? `<@${discordId}>` : `**${p.displayName}**`;
    })
    .join(", ");

  const welcomeMessage =
    `👋 **Welcome to the pending mentees channel!**\n\n` +
    `**Mentor:** ${mentorMention}\n` +
    `**Pending mentees:** ${menteeMentions}\n\n` +
    `This is a temporary channel for coordinating pending mentorship requests with ${mentor.displayName}.\n\n` +
    `Feel free to:\n` +
    `• Introduce yourselves to each other\n` +
    `• Ask questions about the mentorship program\n` +
    `• Coordinate with ${mentor.displayName}\n\n` +
    `Good luck! 🚀`;

  await sendChannelMessage(result.channelId, welcomeMessage);
  console.log("✅ Welcome message sent");

  console.log("\n" + "=".repeat(60));
  console.log("✅ SUCCESS");
  console.log(`   Channel: ${result.channelUrl}`);
  console.log(`   Mentees added: ${menteeDiscordIds.length}/${menteeProfiles.length}`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
