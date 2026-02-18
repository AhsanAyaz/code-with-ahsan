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
  // Skill level for project matching (defaults to "beginner")
  skillLevel?: "beginner" | "intermediate" | "advanced";
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
  hasTimeSlots?: boolean;
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
  inactivityWarningAt?: Date;
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

// ─── v2.0 Project Collaboration Types ───────────────────────

export type ProjectStatus = "pending" | "approved" | "active" | "completed" | "archived" | "declined";
export type RoadmapStatus = "draft" | "pending" | "approved" | "active" | "archived";
export type ProjectDifficulty = "beginner" | "intermediate" | "advanced";
export type ProjectMemberRole = "owner" | "member";

export interface Project {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorProfile?: {
    displayName: string;
    photoURL: string;
    username?: string;
    discordUsername?: string;
  };
  status: ProjectStatus;
  githubRepo?: string;
  techStack: string[];
  difficulty: ProjectDifficulty;
  maxTeamSize: number;
  memberCount?: number;
  pendingApplicationCount?: number;
  discordChannelId?: string;
  discordChannelUrl?: string;
  templateId?: ProjectTemplateId;  // Which template was used (if any)
  lastActivityAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  // Demo fields (populated when project is completed)
  demoUrl?: string;           // URL to demo video/presentation (YouTube, Loom, Vimeo, Google Drive)
  demoDescription?: string;   // Description of what the demo shows
  completedAt?: Date;         // When project was completed
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  userProfile?: {
    displayName: string;
    photoURL: string;
    username?: string;
    discordUsername?: string;
  };
  role: ProjectMemberRole;
  joinedAt: Date;
}

export type ApplicationStatus = "pending" | "approved" | "declined";
export type InvitationStatus = "pending" | "accepted" | "declined";

export interface ProjectApplication {
  id: string; // composite: {projectId}_{userId}
  projectId: string;
  userId: string;
  userProfile?: {
    displayName: string;
    photoURL: string;
    username?: string;
    discordUsername?: string;
    skillLevel?: "beginner" | "intermediate" | "advanced";
  };
  message: string;
  status: ApplicationStatus;
  feedback?: string; // Feedback from creator on decline
  createdAt: Date;
  approvedAt?: Date;
  declinedAt?: Date;
}

export interface ProjectInvitation {
  id: string; // composite: {projectId}_{userId}
  projectId: string;
  userId: string;
  userProfile?: {
    displayName: string;
    photoURL: string;
    username?: string;
    discordUsername?: string;
  };
  invitedBy: string; // creator userId
  status: InvitationStatus;
  createdAt: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
}

export interface Roadmap {
  id: string;
  title: string;
  description?: string;
  creatorId: string;
  creatorProfile?: {
    displayName: string;
    photoURL: string;
    username?: string;
    discordUsername?: string;
  };
  domain: RoadmapDomain;
  difficulty: ProjectDifficulty;
  estimatedHours?: number;
  contentUrl?: string;
  content?: string;
  status: RoadmapStatus;
  version: number;
  hasPendingDraft?: boolean;
  draftVersionNumber?: number;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

export type RoadmapDomain =
  | "web-dev"
  | "frontend"
  | "backend"
  | "ml"
  | "ai"
  | "mcp"
  | "agents"
  | "prompt-engineering";

export interface RoadmapVersion {
  id: string;
  roadmapId: string;
  version: number;
  contentUrl: string;
  content?: string;
  status: "draft" | "approved" | "rejected";
  title?: string;
  description?: string;
  domain?: RoadmapDomain;
  difficulty?: ProjectDifficulty;
  estimatedHours?: number;
  createdBy: string;
  createdAt: Date;
  changeDescription?: string;
  feedback?: string;
  feedbackAt?: Date;
  feedbackBy?: string;
}

// ─── Project Templates ───────────────────────

export type ProjectTemplateId = "fullstack-app" | "ai-tool" | "open-source-library";

export interface ProjectTemplate {
  id: ProjectTemplateId;
  name: string;
  description: string;           // Template description shown in selector
  defaultTitle: string;           // Suggested title placeholder
  defaultDescription: string;     // Pre-filled description scaffold
  suggestedTechStack: string[];   // Pre-filled tech stack
  suggestedDifficulty: ProjectDifficulty;
  suggestedMaxTeamSize: number;
  suggestedTimeline: string;      // e.g., "4-6 weeks" - display only, informational
  recommendedSkills: string[];    // Display only, helps creators think about requirements
}

// --- Phase 12: Mentor Time Slots ---

export interface TimeRange {
  start: string; // "HH:mm" format e.g. "09:00"
  end: string;   // "HH:mm" format e.g. "12:00"
}

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface TimeSlotAvailability {
  /** Weekly recurring availability: day -> array of time ranges */
  weekly: Partial<Record<DayOfWeek, TimeRange[]>>;
  /** Mentor's timezone (IANA format, e.g. "America/New_York") */
  timezone: string;
  /** Slot duration in minutes (fixed at 30 for now) */
  slotDurationMinutes: number;
}

export interface UnavailableDate {
  date: string;    // "YYYY-MM-DD" format
  reason?: string; // Optional reason
}

export type BookingStatus = "confirmed" | "cancelled" | "pending_approval";

export interface MentorBooking {
  id: string;
  mentorId: string;
  menteeId: string;
  mentorProfile?: {
    displayName: string;
    photoURL: string;
    username?: string;
    discordUsername?: string;
  };
  menteeProfile?: {
    displayName: string;
    photoURL: string;
    username?: string;
    discordUsername?: string;
  };
  startTime: Date;   // UTC
  endTime: Date;     // UTC
  timezone: string;  // Mentor's timezone at time of booking
  status: BookingStatus;
  templateId?: string;            // Session template ID (e.g. "cv-review", "mock-interview")
  calendarEventId?: string;       // Google Calendar event ID
  calendarSyncStatus?: "pending" | "synced" | "failed" | "not_connected";
  cancelledBy?: string;           // uid of who cancelled
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A computed available slot for display/booking */
export interface AvailableSlot {
  start: Date;  // UTC
  end: Date;    // UTC
  /** Display time in mentor's timezone, e.g. "09:00 AM" */
  displayTime: string;
}
