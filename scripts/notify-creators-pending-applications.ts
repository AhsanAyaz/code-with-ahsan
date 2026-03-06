#!/usr/bin/env npx ts-node
/**
 * Notify Project Creators of Pending Applications (one-time backfill)
 *
 * Finds all active projects with pending applications and sends a Discord DM
 * to each creator listing how many applications are waiting for review.
 *
 * Usage:
 *   DRY_RUN=true npx tsx scripts/notify-creators-pending-applications.ts
 *   npx tsx scripts/notify-creators-pending-applications.ts
 *
 * Requirements:
 * - DISCORD_BOT_TOKEN
 * - DISCORD_GUILD_ID
 * - Firebase env vars
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as admin from "firebase-admin";
import { sendDirectMessage, isDiscordConfigured } from "../src/lib/discord";

// Initialize Firebase Admin (no storageBucket — not needed here)
if (!admin.apps.length) {
  if (process.env.NODE_ENV === "production") {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      console.error("FIREBASE_SERVICE_ACCOUNT not set");
      process.exit(1);
    }
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require("../secure/code-with-ahsan-45496-firebase-adminsdk-7axo0-3127308aba.json");
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
}

const db = admin.firestore();

const DRY_RUN = process.env.DRY_RUN === "true";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://codewithahsan.dev";

async function main() {
  console.log("=".repeat(60));
  console.log(`Notify Creators: Pending Applications${DRY_RUN ? " (DRY RUN)" : ""}`);
  console.log("=".repeat(60));

  if (!isDiscordConfigured()) {
    console.error("Discord not configured. Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID.");
    process.exit(1);
  }

  // Fetch all pending applications
  const applicationsSnap = await db
    .collection("project_applications")
    .where("status", "==", "pending")
    .get();

  if (applicationsSnap.empty) {
    console.log("No pending applications found.");
    return;
  }

  // Group by projectId
  const byProject = new Map<string, number>();
  for (const doc of applicationsSnap.docs) {
    const projectId = doc.data().projectId as string;
    byProject.set(projectId, (byProject.get(projectId) ?? 0) + 1);
  }

  console.log(`Found ${applicationsSnap.size} pending applications across ${byProject.size} projects.\n`);

  // Fetch projects and their creators
  const projectIds = [...byProject.keys()];
  let notified = 0;
  let skipped = 0;

  for (const projectId of projectIds) {
    const projectDoc = await db.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      console.log(`  [SKIP] Project ${projectId} not found`);
      skipped++;
      continue;
    }

    const project = projectDoc.data()!;
    const count = byProject.get(projectId)!;
    const title = project.title || projectId;

    // Fetch creator profile
    const creatorDoc = await db
      .collection("mentorship_profiles")
      .doc(project.creatorId)
      .get();

    if (!creatorDoc.exists) {
      console.log(`  [SKIP] "${title}" — creator profile not found`);
      skipped++;
      continue;
    }

    const creator = creatorDoc.data()!;

    if (!creator.discordUsername) {
      console.log(`  [SKIP] "${title}" — creator ${creator.displayName || project.creatorId} has no Discord username`);
      skipped++;
      continue;
    }

    const plural = count === 1 ? "application" : "applications";
    const message =
      `📋 **You have ${count} pending ${plural} for "${title}"**\n\n` +
      `${count === 1 ? "Someone has" : `${count} people have`} applied to join your project and ${count === 1 ? "is" : "are"} waiting for your response.\n\n` +
      `👉 Review ${count === 1 ? "it" : "them"} here: ${SITE_URL}/projects/${projectId}`;

    console.log(`  [${DRY_RUN ? "DRY RUN" : "SEND"}] "${title}" → @${creator.discordUsername} (${count} ${plural})`);

    if (!DRY_RUN) {
      await sendDirectMessage(creator.discordUsername, message).catch((err) =>
        console.error(`    Failed to DM @${creator.discordUsername}:`, err)
      );
      // Small delay to respect Discord rate limits
      await new Promise((r) => setTimeout(r, 500));
    }

    notified++;
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Done. Notified: ${notified}, Skipped: ${skipped}`);
  if (DRY_RUN) console.log("(Dry run — no messages were actually sent)");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
