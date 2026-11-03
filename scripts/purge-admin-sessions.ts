/**
 * scripts/purge-admin-sessions.ts
 *
 * Deletes every doc in the retired `admin_sessions` collection. Those docs were
 * minted by the old shared admin password login and are no longer read by any
 * route once admin access moved to per-person roles (admin_roles/{uid}).
 *
 * Run after the cutover is deployed and you have confirmed you can sign in to
 * /admin with your own account.
 *
 * Dry run by default; pass --apply to delete.
 *
 * Usage:
 *   npx tsx scripts/purge-admin-sessions.ts           # dry run (count only)
 *   npx tsx scripts/purge-admin-sessions.ts --apply   # delete
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fallback to .env

const COLLECTION = "admin_sessions";
const BATCH_SIZE = 400;

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");

  // Import after dotenv so firebaseAdmin sees the credentials.
  const { db } = await import("../src/lib/firebaseAdmin");

  console.log(`\n=== Purge ${COLLECTION} ${apply ? "(APPLY)" : "(DRY RUN)"} ===\n`);

  const refs = await db.collection(COLLECTION).listDocuments();
  console.log(`Found ${refs.length} doc(s) in ${COLLECTION}`);

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to delete.\n");
    return;
  }

  let deleted = 0;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const ref of refs.slice(i, i + BATCH_SIZE)) batch.delete(ref);
    await batch.commit();
    deleted += Math.min(BATCH_SIZE, refs.length - i);
    console.log(`  deleted ${deleted}/${refs.length}`);
  }

  console.log(`\nDeleted ${deleted} doc(s) from ${COLLECTION}.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
