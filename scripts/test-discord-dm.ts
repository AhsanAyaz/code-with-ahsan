/**
 * Test script to demonstrate mentor pending reminders
 * Fetches pending mentees for a specific mentor and sends preview to codewithahsan
 * Usage: npx tsx scripts/test-discord-dm.ts
 */

import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const DISCORD_API = "https://discord.com/api/v10";
const DASHBOARD_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://codewithahsan.dev";

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production/CI mode
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("✅ Firebase Admin initialized (production mode)");
  } catch (e) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", e);
    process.exit(1);
  }
} else {
  // Development mode - load from secure directory
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require("../secure/code-with-ahsan-45496-firebase-adminsdk-7axo0-3127308aba.json");
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("✅ Firebase Admin initialized (development mode)");
  } catch (e) {
    console.error("❌ Could not load local service account:", e);
    process.exit(1);
  }
}

const db = getFirestore();

function getHeaders() {
  return {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function sendDirectMessageByUserId(
  userId: string,
  message: string
): Promise<boolean> {
  try {
    // Create DM channel with the user
    const dmChannelResponse = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ recipient_id: userId }),
    });

    if (!dmChannelResponse.ok) {
      console.error(
        "Failed to create DM channel:",
        await dmChannelResponse.text()
      );
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

    if (!messageResponse.ok) {
      console.error("Failed to send message:", await messageResponse.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending DM:", error);
    return false;
  }
}

async function getMentorByDiscordId(discordUserId: string): Promise<{ id: string; displayName?: string; discordUserId?: string; discordUsername?: string } | null> {
  const mentorsRef = db.collection("mentorship_profiles");

  // Try discordUserId field first
  let snapshot = await mentorsRef
    .where("discordUserId", "==", discordUserId)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as { id: string; displayName?: string; discordUserId?: string; discordUsername?: string };
  }

  // Fallback: try discordUsername field (some profiles might store it here)
  snapshot = await mentorsRef
    .where("discordUsername", "==", discordUserId)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as { id: string; displayName?: string; discordUserId?: string; discordUsername?: string };
  }

  return null;
}

async function getMentorByUsername(username: string): Promise<{ id: string; displayName?: string; discordUserId?: string; discordUsername?: string } | null> {
  const mentorsRef = db.collection("mentorship_profiles");
  const snapshot = await mentorsRef
    .where("discordUsername", "==", username)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as { id: string; displayName?: string; discordUserId?: string; discordUsername?: string };
}

async function getPendingRequestsForMentor(mentorId: string) {
  const sessionsRef = db.collection("mentorship_sessions");
  const snapshot = await sessionsRef
    .where("mentorId", "==", mentorId)
    .where("status", "==", "pending")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function main() {
  console.log("\n🔍 Testing Mentor Pending Reminders...\n");

  // Look up mentor by Discord ID first
  const mentorDiscordId = "1054730065373577317"; // farrukh1212cs
  const mentorUsername = "farrukh1212cs";

  console.log(`Looking up mentor with Discord ID: ${mentorDiscordId}...`);
  let mentor = await getMentorByDiscordId(mentorDiscordId);

  if (!mentor) {
    console.log(`Not found by ID, trying username: ${mentorUsername}...`);
    mentor = await getMentorByUsername(mentorUsername);
  }

  if (!mentor) {
    console.log("❌ Mentor not found with that Discord ID or username");
    console.log("Trying to list some mentors to help debug...\n");

    // List a few mentors to help debug
    const allMentors = await db.collection("mentorship_profiles").limit(5).get();
    allMentors.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`- ${data.displayName}: discordUsername="${data.discordUsername}", discordUserId="${data.discordUserId || 'not set'}"`);
    });

    process.exit(1);
  }

  console.log(`✅ Found mentor: ${mentor.displayName} (${mentor.id})`);

  // Get pending requests
  console.log(`\nFetching pending requests...`);
  const pendingRequests = await getPendingRequestsForMentor(mentor.id);

  console.log(`Found ${pendingRequests.length} pending request(s)\n`);

  if (pendingRequests.length === 0) {
    console.log("ℹ️  No pending requests to show");
    return;
  }

  // Build the notification message (same format as cron job)
  const message = `👋 **Mentorship Reminder**

You have **${pendingRequests.length}** pending mentorship request${pendingRequests.length > 1 ? "s" : ""} waiting for your review.

${pendingRequests.map((req: any, idx: number) => {
  const menteeProfile = req.menteeProfile || {};
  const menteeName = menteeProfile.displayName || "Unknown Mentee";
  const createdAt = req.createdAt?.toDate?.() || new Date(req.createdAt);
  const daysAgo = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  return `${idx + 1}. **${menteeName}** - ${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago`;
}).join("\n")}

Please review and respond to these requests as soon as possible. Mentees are waiting for your response!

👉 [View Pending Requests](${DASHBOARD_URL}/mentorship/dashboard/sessions)

---
*This is a test preview of the daily mentor reminder sent to: ${mentor.displayName}*`;

  console.log("📤 Sending preview notification to codewithahsan...\n");

  const testRecipientId = "814185701537087527"; // codewithahsan
  const success = await sendDirectMessageByUserId(testRecipientId, message);

  if (success) {
    console.log("✅ Test notification sent successfully!");
    console.log("\nCheck your Discord DMs to see what mentors will receive.");
  } else {
    console.log("❌ Failed to send test notification");
    process.exit(1);
  }
}

main();
