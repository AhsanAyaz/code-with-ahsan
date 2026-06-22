import { db } from "@/lib/firebaseAdmin";
import {
  Challenge,
  ChallengeStatus,
  ChallengeParticipant,
  ChallengeParticipantStatus,
  LeaderboardEntry,
  Submission,
} from "@/types/challenges";
import { FieldValue } from "firebase-admin/firestore";
import {
  ANONYMOUS_CHALLENGE_PARTICIPANT,
  buildLeaderboardFromSubmissions,
  CHALLENGE_SUBMISSION_SCORE,
} from "@/lib/challenges";

const CHALLENGES_COLLECTION = "challenges";
const SUBMISSIONS_COLLECTION = "submissions";
const LEADERBOARD_COLLECTION = "leaderboard";
const CHALLENGE_PARTICIPANTS_COLLECTION = "challenge_participants";

type FirestoreDateValue =
  | string
  | Date
  | { toDate: () => Date }
  | null
  | undefined;

/**
 * Error thrown when a user attempts to submit multiple projects
 * for the same challenge.
 */
export class DuplicateSubmissionError extends Error {
  constructor() {
    super("You have already submitted a project for this challenge");
    this.name = "DuplicateSubmissionError";
  }
}

/**
 * Error thrown when a user attempts to submit a project without
 * first joining the challenge.
 */
export class NotJoinedChallengeError extends Error {
  constructor() {
    super("You must join the challenge before submitting a project.");
    this.name = "NotJoinedChallengeError";
  }
}

function toIsoString(value: FirestoreDateValue): string {
  if (!value) return new Date(0).toISOString();
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return value.toDate().toISOString();
}

function normalizeChallenge(
  doc: FirebaseFirestore.DocumentSnapshot,
): Challenge {
  const data = doc.data() as Partial<Challenge>;

  return {
    id: doc.id,
    title: data.title || "",
    description: data.description || "",
    topic: data.topic || "General",
    difficulty: data.difficulty || "intermediate",
    startDate: toIsoString(data.startDate as FirestoreDateValue),
    endDate: toIsoString(data.endDate as FirestoreDateValue),
    status: data.status || "upcoming",
    brief: data.brief || "",
    deliverables: Array.isArray(data.deliverables) ? data.deliverables : [],
    resources: Array.isArray(data.resources) ? data.resources : [],
    createdAt: toIsoString(data.createdAt as FirestoreDateValue),
    updatedAt: toIsoString(data.updatedAt as FirestoreDateValue),
  };
}

function normalizeSubmission(
  doc: FirebaseFirestore.DocumentSnapshot,
): Submission {
  const data = doc.data() as Partial<Submission>;

  return {
    id: doc.id,
    challengeId: data.challengeId || "",
    userId: data.userId || "",
    userName: data.userName || ANONYMOUS_CHALLENGE_PARTICIPANT,
    userAvatar: data.userAvatar,
    repoUrl: data.repoUrl || "",
    demoUrl: data.demoUrl,
    linkedinUrl: data.linkedinUrl || "",
    description: data.description || "",
    submittedAt: toIsoString(data.submittedAt as FirestoreDateValue),
    status: data.status || "approved",
    score: data.score || CHALLENGE_SUBMISSION_SCORE,
  };
}

function normalizeParticipant(
  doc: FirebaseFirestore.DocumentSnapshot,
): ChallengeParticipant {
  const data = doc.data() as Partial<ChallengeParticipant>;

  return {
    id: doc.id,
    challengeId: data.challengeId || "",
    userId: data.userId || "",
    userName: data.userName || ANONYMOUS_CHALLENGE_PARTICIPANT,
    userAvatar: data.userAvatar,
    joinedAt: toIsoString(data.joinedAt as FirestoreDateValue),
    email: data.email,
    discordUsername: data.discordUsername,
  };
}

/**
 * Records a user's participation in a specific challenge.
 * This is a required step before they can submit a project.
 * 
 * @param participantData The user and challenge IDs.
 * @returns The new participant record.
 */
