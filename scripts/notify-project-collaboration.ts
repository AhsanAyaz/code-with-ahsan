#!/usr/bin/env npx tsx
/**
 * Script: Notify #project-collaboration for open projects
 *
 * Queries Firestore for all active projects that haven't reached max team size,
 * then either lists them or sends a Discord announcement for each.
 *
 * Usage:
 *   MODE=list    npx tsx scripts/notify-project-collaboration.ts   # List open projects
 *   MODE=notify  npx tsx scripts/notify-project-collaboration.ts   # Send Discord notifications
 *
 * Required env vars:
 *   FIREBASE_SERVICE_ACCOUNT  — JSON string (production)
 *   DISCORD_BOT_TOKEN         — bot token with message:write permission (notify mode)
 *   DISCORD_GUILD_ID          — Discord server ID
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as admin from "firebase-admin";
import { sendNewProjectAnnouncementToCollaborators } from "../src/lib/discord";

const MODE = (process.env.MODE || "list").trim();

if (MODE !== "list" && MODE !== "notify") {
  console.error(`Invalid MODE "${MODE}". Use MODE=list or MODE=notify.`);
  process.exit(1);
}

// --- Firebase init ---
if (!admin.apps.length) {
  if (process.env.NODE_ENV === "production") {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      console.error("FIREBASE_SERVICE_ACCOUNT env var is not set");
      process.exit(1);
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require("../secure/code-with-ahsan-45496-firebase-adminsdk-7axo0-3127308aba.json");
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
}

interface ProjectDoc {
  id: string;
  title: string;
  memberCount: number;
  maxTeamSize: number;
  creatorProfile: { displayName: string };
}

async function main() {
  const db = admin.firestore();

  // --- Query open projects ---
  const snapshot = await db
    .collection("projects")
    .where("status", "==", "active")
    .get();

  const openProjects: ProjectDoc[] = snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ProjectDoc, "id">) }))
    .filter((p) => (p.memberCount ?? 0) < (p.maxTeamSize ?? 4));

  if (openProjects.length === 0) {
    console.log("No open projects found (all at max capacity or none active).");
    return;
  }

  // --- List mode ---
  if (MODE === "list") {
    console.log(`\nOpen projects with available spots (${openProjects.length} total):\n`);
    for (const p of openProjects) {
      const spots = (p.maxTeamSize ?? 4) - (p.memberCount ?? 0);
      console.log(`  [${p.id}] ${p.title}`);
      console.log(`    Creator : ${p.creatorProfile?.displayName || "Unknown"}`);
      console.log(`    Members : ${p.memberCount ?? 0} / ${p.maxTeamSize ?? 4}  (${spots} spot${spots !== 1 ? "s" : ""} left)`);
      console.log(`    URL     : https://codewithahsan.com/projects/${p.id}`);
      console.log();
    }
    return;
  }

  // --- Notify mode ---
  console.log(`\nSending Discord notifications for ${openProjects.length} open project(s)...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const p of openProjects) {
    const title = p.title || "Untitled Project";
    const creator = p.creatorProfile?.displayName || "Creator";
    process.stdout.write(`  Notifying: "${title}" ... `);
    const ok = await sendNewProjectAnnouncementToCollaborators(title, creator, p.id);
    if (ok) {
      console.log("sent");
      successCount++;
    } else {
      console.log("FAILED");
      failCount++;
    }
  }

  console.log(`\nDone: ${successCount} sent, ${failCount} failed.`);
  if (failCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
