#!/usr/bin/env node

/**
 * Host Password Setup Script
 *
 * This script generates a bcrypt-hashed password and saves it to Firestore.
 *
 * Usage:
 *   node scripts/set-host-password.js <password>
 *
 * Example:
 *   node scripts/set-host-password.js MySecurePassword123!
 */

const bcrypt = require("bcryptjs");
const admin = require("firebase-admin");
const path = require("path");

// Try to load environment variables from .env.local
try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
} catch (e) {
  // dotenv might not be installed, ignore
}

/**
 * Parse FIREBASE_SERVICE_ACCOUNT_KEY.
 *
 * On Vercel the value arrives with the private key's newlines still escaped as
 * \n, which is valid JSON. But dotenv expands \n inside a double-quoted .env
 * value into real newlines, and a raw newline inside a JSON string is illegal —
 * so a straight JSON.parse throws "Bad escaped character in JSON" after a
 * `vercel env pull`. Re-escape and retry.
 *
 * Errors are rethrown without the payload: the default JSON.parse failure echoes
 * the offending source line, which puts part of the credential in the terminal.
 */
function parseServiceAccount(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(raw.replace(/\r/g, "").replace(/\n/g, "\\n"));
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. Re-copy it from the Vercel " +
          "dashboard, or use the secure/ service-account file instead."
      );
    }
  }
}

let resolvedProject = null;

// Initialize Firebase Admin using the same approach as firebaseAdmin.ts
if (!admin.apps.length) {
  // Check for FIREBASE_SERVICE_ACCOUNT_KEY env var (JSON string)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
    resolvedProject = serviceAccount.project_id;
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✓ Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT_KEY");
  }
  // Check for individual env vars
  else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
    resolvedProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    console.log("✓ Firebase Admin initialized with env credentials");
  }
  // Development: Load from local service account file
  else {
    try {
      const serviceAccountPath = path.join(
        __dirname,
        "..",
        "secure",
        "code-with-ahsan-45496-firebase-adminsdk-7axo0-3127308aba.json"
      );
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      resolvedProject = serviceAccount.project_id;
      console.log("✓ Firebase Admin initialized with local service account");
    } catch (e) {
      console.error("✗ Failed to initialize Firebase Admin");
      console.error("  Could not load service account from secure/ folder");
      console.error("\n  Make sure you have one of:");
      console.error("    1. FIREBASE_SERVICE_ACCOUNT_KEY env variable");
      console.error("    2. FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL env variables");
      console.error("    3. Service account JSON file in secure/ folder");
      process.exit(1);
    }
  }
}

const db = admin.firestore();

async function setHostPassword(password) {
  if (!password || password.length < 8) {
    console.error("✗ Password must be at least 8 characters long");
    process.exit(1);
  }

  console.log("\n📝 Setting host password...\n");

  // Generate bcrypt hash with cost factor of 12
  const saltRounds = 12;
  console.log(`  Generating bcrypt hash (cost factor: ${saltRounds})...`);

  const hash = await bcrypt.hash(password, saltRounds);

  console.log("  Hash generated successfully");
  console.log(`  Hash preview: ${hash.substring(0, 20)}...`);

  // Save to Firestore
  // Name the target explicitly. The project comes from the credential, not from
  // NEXT_PUBLIC_FIREBASE_PROJECT_ID, and FIRESTORE_EMULATOR_HOST silently
  // redirects the write to the emulator — easy to set the password somewhere
  // you did not mean to.
  const targetProject = resolvedProject || admin.app().options.projectId || "unknown";
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;
  console.log(
    `\n  Target: project "${targetProject}"${emulator ? ` via EMULATOR at ${emulator}` : " (PRODUCTION)"}`
  );
  console.log("\n  Saving to Firestore (config/host)...");

  await db.collection("config").doc("host").set(
    {
      passwordHash: hash,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      hashAlgorithm: "bcrypt",
      costFactor: saltRounds,
    },
    { merge: true }
  );

  console.log("\n✓ Host password has been set successfully!");
  console.log(
    "\n⚠️  Important: Keep this password safe. You will need it to access the presenter host panel."
  );
  console.log("  To reset the password, run this script again with a new password.\n");
}

// Main execution
const password = process.argv[2];

if (!password) {
  console.log(`
Host Password Setup Script
============================

Usage: node scripts/set-host-password.js <password>

Example:
  node scripts/set-host-password.js MySecurePassword123!

Requirements:
  - Password must be at least 8 characters
  - Firebase Admin credentials must be configured
`);
  process.exit(1);
}

setHostPassword(password)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n✗ Error setting password:", error.message);
    process.exit(1);
  });
