"use client";

import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import {
  useMentorship,
  MentorshipMatch,
  MentorshipProfile,
} from "@/contexts/MentorshipContext";
import Link from "next/link";
import ContactInfo from "@/components/mentorship/ContactInfo";

interface MatchWithProfile extends MentorshipMatch {
  partnerProfile?: MentorshipProfile;
}

export default function MyMatchesPage() {
  const { setShowLoginPopup } = useContext(AuthContext);
  const { user, profile, loading, profileLoading } = useMentorship();
  const [activeMatches, setActiveMatches] = useState<MatchWithProfile[]>([]);
  const [pendingMatches, setPendingMatches] = useState<MatchWithProfile[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  useEffect(() => {
    if (!loading && !profileLoading && !user) {
      setShowLoginPopup(true);
    }
  }, [loading, profileLoading, user, setShowLoginPopup]);

  useEffect(() => {
    const fetchMatches = async () => {
      if (!user || !profile) return;

      try {
        const response = await fetch(
          `/api/mentorship/my-matches?uid=${user.uid}&role=${profile.role}`,
        );
        if (response.ok) {
          const data = await response.json();
          setActiveMatches(data.activeMatches || []);
          setPendingMatches(data.pendingMatches || []);
        }
      } catch (error) {
        console.error("Error fetching matches:", error);
      } finally {
        setLoadingMatches(false);
      }
    };

    if (user && profile) {
      fetchMatches();
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
            Please sign in and complete your profile.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">My Mentorship Connections</h2>
          <p className="text-base-content/70">
            {profile.role === "mentor" ? "Your mentees" : "Your mentors"}
          </p>
        </div>
        <Link href="/mentorship/dashboard" className="btn btn-ghost btn-sm">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Pending Section */}
      {pendingMatches.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="badge badge-warning">Pending</span>
            {profile.role === "mentee"
              ? "Awaiting Response"
              : "Your Pending Approvals"}
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingMatches.map((match) => (
              <div
                key={match.id}
                className="card bg-base-100 shadow-lg border-2 border-warning/20"
              >
                <div className="card-body p-4">
                  <div className="flex items-center gap-4">
                    <div className="avatar">
                      <div className="w-12 h-12 rounded-full">
                        {match.partnerProfile?.photoURL ? (
                          <img
                            src={match.partnerProfile.photoURL}
                            alt={match.partnerProfile.displayName || "User"}
                          />
                        ) : (
                          <div className="bg-warning text-warning-content flex items-center justify-center font-bold">
                            ?
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold">
                        {match.partnerProfile?.displayName || "Unknown"}
                      </div>
                      <div className="text-xs text-base-content/60">
                        Requested{" "}
                        {new Date(match.requestedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {profile.role === "mentee" && (
                    <div className="text-sm text-warning mt-2">
                      ⏳ Waiting for mentor approval
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Matches */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="badge badge-success">Active</span>
          Current Connections
        </h3>

        {loadingMatches ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : activeMatches.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center py-12">
              <div className="text-5xl mb-4">🤝</div>
              <h3 className="text-xl font-semibold">
                No active connections yet
              </h3>
              <p className="text-base-content/70">
                {profile.role === "mentee"
                  ? "Browse mentors and request a match to get started!"
                  : "When you accept mentee requests, they'll appear here."}
              </p>
              {profile.role === "mentee" && (
                <div className="card-actions justify-center mt-4">
                  <Link href="/mentorship/browse" className="btn btn-primary">
                    Browse Mentors
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {activeMatches.map((match) => (
              <div key={match.id} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex items-start gap-4">
                    <div className="avatar">
                      <div className="w-16 h-16 rounded-full ring ring-success ring-offset-base-100 ring-offset-2">
                        {match.partnerProfile?.photoURL ? (
                          <img
                            src={match.partnerProfile.photoURL}
                            alt={match.partnerProfile.displayName || "User"}
                          />
                        ) : (
                          <div className="bg-success text-success-content flex items-center justify-center text-2xl font-bold">
                            {match.partnerProfile?.displayName?.charAt(0) ||
                              "?"}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">
                        {match.partnerProfile?.displayName}
                      </h4>
                      <p className="text-sm text-base-content/70">
                        {match.partnerProfile?.currentRole ||
                          match.partnerProfile?.education ||
                          ""}
                      </p>
                      <ContactInfo
                        email={match.partnerProfile?.email}
                        discordUsername={match.partnerProfile?.discordUsername}
                        className="mt-1"
                      />
                      <div className="text-xs text-base-content/50 mt-1">
                        Matched on{" "}
                        {match.approvedAt
                          ? new Date(match.approvedAt).toLocaleDateString()
                          : "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Expertise/Skills Tags */}
                  {(match.partnerProfile?.expertise ||
                    match.partnerProfile?.skillsSought) && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {(
                        match.partnerProfile?.expertise ||
                        match.partnerProfile?.skillsSought ||
                        []
                      )
                        .slice(0, 4)
                        .map((tag) => (
                          <span
                            key={tag}
                            className="badge badge-outline badge-sm"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="card-actions mt-4">
                    <Link
                      href={`/mentorship/dashboard/${match.id}`}
                      className="btn btn-primary flex-1"
                    >
                      Open Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
