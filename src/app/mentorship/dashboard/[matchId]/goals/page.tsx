"use client";

import GoalTracker from "@/components/mentorship/GoalTracker";
import { useDashboard } from "../DashboardContext";

export default function GoalsPage() {
  const { matchId, currentUserId, isMentor } = useDashboard();

  return (
    <GoalTracker
      matchId={matchId}
      currentUserId={currentUserId}
      isMentor={isMentor}
    />
  );
}
