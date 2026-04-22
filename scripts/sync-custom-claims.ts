/**
 * scripts/sync-custom-claims.ts
 *
 * Deploy #2.5 of the roles-array migration (per D-15 in 01-CONTEXT.md).
 * Reads the now-migrated mentorship_profiles.roles as the source of truth and
 * synchronizes each Firebase Auth user's custom claims to match.
 *
 * Preserves existing custom claims (does NOT replace the whole claims object).
 * setCustomUserClaims in the Admin SDK replaces the claims atomically — so this
 * script reads the user's current claims, merges roles + admin from Firestore,
 * and writes back.
 *
 * Keeps the legacy `role` claim populated during the dual-claim window so
 * firestore.rules can evaluate both claim shapes (per D-13). The legacy claim is
 * dropped in Deploy #5's cleanup PR.
 *
 * Idempotent: re-running with unchanged Firestore produces zero writes (detects
 * when the auth user's current claims already match the desired shape and skips).
 *
 * Usage:
 *   npx tsx scripts/sync-custom-claims.ts --dry-run
 *   npx tsx scripts/sync-custom-claims.ts --limit=100
 *   npx tsx scripts/sync-custom-claims.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fallback to .env
import * as admin from "firebase-admin";

const COLLECTION = "mentorship_profiles";
const PAGE_SIZE = 100;   // smaller than migration — auth.getUser is per-user RPC
const RATE_DELAY_MS = 50; // conservative throttle for Firebase Auth API quota

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
  throw new Error("Missing Firebase credentials — see scripts/migrate-roles-to-array.ts header comment.");
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
 * Return true if current claims already match the target roles + admin + legacy-role shape.
 * If true, skip the setCustomUserClaims call (idempotency).
 */
function claimsMatchTarget(
  current: Record<string, unknown> | undefined,
  targetRoles: string[],
  targetAdmin: boolean
): boolean {
  if (!current) return false;
  const currentRoles = Array.isArray(current.roles) ? (current.roles as string[]) : null;
  if (!currentRoles) return false;
  if (currentRoles.length !== targetRoles.length) return false;
  for (const r of targetRoles) if (!currentRoles.includes(r)) return false;
  if ((current.admin === true) !== targetAdmin) return false;
  // Legacy-role claim: during dual-claim window, the legacy role claim should mirror the first role in targetRoles (or be absent if roles is empty)
  const expectedLegacyRole = targetRoles[0] ?? undefined;
  if (current.role !== expectedLegacyRole) return false;
  return true;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function run(): Promise<void> {
  const { dryRun, limit } = parseArgs(process.argv);
  initAdmin();
  const db = admin.firestore();
  const auth = admin.auth();

  let totalScanned = 0;
  let totalWouldUpdate = 0;
  let totalUpdated = 0;
  let totalSkippedAlreadyInSync = 0;
  let totalSkippedNoAuthUser = 0;
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
      const roles: string[] = Array.isArray(data.roles) ? data.roles : [];
      const isAdminFlag: boolean = data.isAdmin === true;

      let userRecord: admin.auth.UserRecord;
      try {
        userRecord = await auth.getUser(doc.id);
      } catch (err: unknown) {
        // user-not-found is expected for deleted users that still have profile docs
        if (err instanceof Error && /no user record/i.test(err.message)) {
          totalSkippedNoAuthUser++;
          continue;
        }
        totalErrors++;
        console.error(`[ERROR] auth.getUser(${doc.id}):`, err instanceof Error ? err.message : err);
        continue;
      }

      if (claimsMatchTarget(userRecord.customClaims, roles, isAdminFlag)) {
        totalSkippedAlreadyInSync++;
        continue;
      }

      // Merge: preserve any other custom claims we don't own.
      const merged: Record<string, unknown> = {
        ...(userRecord.customClaims ?? {}),
        roles,
        role: roles[0] ?? null, // legacy claim — removed in Deploy #5
        admin: isAdminFlag,
      };

      if (dryRun) {
        totalWouldUpdate++;
        console.log(`[DRY-RUN] ${doc.id}: claims -> ${JSON.stringify({ roles, admin: isAdminFlag })}`);
        continue;
      }

      try {
        await auth.setCustomUserClaims(doc.id, merged);
        totalUpdated++;
        await sleep(RATE_DELAY_MS);
      } catch (err) {
        totalErrors++;
        console.error(`[ERROR] setCustomUserClaims(${doc.id}):`, err instanceof Error ? err.message : err);
      }
    }

    if (limit !== null && totalScanned >= limit) break;
    lastSnap = page.docs[page.docs.length - 1];
    if (page.size < PAGE_SIZE) break;
  }

  console.log("\n=== Claims sync report ===");
  console.log(`Mode:                   ${dryRun ? "DRY-RUN" : "APPLY"}`);
  console.log(`Total scanned:          ${totalScanned}`);
  console.log(`Already in sync:        ${totalSkippedAlreadyInSync}`);
  console.log(`No auth user:           ${totalSkippedNoAuthUser}`);
  console.log(`${dryRun ? "Would update" : "Updated"}:          ${dryRun ? totalWouldUpdate : totalUpdated}`);
  console.log(`Errors:                 ${totalErrors}`);

  if (totalErrors > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
