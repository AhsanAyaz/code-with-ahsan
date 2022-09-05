import { getApp } from 'firebase/app'
import { getAuth, GithubAuthProvider, signInWithPopup } from 'firebase/auth'

export async function logIn() {
  const auth = getAuth(getApp())
  const provider = new GithubAuthProvider()
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
