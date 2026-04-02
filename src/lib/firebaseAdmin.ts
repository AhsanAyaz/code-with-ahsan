import * as admin from "firebase-admin";

if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(
        /\\n/g,
        "\n",
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
      credential: admin.credential.applicationDefault(), // Fallback to ADC
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
}

export const db = admin.firestore();
export const auth = admin.auth();

// Storage bucket for file uploads (unavailable in emulator-only local dev)
export const storage = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  ? admin.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
  : (null as unknown as ReturnType<admin.storage.Storage["bucket"]>);

