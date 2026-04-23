import { getAuth } from "firebase/auth";
import { getApp } from "firebase/app";

/**
 * Authenticated fetch wrapper. Automatically attaches Firebase ID token
 * as Bearer token in Authorization header for mutating requests.
 *
 * Retries once with a force-refreshed token on 401/403. This covers two
 * recurring cases:
 *   - Emulator restarts in dev — the cached token was signed by a previous
 *     emulator instance and Admin SDK verifyIdToken() rejects it (401).
 *   - Newly-granted custom claims (e.g. `roles: [...,"ambassador"]` set
 *     server-side during acceptance) aren't yet in the cached token, so the
 *     role gate on the server returns 403. Forcing a refresh exchanges the
 *     refresh token for one carrying the new claims.
 * The retry is safe: server handlers short-circuit on 401/403 before any
 * mutation commits, and getIdToken(true) is idempotent.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const auth = getAuth(getApp());

  const run = async (forceRefresh: boolean): Promise<Response> => {
    const user = auth.currentUser;
    const headers = new Headers(options.headers);
    if (user) {
      const token = await user.getIdToken(forceRefresh);
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(url, { ...options, headers });
  };

  const res = await run(false);
  if ((res.status === 401 || res.status === 403) && auth.currentUser) {
    return run(true);
  }
  return res;
}
