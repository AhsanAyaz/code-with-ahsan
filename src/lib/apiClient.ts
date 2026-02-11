import { getAuth } from "firebase/auth";
import { getApp } from "firebase/app";

/**
 * Authenticated fetch wrapper. Automatically attaches Firebase ID token
 * as Bearer token in Authorization header for mutating requests.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const auth = getAuth(getApp());
  const user = auth.currentUser;

  const headers = new Headers(options.headers);

  if (user) {
    const token = await user.getIdToken();
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...options, headers });
}
