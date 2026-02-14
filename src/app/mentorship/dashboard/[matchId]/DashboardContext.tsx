"use client";

import { createContext, useContext } from "react";
import type { MentorshipProfile } from "@/contexts/MentorshipContext";

interface MatchDetails {
  id: string;
  mentorId: string;
  menteeId: string;
  status: string;
  approvedAt: string;
  discordChannelUrl?: string;
  announcementImageUrl?: string;
  partner: MentorshipProfile;
}

interface DashboardContextValue {
  matchId: string;
  matchDetails: MatchDetails;
  currentUserId: string;
  isMentor: boolean;
}

export type { MatchDetails };

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardContext.Provider");
  return ctx;
}