export async function joinChallenge(
  participantData: Omit<ChallengeParticipant, "id" | "joinedAt">,
): Promise<ChallengeParticipant> {
  const docId = `${participantData.challengeId}_${participantData.userId}`;
  const docRef = db.collection(CHALLENGE_PARTICIPANTS_COLLECTION).doc(docId);
  const participant: ChallengeParticipant = {
    ...participantData,
    id: docRef.id,
    joinedAt: new Date().toISOString(),
  };

  const participantToWrite: Partial<ChallengeParticipant> = { ...participant };
  // Firestore Admin SDK rejects undefined values — strip optional fields when absent.
  if (participantToWrite.userAvatar === undefined) {
    delete participantToWrite.userAvatar;
  }
  if (participantToWrite.email === undefined) {
    delete participantToWrite.email;
  }
  if (participantToWrite.discordUsername === undefined) {
    delete participantToWrite.discordUsername;
  }

  await db.runTransaction(async (transaction) => {
    const existingDoc = await transaction.get(docRef);
    if (existingDoc.exists) {
      return;
    }

    transaction.set(docRef, participantToWrite as ChallengeParticipant);
  });

  const doc = await docRef.get();
  return normalizeParticipant(doc);
}

/**
 * Gets the total number of users who have joined a specific challenge.
 * 
 * @param challengeId The ID of the challenge.
 * @returns The count of participants.
 */
export async function getChallengeParticipantsCount(
  challengeId: string,
): Promise<number> {
  const snapshot = await db
    .collection(CHALLENGE_PARTICIPANTS_COLLECTION)
    .where("challengeId", "==", challengeId)
    .get();

  return snapshot.size;
}

/**
 * Checks if a specific user has joined a specific challenge.
 * 
 * @param challengeId The ID of the challenge.
 * @param userId The ID of the user.
 * @returns True if the user has joined, false otherwise.
 */
export async function isChallengeParticipant(
  challengeId: string,
  userId: string,
): Promise<boolean> {
  const docRef = db
    .collection(CHALLENGE_PARTICIPANTS_COLLECTION)
    .doc(`${challengeId}_${userId}`);

  const doc = await docRef.get();
  return doc.exists;
}

/**
 * Lists all participants of a challenge alongside whether they have submitted a
 * project. Returns a public-safe shape (no email/discord). Submitted participants
 * are listed first, then by join time.
 *
 * @param challengeId The ID of the challenge.
 * @returns Participants with their submission status.
 */
export async function getChallengeParticipantsWithStatus(
  challengeId: string,
): Promise<ChallengeParticipantStatus[]> {
  const [participantsSnap, submissions] = await Promise.all([
    db
      .collection(CHALLENGE_PARTICIPANTS_COLLECTION)
      .where("challengeId", "==", challengeId)
      .get(),
    getSubmissionsForChallenge(challengeId),
  ]);

  const submissionByUser = new Map(submissions.map((s) => [s.userId, s]));

  const participants = participantsSnap.docs.map((doc) => {
    const participant = normalizeParticipant(doc);
    const submission = submissionByUser.get(participant.userId);
    return {
      userId: participant.userId,
      userName: participant.userName,
      userAvatar: participant.userAvatar,
      joinedAt: participant.joinedAt,
      submitted: Boolean(submission),
      submittedAt: submission?.submittedAt,
    };
  });

  return participants.sort((a, b) => {
    if (a.submitted !== b.submitted) return a.submitted ? -1 : 1;
    return a.joinedAt.localeCompare(b.joinedAt);
  });
}

