/**
 * scripts/migrate-admin-roles.ts
 *
 * Seeds admin_roles/{uid} with role "admin" for every mentorship_profiles doc
 * where isAdmin == true, so existing admins keep portal access when routes move
 * to requireAdminAccess. Users who already have an admin_roles doc are skipped
 * (their role is left as is). Idempotent.
 *
 * Dry run by default; pass --apply to write.
 *
 * Usage:
 *   npx tsx scripts/migrate-admin-roles.ts           # dry run
 *   npx tsx scripts/migrate-admin-roles.ts --apply   # write
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fallback to .env

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");

  // Import after dotenv so firebaseAdmin sees the credentials.
  const { auth, db } = await import("../src/lib/firebaseAdmin");
  const { setAdminRole, ADMIN_ROLES_COLLECTION } = await import("../src/lib/adminAccess/server");

  console.log(`\n=== Migrate admin roles ${apply ? "(APPLY)" : "(DRY RUN)"} ===\n`);

  const snap = await db.collection("mentorship_profiles").where("isAdmin", "==", true).get();
  console.log(`Found ${snap.size} profile(s) with isAdmin == true\n`);

  let seeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of snap.docs) {
    const uid = doc.id;
    const data = doc.data();

    const existing = await db.collection(ADMIN_ROLES_COLLECTION).doc(uid).get();
    if (existing.exists) {
      console.log(`  skip  ${uid}: already has role "${existing.data()?.role}"`);
      skipped++;
      continue;
    }

    let email: string = typeof data.email === "string" ? data.email : "";
    let displayName: string | undefined =
      typeof data.displayName === "string" ? data.displayName : undefined;
    try {
      const user = await auth.getUser(uid);
      email = user.email ?? email;
      displayName = user.displayName ?? displayName;
    } catch {
      console.warn(`  warn  ${uid}: no Firebase Auth user, using profile email "${email}"`);
    }

    if (!apply) {
      console.log(`  would seed ${uid} (${email || "no email"}) as admin`);
      seeded++;
      continue;
    }

    const result = await setAdminRole(
      { uid, email, ...(displayName !== undefined ? { displayName } : {}) },
      "admin",
      { uid: "migration", email: "migration:migrate-admin-roles" }
    );
    if (!result.ok) {
      console.error(`  FAIL  ${uid}: ${result.error}`);
      failed++;
      continue;
    }
    console.log(
      `  seeded ${uid} (${email || "no email"}) as admin${
        result.claimSynced ? "" : ` (claim sync failed: ${result.claimError})`
      }`
    );
    seeded++;
  }

  console.log(
    `\n${apply ? "Seeded" : "Would seed"}: ${seeded}, skipped: ${skipped}, failed: ${failed}`
  );
  if (!apply) console.log("Dry run only. Re-run with --apply to write.\n");
  if (failed > 0) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
