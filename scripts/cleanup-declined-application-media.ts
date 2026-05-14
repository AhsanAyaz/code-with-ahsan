/**
 * REVIEW-04: Delete student-ID Storage objects for applications declined > 30 days ago.
 *
 * Runs weekly via .github/workflows/cleanup-declined-application-media.yml.
 * Idempotent — re-runs on the same decline skip because the doc is flagged { studentIdCleanedUp: true }.
 *
 * Env vars required:
 *   FIREBASE_SERVICE_ACCOUNT                   (JSON-serialized service account)
 *   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET        (e.g. project-id.appspot.com)
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID            (optional; admin SDK derives from SA key)
 *
 * Usage:
 *   npx tsx scripts/cleanup-declined-application-media.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fallback to .env

import * as admin from "firebase-admin";

// --- Constants (mirrors src/lib/ambassador/constants.ts) ---
// Intentionally duplicated (not imported) so a scripts run doesn't drag the whole
// Next.js tsconfig path-mapping chain behind it. Keep in sync with constants.ts manually.
const DECLINED_APPLICATION_RETENTION_DAYS = 30;
const AMBASSADOR_APPLICATIONS_COLLECTION = "applications";

function daysAgoMs(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function initAdmin(): void {
  if (admin.apps.length > 0) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT env var is required.");
  }
  const serviceAccount = JSON.parse(raw) as { private_key?: string };
  // Normalize private_key: env vars sometimes store \n as literal \\n
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

async function deleteStorageObjectSafe(
  bucket: ReturnType<typeof admin.storage>["bucket"] extends (...args: infer _A) => infer R ? R : never,
  path: string
): Promise<"deleted" | "already_gone"> {
  // ignoreNotFound: true makes delete idempotent — 404 is treated as success.
  try {
    await bucket.file(path).delete({ ignoreNotFound: true });
    return "deleted";
  } catch (e) {
    const err = e as { code?: number | string; message?: string };
    // Extra safety net: if ignoreNotFound somehow didn't catch a 404, handle here
    if (err.code === 404 || err.code === "storage/object-not-found") return "already_gone";
    throw e;
  }
}

async function main(): Promise<void> {
  initAdmin();
  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  const cutoffMs = daysAgoMs(DECLINED_APPLICATION_RETENTION_DAYS);
  const cutoffTs = admin.firestore.Timestamp.fromMillis(cutoffMs);

  console.log(
    `[cleanup] Querying applications with status=declined AND declinedAt <= ${new Date(cutoffMs).toISOString()}`
  );
  console.log(`[cleanup] Retention threshold: ${DECLINED_APPLICATION_RETENTION_DAYS} days`);

  // Firestore query: declined AND declinedAt <= cutoff
  // NOTE: This query requires a Firestore composite index on (status ASC, declinedAt ASC).
  // If the index doesn't exist, the first run will fail with a Firebase console link to create it.
  // The studentIdCleanedUp filter is applied in-process (cannot compound inequality + equality for this field).
  const snap = await db
    .collection(AMBASSADOR_APPLICATIONS_COLLECTION)
    .where("status", "==", "declined")
    .where("declinedAt", "<=", cutoffTs)
    .get();

  console.log(
    `[cleanup] found ${snap.size} declined applications older than ${DECLINED_APPLICATION_RETENTION_DAYS} days`
  );

  let deleted = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as {
      studentIdStoragePath?: string;
      studentIdCleanedUp?: boolean;
    };

    // Idempotency gate: skip docs already cleaned up
    if (data.studentIdCleanedUp === true) {
      console.log(`[cleanup] ${doc.id}: already cleaned up, skipping`);
      skipped += 1;
      continue;
    }

    try {
      if (data.studentIdStoragePath) {
        const result = await deleteStorageObjectSafe(bucket, data.studentIdStoragePath);
        console.log(`[cleanup] ${doc.id}: Storage object ${result} (${data.studentIdStoragePath})`);
      } else {
        console.log(`[cleanup] ${doc.id}: no studentIdStoragePath, marking cleaned`);
      }

      // Flag the doc so re-runs are no-ops
      await doc.ref.update({
        studentIdCleanedUp: true,
        cleanedUpAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      deleted += 1;
    } catch (e) {
      errors += 1;
      console.error(`[cleanup] ${doc.id} error:`, e);
    }
  }

  console.log(
    `[cleanup] done. deleted=${deleted}, skipped=${skipped}, errors=${errors}`
  );

  // Non-zero exit code so GitHub Actions surfaces the failure
  if (errors > 0) process.exit(1);
}

main().catch((e) => {
  console.error("[cleanup] fatal", e);
  process.exit(1);
});
