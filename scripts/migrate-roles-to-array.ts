/**
 * scripts/migrate-roles-to-array.ts
 *
 * Deploy #2 of the roles-array migration (per D-15 in 01-CONTEXT.md).
 * Populates mentorship_profiles.roles from the legacy single-role field.
 *
 * Idempotent: re-running produces zero writes once all docs have roles populated.
 * Dry-run supported: --dry-run prints what WOULD be written, makes no changes.
 * Paginated: --limit=N bounds a staging/smoke run. Default = full collection.
 *
 * Invariant (PITFALLS.md §Pitfall 2): never writes null or empty string into the
 * roles array. A doc with role === null becomes roles: []. A doc with
 * role === "mentor" becomes roles: ["mentor"].
 *
 * Usage:
 *   npx tsx scripts/migrate-roles-to-array.ts --dry-run
 *   npx tsx scripts/migrate-roles-to-array.ts --limit=100
 *   npx tsx scripts/migrate-roles-to-array.ts          # full run
 */

import "dotenv/config";
import * as admin from "firebase-admin";

const COLLECTION = "mentorship_profiles";
const PAGE_SIZE = 200;

// Re-create the same canonical role set as src/types/mentorship.ts RoleSchema.
// Intentionally duplicated (not imported) so a scripts run doesn't drag the whole
// Next.js tsconfig path-mapping chain behind it. Keep in sync manually — the
// RoleSchema is the authority; this list is defensive filtering.
const VALID_ROLES = new Set(["mentor", "mentee", "ambassador", "alumni-ambassador"]);

function initAdmin(): void {
  if (admin.apps.length > 0) return;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
    });
    return;
  }
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
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
    "Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_KEY or the FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY trio in .env.local."
  );
}

interface CliArgs {
  dryRun: boolean;
  limit: number | null;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { dryRun: false, limit: null };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a.startsWith("--limit=")) args.limit = parseInt(a.split("=")[1], 10);
  }
  return args;
}

/**
 * Derive the `roles` array from a doc's legacy `role` field.
 * Returns [] when role is null/undefined/empty/not-in-VALID_ROLES.
 * NEVER returns an array containing null or "".
 */
function deriveRoles(legacyRole: unknown): string[] {
  if (typeof legacyRole !== "string") return [];
  if (legacyRole === "") return [];
  if (!VALID_ROLES.has(legacyRole)) return []; // defensive: skip unknown values
  return [legacyRole];
}

async function run(): Promise<void> {
  const { dryRun, limit } = parseArgs(process.argv);
  initAdmin();
  const db = admin.firestore();

  let totalScanned = 0;
  let totalWouldUpdate = 0;
  let totalUpdated = 0;
  let totalSkippedAlreadyMigrated = 0;
  let totalErrors = 0;

  let lastSnap: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  while (true) {
    let q = db.collection(COLLECTION).orderBy("__name__").limit(PAGE_SIZE);
    if (lastSnap) q = q.startAfter(lastSnap);
    const page = await q.get();
    if (page.empty) break;

    for (const doc of page.docs) {
      totalScanned++;
      if (limit !== null && totalScanned > limit) break;

      const data = doc.data();
      const existingRoles = data.roles;
      const legacyRole = data.role;

      // Idempotency gate: if roles is ALREADY an array, skip (even if empty).
      if (Array.isArray(existingRoles)) {
        totalSkippedAlreadyMigrated++;
        continue;
      }

      const derived = deriveRoles(legacyRole);

      if (dryRun) {
        totalWouldUpdate++;
        console.log(`[DRY-RUN] ${doc.id}: role=${JSON.stringify(legacyRole)} -> roles=${JSON.stringify(derived)}`);
        continue;
      }

      try {
        await doc.ref.update({ roles: derived });
        totalUpdated++;
      } catch (err) {
        totalErrors++;
        console.error(`[ERROR] ${doc.id}:`, err instanceof Error ? err.message : err);
      }
    }

    if (limit !== null && totalScanned >= limit) break;
    lastSnap = page.docs[page.docs.length - 1];
    if (page.size < PAGE_SIZE) break;
  }

  console.log("\n=== Migration report ===");
  console.log(`Mode:                   ${dryRun ? "DRY-RUN" : "APPLY"}`);
  console.log(`Total scanned:          ${totalScanned}`);
  console.log(`Already migrated:       ${totalSkippedAlreadyMigrated}`);
  console.log(`${dryRun ? "Would update" : "Updated"}:          ${dryRun ? totalWouldUpdate : totalUpdated}`);
  console.log(`Errors:                 ${totalErrors}`);

  if (totalErrors > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
