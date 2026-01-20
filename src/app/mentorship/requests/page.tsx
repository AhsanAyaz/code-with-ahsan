"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useMentorship, MentorshipMatch } from "@/contexts/MentorshipContext";
import Link from "next/link";
import { DEFAULT_MAX_MENTEES } from "@/lib/mentorship-constants";
import ContactInfo from "@/components/mentorship/ContactInfo";

interface RequestWithProfile extends MentorshipMatch {
  menteeProfile?: {
    displayName: string;
    photoURL: string;
    email?: string;
    discordUsername?: string;
    education?: string;
    skillsSought?: string[];
    careerGoals?: string;
    learningStyle?: string;
  };
}

export default function MentorRequestsPage() {
  const router = useRouter();
  const { setShowLoginPopup } = useContext(AuthContext);
  const toast = useToast();
  const { user, profile, loading, profileLoading, refreshMatches, matches } =
    useMentorship();
  const [requests, setRequests] = useState<RequestWithProfile[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Calculate capacity
  const maxMentees = profile?.maxMentees || DEFAULT_MAX_MENTEES;
  const activeMenteeCount = matches.length;
  const isAtCapacity = activeMenteeCount >= maxMentees;

  useEffect(() => {
    if (!loading && !profileLoading && !user) {
      setShowLoginPopup(true);
    }
  }, [loading, profileLoading, user, setShowLoginPopup]);

  useEffect(() => {
    if (!loading && !profileLoading && profile && profile.role !== "mentor") {
      router.push("/mentorship");
    }
  }, [loading, profileLoading, profile, router]);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user) return;

      try {
        const response = await fetch(
          `/api/mentorship/requests?mentorId=${user.uid}`,
        );
        if (response.ok) {
          const data = await response.json();
          setRequests(data.requests || []);
        }
      } catch (error) {
        console.error("Error fetching requests:", error);
      } finally {
        setLoadingRequests(false);
      }
    };

    if (user && profile?.role === "mentor") {
      fetchRequests();
    }
  }, [user, profile]);

  const handleAction = async (
    matchId: string,
    action: "approve" | "decline",
  ) => {
    setProcessingId(matchId);
    try {
      const response = await fetch("/api/mentorship/match", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          action,
          mentorId: user?.uid,
        }),
      });

      if (response.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== matchId));
        await refreshMatches();
      } else {
        const error = await response.json();
        toast.error("Failed: " + error.error);
      }
    } catch (error) {
      console.error("Error processing request:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

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
            Please sign in and complete your mentor profile.
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
          <h2 className="text-2xl font-bold">Pending Requests</h2>
          <p className="text-base-content/70">
            Review mentee applications and accept those you can support
          </p>
        </div>
        <Link href="/mentorship/dashboard" className="btn btn-ghost btn-sm">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Capacity Info */}
      <div className={`alert ${isAtCapacity ? "alert-warning" : "alert-info"}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="stroke-current shrink-0 w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <div>
          <span>
            <strong>
              Capacity: {activeMenteeCount}/{maxMentees} mentees
            </strong>
            {isAtCapacity ? (
              <>
                {" "}
                — You're at capacity.{" "}
                <Link href="/mentorship/settings" className="link">
                  Update settings
                </Link>{" "}
                to accept more mentees.
              </>
            ) : (
              <>
                {" "}
                — You can accept {maxMentees - activeMenteeCount} more mentee
                {maxMentees - activeMenteeCount !== 1 ? "s" : ""}.
              </>
            )}
          </span>
        </div>
      </div>

      {/* Requests List */}
      {loadingRequests ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : requests.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-semibold">No pending requests</h3>
            <p className="text-base-content/70">
              When mentees request to be matched with you, they'll appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Mentee Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="avatar">
                      <div className="w-16 h-16 rounded-full ring ring-secondary ring-offset-base-100 ring-offset-2">
                        {request.menteeProfile?.photoURL ? (
                          <img
                            src={request.menteeProfile.photoURL}
                            alt={request.menteeProfile.displayName || "Mentee"}
                          />
                        ) : (
                          <div className="bg-secondary text-secondary-content flex items-center justify-center text-2xl font-bold">
                            ?
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">
                        {request.menteeProfile?.displayName || "Anonymous"}
                      </h3>
                      <ContactInfo
                        email={request.menteeProfile?.email}
                        discordUsername={request.menteeProfile?.discordUsername}
                        className="mt-1"
                      />
                      {request.menteeProfile?.education && (
                        <p className="text-sm text-base-content/70 mt-1">
                          {request.menteeProfile.education}
                        </p>
                      )}

                      {/* Skills Sought */}
                      {request.menteeProfile?.skillsSought &&
                        request.menteeProfile.skillsSought.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {request.menteeProfile.skillsSought
                              .slice(0, 5)
                              .map((skill) => (
                                <span
                                  key={skill}
                                  className="badge badge-secondary badge-sm"
                                >
                                  {skill}
                                </span>
                              ))}
                          </div>
                        )}

                      {/* Career Goals */}
                      {request.menteeProfile?.careerGoals && (
                        <div className="mt-3">
                          <div className="text-sm font-semibold">
                            Career Goals:
                          </div>
                          <p className="text-sm text-base-content/70 line-clamp-2">
                            {request.menteeProfile.careerGoals}
                          </p>
                        </div>
                      )}

                      {/* Learning Style */}
                      {request.menteeProfile?.learningStyle && (
                        <div className="mt-2 text-sm">
                          <span className="font-semibold">Learning Style:</span>{" "}
                          <span className="capitalize">
                            {request.menteeProfile.learningStyle}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    <div
                      className={isAtCapacity ? "tooltip" : ""}
                      data-tip={
                        isAtCapacity
                          ? "Update your settings to increase capacity"
                          : ""
                      }
                    >
                      <button
                        className="btn btn-success w-full"
                        onClick={() => handleAction(request.id, "approve")}
                        disabled={processingId === request.id || isAtCapacity}
                      >
                        {processingId === request.id ? (
                          <span className="loading loading-spinner loading-sm"></span>
                        ) : isAtCapacity ? (
                          <>🚫 At Capacity</>
                        ) : (
                          <>✓ Accept</>
                        )}
                      </button>
                    </div>
                    <button
                      className="btn btn-outline btn-error"
                      onClick={() => handleAction(request.id, "decline")}
                      disabled={processingId === request.id}
                    >
                      ✗ Decline
                    </button>
                    <div className="text-xs text-base-content/50 text-center mt-1">
                      Requested:{" "}
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
