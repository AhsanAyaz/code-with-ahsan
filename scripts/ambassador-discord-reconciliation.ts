#!/usr/bin/env npx tsx
/**
 * Phase 4 (DISC-04): Weekly Discord-role reconciliation.
 *
 * For each active ambassador with a resolved `discordMemberId`:
 *   - Fetch their guild member via `getGuildMemberById(discordMemberId)`.
 *   - If the member's roles array does NOT include `DISCORD_AMBASSADOR_ROLE_ID`,
 *     write `ambassador_cron_flags` with type=missing_discord_role.
 *
 * D-06 INVARIANT: This script NEVER calls `assignDiscordRole`. Missing roles
 * are flagged for admin review only. Admins use the existing
 * `/api/ambassador/applications/[applicationId]/discord-resolve` retry (Phase 2)
 * or the future Phase 5 member offboarding UI.
 *
 * TODO: getGuildMemberById uses the immutable Discord member snowflake ID.
 * If a future quick task swaps subdoc to store discordMemberId as a username,
 * replace getGuildMemberById with lookupMemberByUsername and update the
 * loadActiveAmbassadors join accordingly.
 *
 * Run: npx tsx scripts/ambassador-discord-reconciliation.ts [--dry-run]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import {
  getGuildMemberById,
  DISCORD_AMBASSADOR_ROLE_ID,
} from "../src/lib/discord";
import { AMBASSADOR_CRON_FLAGS_COLLECTION } from "../src/lib/ambassador/constants";

// PUBLIC_AMBASSADORS_COLLECTION is defined in src/types/ambassador.ts (uses @/ alias).
// Scripts run outside Next.js bundler, so we use the literal string directly.
const PUBLIC_AMBASSADORS_COLLECTION = "public_ambassadors";

const DRY_RUN = process.argv.includes("--dry-run");

interface AmbassadorRecord {
  uid: string;
  discordMemberId: string | null;
  displayName: string;
}

async function loadActiveAmbassadors(): Promise<AmbassadorRecord[]> {
  const snap = await db
    .collection("public_ambassadors")
    .where("active", "==", true)
    .get();

  const results: AmbassadorRecord[] = [];
  for (const doc of snap.docs) {
    const uid = doc.id;
    const subdocSnap = await db
      .collection("mentorship_profiles")
      .doc(uid)
      .collection("ambassador")
      .doc("v1")
      .get();
    const subdoc = subdocSnap.data() ?? {};
    const data = doc.data() ?? {};

    results.push({
      uid,
      discordMemberId:
        typeof subdoc.discordMemberId === "string" && subdoc.discordMemberId.length > 0
          ? subdoc.discordMemberId
          : null,
      displayName: typeof data.displayName === "string" ? data.displayName : uid,
    });
  }
  return results;
}

async function writeFlag(ambassadorId: string): Promise<void> {
  // Deterministic doc id — re-runs never duplicate unresolved flags.
  const flagId = `${ambassadorId}_missing_discord_role_all`;
  if (DRY_RUN) {
    console.log(`[DRY-RUN] would write flag: ${flagId}`);
    return;
  }
  await db.collection(AMBASSADOR_CRON_FLAGS_COLLECTION).doc(flagId).set(
    {
      ambassadorId,
      type: "missing_discord_role",
      flaggedAt: FieldValue.serverTimestamp(),
      resolved: false,
    },
    { merge: true }
  );
}

async function main() {
  console.log(
    `[ambassador-discord-reconciliation] starting at ${new Date().toISOString()} (dry-run=${DRY_RUN})`
  );
  // Cast to string so future callers that use a runtime env var also get the guard.
  const roleId: string = DISCORD_AMBASSADOR_ROLE_ID;
  if (!roleId || roleId === "PENDING_DISCORD_ROLE_CREATION") {
    console.error(
      "[ambassador-discord-reconciliation] DISCORD_AMBASSADOR_ROLE_ID is not set; exiting"
    );
    process.exit(1);
  }

  const ambassadors = await loadActiveAmbassadors();
  console.log(
    `[ambassador-discord-reconciliation] loaded ${ambassadors.length} active ambassadors`
  );

  let flagsWritten = 0;
  let noDiscordId = 0;
  let errors = 0;

  for (const amb of ambassadors) {
    try {
      if (!amb.discordMemberId) {
        // No resolved Discord id — surface as missing_discord_role flag so admin can re-resolve
        await writeFlag(amb.uid);
        flagsWritten++;
        noDiscordId++;
        console.log(`[flag-no-discord-id] ${amb.uid} (${amb.displayName})`);
        continue;
      }

      const member = await getGuildMemberById(amb.discordMemberId);
      if (!member) {
        await writeFlag(amb.uid);
        flagsWritten++;
        console.log(`[flag-not-in-guild] ${amb.uid} (${amb.displayName})`);
        continue;
      }

      const roles: string[] = Array.isArray(member.roles) ? member.roles : [];
      if (!roles.includes(DISCORD_AMBASSADOR_ROLE_ID)) {
        await writeFlag(amb.uid);
        flagsWritten++;
        console.log(`[flag-role-missing] ${amb.uid} (${amb.displayName})`);
      }
    } catch (err) {
      errors++;
      console.error(`[error] ${amb.uid}:`, err);
      // Continue on per-ambassador failures
    }
  }

  console.log(
    `[ambassador-discord-reconciliation] done. flags=${flagsWritten} noDiscordId=${noDiscordId} errors=${errors}`
  );
}

main().catch((err) => {
  console.error("[ambassador-discord-reconciliation] fatal:", err);
  process.exit(1);
});
