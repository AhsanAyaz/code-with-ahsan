/**
 * Firebase Admin for Scripts (Lazy Storage Initialization)
 *
 * Use this module instead of firebaseAdmin in scripts to avoid the
 * storage bucket initialization error when NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 * is not set.
 *
 * This module only exports `db` (Firestore) and does not initialize storage.
 */

import * as admin from "firebase-admin";

if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(
        /\\n/g,
        "\n"
      );
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  } else if (process.env.NODE_ENV === "development") {
    // Local dev — always use emulators, set hosts before Firestore client is created
    process.env.FIRESTORE_EMULATOR_HOST ??= "localhost:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "localhost:9099";
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-codewithahsan",
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
}

// Only export Firestore - no storage initialization
export const db = admin.firestore();
