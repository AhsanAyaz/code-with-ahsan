import { getApp } from 'firebase/app'
import {
  getAuth,
  GithubAuthProvider,
  ProviderId,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'

export async function logIn(providerId) {
  if (!providerId) {
    throw new Error('ProviderId needed')
  }
  const auth = getAuth(getApp())
  let provider
  if (providerId === ProviderId.GITHUB) {
    provider = new GithubAuthProvider()
  } else {
    provider = new GoogleAuthProvider()
  }
  try {
    const result = await signInWithPopup(auth, provider)
    // This gives you a GitHub Access Token. You can use it to access the GitHub API.
    const credential = GithubAuthProvider.credentialFromResult(result)
    const token = credential.accessToken

    // The signed-in user info.
    return result.user
  } catch (error) {
    console.log({ error })
    return null
  }
}

export const getCurrentUser = async () => {
  const auth = getAuth(getApp())
  return auth.currentUser
}
