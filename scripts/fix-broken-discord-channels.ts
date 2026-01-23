#!/usr/bin/env npx ts-node
/**
 * Migration Script: Fix Broken Discord Channels
 *
 * This script finds active mentorship sessions where the Discord channel ID
 * recorded in the database returns a 404 from Discord (or is missing but assumed set),
 * and regenerates the channel.
 *
 * Usage:
 *   DRY_RUN=true npx tsx scripts/fix-broken-discord-channels.ts   # Preview only
 *   npx tsx scripts/fix-broken-discord-channels.ts                 # Execute for real
 *
 * Requirements:
 * - DISCORD_BOT_TOKEN environment variable
 * - DISCORD_GUILD_ID environment variable
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as admin from "firebase-admin";

// Initialize Firebase Admin directly (avoiding src/lib/firebaseAdmin side-effects)
const serviceAccount = require("../secure/code-with-ahsan-45496-firebase-adminsdk-7axo0-3127308aba.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

import {
  createMentorshipChannel,
  sendDirectMessage,
  sendChannelMessage,
  isDiscordConfigured,
  getChannel,
  unarchiveMentorshipChannel,
  lookupMemberByUsername,
} from "../src/lib/discord";

const DRY_RUN = process.env.DRY_RUN === "true";
const SUMMARY_CHANNEL_ID = "1445678445408288850"; // Use same summary channel as backfill script

interface MentorshipSession {
  id: string;
  mentorId: string;
  menteeId: string;
  status: string;
  discordChannelId?: string;
  discordChannelUrl?: string;
}

interface MentorshipProfile {
  displayName?: string;
  email?: string;
  discordUsername?: string;
}

interface FixEntry {
  mentorName: string;
  mentorDiscord: string;
  menteeName: string;
  menteeDiscord: string;
  oldChannelId?: string;
  newChannelUrl: string;
}

interface BrokenEntry {
  sessionId: string;
  mentorName: string;
  menteeName: string;
  reason: string;
}

async function getProfile(uid: string): Promise<MentorshipProfile | null> {
  const doc = await db.collection("mentorship_profiles").doc(uid).get();
  if (!doc.exists) return null;
  return doc.data() as MentorshipProfile;
}

async function main() {
  console.log("=".repeat(60));
  console.log("Fix Broken Discord Channels Script");
  console.log("=".repeat(60));
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE EXECUTION"}`);
  console.log("");

  if (!isDiscordConfigured()) {
    console.error(
      "❌ Discord is not configured. Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID."
    );
    process.exit(1);
  }

  console.log("Fetching all active mentorships...\n");
  
  const snapshot = await db
    .collection("mentorship_sessions")
    .where("status", "==", "active")
    .get();

  const sessions: MentorshipSession[] = snapshot.docs.map(doc => ({
    id: doc.id,
    mentorId: doc.data().mentorId,
    menteeId: doc.data().menteeId,
    status: doc.data().status,
    discordChannelId: doc.data().discordChannelId,
    discordChannelUrl: doc.data().discordChannelUrl,
  }));

  console.log(`Found ${sessions.length} active mentorship(s). Checking for broken channels...\n`);

  const fixEntries: FixEntry[] = [];
  const brokenEntries: BrokenEntry[] = [];
  let successCount = 0;
  let errorCount = 0;
  let alreadyGoodCount = 0;

  for (const session of sessions) {
    let isBroken = false;
    let breakReason = "";

    // Check if channel ID is present and valid
    if (session.discordChannelId) {
      const channel = await getChannel(session.discordChannelId);
      if (!channel) {
        isBroken = true;
        breakReason = `Channel ID ${session.discordChannelId} not found (404)`;
      } else if (channel.name && channel.name.startsWith("archived-")) {
        // Channel exists but is archived, while session is active
        isBroken = true;
        breakReason = `Channel is ARCHIVED (${channel.name}) but session is ACTIVE`;
      } else {
        process.stdout.write("."); // Progress dot for good channels
        alreadyGoodCount++;
        continue;
      }
    } else if (session.discordChannelUrl) {
      // Missing ID but has set URL - might be broken or legacy
      isBroken = true;
      breakReason = `Missing Channel ID but has URL: ${session.discordChannelUrl}`;
    } else {
        // Missing both - covered by backfill script, but we can fix here too if we want
        // For now, let's treat it as broken/missing
        isBroken = true;
        breakReason = "Missing Channel ID and URL";
    }

    if (isBroken) {
      console.log(`\n\n🔎 Found Broken Session: ${session.id}`);
      console.log(`   Reason: ${breakReason}`);

      const [mentorProfile, menteeProfile] = await Promise.all([
        getProfile(session.mentorId),
        getProfile(session.menteeId),
      ]);

      if (!mentorProfile || !menteeProfile) {
        console.log(`   ⚠️ Skipping: Missing profile(s)`);
        brokenEntries.push({
          sessionId: session.id,
          mentorName: mentorProfile?.displayName || "Unknown",
          menteeName: menteeProfile?.displayName || "Unknown",
          reason: "Missing Profile",
        });
        continue;
      }

      const mentorDiscord = mentorProfile.discordUsername;
      const menteeDiscord = menteeProfile.discordUsername;

      if (!mentorDiscord || !menteeDiscord) {
        console.log(`   ⚠️ Skipping: Missing Discord username(s)`);
        brokenEntries.push({
           sessionId: session.id,
           mentorName: mentorProfile.displayName || "Unknown",
           menteeName: menteeProfile.displayName || "Unknown",
           reason: "Missing Discord Username",
        });
        continue;
      }
      
      console.log(`   Mentor: ${mentorProfile.displayName} (@${mentorDiscord})`);
      console.log(`   Mentee: ${menteeProfile.displayName} (@${menteeDiscord})`);
      
      if (DRY_RUN) {
        if (breakReason.includes("ARCHIVED")) {
             console.log(`   🔵 DRY RUN: Would UNARCHIVE channel (rename & restore permissions)`);
             fixEntries.push({
                mentorName: mentorProfile.displayName || "Mentor",
                mentorDiscord,
                menteeName: menteeProfile.displayName || "Mentee",
                menteeDiscord,
                oldChannelId: session.discordChannelId,
                newChannelUrl: "[DRY RUN UNARCHIVE]",
            });
        } else {
             const sanitize = (name: string) =>
                name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20);
             const proposedChannelName = `mentorship-${sanitize(mentorProfile.displayName || "mentor")}-${sanitize(menteeProfile.displayName || "mentee")}`;
             console.log(`   🔵 DRY RUN: Would recreate channel`);
             console.log(`   Expected Channel Name: #${proposedChannelName}`);
             fixEntries.push({
                mentorName: mentorProfile.displayName || "Mentor",
                mentorDiscord,
                menteeName: menteeProfile.displayName || "Mentee",
                menteeDiscord,
                oldChannelId: session.discordChannelId,
                newChannelUrl: "[DRY RUN RECREATE]",
            });
        }
        successCount++;
        continue;
      }

      try {
          let resultUrl = "";
          
          if (breakReason.includes("ARCHIVED") && session.discordChannelId) {
             // UNARCHIVE
             // We need discord IDs for permissions. Lookup members.
             const mentorMember = await lookupMemberByUsername(mentorDiscord);
             const menteeMember = await lookupMemberByUsername(menteeDiscord);
             
             const result = await unarchiveMentorshipChannel(
                 session.discordChannelId,
                 mentorMember?.id,
                 menteeMember?.id
             );
             
             if (!result.success) {
                 console.log(`   ❌ Failed to unarchive channel`);
                 errorCount++;
                 continue;
             }
             resultUrl = result.channelUrl || session.discordChannelUrl || "unknown";
             console.log(`   ✅ Channel unarchived: ${resultUrl}`);

          } else {
              // RECREATE
              const result = await createMentorshipChannel(
                mentorProfile.displayName || "Mentor",
                menteeProfile.displayName || "Mentee",
                session.id,
                mentorDiscord,
                menteeDiscord
              );
        
              if (!result) {
                console.log(`   ❌ Failed to create channel`);
                errorCount++;
                continue;
              }
              
              // Update Firestore
              await db.collection("mentorship_sessions").doc(session.id).update({
                discordChannelId: result.channelId,
                discordChannelUrl: result.channelUrl,
              });
              resultUrl = result.channelUrl;
              console.log(`   ✅ Channel recreated: ${resultUrl}`);
          }
    
          fixEntries.push({
            mentorName: mentorProfile.displayName || "Mentor",
            mentorDiscord,
            menteeName: menteeProfile.displayName || "Mentee",
            menteeDiscord,
            oldChannelId: session.discordChannelId,
            newChannelUrl: resultUrl,
          });
    
          // Send DM to mentee
          await sendDirectMessage(
            menteeDiscord,
            `🔧 **Mentorship Channel Update**\n\n` +
              `Your mentorship channel with **${mentorProfile.displayName}** has been restored/updated!\n` +
              `Join here: ${resultUrl}`
          ).catch((err) => console.log(`   ⚠️  DM failed: ${err.message}`));
    
          successCount++;
      } catch (error) {
        console.log(`   ❌ Error: ${error}\n`);
        errorCount++;
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Summary:");
  console.log(`  ✅ Existing Valid Channels: ${alreadyGoodCount}`);
  console.log(`  ✅ Fixed/Recreated: ${successCount}`);
  console.log(`  ⚠️  Skipped (Profiles/Discord missing): ${brokenEntries.length}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log("=".repeat(60));

  if (!DRY_RUN && fixEntries.length > 0) {
      // Send summary to admin channel
      const header = `📢 **Broken Discord Channels Fixed**\n\nThe following channels were regenerated because they were found to be missing or invalid:\n\n`;
      let content = "";
      for(const entry of fixEntries) {
          content += `• **${entry.mentorName}** ↔ **${entry.menteeName}**: ${entry.newChannelUrl} (was: ${entry.oldChannelId || "missing"})\n`;
      }
      // Simple split check
      if ((header + content).length < 2000) {
          await sendChannelMessage(SUMMARY_CHANNEL_ID, header + content);
      } else {
          await sendChannelMessage(SUMMARY_CHANNEL_ID, header + `(${fixEntries.length} channels fixed - too long for one message)`);
      }
      console.log("✅ Summary sent to Discord!");
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
