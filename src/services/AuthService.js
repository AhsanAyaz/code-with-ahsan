import { getApp } from "firebase/app";
import {
  getAuth,
  GithubAuthProvider,
  ProviderId,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

export async function logIn(providerId) {
  if (!providerId) {
    throw new Error("ProviderId needed");
  }
  const auth = getAuth(getApp());
  let provider;
  if (providerId === ProviderId.GITHUB) {
    provider = new GithubAuthProvider();
  } else {
    provider = new GoogleAuthProvider();
  }
  try {
    const result = await signInWithPopup(auth, provider);
    // Attribute the cwa_ref referral cookie on sign-in (board decision GH#267 / VIS-135).
    // Fired on EVERY login, not just isNewUser, so it doubles as the backfill path:
    //   - new users are attributed at signup (their first login);
    //   - existing users who still hold a valid cwa_ref cookie get backfilled on
    //     their next login — no migration script needed.
    // Server-side consumeReferral is idempotent (self/double/unknown-code guards) and
    // the endpoint short-circuits with `no_cookie` when there's nothing to attribute.
    // Fire-and-forget — attribution must never block login.
    result.user
      .getIdToken()
      .then((token) =>
        fetch("/api/user/referral", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch((err) => console.warn("[AuthService] referral attribution failed:", err))
      )
      .catch((err) => console.warn("[AuthService] getIdToken failed:", err));
    return result.user;
  } catch (error) {
    console.error("Sign in error:", error);
    return null;
  }
}

export const getCurrentUser = async () => {
  const auth = getAuth(getApp());
  return auth.currentUser;
};
