/**
 * Centralized types for the Mentorship feature
 * Import from '@/types/mentorship' instead of defining locally
 */

export type MentorshipRole = "mentor" | "mentee" | null;

/**
 * Full mentorship profile stored in Firestore
 * Used in context, API routes, and components
 */
export interface MentorshipProfile {
  uid: string;
  username?: string; // Public username for profile URLs
  role: MentorshipRole;
  displayName: string;
  email: string;
  photoURL: string;
  discordUsername?: string; // Discord username for bot interactions
  discordUsernameValidated?: boolean; // Whether Discord username exists on server
  createdAt: Date;
  updatedAt: Date;
  // Approval status
  status?: "pending" | "accepted" | "declined" | "disabled";
  // Mentor-specific
  expertise?: string[];
  currentRole?: string;
  bio?: string;
  resumeURL?: string;
  cvUrl?: string; // CV/Resume link for scrutiny
  majorProjects?: string; // Description of major projects and role
  availability?: Record<string, string[]>;
  maxMentees?: number;
  isPublic?: boolean;
  mentor_announcement?: string; // URL for the mentor announcement image
  // Mentee-specific
  education?: string;
  skillsSought?: string[];
  careerGoals?: string;
  mentorshipGoals?: string; // What the mentee is looking for in a mentorship
  learningStyle?: "self-study" | "guided" | "mixed";
}

/**
 * Public mentor data returned from API
 * Subset of MentorshipProfile with computed stats
 */
export interface PublicMentor {
  uid: string;
  username?: string;
  displayName: string;
  photoURL?: string;
  currentRole?: string;
  expertise?: string[];
  bio?: string;
  activeMenteeCount: number;
  completedMentorships: number;
  maxMentees: number;
  avgRating?: number;
  ratingCount?: number;
  availability?: Record<string, string[]>;
  isAtCapacity?: boolean;
}

/**
 * Detailed mentor profile for the public profile page
 * Extends PublicMentor with additional details
 */
export interface MentorProfileDetails extends PublicMentor {
  majorProjects?: string;
  createdAt: string | null;
  status?: string;
}

/**
 * Mentorship match/session between mentor and mentee
 */
export interface MentorshipMatch {
  id: string;
  mentorId: string;
  menteeId: string;
  status: "pending" | "active" | "declined" | "completed" | "cancelled";
  requestedAt: Date;
  approvedAt?: Date;
  lastContactAt?: Date;
  matchScore?: number;
  discordChannelId?: string;
  discordChannelUrl?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  announcementImageUrl?: string; // Firebase Storage URL for the announcement image
}

/**
 * Match with partner profile details attached
 */
export interface MatchWithProfile extends MentorshipMatch {
  partnerProfile?: Partial<MentorshipProfile>;
}

/**
 * Request status for mentor-mentee matching
 */
export type RequestStatus =
  | "none"
  | "pending"
  | "declined"
  | "active"
  | "completed";
