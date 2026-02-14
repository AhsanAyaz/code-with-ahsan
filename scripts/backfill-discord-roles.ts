#!/usr/bin/env npx ts-node
/**
 * Backfill Discord Roles for Existing Mentors and Mentees
 *
 * Queries all mentorship_profiles with role "mentor" (status "accepted") or "mentee",
 * and assigns the corresponding Discord role to each user who has a discordUsername.
 *
 * Usage:
 *   DRY_RUN=true NODE_ENV=development npx tsx --require dotenv/config scripts/backfill-discord-roles.ts   # Preview only
 *   NODE_ENV=development npx tsx --require dotenv/config scripts/backfill-discord-roles.ts                 # Execute for real
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/firebaseAdmin";
import {
  assignDiscordRole,
  DISCORD_MENTOR_ROLE_ID,
  DISCORD_MENTEE_ROLE_ID,
} from "../src/lib/discord";
import { maskName, maskDiscord } from "./utils";

const DRY_RUN = process.env.DRY_RUN === "true";

interface ProfileDoc {
  uid: string;
  displayName?: string;
  discordUsername?: string;
  role: "mentor" | "mentee";
  status?: string;
}

async function main() {
  console.log(`\n=== Backfill Discord Roles ${DRY_RUN ? "(DRY RUN)" : "(LIVE)"} ===\n`);

  // Fetch approved mentors
  const mentorSnap = await db
    .collection("mentorship_profiles")
    .where("role", "==", "mentor")
    .where("status", "==", "accepted")
    .get();

  // Fetch all mentees (mentees don't have an approval flow)
  const menteeSnap = await db
    .collection("mentorship_profiles")
    .where("role", "==", "mentee")
    .get();

  const mentors: ProfileDoc[] = mentorSnap.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  })) as ProfileDoc[];

  const mentees: ProfileDoc[] = menteeSnap.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  })) as ProfileDoc[];

  console.log(`Found ${mentors.length} approved mentors`);
  console.log(`Found ${mentees.length} mentees\n`);

  // Process mentors
  console.log("--- MENTORS ---");
  let mentorSuccess = 0;
  let mentorSkipped = 0;
  let mentorFailed = 0;

  for (const mentor of mentors) {
    const name = maskName(mentor.displayName);
    const discord = maskDiscord(mentor.discordUsername);

    if (!mentor.discordUsername) {
      console.log(`  SKIP  ${name} — no Discord username`);
      mentorSkipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] ${name} (${discord}) — would assign Mentor role`);
      mentorSuccess++;
      continue;
    }

    const ok = await assignDiscordRole(mentor.discordUsername, DISCORD_MENTOR_ROLE_ID);
    if (ok) {
      console.log(`  OK    ${name} (${discord}) — Mentor role assigned`);
      mentorSuccess++;
    } else {
      console.log(`  FAIL  ${name} (${discord}) — could not assign Mentor role`);
      mentorFailed++;
    }
  }

  console.log(`\nMentors: ${mentorSuccess} assigned, ${mentorSkipped} skipped, ${mentorFailed} failed\n`);

  // Process mentees
  console.log("--- MENTEES ---");
  let menteeSuccess = 0;
  let menteeSkipped = 0;
  let menteeFailed = 0;

  for (const mentee of mentees) {
    const name = maskName(mentee.displayName);
    const discord = maskDiscord(mentee.discordUsername);

    if (!mentee.discordUsername) {
      console.log(`  SKIP  ${name} — no Discord username`);
      menteeSkipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] ${name} (${discord}) — would assign Mentee role`);
      menteeSuccess++;
      continue;
    }

    const ok = await assignDiscordRole(mentee.discordUsername, DISCORD_MENTEE_ROLE_ID);
    if (ok) {
      console.log(`  OK    ${name} (${discord}) — Mentee role assigned`);
      menteeSuccess++;
    } else {
      console.log(`  FAIL  ${name} (${discord}) — could not assign Mentee role`);
      menteeFailed++;
    }
  }

  console.log(`\nMentees: ${menteeSuccess} assigned, ${menteeSkipped} skipped, ${menteeFailed} failed\n`);

  // Summary
  console.log("=== SUMMARY ===");
  console.log(`Mentors: ${mentorSuccess}/${mentors.length} assigned`);
  console.log(`Mentees: ${menteeSuccess}/${mentees.length} assigned`);
  console.log(`Total skipped (no Discord): ${mentorSkipped + menteeSkipped}`);
  console.log(`Total failed: ${mentorFailed + menteeFailed}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
