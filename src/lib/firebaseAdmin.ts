import * as admin from "firebase-admin";

// Always set emulator env vars at module TOP — before any admin op and regardless
// of whether admin has already been initialized. Firebase Admin caches auth/
// firestore clients based on env vars at client-creation time; setting these too
// late has no effect on an already-initialized app.
const wantsEmulator =
  process.env.NODE_ENV === "development" &&
  (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.startsWith("demo-") === true ||
    !!process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    !!process.env.FIRESTORE_EMULATOR_HOST);

if (wantsEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST ??= "localhost:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "localhost:9099";
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= "localhost:9199";
}

// Hot-reload guard. In emulator mode we exclusively use a named app (EMU_APP_NAME)
// so the DEFAULT app is never returned by getOrInitApp(). However, a previous
// hot-reload cycle may have initialized the DEFAULT app with prod credentials —
// delete that specific app so it doesn't occupy the [DEFAULT] slot.
if (wantsEmulator) {
  const defaultApp = admin.apps.find((a) => a?.name === "[DEFAULT]");
  if (defaultApp) {
    const hasCredential = !!(
      defaultApp.options as { credential?: unknown }
    )?.credential;
    if (hasCredential) {
      console.warn(
        "[firebaseAdmin] dev+emulator: DEFAULT app has prod credentials — deleting it. " +
          "If auth still fails, fully restart `next dev` and clear the .next cache.",
      );
      try { void defaultApp.delete(); } catch { /* ignore */ }
    }
  }
}

// Primary app handle — named in dev-emulator hot-reload conflict path so we
// bypass the stale default app; otherwise the default unnamed app.
const EMU_APP_NAME = "dev-emulator-app";

function getOrInitApp(): admin.app.App {
  if (wantsEmulator) {
    // In emulator mode always use the named app — never admin.apps[0], which may
    // be a stale or already-deleted DEFAULT app from a prior hot-reload cycle.
    const existing = admin.apps.find((a) => a?.name === EMU_APP_NAME);
    if (existing) return existing;
    return admin.initializeApp(
      { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-codewithahsan" },
      EMU_APP_NAME,
    );
  }

  if (admin.apps.length > 0) return admin.apps[0]!;

  if (wantsEmulator) {
    // Unreachable — emulator path above always returns early — kept for safety.
    return admin.initializeApp({
      projectId:
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-codewithahsan",
    });
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }

  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const app = getOrInitApp();

export const db = app.firestore();
export const auth = app.auth();

// Storage bucket for file uploads. In dev emulator mode, the bucket call is
// routed to localhost:9199 via FIREBASE_STORAGE_EMULATOR_HOST set above.
export const storage = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  ? app.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
  : (null as unknown as ReturnType<admin.storage.Storage["bucket"]>);