function monthRange(yearMonth?: string) {
  const current = yearMonth
    ? new Date(`${yearMonth}-01T00:00:00.000Z`)
    : new Date();
  const start = new Date(
    Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1),
  );

  return {
    month: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

// --- Challenges ---

/**
 * Creates a new Challenge in Firestore.
 * 
 * @param challengeData The data for the new challenge.
 * @returns The created Challenge object including its generated ID.
 */
export async function createChallenge(
  challengeData: Omit<Challenge, "id" | "createdAt" | "updatedAt">,
): Promise<Challenge> {
  const docRef = db.collection(CHALLENGES_COLLECTION).doc();
  const now = new Date().toISOString();

  const challenge: Challenge = {
    ...challengeData,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(challenge);
  return challenge;
}

/**
 * Updates an existing Challenge in Firestore.
 * 
 * @param id The ID of the challenge to update.
 * @param updates Partial challenge data to apply.
 */
export async function updateChallenge(
  id: string,
  updates: Partial<Challenge>,
): Promise<void> {
  const docRef = db.collection(CHALLENGES_COLLECTION).doc(id);
  await docRef.update({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Deletes a Challenge from Firestore.
 * 
 * @param id The ID of the challenge to delete.
 */
export async function deleteChallenge(id: string): Promise<void> {
  const docRef = db.collection(CHALLENGES_COLLECTION).doc(id);
  await docRef.delete();
}

/**
 * Retrieves a single Challenge by its ID.
 * 
 * @param id The ID of the challenge.
 * @returns The Challenge object or null if not found.
 */
export async function getChallenge(id: string): Promise<Challenge | null> {
  const docRef = db.collection(CHALLENGES_COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  return normalizeChallenge(doc);
}

/**
 * Retrieves a list of Challenges, optionally filtered by status.
 * Results are ordered by start date descending.
 * 
 * @param status Optional status to filter by (e.g. "active").
 * @returns An array of Challenges.
 */
export async function getChallenges(
  status?: ChallengeStatus,
): Promise<Challenge[]> {
  let query: FirebaseFirestore.Query = db.collection(CHALLENGES_COLLECTION);

  if (status) {
    query = query.where("status", "==", status);
  }

  query = query.orderBy("startDate", "desc");

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => normalizeChallenge(doc));
}

// --- Submissions ---

/**
 * Creates a new project Submission for a specific challenge.
 * Runs in a Firestore transaction to ensure atomic updates:
 * 1. Verifies the user has joined the challenge.
 * 2. Prevents duplicate submissions.
 * 3. Creates the submission record.
 * 4. Updates or creates the user's global leaderboard entry.
 * 
 * @param submissionData The data for the new submission.
 * @returns The created Submission object.
 */
export async function createSubmission(
  submissionData: Omit<Submission, "id" | "submittedAt" | "status" | "score">,
): Promise<Submission> {
  const docId = `${submissionData.challengeId}_${submissionData.userId}`;
  const docRef = db.collection(SUBMISSIONS_COLLECTION).doc(docId);
  const leaderboardRef = db
    .collection(LEADERBOARD_COLLECTION)
    .doc(submissionData.userId);

  const submission: Submission = {
    ...submissionData,
    id: docRef.id,
    submittedAt: new Date().toISOString(),
    status: "approved",
    score: CHALLENGE_SUBMISSION_SCORE,
  };

  const submissionToWrite: Partial<Submission> = { ...submission };
  if (submissionToWrite.userAvatar === undefined) {
    delete submissionToWrite.userAvatar;
  }
  if (submissionToWrite.demoUrl === undefined) {
    delete submissionToWrite.demoUrl;
  }

  const participantRef = db
    .collection(CHALLENGE_PARTICIPANTS_COLLECTION)
    .doc(`${submissionData.challengeId}_${submissionData.userId}`);

  await db.runTransaction(async (transaction) => {
    const [submissionDoc, leaderboardDoc, participantDoc] = await Promise.all([
      transaction.get(docRef),
      transaction.get(leaderboardRef),
      transaction.get(participantRef),
    ]);

    if (!participantDoc.exists) {
      throw new NotJoinedChallengeError();
    }

    if (submissionDoc.exists) {
      throw new DuplicateSubmissionError();
    }

    transaction.set(docRef, submissionToWrite as Submission);

    if (!leaderboardDoc.exists) {
      const newEntry: LeaderboardEntry = {
        userId: submission.userId,
        username: submission.userName,
        ...(submission.userAvatar !== undefined ? { userAvatar: submission.userAvatar } : {}),
        totalPoints: CHALLENGE_SUBMISSION_SCORE,
        challengesCompleted: 1,
      };
      transaction.set(leaderboardRef, newEntry);
    } else {
      transaction.update(leaderboardRef, {
        totalPoints: FieldValue.increment(CHALLENGE_SUBMISSION_SCORE),
        challengesCompleted: FieldValue.increment(1),
        username: submission.userName,
        ...(submission.userAvatar !== undefined ? { userAvatar: submission.userAvatar } : { userAvatar: FieldValue.delete() }),
      });
    }
  });

  return submission;
}

/**
 * Retrieves all approved submissions for a specific challenge.
 * Results are ordered by submission date descending.
 * 
 * @param challengeId The ID of the challenge.
 * @returns An array of Submissions.
 */
export async function getSubmissionsForChallenge(
  challengeId: string,
): Promise<Submission[]> {
  const query = db
    .collection(SUBMISSIONS_COLLECTION)
    .where("challengeId", "==", challengeId)
    .where("status", "==", "approved")
    .orderBy("submittedAt", "desc");

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => normalizeSubmission(doc));
}

/**
 * Generates a mini-leaderboard specific to a single challenge.
 * 
 * @param challengeId The ID of the challenge.
 * @param limit The maximum number of entries to return.
 * @returns An array of LeaderboardEntries.
 */
export async function getLeaderboardForChallenge(
  challengeId: string,
  limit: number = 10,
): Promise<LeaderboardEntry[]> {
  const submissions = await getSubmissionsForChallenge(challengeId);
  return buildLeaderboardFromSubmissions(submissions, limit);
}

// --- Leaderboard ---

/**
 * Manually updates a user's global leaderboard entry.
 * Primarily used via transaction within `createSubmission`, but exposed
 * here for potential admin adjustments or other point-awarding systems.
 * 
 * @param userId The ID of the user.
 * @param username The display name of the user.
 * @param userAvatar The avatar URL of the user.
 * @param pointsToAdd The number of points to add to their total.
 */
export async function updateLeaderboardEntry(
  userId: string,
  username: string,
  userAvatar: string | undefined,
  pointsToAdd: number,
): Promise<void> {
  const docRef = db.collection(LEADERBOARD_COLLECTION).doc(userId);

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);

    if (!doc.exists) {
      const newEntry: LeaderboardEntry = {
        userId,
        username,
        ...(userAvatar !== undefined ? { userAvatar } : {}),
        totalPoints: pointsToAdd,
        challengesCompleted: 1,
      };
      transaction.set(docRef, newEntry);
    } else {
      transaction.update(docRef, {
        totalPoints: FieldValue.increment(pointsToAdd),
        challengesCompleted: FieldValue.increment(1),
        username,
        ...(userAvatar !== undefined ? { userAvatar } : { userAvatar: FieldValue.delete() }),
      });
    }
  });
}

/**
 * Retrieves the global all-time leaderboard.
 * Results are ordered by total points descending.
 * 
 * @param limit The maximum number of entries to return (default 50).
 * @returns An array of LeaderboardEntries.
 */
export async function getLeaderboard(
  limit: number = 50,
): Promise<LeaderboardEntry[]> {
  const query = db
    .collection(LEADERBOARD_COLLECTION)
    .orderBy("totalPoints", "desc")
    .limit(limit);

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as LeaderboardEntry);
}

/**
 * Dynamically calculates a monthly leaderboard by aggregating all
 * submissions created within a specific month.
 * 
 * @param yearMonth Optional YYYY-MM string. Defaults to the current UTC month.
 * @param limit The maximum number of entries to return (default 50).
 * @returns An object containing the month string and the calculated leaderboard.
 */
export async function getMonthlyLeaderboard(
  yearMonth?: string,
  limit: number = 50,
): Promise<{ month: string; leaderboard: LeaderboardEntry[] }> {
  const { month, startIso, endIso } = monthRange(yearMonth);
  const snapshot = await db
    .collection(SUBMISSIONS_COLLECTION)
    .where("status", "==", "approved")
    .where("submittedAt", ">=", startIso)
    .where("submittedAt", "<", endIso)
    .get();

  const submissions = snapshot.docs.map((doc) => normalizeSubmission(doc));
  const leaderboard = buildLeaderboardFromSubmissions(submissions, limit);

  return { month, leaderboard };
}
