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

// Hot-reload guard. The firebase-admin module lives in node_modules and persists
// across `next dev` hot reloads, so `admin.apps` may already contain an app from
// a previous compile that ran under an older version of this file. If that app
// was initialized with production credentials but we now want emulator mode,
// tear it down and let the init below run on a clean slate.
if (wantsEmulator && admin.apps.length > 0) {
  const app = admin.apps[0];
  const hasCredential = !!(app && (app.options as { credential?: unknown })?.credential);
  if (hasCredential) {
    console.warn(
      "[firebaseAdmin] dev+emulator detected but existing app has production credentials. " +
        "Deleting and re-initializing for emulator. If auth still fails, fully restart `next dev` " +
        "and clear the .next cache.",
    );
    // .delete() is async, but we need admin.apps cleared synchronously before
    // initializeApp below. Fire the delete; then clear admin.apps in place.
    try {
      void app!.delete();
    } catch {
      /* ignore */
    }
    // admin.apps is a live getter that reads from an internal array; we can't
    // modify it directly. But initializeApp with a NAMED app sidesteps the
    // "default app already exists" error. We use a named app and re-export.
  }
}

// Primary app handle — named in dev-emulator hot-reload conflict path so we
// bypass the stale default app; otherwise the default unnamed app.
const EMU_APP_NAME = "dev-emulator-app";

function getOrInitApp(): admin.app.App {
  // If we're in dev-emulator mode and the default app already has credentials,
  // use a named app instead.
  if (wantsEmulator) {
    const existing = admin.apps.find((a) => a?.name === EMU_APP_NAME);
    if (existing) return existing;
    const defaultHasCredential =
      admin.apps.length > 0 &&
      !!(admin.apps[0] && (admin.apps[0]!.options as { credential?: unknown })?.credential);
    if (defaultHasCredential) {
      return admin.initializeApp(
        {
          projectId:
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-codewithahsan",
        },
        EMU_APP_NAME,
      );
    }
  }

  if (admin.apps.length > 0) return admin.apps[0]!;

  if (wantsEmulator) {
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
