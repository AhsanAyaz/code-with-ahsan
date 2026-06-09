import { ANONYMOUS_CHALLENGE_PARTICIPANT } from "@/lib/challenges";
import { auth, db } from "@/lib/firebaseAdmin";

export interface ChallengeParticipantProfile {
  userName: string;
  userAvatar?: string;
  // Captured for certificate sharing. discordUsername lives on
  // mentorship_profiles, so it is only present for users in that program.
  email?: string;
  discordUsername?: string;
}

export async function getChallengeParticipantProfile(
  userId: string,
): Promise<ChallengeParticipantProfile> {
  const userDoc = await db.collection("users").doc(userId).get();
  let userName = ANONYMOUS_CHALLENGE_PARTICIPANT;
  let userAvatar: string | undefined;
  let email: string | undefined;
  let discordUsername: string | undefined;

  if (userDoc.exists) {
    const userData = userDoc.data();
    userName =
      userData?.displayName ||
      userData?.username ||
      ANONYMOUS_CHALLENGE_PARTICIPANT;
    userAvatar = userData?.photoURL;
    email = userData?.email;
    discordUsername = userData?.discordUsername;
  }

  // Always consult mentorship_profiles to fill gaps — discordUsername only
  // exists there.
  if (
    userName === ANONYMOUS_CHALLENGE_PARTICIPANT ||
    !userAvatar ||
    !email ||
    !discordUsername
  ) {
    const mentorDoc = await db
      .collection("mentorship_profiles")
      .doc(userId)
      .get();

    if (mentorDoc.exists) {
      const mentorData = mentorDoc.data();
      if (userName === ANONYMOUS_CHALLENGE_PARTICIPANT) {
        userName =
          mentorData?.displayName ||
          mentorData?.username ||
          ANONYMOUS_CHALLENGE_PARTICIPANT;
      }
      userAvatar = userAvatar || mentorData?.photoURL;
      email = email || mentorData?.email;
      discordUsername = discordUsername || mentorData?.discordUsername;
    }
  }

  if (userName === ANONYMOUS_CHALLENGE_PARTICIPANT || !userAvatar || !email) {
    const firebaseUser = await auth.getUser(userId);
    userName =
      userName === ANONYMOUS_CHALLENGE_PARTICIPANT
        ? firebaseUser.displayName || firebaseUser.email || userName
        : userName;
    userAvatar = userAvatar || firebaseUser.photoURL || undefined;
    email = email || firebaseUser.email || undefined;
  }

  return { userName, userAvatar, email, discordUsername };
}
