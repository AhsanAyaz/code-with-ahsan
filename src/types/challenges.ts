/** Defines the difficulty level of a challenge */
export type ChallengeDifficulty = "beginner" | "intermediate" | "advanced";

/** Defines the current status of a challenge lifecycle */
export type ChallengeStatus = "upcoming" | "active" | "past";

/**
 * Represents an external resource (e.g. documentation, tutorial video)
 * provided to help users complete a challenge.
 */
export interface ChallengeResource {
  title: string;
  url: string;
}

/**
 * Core model representing a monthly or periodic coding challenge.
 * Contains metadata, requirements, and timeline information.
 */
export interface Challenge {
  id: string;
  title: string;
  description: string;
  topic: string;
  difficulty: ChallengeDifficulty;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  status: ChallengeStatus;
  brief: string; // Markdown content or long text
  deliverables: string[];
  resources: ChallengeResource[];
  createdAt: string;
  updatedAt: string;
}

/** Defines the approval status of a user's submission */
export type SubmissionStatus = "pending" | "approved" | "rejected";

/**
 * Represents a user's completed project submitted for a specific challenge.
 * Tracks the repository, live demo, and awarded score.
 */
export interface Submission {
  id: string;
  challengeId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  repoUrl: string;
  demoUrl?: string;
  linkedinUrl: string;
  description: string;
  submittedAt: string; // ISO date string
  status: SubmissionStatus;
  score: number; // Flat score, e.g., 10 points
}

/**
 * Represents an aggregated entry on the global challenge leaderboard.
 * Tracks a user's total accumulated points across all submissions.
 */
export interface LeaderboardEntry {
  userId: string;
  username: string;
  userAvatar?: string;
  totalPoints: number;
  challengesCompleted: number;
}

/**
 * Represents a user's intent to participate in a specific challenge.
 * Used for tracking enrollment counts before submissions are made.
 */
export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  joinedAt: string;
  // Captured at join for later certificate sharing. Admin-only — never exposed
  // on public participant listings.
  email?: string;
  discordUsername?: string;
}

/**
 * Public-safe view of a participant for the challenge detail page.
 * Omits contact info (email/discord) and adds submission status.
 */
export interface ChallengeParticipantStatus {
  userId: string;
  userName: string;
  userAvatar?: string;
  joinedAt: string;
  submitted: boolean;
  submittedAt?: string;
}
