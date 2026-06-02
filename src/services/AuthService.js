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
    // The signed-in user info.
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
