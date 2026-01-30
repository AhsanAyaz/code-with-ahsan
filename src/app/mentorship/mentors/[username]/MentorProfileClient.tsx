"use client";

import { useState, useEffect, useContext } from "react";
import Link from "next/link";
import type { MentorProfileDetails } from "@/types/mentorship";
import { useMentorship } from "@/contexts/MentorshipContext";
import { useToast } from "@/contexts/ToastContext";
import { AuthContext } from "@/contexts/AuthContext";

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

type RequestStatus = "none" | "pending" | "declined" | "active" | "completed";

interface MentorProfileClientProps {
  username: string;
  initialMentor?: MentorProfileDetails | null;
}

export default function MentorProfileClient({
  username,
  initialMentor,
}: MentorProfileClientProps) {
  const [mentor, setMentor] = useState<MentorProfileDetails | null>(
    initialMentor ?? null
  );
  const [loading, setLoading] = useState(!initialMentor);
  const [error, setError] = useState<string | null>(null);

  // Mentorship context for user authentication
  const { user, profile, loading: mentorshipLoading } = useMentorship();
  const toast = useToast();
  const { setShowLoginPopup } = useContext(AuthContext);

  // Request status state
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("none");
  const [sessionInfo, setSessionInfo] = useState<{
    sessionId: string;
    hasRated: boolean;
  } | null>(null);
  const [requestingMentor, setRequestingMentor] = useState(false);
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  // Rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    // If we already have initial data, don't refetch
    if (initialMentor) return;

    const fetchMentor = async () => {
      try {
        const response = await fetch(`/api/mentorship/mentors/${username}`);
        if (response.ok) {
          const data = await response.json();
          setMentor(data.mentor);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to load mentor profile");
        }
      } catch (err) {
        console.error("Error fetching mentor:", err);
        setError("Failed to load mentor profile");
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchMentor();
    }
  }, [username, initialMentor]);

  // Fetch mentee's request status for this mentor
  useEffect(() => {
    const fetchRequestStatus = async () => {
      if (!user || !mentor) return;

      try {
        const response = await fetch(
          `/api/mentorship/mentee-requests?menteeId=${user.uid}`
        );
        if (response.ok) {
          const data = await response.json();
          // Find request for this specific mentor
          const request = (data.requests || []).find(
            (r: { mentorId: string }) => r.mentorId === mentor.uid
          );
          if (request) {
            setRequestStatus(request.status as RequestStatus);
            if (request.status === "completed") {
              setSessionInfo({
                sessionId: request.sessionId || request.id,
                hasRated: request.hasRated || false,
              });
            }
            if (request.status === "pending") {
              setPendingMatchId(request.sessionId || request.id);
            }
          } else {
            setRequestStatus("none");
          }
        }
      } catch (err) {
        console.error("Error fetching request status:", err);
      }
    };

    if (user && profile?.role === "mentee" && mentor) {
      fetchRequestStatus();
    }
  }, [user, profile, mentor]);

  const handleRequestMatch = async () => {
    if (!user || !mentor) return;

    setRequestingMentor(true);
    try {
      const response = await fetch("/api/mentorship/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menteeId: user.uid,
          mentorId: mentor.uid,
        }),
      });

      if (response.ok) {
        setRequestStatus("pending");
      } else {
        const errorData = await response.json();
        if (response.status === 409) {
          // Already requested - update with actual status
          setRequestStatus(errorData.status || "pending");
        } else {
          toast.error("Failed to send request: " + errorData.error);
        }
      }
    } catch (err) {
      console.error("Error requesting match:", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setRequestingMentor(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user || !pendingMatchId) return;

    setWithdrawing(true);
    try {
      const response = await fetch("/api/mentorship/match", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: pendingMatchId,
          action: "withdraw",
          menteeId: user.uid,
        }),
      });

      if (response.ok) {
        setRequestStatus("none");
        setPendingMatchId(null);
        toast.success("Request withdrawn successfully.");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to withdraw request");
      }
    } catch (err) {
      console.error("Error withdrawing request:", err);
      toast.error("Failed to withdraw request. Please try again.");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleRateNow = async () => {
    if (!user || !mentor || !sessionInfo?.sessionId) return;

    setSubmittingRating(true);
    try {
      const response = await fetch("/api/mentorship/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId: mentor.uid,
          menteeId: user.uid,
          sessionId: sessionInfo.sessionId,
          rating,
          feedback,
        }),
      });

      if (response.ok) {
        setSessionInfo((prev) => (prev ? { ...prev, hasRated: true } : null));
        setShowRatingModal(false);
        toast.success("Thank you for your feedback!");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to submit rating");
      }
    } catch (err) {
      console.error("Error submitting rating:", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setSubmittingRating(false);
    }
  };

  const renderActionButton = () => {
    // User not logged in
    if (!user) {
      return (
        <button
          className="btn btn-primary"
          onClick={() => setShowLoginPopup(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
            />
          </svg>
          Sign in to Request Mentorship
        </button>
      );
    }

    // User is not a mentee
    if (profile?.role !== "mentee") {
      return (
        <Link href="/mentorship" className="btn btn-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {profile?.role === "mentor"
            ? "You are a mentor"
            : "Register as mentee to request"}
        </Link>
      );
    }

    // Mentee with existing request statuses
    switch (requestStatus) {
      case "pending":
        return (
          <>
            <button className="btn btn-warning" disabled>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Request Pending
            </button>
            <button
              className="btn btn-error btn-outline"
              onClick={handleWithdraw}
              disabled={withdrawing}
            >
              {withdrawing ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Withdrawing...
                </>
              ) : (
                "Withdraw Request"
              )}
            </button>
          </>
        );
      case "declined":
        return (
          <button className="btn btn-error btn-outline" disabled>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Request Declined
          </button>
        );
      case "active":
        return (
          <button className="btn btn-success" disabled>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Already Matched
          </button>
        );
      case "completed":
        return (
          <button className="btn btn-success" disabled>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Mentorship Completed
          </button>
        );
      default:
        // No existing request - show request button or capacity warning
        if (mentor?.isAtCapacity) {
          return (
            <button className="btn btn-ghost" disabled>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
              At Capacity ({mentor.activeMenteeCount}/{mentor.maxMentees})
            </button>
          );
        }
        return (
          <button
            className="btn btn-primary"
            onClick={handleRequestMatch}
            disabled={requestingMentor}
          >
            {requestingMentor ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Sending Request...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                Request Mentorship
              </>
            )}
          </button>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="card bg-base-100 shadow-xl max-w-lg mx-auto">
        <div className="card-body text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="card-title justify-center">Mentor Not Found</h2>
          <p className="text-base-content/70">
            {error || "This mentor profile is not available or does not exist."}
          </p>
          <div className="card-actions justify-center mt-4">
            <Link href="/mentorship/mentors" className="btn btn-primary">
              Browse All Mentors
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const availableDays = mentor.availability
    ? Object.keys(mentor.availability).filter(
        (day) =>
          mentor.availability![day] && mentor.availability![day].length > 0
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link href="/mentorship">Mentorship</Link>
          </li>
          <li>
            <Link href="/mentorship/mentors">Community Mentors</Link>
          </li>
          <li className="text-primary">{mentor.displayName}</li>
        </ul>
      </div>

      {/* Profile Header */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="avatar">
                <div className="w-32 h-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-4">
                  {mentor.photoURL ? (
                    <img src={mentor.photoURL} alt={mentor.displayName} />
                  ) : (
                    <div className="bg-primary text-primary-content flex items-center justify-center text-5xl font-bold w-full h-full">
                      {mentor.displayName?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{mentor.displayName}</h1>
              <p className="text-base-content/60 text-sm">@{mentor.username}</p>
              {mentor.currentRole && (
                <p className="text-lg text-base-content/70 mt-1">
                  {mentor.currentRole}
                </p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-4 mt-4">
                {(mentor.avgRating ?? 0) > 0 && (
                  <div className="flex items-center gap-1 text-warning">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold">{mentor.avgRating}</span>
                    <span className="text-base-content/60">
                      ({mentor.ratingCount} reviews)
                    </span>
                  </div>
                )}
                <div className="badge badge-primary badge-lg gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {mentor.activeMenteeCount} / {mentor.maxMentees} mentees
                </div>
                <div className="badge badge-secondary badge-lg gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {mentor.completedMentorships} completed
                </div>
              </div>

              {/* Capacity indicator */}
              {mentor.isAtCapacity && (
                <div className="alert alert-warning mt-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>
                    This mentor is currently at capacity. Check back later!
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bio Section */}
      {mentor.bio && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              About
            </h2>
            <p className="text-base-content/80 whitespace-pre-wrap">
              {mentor.bio}
            </p>
          </div>
        </div>
      )}

      {/* Major Projects / Experience Section */}
      {mentor.majorProjects && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              Experience & Projects
            </h2>
            <div className="text-base-content/80 whitespace-pre-wrap">
              {mentor.majorProjects}
            </div>
          </div>
        </div>
      )}

      {/* Expertise Section */}
      {(mentor.expertise?.length ?? 0) > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Areas of Expertise
            </h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {mentor.expertise?.map((skill) => (
                <span key={skill} className="badge badge-primary badge-lg">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Availability Section */}
      {availableDays.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Availability
            </h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {DAYS_OF_WEEK.map((day) => {
                const isAvailable = availableDays.includes(day);
                return (
                  <div
                    key={day}
                    className={`badge badge-lg capitalize ${
                      isAvailable ? "badge-secondary" : "badge-ghost opacity-40"
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-base-content/60 mt-2">
              Days marked in color indicate general availability for mentorship
              sessions.
            </p>
          </div>
        </div>
      )}

      {/* CTA Section - Dynamic based on user state */}
      <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content">
        <div className="card-body text-center">
          <h3 className="card-title justify-center text-2xl">
            {user && profile?.role === "mentee"
              ? requestStatus === "active"
                ? `You're matched with ${mentor.displayName}!`
                : requestStatus === "completed"
                  ? `You completed mentorship with ${mentor.displayName}!`
                  : `Want ${mentor.displayName} as your mentor?`
              : "Interested in getting mentored?"}
          </h3>
          <p className="opacity-90 mb-4">
            {!user
              ? "Sign in to request a mentorship match with this mentor."
              : profile?.role !== "mentee"
                ? "Register as a mentee to request mentorship."
                : requestStatus === "active"
                  ? "Continue your mentorship journey together."
                  : requestStatus === "pending"
                    ? "Your request is being reviewed. Please wait for a response."
                    : requestStatus === "completed"
                      ? sessionInfo?.hasRated
                        ? "Thank you for rating your experience!"
                        : "Don't forget to rate your mentorship experience."
                      : requestStatus === "declined"
                        ? "Your request was declined. You can explore other mentors."
                        : mentor.isAtCapacity
                          ? "This mentor is at capacity, but you can explore other amazing mentors."
                          : "Click below to send a mentorship request."}
          </p>
          <div className="card-actions justify-center items-center flex-wrap gap-3">
            {/* Main action button based on state */}
            {!mentorshipLoading && renderActionButton()}

            {/* Rating button for completed mentorships */}
            {requestStatus === "completed" &&
              sessionInfo &&
              !sessionInfo.hasRated && (
                <button
                  className="btn btn-warning"
                  onClick={() => setShowRatingModal(true)}
                >
                  ⭐ Rate Your Experience
                </button>
              )}
            {requestStatus === "completed" && sessionInfo?.hasRated && (
              <span className="badge badge-success badge-lg">✓ Rated</span>
            )}

            {/* Browse mentors link */}
            <Link
              href="/mentorship/browse"
              className="btn btn-ghost bg-white/20 hover:bg-white/30"
            >
              Browse Mentors
            </Link>
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">⭐ Rate Your Mentorship</h3>
            <p className="py-2 text-base-content/70">
              How was your experience with <strong>{mentor.displayName}</strong>
              ?
            </p>

            {/* Star selector */}
            <div className="flex justify-center gap-2 my-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`btn btn-circle btn-lg ${star <= rating ? "btn-warning" : "btn-ghost"}`}
                  onClick={() => setRating(star)}
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
            <p className="text-center font-semibold">{rating} out of 5 stars</p>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Feedback (optional)</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="Share your experience..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowRatingModal(false)}
                disabled={submittingRating}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleRateNow}
                disabled={submittingRating}
              >
                {submittingRating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>{" "}
                    Submitting...
                  </>
                ) : (
                  "Submit Rating"
                )}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowRatingModal(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
