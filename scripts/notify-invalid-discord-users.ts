#!/usr/bin/env npx ts-node
/**
 * Script: Notify Users With Invalid Discord Usernames
 *
 * This script sends email notifications to users with invalid Discord usernames
 * and also notifies their mentors/mentees to keep them in the loop.
 *
 * Usage:
 *   DRY_RUN=true NODE_ENV=development npx tsx scripts/notify-invalid-discord-users.ts  # Preview only
 *   NODE_ENV=development npx tsx scripts/notify-invalid-discord-users.ts               # Execute
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/firebaseAdminLazy";
import { sendDiscordUsernameReminderEmail } from "../src/lib/email";

const DRY_RUN = process.env.DRY_RUN === "true";

interface MentorshipProfile {
  uid: string;
  displayName: string;
  email: string;
  discordUsername?: string;
  discordUsernameValidated?: boolean;
  role: "mentor" | "mentee";
  status?: string;
}

interface MentorshipSession {
  id: string;
  mentorId: string;
  menteeId: string;
  status: string;
}

async function getInvalidProfiles(): Promise<MentorshipProfile[]> {
  const snapshot = await db
    .collection("mentorship_profiles")
    .where("discordUsernameValidated", "==", false)
    .get();

  return snapshot.docs.map((doc) => ({
    uid: doc.id,
    displayName: doc.data().displayName || "Unknown",
    email: doc.data().email || "",
    discordUsername: doc.data().discordUsername,
    discordUsernameValidated: doc.data().discordUsernameValidated,
    role: doc.data().role,
    status: doc.data().status,
  }));
}

async function getProfile(uid: string): Promise<MentorshipProfile | null> {
  const doc = await db.collection("mentorship_profiles").doc(uid).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    uid: doc.id,
    displayName: data.displayName || "Unknown",
    email: data.email || "",
    discordUsername: data.discordUsername,
    discordUsernameValidated: data.discordUsernameValidated,
    role: data.role,
    status: data.status,
  };
}

async function getActiveMentorshipsForUser(
  uid: string,
  role: "mentor" | "mentee"
): Promise<MentorshipSession[]> {
  const field = role === "mentor" ? "mentorId" : "menteeId";
  const snapshot = await db
    .collection("mentorship_sessions")
    .where(field, "==", uid)
    .where("status", "==", "active")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    mentorId: doc.data().mentorId,
    menteeId: doc.data().menteeId,
    status: doc.data().status,
  }));
}

async function main() {
  console.log("=".repeat(60));
  console.log("Notify Users With Invalid Discord Usernames");
  console.log("=".repeat(60));
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no emails sent)" : "LIVE"}`);
  console.log("");

  console.log("Fetching profiles with invalid Discord usernames...\n");
  const invalidProfiles = await getInvalidProfiles();

  if (invalidProfiles.length === 0) {
    console.log("✅ No profiles with invalid Discord usernames found.");
    process.exit(0);
  }

  console.log(
    `Found ${invalidProfiles.length} profile(s) with invalid Discord usernames.\n`
  );

  let emailsSent = 0;
  let emailsFailed = 0;
  const emailLog: string[] = [];

  for (const profile of invalidProfiles) {
    if (!profile.email) {
      console.log(`⚠️  Skipping ${profile.displayName} - no email`);
      continue;
    }

    console.log(`\n📧 Processing: ${profile.displayName} (${profile.role})`);

    // Get active mentorships
    const mentorships = await getActiveMentorshipsForUser(
      profile.uid,
      profile.role
    );

    let ccString: string | undefined = undefined;
    let partnerName: string | undefined = undefined;
    const partnerRole = profile.role === "mentor" ? "mentee" : "mentor";

    // If mentorships exist, resolve partners
    if (mentorships.length > 0) {
      console.log(`   └─ ${mentorships.length} active mentorship(s)`);

      const partnerField = profile.role === "mentor" ? "menteeId" : "mentorId";
      const partnerEmails: string[] = [];
      const partnerNames: string[] = [];

      for (const session of mentorships) {
        const partnerId = session[partnerField as keyof MentorshipSession] as string;
        const partner = await getProfile(partnerId);
        if (partner) {
          if (partner.email) partnerEmails.push(partner.email);
          if (partner.displayName) partnerNames.push(partner.displayName);
        }
      }

      // If invalid user is a Mentee: CC the Mentor(s)
      if (profile.role === "mentee") {
        if (partnerEmails.length > 0) {
          ccString = partnerEmails.join(", ");
          console.log(`   └─ CCing mentor(s): ${ccString}`);
        }
        if (partnerNames.length > 0) {
          partnerName = partnerNames[0]; // Use first mentor name
        }
      } 
      // If invalid user is a Mentor: Do NOT CC mentees (privacy/professionalism)
      // but we do need the partner info for the "partner info" text in the email?
      // "Your mentee(s) are waiting..." doesn't need a specific name.
    } else {
      console.log(`   └─ No active mentorship, emailing user only`);
    }

    if (!DRY_RUN) {
      try {
        await sendDiscordUsernameReminderEmail(
          { displayName: profile.displayName, email: profile.email },
          profile.role,
          partnerName, // Only relevant if user is mentee
          ccString     // Only populated if user is mentee
        );
        
        emailsSent++;
        let logMsg = `✅ ${profile.email} (${profile.role})`;
        if (ccString) logMsg += ` [CC: ${ccString}]`;
        emailLog.push(logMsg);
        
      } catch (error) {
        console.log(`   └─ ❌ Failed to send email to user: ${error}`);
        emailsFailed++;
        emailLog.push(`❌ ${profile.email} (${profile.role}) - FAILED`);
      }
    } else {
      let logMsg = `[DRY RUN] ${profile.email} (${profile.role})`;
      if (ccString) logMsg += ` [CC: ${ccString}]`;
      emailLog.push(logMsg);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Summary:");
  console.log(`  📧 Emails sent: ${emailsSent}`);
  console.log(`  ❌ Emails failed: ${emailsFailed}`);
  console.log("=".repeat(60));

  console.log("\n📋 Email Log:");
  for (const log of emailLog) {
    console.log(`   ${log}`);
  }

  if (DRY_RUN) {
    console.log("\n🔵 DRY RUN: No emails were actually sent.");
    console.log("   Run without DRY_RUN=true to send emails.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
