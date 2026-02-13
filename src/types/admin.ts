import { MentorshipProfile } from "@/contexts/MentorshipContext";

export interface AdminStats {
  totalMentors: number;
  totalMentees: number;
  totalMatches: number;
  activeMatches: number;
  pendingMatches: number;
  completedGoals: number;
  totalGoals: number;
  totalSessions: number;
  averageRating: number;
  lowRatingAlerts: number;
}

export interface Alert {
  id: string;
  type: string;
  sessionId: string;
  rating: number;
  feedback: string;
  createdAt: string;
  resolved: boolean;
}

export interface ProfileWithDetails extends MentorshipProfile {
  cvUrl?: string;
  majorProjects?: string;
  adminNotes?: string;
  acceptedAt?: string;
  disabledSessionsCount?: number;
  avgRating?: number;
  ratingCount?: number;
}

export interface Review {
  id: string;
  mentorId: string;
  menteeId: string;
  sessionId: string;
  rating: number;
  feedback?: string;
  createdAt: string;
  menteeName?: string;
  menteeEmail?: string;
  menteePhoto?: string;
}

export interface MentorshipWithPartner {
  id: string;
  status: string;
  discordChannelId?: string;
  discordChannelUrl?: string;
  approvedAt?: string;
  lastContactAt?: string;
  requestedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  partnerProfile?: MentorshipProfile;
}

export interface GroupedMentorship {
  profile: MentorshipProfile;
  mentorships: MentorshipWithPartner[];
}

export interface MentorshipSummary {
  totalMentors: number;
  totalMentees: number;
  activeMentorships: number;
  completedMentorships: number;
}
