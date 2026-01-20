"use client";

import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { useMentorship } from "@/contexts/MentorshipContext";
import Link from "next/link";

interface Goal {
  id: string;
  matchId: string;
  title: string;
  status: string;
  targetDate: string;
}

interface MatchWithGoals {
  matchId: string;
  partnerName: string;
  goals: Goal[];
}

export default function GoalsPage() {
  const { setShowLoginPopup } = useContext(AuthContext);
  const { user, profile, loading, profileLoading } = useMentorship();
  const [matchesWithGoals, setMatchesWithGoals] = useState<MatchWithGoals[]>(
    [],
  );
  const [loadingGoals, setLoadingGoals] = useState(true);

  useEffect(() => {
    if (!loading && !profileLoading && !user) {
      setShowLoginPopup(true);
    }
  }, [loading, profileLoading, user, setShowLoginPopup]);

  useEffect(() => {
    const fetchGoals = async () => {
      if (!user || !profile) return;

      try {
        const response = await fetch(
          `/api/mentorship/all-goals?uid=${user.uid}&role=${profile.role}`,
        );
        if (response.ok) {
          const data = await response.json();
          setMatchesWithGoals(data.matchesWithGoals || []);
        }
      } catch (error) {
        console.error("Error fetching goals:", error);
      } finally {
        setLoadingGoals(false);
      }
    };

    if (user && profile) {
      fetchGoals();
    }
  }, [user, profile]);

  if (loading || profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <h2 className="card-title justify-center text-2xl">
            Access Required
          </h2>
          <p className="text-base-content/70 mt-2">
            Please sign in to view your goals.
          </p>
          <div className="card-actions justify-center mt-6">
            <Link href="/mentorship/dashboard" className="btn btn-primary">
              Go to Mentorship Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const allGoals = matchesWithGoals.flatMap((m) => m.goals);
  const completedCount = allGoals.filter(
    (g) => g.status === "completed",
  ).length;
  const inProgressCount = allGoals.filter(
    (g) => g.status === "in-progress",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Goals & Progress</h2>
          <p className="text-base-content/70">
            Track all your mentorship objectives
          </p>
        </div>
        <Link href="/mentorship/dashboard" className="btn btn-ghost btn-sm">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Stats */}
      <div className="stats shadow w-full bg-base-100">
        <div className="stat">
          <div className="stat-title">Total Goals</div>
          <div className="stat-value text-primary">{allGoals.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">In Progress</div>
          <div className="stat-value text-warning">{inProgressCount}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Completed</div>
          <div className="stat-value text-success">{completedCount}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Completion Rate</div>
          <div className="stat-value text-info">
            {allGoals.length > 0
              ? Math.round((completedCount / allGoals.length) * 100)
              : 0}
            %
          </div>
        </div>
      </div>

      {/* Goals by Match */}
      {loadingGoals ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : matchesWithGoals.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold">No goals yet</h3>
            <p className="text-base-content/70">
              Connect with a {profile.role === "mentor" ? "mentee" : "mentor"}{" "}
              and start setting goals together!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {matchesWithGoals.map((match) => (
            <div key={match.matchId} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="card-title">Goals with {match.partnerName}</h3>
                  <Link
                    href={`/mentorship/dashboard/${match.matchId}`}
                    className="btn btn-primary btn-sm"
                  >
                    Open Dashboard
                  </Link>
                </div>

                {match.goals.length === 0 ? (
                  <p className="text-base-content/60 text-center py-4">
                    No goals set yet. Open the dashboard to create some!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {match.goals.map((goal) => (
                      <div
                        key={goal.id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          goal.status === "completed"
                            ? "bg-success/10"
                            : "bg-base-200"
                        }`}
                      >
                        <span
                          className={`text-lg ${goal.status === "completed" ? "text-success" : ""}`}
                        >
                          {goal.status === "completed" ? "✅" : "⏳"}
                        </span>
                        <span
                          className={
                            goal.status === "completed"
                              ? "line-through text-base-content/60"
                              : ""
                          }
                        >
                          {goal.title}
                        </span>
                        {goal.targetDate && (
                          <span className="text-xs text-base-content/50 ml-auto">
                            Due:{" "}
                            {new Date(goal.targetDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
