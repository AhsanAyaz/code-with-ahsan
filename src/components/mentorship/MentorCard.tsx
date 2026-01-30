"use client";

import { useState } from "react";
import Link from "next/link";
import { MentorshipProfile } from "@/contexts/MentorshipContext";
import { DEFAULT_MAX_MENTEES } from "@/lib/mentorship-constants";

type RequestStatus = "none" | "pending" | "declined" | "active" | "completed";

interface MentorCardProps {
  mentor: MentorshipProfile & {
    avgRating?: number;
    ratingCount?: number;
    hasRated?: boolean;
    sessionId?: string;
  };
  onRequestMatch: (mentorId: string) => Promise<void>;
  isRequesting: boolean;
  requestStatus: RequestStatus;
  onRateNow?: (
    mentorId: string,
    sessionId: string,
    rating: number,
    feedback: string
  ) => Promise<void>;
  onWithdraw?: (mentorId: string) => Promise<void>;
  isWithdrawing?: boolean;
  currentUserId?: string;
}

export default function MentorCard({
  mentor,
  onRequestMatch,
  isRequesting,
  requestStatus,
  onRateNow,
  onWithdraw,
  isWithdrawing,
  currentUserId,
}: MentorCardProps) {
  // Check if mentor is at capacity (these fields come from API)
  const isAtCapacity = (
    mentor as MentorshipProfile & { isAtCapacity?: boolean }
  ).isAtCapacity;
  const activeMenteeCount =
    (mentor as MentorshipProfile & { activeMenteeCount?: number })
      .activeMenteeCount || 0;

  // Rating state (for submitting ratings on completed mentorships)
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const handleSubmitRating = async () => {
    if (!onRateNow || !mentor.sessionId) return;
    setSubmittingRating(true);
    try {
      await onRateNow(mentor.uid, mentor.sessionId, rating, feedback);
      setShowRatingModal(false);
    } finally {
      setSubmittingRating(false);
    }
  };

  const renderActionButton = () => {
    switch (requestStatus) {
      case "pending":
        return (
          <div className="flex gap-2">
            <button className="btn btn-warning flex-1" disabled>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
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
            {onWithdraw && (
              <button
                className="btn btn-error btn-outline"
                onClick={() => onWithdraw(mentor.uid)}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Withdraw"
                )}
              </button>
            )}
          </div>
        );
      case "declined":
        return (
          <button className="btn btn-error btn-outline btn-block" disabled>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
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
          <button className="btn btn-success btn-block" disabled>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
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
          <div className="space-y-2">
            <button className="btn btn-success btn-block" disabled>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
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
              Mentorship completed
            </button>
            {/* Show rate button if not rated yet and onRateNow is provided */}
            {onRateNow && !mentor.hasRated && mentor.sessionId && (
              <button
                className="btn btn-outline btn-warning btn-block gap-2"
                onClick={() => setShowRatingModal(true)}
              >
                ⭐ Rate Your Experience
              </button>
            )}
            {mentor.hasRated && (
              <div className="text-center text-sm text-success">
                ✓ You rated this mentor
              </div>
            )}
          </div>
        );
      default:
        // Check if mentor is at capacity
        if (isAtCapacity) {
          return (
            <div className="space-y-2">
              <button className="btn btn-ghost btn-block" disabled>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
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
                At Capacity
              </button>
              <p className="text-xs text-base-content/50 text-center">
                Mentor has {activeMenteeCount}/
                {mentor.maxMentees || DEFAULT_MAX_MENTEES} mentees
              </p>
            </div>
          );
        }
        return (
          <button
            className="btn btn-primary btn-block"
            onClick={() => onRequestMatch(mentor.uid)}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Sending...
              </>
            ) : (
              <>Request Match</>
            )}
          </button>
        );
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
      <div className="card-body">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="avatar">
            <div className="w-16 h-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              {mentor.photoURL ? (
                <img
                  src={mentor.photoURL}
                  alt={mentor.displayName || "Mentor"}
                />
              ) : (
                <div className="bg-primary text-primary-content flex items-center justify-center text-2xl font-bold">
                  {mentor.displayName?.charAt(0) || "?"}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="card-title text-lg truncate">
              {mentor.displayName}
            </h3>
            <p className="text-sm text-base-content/70 truncate">
              {mentor.currentRole}
            </p>
          </div>
        </div>

        {/* Expertise Tags */}
        {mentor.expertise && mentor.expertise.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {mentor.expertise.slice(0, 4).map((skill) => (
              <span key={skill} className="badge badge-primary badge-sm">
                {skill}
              </span>
            ))}
            {mentor.expertise.length > 4 && (
              <span className="badge badge-ghost badge-sm">
                +{mentor.expertise.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Bio */}
        {mentor.bio && (
          <p className="text-sm text-base-content/70 mt-3 line-clamp-3">
            {mentor.bio}
          </p>
        )}

        {/* Availability & Capacity */}
        <div className="flex items-center gap-4 mt-4 text-sm text-base-content/60">
          {mentor.availability &&
            Object.keys(mentor.availability).length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 shrink-0"
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
                <span className="capitalize">
                  {Object.keys(mentor.availability)
                    .map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3))
                    .join(", ")}
                </span>
              </div>
            )}
          {mentor.maxMentees && (
            <div className="flex items-center gap-1">
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
              <span>Up to {mentor.maxMentees} mentees</span>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="card-actions mt-4 flex-col gap-2">
          {renderActionButton()}
          <Link
            href={`/mentorship/mentors/${mentor.username || mentor.uid}`}
            className="btn btn-ghost btn-sm w-full"
          >
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
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            View Profile
          </Link>
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
                onClick={handleSubmitRating}
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
