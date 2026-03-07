#!/usr/bin/env npx tsx
/**
 * Script: Notify #project-collaboration channel for a specific project
 *
 * Sends a Discord announcement tagging @ProjectCollaborator for a given project.
 * Used by the manual GitHub Action when admins need to re-notify or notify for
 * projects that were approved before the automated notification was in place.
 *
 * Usage:
 *   PROJECT_ID=abc123 PROJECT_TITLE="My Project" CREATOR_NAME="John Doe" npx tsx scripts/notify-project-collaboration.ts
 *
 * Required env vars:
 *   DISCORD_BOT_TOKEN  — bot token with message:write permission
 *   PROJECT_ID         — Firestore project document ID
 *   PROJECT_TITLE      — Human-readable project title
 *   CREATOR_NAME       — Display name of the project creator
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { sendNewProjectAnnouncementToCollaborators } from "../src/lib/discord";

const projectId = process.env.PROJECT_ID?.trim();
const projectTitle = process.env.PROJECT_TITLE?.trim();
const creatorName = process.env.CREATOR_NAME?.trim();

if (!projectId || !projectTitle || !creatorName) {
  console.error(
    "Missing required env vars: PROJECT_ID, PROJECT_TITLE, CREATOR_NAME"
  );
  process.exit(1);
}

console.log(`Notifying #project-collaboration for project: "${projectTitle}" (${projectId})`);

const ok = await sendNewProjectAnnouncementToCollaborators(
  projectTitle,
  creatorName,
  projectId
);

if (ok) {
  console.log("Notification sent successfully.");
} else {
  console.error("Failed to send notification.");
  process.exit(1);
}
