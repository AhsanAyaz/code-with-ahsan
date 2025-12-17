import * as admin from "firebase-admin";

if (!admin.apps.length) {
  // If we have a service account env var, use it. Otherwise, rely on default Google Cloud credentials (ADC)
  // or assume we are just using the project ID if locally authenticated via gcloud.
  // Ideally, for production, you'd use cert(serviceAccount).
  // For this environment, we try default/inferred.

  // Check if we have explicit credentials strings (common in Vercel/local envs)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (process.env.NODE_ENV === "development") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serviceAccount = require("../../secure/code-with-ahsan-45496-firebase-adminsdk-7axo0-3127308aba.json");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e) {
      console.warn("Could not load local service account", e);
      admin.initializeApp({
        credential: admin.credential.applicationDefault(), // Fallback to ADC
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(), // Fallback to ADC
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
}

export const db = admin.firestore();
