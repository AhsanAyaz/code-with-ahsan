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
    // Consume referral cookie on first sign-up (board decision GH#267).
    // Fire-and-forget — referral attribution must never block login.
    if (result.additionalUserInfo?.isNewUser) {
      result.user
        .getIdToken()
        .then((token) =>
          fetch("/api/user/referral", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }).catch((err) => console.warn("[AuthService] referral attribution failed:", err))
        )
        .catch((err) => console.warn("[AuthService] getIdToken failed:", err));
    }
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
