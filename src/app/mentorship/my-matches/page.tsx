"use client";

import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  useMentorship,
  MentorshipMatch,
  MentorshipProfile,
} from "@/contexts/MentorshipContext";
import Link from "next/link";

interface MatchWithProfile extends MentorshipMatch {
  partnerProfile?: MentorshipProfile;
}

export default function MyMatchesPage() {
  const { setShowLoginPopup } = useContext(AuthContext);
  const toast = useToast();
  const { user, profile, loading } = useMentorship();
  const [activeMatches, setActiveMatches] = useState<MatchWithProfile[]>([]);
  const [pendingMatches, setPendingMatches] = useState<MatchWithProfile[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      setShowLoginPopup(true);
    }
  }, [loading, user, setShowLoginPopup]);

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

  if (loading) {
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
                      {/* Contact Info - only show for mentors viewing mentee info */}
                      {profile.role === "mentor" &&
                        (match.partnerProfile?.email ||
                          match.partnerProfile?.discordUsername) && (
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-base-content/70">
                            {match.partnerProfile?.email && (
                              <button
                                className="flex items-center gap-1 hover:text-primary cursor-pointer"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    match.partnerProfile!.email!,
                                  );
                                  toast.success("Email copied!");
                                }}
                                title="Click to copy email"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="w-4 h-4"
                                >
                                  <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                                  <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                                </svg>
                                <span>{match.partnerProfile.email}</span>
                              </button>
                            )}
                            {match.partnerProfile?.discordUsername ? (
                              <button
                                className="flex items-center gap-1 hover:text-primary cursor-pointer"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    match.partnerProfile!.discordUsername!,
                                  );
                                  toast.success("Discord username copied!");
                                }}
                                title="Click to copy Discord username"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="w-4 h-4"
                                >
                                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                </svg>
                                <span>
                                  {match.partnerProfile.discordUsername}
                                </span>
                              </button>
                            ) : (
                              <span className="flex items-center gap-1 text-warning">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="w-4 h-4"
                                >
                                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                </svg>
                                <span>Discord username not set</span>
                              </span>
                            )}
                          </div>
                        )}
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
