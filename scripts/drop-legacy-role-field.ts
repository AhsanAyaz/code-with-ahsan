/**
 * scripts/drop-legacy-role-field.ts
 *
 * Plan 10 / Deploy #5 one-shot cleanup.
 * Removes the legacy `role` field from every mentorship_profiles Firestore doc
 * and strips the legacy `role` key from each user's Firebase Auth custom claims.
 *
 * Safe to re-run: docs/users that already lack the `role` field are skipped.
 *
 * Usage:
 *   npx tsx scripts/drop-legacy-role-field.ts --dry-run
 *   npx tsx scripts/drop-legacy-role-field.ts --limit=50
 *   npx tsx scripts/drop-legacy-role-field.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();
import * as admin from "firebase-admin";

const COLLECTION = "mentorship_profiles";
const PAGE_SIZE = 100;
const RATE_DELAY_MS = 50;

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
  throw new Error("Missing Firebase credentials.");
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

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function run(): Promise<void> {
  const { dryRun, limit } = parseArgs(process.argv);
  initAdmin();
  const db = admin.firestore();
  const auth = admin.auth();

  let totalScanned = 0;
  let totalFirestoreUpdated = 0;
  let totalClaimsUpdated = 0;
  let totalAlreadyClean = 0;
  let totalErrors = 0;

  console.log(`[drop-legacy-role] Starting${dryRun ? " (DRY RUN)" : ""}${limit ? ` limit=${limit}` : ""}`);

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
      const hasLegacyField = "role" in data;

      // ── Firestore: drop `role` field ─────────────────────────────────────
      if (hasLegacyField) {
        if (dryRun) {
          console.log(`[DRY-RUN] Firestore ${doc.id}: would delete role="${data.role}"`);
          totalFirestoreUpdated++;
        } else {
          try {
            await doc.ref.update({ role: admin.firestore.FieldValue.delete() });
            totalFirestoreUpdated++;
          } catch (err) {
            totalErrors++;
            console.error(`[ERROR] Firestore update ${doc.id}:`, err instanceof Error ? err.message : err);
          }
        }
      }

      // ── Auth claims: strip `role` key ─────────────────────────────────────
      let userRecord: admin.auth.UserRecord;
      try {
        userRecord = await auth.getUser(doc.id);
      } catch (err: unknown) {
        if (err instanceof Error && /no user record/i.test(err.message)) {
          continue;
        }
        totalErrors++;
        console.error(`[ERROR] auth.getUser(${doc.id}):`, err instanceof Error ? err.message : err);
        continue;
      }

      const claims = (userRecord.customClaims ?? {}) as Record<string, unknown>;
      if (!("role" in claims)) {
        totalAlreadyClean++;
      } else {
        const { role: _legacyRole, ...preserved } = claims;
        if (dryRun) {
          console.log(`[DRY-RUN] Claims ${doc.id}: would drop role="${claims.role}"`);
          totalClaimsUpdated++;
        } else {
          try {
            await auth.setCustomUserClaims(doc.id, preserved);
            totalClaimsUpdated++;
          } catch (err) {
            totalErrors++;
            console.error(`[ERROR] setCustomUserClaims ${doc.id}:`, err instanceof Error ? err.message : err);
          }
          await sleep(RATE_DELAY_MS);
        }
      }
    }

    lastSnap = page.docs[page.docs.length - 1];
    if (limit !== null && totalScanned >= limit) break;
  }

  console.log(`\n[drop-legacy-role] Done${dryRun ? " (DRY RUN)" : ""}`);
  console.log(`  Scanned:              ${totalScanned}`);
  console.log(`  Firestore updated:    ${totalFirestoreUpdated}`);
  console.log(`  Claims updated:       ${totalClaimsUpdated}`);
  console.log(`  Claims already clean: ${totalAlreadyClean}`);
  console.log(`  Errors:               ${totalErrors}`);
}

run().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
