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
import MyProjectsWidget from "@/components/mentorship/dashboard/MyProjectsWidget";
import MyRoadmapsWidget from "@/components/mentorship/dashboard/MyRoadmapsWidget";

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

  return (
    <DashboardContent
      user={user}
      profile={profile}
      stats={stats}
      pendingRequests={pendingRequests}
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
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [myRoadmaps, setMyRoadmaps] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(true);
  const { refreshMatches } = useMentorship();
  const toast = useToast();

  // Fetch enriched matches
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
      } finally {
        setLoadingMatches(false);
      }
    };
    fetchMatches();
  }, [user.uid, profile.role]);

  // Fetch Projects (Owned + Member)
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        // Fetch projects where I am the creator
        const ownedRes = await fetch(`/api/projects?creatorId=${user.uid}`);
        const ownedData = ownedRes.ok ? await ownedRes.json() : { projects: [] };

        // Fetch projects where I am a member
        const memberRes = await fetch(`/api/projects?member=${user.uid}`);
        const memberData = memberRes.ok ? await memberRes.json() : { projects: [] };

        // Merge and deduplicate by ID
        const allProjects = [...ownedData.projects, ...memberData.projects];
        const uniqueProjects = Array.from(
          new Map(allProjects.map((p) => [p.id, p])).values()
        );

        // Sort by last activity
        uniqueProjects.sort(
          (a: any, b: any) =>
            new Date(b.lastActivityAt || b.createdAt).getTime() -
            new Date(a.lastActivityAt || a.createdAt).getTime()
        );

        setMyProjects(uniqueProjects);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [user.uid]);

  // Fetch Roadmaps (Mentor only)
  useEffect(() => {
    if (profile.role !== "mentor") {
      setLoadingRoadmaps(false);
      return;
    }

    const fetchRoadmaps = async () => {
      try {
        setLoadingRoadmaps(true);
        const response = await fetch(`/api/roadmaps?creatorId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          setMyRoadmaps(data.roadmaps || []);
        }
      } catch (error) {
        console.error("Error fetching roadmaps:", error);
      } finally {
        setLoadingRoadmaps(false);
      }
    };
    fetchRoadmaps();
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
            loading={loadingMatches}
          />
          
          {/* My Projects */}
          <MyProjectsWidget 
            projects={myProjects} 
            userId={user.uid}
            loading={loadingProjects}
          />

          {/* My Roadmaps (Mentor Only) */}
          {profile.role === "mentor" && (
            <MyRoadmapsWidget roadmaps={myRoadmaps} loading={loadingRoadmaps} />
          )}

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
