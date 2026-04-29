/**
 * scripts/migrate-applications-collection.ts
 *
 * Copies all docs from the legacy `applications` collection to
 * `ambassador_applications`, preserving doc IDs, then deletes the originals.
 *
 * Idempotent: re-running skips docs that already exist in the destination
 * (unless --overwrite is passed). Safe to stop and restart.
 *
 * Dry-run supported: --dry-run prints what WOULD be written, makes no changes.
 * Paginated: --limit=N bounds a staging/smoke run.
 *
 * Usage:
 *   npx tsx scripts/migrate-applications-collection.ts --dry-run
 *   npx tsx scripts/migrate-applications-collection.ts --limit=10
 *   npx tsx scripts/migrate-applications-collection.ts          # full run
 *   npx tsx scripts/migrate-applications-collection.ts --overwrite  # re-copy even if dest exists
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();
import * as admin from "firebase-admin";

const SOURCE = "applications";
const DEST = "ambassador_applications";
const PAGE_SIZE = 200;
const BATCH_SIZE = 400; // Firestore max is 500 ops per batch

function initAdmin(): void {
  if (admin.apps.length > 0) return;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    const parsed = JSON.parse(serviceAccountJson);
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    admin.initializeApp({ credential: admin.credential.cert(parsed) });
    return;
  }
  if (
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PROJECT_ID
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
    return;
  }
  throw new Error(
    "Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_KEY or the " +
      "FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY trio in .env.local."
  );
}

interface CliArgs {
  dryRun: boolean;
  overwrite: boolean;
  limit: number | null;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { dryRun: false, overwrite: false, limit: null };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--overwrite") args.overwrite = true;
    else if (a.startsWith("--limit=")) args.limit = parseInt(a.split("=")[1], 10);
  }
  return args;
}

async function run(): Promise<void> {
  const { dryRun, overwrite, limit } = parseArgs(process.argv);
  initAdmin();
  const db = admin.firestore();

  let totalScanned = 0;
  let totalCopied = 0;
  let totalSkipped = 0;
  let totalDeleted = 0;
  let totalErrors = 0;

  console.log(`\nMigrating: ${SOURCE} → ${DEST}`);
  if (dryRun) console.log("  [DRY RUN — no writes]\n");
  if (overwrite) console.log("  [--overwrite: existing dest docs will be replaced]\n");

  let lastSnap: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  let done = false;

  while (!done) {
    let query = db.collection(SOURCE).orderBy("__name__").limit(PAGE_SIZE);
    if (lastSnap) query = query.startAfter(lastSnap);

    const page = await query.get();
    if (page.empty) break;

    // Collect doc IDs to check which already exist in destination
    const docIds = page.docs.map((d) => d.id);
    const destRefs = docIds.map((id) => db.collection(DEST).doc(id));
    const destSnaps = await db.getAll(...destRefs);
    const existingInDest = new Set(
      destSnaps.filter((s) => s.exists).map((s) => s.id)
    );

    // Process in batches of BATCH_SIZE (each doc = 1 write + 1 delete = 2 ops)
    const toMigrate = page.docs.filter(
      (d) => overwrite || !existingInDest.has(d.id)
    );
    const toSkip = page.docs.filter(
      (d) => !overwrite && existingInDest.has(d.id)
    );

    totalScanned += page.docs.length;
    totalSkipped += toSkip.length;

    if (toSkip.length > 0) {
      console.log(`  Skipping ${toSkip.length} doc(s) already in destination.`);
    }

    // Chunk into batches (write + delete = 2 ops per doc)
    for (let i = 0; i < toMigrate.length; i += BATCH_SIZE / 2) {
      const chunk = toMigrate.slice(i, i + BATCH_SIZE / 2);
      if (chunk.length === 0) continue;

      if (dryRun) {
        for (const doc of chunk) {
          console.log(`  [dry-run] would copy  ${SOURCE}/${doc.id} → ${DEST}/${doc.id}`);
          console.log(`  [dry-run] would delete ${SOURCE}/${doc.id}`);
        }
        totalCopied += chunk.length;
        totalDeleted += chunk.length;
        continue;
      }

      const batch = db.batch();
      for (const doc of chunk) {
        batch.set(db.collection(DEST).doc(doc.id), doc.data());
        batch.delete(db.collection(SOURCE).doc(doc.id));
      }

      try {
        await batch.commit();
        totalCopied += chunk.length;
        totalDeleted += chunk.length;
        console.log(`  Migrated ${chunk.length} doc(s) (batch ending at ${chunk[chunk.length - 1].id})`);
      } catch (e) {
        totalErrors += chunk.length;
        console.error(`  ERROR on batch:`, e);
      }
    }

    lastSnap = page.docs[page.docs.length - 1];

    if (limit !== null && totalScanned >= limit) {
      console.log(`\n  Reached --limit=${limit}, stopping.`);
      done = true;
    }
    if (page.docs.length < PAGE_SIZE) done = true;
  }

  console.log(`\n── Summary ──────────────────────────────`);
  console.log(`  Scanned : ${totalScanned}`);
  console.log(`  Copied  : ${totalCopied}${dryRun ? " (dry-run)" : ""}`);
  console.log(`  Skipped : ${totalSkipped} (already in destination)`);
  console.log(`  Deleted : ${totalDeleted}${dryRun ? " (dry-run)" : ""}`);
  console.log(`  Errors  : ${totalErrors}`);
  if (totalErrors === 0 && !dryRun) {
    console.log(`\n  ✓ Migration complete. You can now remove the 'applications' indexes`);
    console.log(`    from firestore.indexes.json and redeploy with --force.`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
