import { ANONYMOUS_CHALLENGE_PARTICIPANT } from "@/lib/challenges";
import { auth, db } from "@/lib/firebaseAdmin";

export interface ChallengeParticipantProfile {
  userName: string;
  userAvatar?: string;
}

export async function getChallengeParticipantProfile(
  userId: string,
): Promise<ChallengeParticipantProfile> {
  const userDoc = await db.collection("users").doc(userId).get();
  let userName = ANONYMOUS_CHALLENGE_PARTICIPANT;
  let userAvatar: string | undefined;

  if (userDoc.exists) {
    const userData = userDoc.data();
    userName =
      userData?.displayName ||
      userData?.username ||
      ANONYMOUS_CHALLENGE_PARTICIPANT;
    userAvatar = userData?.photoURL;
  } else {
    const mentorDoc = await db
      .collection("mentorship_profiles")
      .doc(userId)
      .get();

    if (mentorDoc.exists) {
      const mentorData = mentorDoc.data();
      userName =
        mentorData?.displayName ||
        mentorData?.username ||
        ANONYMOUS_CHALLENGE_PARTICIPANT;
      userAvatar = mentorData?.photoURL;
    }
  }

  if (userName === ANONYMOUS_CHALLENGE_PARTICIPANT || !userAvatar) {
    const firebaseUser = await auth.getUser(userId);
    userName =
      userName === ANONYMOUS_CHALLENGE_PARTICIPANT
        ? firebaseUser.displayName || firebaseUser.email || userName
        : userName;
    userAvatar = userAvatar || firebaseUser.photoURL || undefined;
  }

  return { userName, userAvatar };
}
