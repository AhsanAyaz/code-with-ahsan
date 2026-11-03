/**
 * scripts/set-admin-role.ts
 *
 * Grant, change or revoke an admin portal role for an existing Firebase user.
 * Writes admin_roles/{uid} and syncs the `admin` custom claim plus the
 * mentorship_profiles.isAdmin mirror (see setAdminRole in
 * src/lib/adminAccess/server.ts). Use it to bootstrap the first admin.
 *
 * Usage:
 *   npx tsx scripts/set-admin-role.ts <email> <admin|moderator|none>
 *
 * Credentials come from .env.local / .env (FIREBASE_SERVICE_ACCOUNT_KEY, or
 * FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL + NEXT_PUBLIC_FIREBASE_PROJECT_ID),
 * the same way src/lib/firebaseAdmin.ts initializes.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fallback to .env
import * as os from "os";

const ROLE_ARGS = ["admin", "moderator", "none"] as const;
type RoleArg = (typeof ROLE_ARGS)[number];

function usage(): never {
  console.log(`
Set Admin Role
==============

Usage: npx tsx scripts/set-admin-role.ts <email> <admin|moderator|none>

  admin      full portal access (also sets the admin custom claim)
  moderator  read + non-destructive writes (no admin claim)
  none       revoke portal access
`);
  process.exit(1);
}

async function main(): Promise<void> {
  const [email, roleArg] = process.argv.slice(2);
  if (!email || !roleArg || !(ROLE_ARGS as readonly string[]).includes(roleArg)) usage();

  // Import after dotenv so firebaseAdmin sees the credentials.
  const { auth } = await import("../src/lib/firebaseAdmin");
  const { setAdminRole } = await import("../src/lib/adminAccess/server");

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    console.error(`User not found: ${email} (they must sign in to the site once first)`);
    process.exit(1);
  }

  const role = (roleArg as RoleArg) === "none" ? null : (roleArg as "admin" | "moderator");
  const result = await setAdminRole(
    {
      uid: user.uid,
      email: user.email ?? email,
      ...(user.displayName ? { displayName: user.displayName } : {}),
    },
    role,
    { uid: "cli", email: `cli:${os.userInfo().username}` }
  );

  if (!result.ok) {
    console.error(`Failed: ${result.error}`);
    process.exit(1);
  }

  console.log(
    role
      ? `Set ${email} (${user.uid}) to role: ${role}`
      : `Revoked admin portal access for ${email} (${user.uid})`
  );
  if (!result.claimSynced) {
    console.warn(`Warning: custom claim sync failed (${result.claimError}). Re-run to retry.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
