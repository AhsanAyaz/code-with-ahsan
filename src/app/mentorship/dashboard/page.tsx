"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/contexts/AuthContext";
import { useMentorship } from "@/contexts/MentorshipContext";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";
import type { MentorshipProfile, MatchWithProfile } from "@/types/mentorship";
import DiscordValidationBanner from "@/components/mentorship/DiscordValidationBanner";

// Widgets
import StatsWidget from "@/components/mentorship/dashboard/StatsWidget";
import ActionRequiredWidget from "@/components/mentorship/dashboard/ActionRequiredWidget";
import ActiveMatchesWidget from "@/components/mentorship/dashboard/ActiveMatchesWidget";
import QuickLinksWidget from "@/components/mentorship/dashboard/QuickLinksWidget";
import GuidelinesWidget from "@/components/mentorship/dashboard/GuidelinesWidget";

interface DashboardStats {
  activeMatches: number;
  completedMentorships: number;
  myRoadmaps?: number;
  totalRoadmaps?: number;
}

// DEV_MODE: Set to true to bypass authentication for testing form layouts
const DEV_MODE = false;

export default function MentorshipDashboardPage() {
  const router = useRouter();
  const { setShowLoginPopup } = useContext(AuthContext);
  const toast = useToast();
  const {
    user,
    profile,
    loading,
    profileLoading,
    pendingRequests,
    matches,
    refreshMatches,
  } = useMentorship();

  const [stats, setStats] = useState<DashboardStats>({
    activeMatches: 0,
    completedMentorships: 0,
    myRoadmaps: 0,
    totalRoadmaps: 0,
  });

  useEffect(() => {
    // Skip auth redirect in DEV_MODE
    if (!DEV_MODE && !loading && !profileLoading && !user) {
      // User not logged in - show login popup
      setShowLoginPopup(true);
    }
  }, [loading, profileLoading, user, setShowLoginPopup]);

  // Only redirect to onboarding if user is logged in AND profile fetch completed with no profile
  useEffect(() => {
    // Skip redirect in DEV_MODE
    if (!DEV_MODE && !loading && !profileLoading && user && profile === null) {
      // User logged in but confirmed no profile exists - redirect to onboarding
      router.push("/mentorship/onboarding");
    }
  }, [loading, profileLoading, user, profile, router]);

  // Fetch dashboard stats (active and completed mentorships, roadmaps)
  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        // Fetch mentorship matches
        const matchesResponse = await fetch(
          `/api/mentorship/my-matches?uid=${user.uid}&role=${profile?.role}`,
        );
        if (matchesResponse.ok) {
          const data = await matchesResponse.json();
          const activeMatches = (data.activeMatches || []).length;
          const completedMentorships = (data.completedMatches || []).length;

          // Fetch roadmaps stats
          let myRoadmaps = 0;
          let totalRoadmaps = 0;

          try {
            // Get total approved roadmaps
            const totalResponse = await fetch(`/api/roadmaps?status=approved`);
            if (totalResponse.ok) {
              const { roadmaps } = await totalResponse.json();
              totalRoadmaps = roadmaps.length;
            }

            // Get user's roadmaps (if mentor)
            if (profile?.role === "mentor") {
              const myResponse = await fetch(
                `/api/roadmaps?creatorId=${user.uid}`,
              );
              if (myResponse.ok) {
                const { roadmaps } = await myResponse.json();
                myRoadmaps = roadmaps.length;
              }
            }
          } catch (error) {
            console.error("Error fetching roadmap stats:", error);
          }

          setStats({
            activeMatches,
            completedMentorships,
            myRoadmaps,
            totalRoadmaps,
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    if (user && profile) {
      fetchStats();
    }
  }, [user, profile]);

  const handleAction = async (
    type: "request" | "invitation",
    id: string,
    action: "approve" | "decline" | "accept",
  ) => {
    if (type === "request") {
      try {
        const response = await fetch("/api/mentorship/match", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId: id,
            action,
            mentorId: user?.uid,
          }),
        });

        if (response.ok) {
          toast.success(`Request ${action}d successfully`);
          await refreshMatches();
        } else {
          const error = await response.json();
          toast.error("Failed: " + error.error);
        }
      } catch (error) {
        console.error("Error processing request:", error);
        toast.error("An error occurred. Please try again.");
      }
    } else {
      // TODO: Implement invitation acceptance/decline
      toast.info("Invitation actions not yet implemented in dashboard");
    }
  };

  if (!DEV_MODE && (loading || profileLoading)) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!DEV_MODE && !user) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <h2 className="card-title justify-center text-2xl">
            Welcome to the Mentorship Program
          </h2>
          <p className="text-base-content/70 mt-2">
            Please sign in with your Google account to access your dashboard.
          </p>
          <div className="card-actions justify-center mt-6">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setShowLoginPopup(true)}
            >
              Sign In to Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile || !user) {
    return null;
  }

  if (profile.status === "disabled") {
    return (
      <div className="space-y-6">
        <div className="card bg-error/10 border-2 border-error shadow-xl">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="card-title justify-center text-2xl text-error">
              Account Disabled
            </h2>
            <p className="text-base-content/70 mt-2 max-w-lg mx-auto">
              Your mentorship profile has been disabled.
            </p>
            <div className="card-actions justify-center mt-4">
              <Link href="/mentorship" className="btn btn-ghost">
                ← Back to Mentorship Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active matches for widget (need partner profile)
  // The `matches` from context are `MentorshipMatch`.
  // We need `MatchWithProfile`.
  // `useMentorship` hook's `matches` type is `MentorshipMatch[]` but in `my-matches` page it fetches enriched data.
  // The context `matches` might NOT have `partnerProfile`.
  // Let's check `MentorshipContext`. It fetches from `/api/mentorship/match`.
  // `/api/mentorship/match` usually returns enriched data.
  // We can cast it or use `any` safely if we know it's there, or fetch again if needed.
  // For now, let's assume `matches` from context has what we need or minimal data.
  // Actually, `activeMatches` in `stats` effect fetches from `/api/mentorship/my-matches` which DEFINITELY returns enriched data.
  // But `activeMatches` state in `useEffect` is local to the effect and only used for counting.
  // I should expose that data or fetch it for the widget.
  // I'll create a state for `activeMatchesWithProfile`.

  return (
    <DashboardContent
      user={user}
      profile={profile}
      stats={stats}
      pendingRequests={pendingRequests}
      // Matches from context might lack profile data, but let's try passing them.
      // If `ActiveMatchesWidget` fails to show avatars, we know why.
      // Better: Fetch enriched matches here like in `useEffect` and store them.
    />
  );
}

// Sub-component to separate logic and avoid state complexity in main
function DashboardContent({
  user,
  profile,
  stats,
  pendingRequests,
}: {
  user: any;
  profile: MentorshipProfile;
  stats: DashboardStats;
  pendingRequests: any[];
}) {
  const [activeMatches, setActiveMatches] = useState<MatchWithProfile[]>([]);
  const { refreshMatches } = useMentorship();
  const toast = useToast();

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await fetch(
          `/api/mentorship/my-matches?uid=${user.uid}&role=${profile.role}`,
        );
        if (response.ok) {
          const data = await response.json();
          setActiveMatches(data.activeMatches || []);
        }
      } catch (error) {
        console.error("Error fetching matches:", error);
      }
    };
    fetchMatches();
  }, [user.uid, profile.role]);

  const handleAction = async (
    type: "request" | "invitation",
    id: string,
    action: "approve" | "decline" | "accept",
  ) => {
    if (type === "request") {
      try {
        const response = await fetch("/api/mentorship/match", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId: id,
            action,
            mentorId: user.uid,
          }),
        });

        if (response.ok) {
          toast.success(`Request ${action}d successfully`);
          // Refresh both global context and local matches
          await refreshMatches();
          // Re-fetch local matches
          const matchesRes = await fetch(
            `/api/mentorship/my-matches?uid=${user.uid}&role=${profile.role}`,
          );
          if (matchesRes.ok) {
            const data = await matchesRes.json();
            setActiveMatches(data.activeMatches || []);
          }
        } else {
          const error = await response.json();
          toast.error("Failed: " + error.error);
        }
      } catch (error) {
        console.error("Error processing request:", error);
        toast.error("An error occurred. Please try again.");
      }
    } else {
      toast.info("Invitation actions not yet implemented");
    }
  };

  return (
    <div className="space-y-6">
      <DiscordValidationBanner
        discordUsernameValidated={profile.discordUsernameValidated}
      />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user.displayName?.split(" ")[0] || "Friend"}!
          </h1>
          <p className="text-base-content/70">
            {profile.role === "mentor"
              ? "Ready to inspire the next generation?"
              : "Your journey to mastery continues."}
          </p>
        </div>
        <div className="badge badge-primary badge-lg capitalize">
          {profile.role}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="md:col-span-2 space-y-6">
          {/* Action Required - Top Priority */}
          <ActionRequiredWidget
            requests={pendingRequests}
            invitations={[]} // TODO: Fetch invitations
            role={profile.role!}
            onAction={handleAction}
          />

          {/* Active Mentorships */}
          <ActiveMatchesWidget
            matches={activeMatches}
            role={profile.role!}
          />
          
          {/* Guidelines Accordion */}
           <GuidelinesWidget role={profile.role!} />
        </div>

        {/* Right Column (1/3 width) - Stats & Quick Links */}
        <div className="space-y-6">
          <StatsWidget stats={stats} role={profile.role!} />
          <QuickLinksWidget profile={profile} user={user} stats={stats} />
        </div>
      </div>
    </div>
  );
}
