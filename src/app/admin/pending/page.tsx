"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { ProfileWithDetails, Review } from "@/types/admin";
import { useStreamerMode } from "@/hooks/useStreamerMode";
import {
  getAnonymizedDisplayName,
  getAnonymizedEmail,
  getAnonymizedDiscord,
} from "@/utils/streamer-mode";
import ProfileAvatar from "@/components/ProfileAvatar";

export default function PendingMentorsPage() {
  const toast = useToast();
  const { isStreamerMode } = useStreamerMode();
  const [profiles, setProfiles] = useState<ProfileWithDetails[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reviews modal state
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviewMentor, setReviewMentor] = useState<ProfileWithDetails | null>(
    null
  );
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        // Fetch both pending and changes_requested profiles in parallel
        const [pendingRes, changesRes] = await Promise.all([
          fetch("/api/mentorship/admin/profiles?role=mentor&status=pending"),
          fetch("/api/mentorship/admin/profiles?role=mentor&status=changes_requested"),
        ]);

        const pendingProfiles = pendingRes.ok ? (await pendingRes.json()).profiles || [] : [];
        const changesProfiles = changesRes.ok ? (await changesRes.json()).profiles || [] : [];

        setProfiles([...pendingProfiles, ...changesProfiles]);
      } catch (error) {
        console.error("Error fetching profiles:", error);
        toast.error("Failed to load pending mentors");
      } finally {
        setLoadingProfiles(false);
      }
    };

    fetchProfiles();
  }, [toast]);

  const handleStatusChange = async (
    uid: string,
    newStatus: "accepted" | "declined" | "disabled",
    reactivateSessions = false
  ) => {
    setActionLoading(uid);
    try {
      const response = await fetch("/api/mentorship/admin/profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, status: newStatus, reactivateSessions }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update local state - remove from pending list after accept/decline
        setProfiles((prev) => prev.filter((p) => p.uid !== uid));

        // Show success message if sessions were reactivated
        if (data.reactivatedSessions > 0) {
          toast.success(
            `${data.reactivatedSessions} mentorship session(s) have been reactivated.`
          );
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestChanges = async (uid: string) => {
    const feedback = prompt(
      "Please describe what changes are needed (min 10 characters):"
    );
    if (feedback === null) return; // User cancelled
    if (feedback.length < 10) {
      toast.error("Feedback must be at least 10 characters");
      return;
    }

    setActionLoading(uid);
    try {
      const response = await fetch("/api/mentorship/admin/profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, status: "changes_requested", feedback }),
      });

      if (response.ok) {
        setProfiles((prev) => prev.filter((p) => p.uid !== uid));
        toast.success("Changes requested - mentor notified via Discord");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to request changes");
      }
    } catch (error) {
      console.error("Error requesting changes:", error);
      toast.error("Failed to request changes");
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewReviews = async (mentor: ProfileWithDetails) => {
    setReviewMentor(mentor);
    setShowReviewsModal(true);
    setLoadingReviews(true);

    try {
      const response = await fetch(
        `/api/mentorship/admin/reviews?mentorId=${mentor.uid}`
      );
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "pending":
        return <span className="badge badge-warning">Pending</span>;
      case "accepted":
        return <span className="badge badge-success">Accepted</span>;
      case "declined":
        return <span className="badge badge-error">Declined</span>;
      case "disabled":
        return <span className="badge badge-neutral">Disabled</span>;
      case "changes_requested":
        return <span className="badge badge-warning">Changes Requested</span>;
      default:
        return <span className="badge badge-ghost">Unknown</span>;
    }
  };

  const getSkillLevelBadge = (level: string | undefined) => {
    switch (level) {
      case "beginner":
        return <span className="badge badge-info badge-sm">Beginner</span>;
      case "intermediate":
        return <span className="badge badge-warning badge-sm">Intermediate</span>;
      case "advanced":
        return <span className="badge badge-success badge-sm">Advanced</span>;
      default:
        return <span className="badge badge-ghost badge-sm">Not set</span>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Pending Mentors</h1>

      {loadingProfiles ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : profiles.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-semibold">No pending mentors</h3>
            <p className="text-base-content/70">
              All mentor registrations have been reviewed!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {profiles.map((p) => (
            <div key={p.uid} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* Avatar and Basic Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <ProfileAvatar
                      photoURL={p.photoURL}
                      displayName={getAnonymizedDisplayName(
                        p.displayName,
                        p.uid,
                        isStreamerMode
                      )}
                      size="xl"
                      ring
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold">
                          {getAnonymizedDisplayName(
                            p.displayName,
                            p.uid,
                            isStreamerMode
                          )}
                        </h3>
                        {getStatusBadge(p.status)}
                        <span className="badge badge-outline">
                          {p.role === "mentor" ? "🎯 Mentor" : "🚀 Mentee"}
                        </span>
                      </div>
                      <p className="text-sm text-base-content/70">
                        {getAnonymizedEmail(p.email, p.uid, isStreamerMode)}
                      </p>
                      {p.currentRole && (
                        <p className="text-sm text-base-content/70 mt-1">
                          {p.currentRole}
                        </p>
                      )}

                      {/* Expertise Tags */}
                      {p.expertise && p.expertise.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {p.expertise.map((skill) => (
                            <span
                              key={skill}
                              className="badge badge-primary badge-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Star Rating (for mentors) - clickable to view reviews */}
                      {p.role === "mentor" && (p.ratingCount ?? 0) > 0 && (
                        <button
                          className="flex items-center gap-1 mt-2 hover:bg-base-200 rounded px-2 py-1 -mx-2 transition-colors cursor-pointer"
                          onClick={() => handleViewReviews(p)}
                        >
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= (p.avgRating ?? 0)
                                    ? "text-yellow-400"
                                    : "text-base-content/20"
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-xs text-base-content/60">
                            {p.avgRating} ({p.ratingCount} reviews)
                          </span>
                          <svg
                            className="w-3 h-3 text-base-content/40"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {(p.status === "pending" || p.status === "changes_requested") && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          disabled={actionLoading === p.uid}
                          onClick={() => handleStatusChange(p.uid, "accepted")}
                        >
                          {actionLoading === p.uid ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            "✓ Accept"
                          )}
                        </button>
                        <button
                          className="btn btn-warning btn-sm"
                          disabled={actionLoading === p.uid}
                          onClick={() => handleRequestChanges(p.uid)}
                        >
                          {actionLoading === p.uid ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            "Request Changes"
                          )}
                        </button>
                        <button
                          className="btn btn-error btn-sm"
                          disabled={actionLoading === p.uid}
                          onClick={() => handleStatusChange(p.uid, "declined")}
                        >
                          {actionLoading === p.uid ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            "✗ Decline"
                          )}
                        </button>
                      </>
                    )}
                    {p.status !== "disabled" && p.status !== "pending" && p.status !== "changes_requested" && (
                      <button
                        className="btn btn-warning btn-sm"
                        disabled={actionLoading === p.uid}
                        onClick={() => handleStatusChange(p.uid, "disabled")}
                      >
                        {actionLoading === p.uid ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          "🚫 Disable"
                        )}
                      </button>
                    )}
                    {p.status === "disabled" && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          disabled={actionLoading === p.uid}
                          onClick={() => handleStatusChange(p.uid, "accepted")}
                        >
                          {actionLoading === p.uid ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            "✓ Re-enable"
                          )}
                        </button>
                      </>
                    )}
                    {/* Show re-enable sessions button for accepted users with disabled sessions */}
                    {p.status === "accepted" && (p.disabledSessionsCount ?? 0) > 0 && (
                      <button
                        className="btn btn-info btn-sm"
                        disabled={actionLoading === p.uid}
                        onClick={() => handleStatusChange(p.uid, "accepted", true)}
                      >
                        {actionLoading === p.uid ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          `🔄 Re-enable ${p.disabledSessionsCount} Session(s)`
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Details */}
                <div className="collapse collapse-arrow bg-base-200 mt-4">
                  <input type="checkbox" />
                  <div className="collapse-title font-medium">
                    View Full Profile Details
                  </div>
                  <div className="collapse-content">
                    <div className="grid md:grid-cols-2 gap-4 pt-2">
                      {/* Discord Username */}
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Discord Username</h4>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-base-content/70">
                            {p.discordUsername
                              ? getAnonymizedDiscord(p.discordUsername, p.uid, isStreamerMode)
                              : <span className="italic">Not provided</span>}
                          </p>
                          {p.discordUsername && (
                            p.discordUsernameValidated
                              ? <span className="badge badge-success badge-xs">Verified</span>
                              : <span className="badge badge-warning badge-xs">Unverified</span>
                          )}
                        </div>
                      </div>

                      {/* LinkedIn */}
                      <div>
                        <h4 className="font-semibold text-sm mb-1">LinkedIn</h4>
                        {p.linkedinUrl ? (
                          <a
                            href={p.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link link-primary text-sm"
                          >
                            View LinkedIn Profile
                          </a>
                        ) : (
                          <p className="text-sm text-base-content/70 italic">Not provided</p>
                        )}
                      </div>

                      {/* Bio */}
                      <div className={p.bio && p.bio.length > 100 ? "md:col-span-2" : ""}>
                        <h4 className="font-semibold text-sm mb-1">Bio</h4>
                        <p className="text-sm text-base-content/70">
                          {p.bio || <span className="italic">Not provided</span>}
                        </p>
                      </div>

                      {/* Major Projects */}
                      <div className="md:col-span-2">
                        <h4 className="font-semibold text-sm mb-1">
                          Major Projects & Experience
                        </h4>
                        {p.majorProjects ? (
                          <p className="text-sm text-base-content/70 whitespace-pre-wrap">
                            {p.majorProjects}
                          </p>
                        ) : (
                          <p className="text-sm text-base-content/70 italic">Not provided</p>
                        )}
                      </div>

                      {/* CV Link */}
                      <div>
                        <h4 className="font-semibold text-sm mb-1">
                          CV / Resume
                        </h4>
                        {p.cvUrl ? (
                          <a
                            href={p.cvUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link link-primary text-sm"
                          >
                            View CV
                          </a>
                        ) : (
                          <p className="text-sm text-base-content/70 italic">Not provided</p>
                        )}
                      </div>

                      {/* Skill Level */}
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Skill Level</h4>
                        {getSkillLevelBadge(p.skillLevel)}
                      </div>

                      {/* Expertise (full list) */}
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Expertise</h4>
                        {p.expertise && p.expertise.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.expertise.map((skill) => (
                              <span key={skill} className="badge badge-primary badge-sm">
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-base-content/70 italic">Not provided</p>
                        )}
                      </div>

                      {/* Max Mentees */}
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Max Mentees</h4>
                        <p className="text-sm text-base-content/70">
                          {p.maxMentees ?? <span className="italic">Not set</span>}
                        </p>
                      </div>

                      {/* Availability */}
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Availability</h4>
                        <p className="text-sm text-base-content/70">
                          {p.availability && Object.keys(p.availability).length > 0
                            ? Object.keys(p.availability).map(day =>
                                day.charAt(0).toUpperCase() + day.slice(1)
                              ).join(", ")
                            : <span className="italic">Not set</span>}
                        </p>
                      </div>

                      {/* Public Profile */}
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Public Profile</h4>
                        <p className="text-sm text-base-content/70">
                          {p.isPublic === undefined ? <span className="italic">Not set</span> : p.isPublic ? "Yes" : "No"}
                        </p>
                      </div>

                      {/* Username */}
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Username</h4>
                        <p className="text-sm text-base-content/70">
                          {p.username || <span className="italic">Not set</span>}
                        </p>
                      </div>

                      {/* Career Goals (for mentees) */}
                      {p.careerGoals && (
                        <div className="md:col-span-2">
                          <h4 className="font-semibold text-sm mb-1">
                            Career Goals
                          </h4>
                          <p className="text-sm text-base-content/70">
                            {p.careerGoals}
                          </p>
                        </div>
                      )}

                      {/* Registration Info */}
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Registered</h4>
                        <p className="text-sm text-base-content/70">
                          {p.createdAt
                            ? new Date(p.createdAt).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reviews Modal */}
      {showReviewsModal && reviewMentor && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
              onClick={() => setShowReviewsModal(false)}
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4 mb-6">
              <ProfileAvatar
                photoURL={reviewMentor.photoURL}
                displayName={getAnonymizedDisplayName(
                  reviewMentor.displayName,
                  reviewMentor.uid,
                  isStreamerMode
                )}
                size="xl"
                ring
              />
              <div>
                <h3 className="text-xl font-bold">
                  {getAnonymizedDisplayName(
                    reviewMentor.displayName,
                    reviewMentor.uid,
                    isStreamerMode
                  )}
                </h3>
                <p className="text-sm text-base-content/60">Reviews & Ratings</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${
                          star <= (reviewMentor.avgRating ?? 0)
                            ? "text-yellow-400"
                            : "text-base-content/20"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="font-semibold">{reviewMentor.avgRating}</span>
                  <span className="text-base-content/50">
                    ({reviewMentor.ratingCount} reviews)
                  </span>
                </div>
              </div>
            </div>

            <div className="divider"></div>

            {/* Reviews List */}
            {loadingReviews ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8 text-base-content/60">
                <div className="text-4xl mb-2">📭</div>
                <p>No reviews found</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {reviews.map((review) => (
                  <div key={review.id} className="card bg-base-200 shadow-sm">
                    <div className="card-body p-4">
                      {/* Reviewer Info */}
                      <div className="flex items-start gap-3">
                        <ProfileAvatar
                          photoURL={review.menteePhoto}
                          displayName={review.menteeName}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <p className="font-semibold">
                                {getAnonymizedDisplayName(
                                  review.menteeName,
                                  review.menteeId,
                                  isStreamerMode
                                ) || "Anonymous"}
                              </p>
                              <p className="text-xs text-base-content/50">
                                {getAnonymizedEmail(
                                  review.menteeEmail,
                                  review.menteeId,
                                  isStreamerMode
                                )}
                              </p>
                            </div>
                            <div className="text-xs text-base-content/50">
                              {review.createdAt
                                ? new Date(review.createdAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )
                                : "N/A"}
                            </div>
                          </div>

                          {/* Star Rating */}
                          <div className="flex items-center gap-1 mt-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? "text-yellow-400"
                                    : "text-base-content/20"
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            <span className="text-sm font-medium ml-1">
                              {review.rating}/5
                            </span>
                          </div>

                          {/* Feedback */}
                          {review.feedback && (
                            <div className="mt-3 p-3 bg-base-100 rounded-lg">
                              <p className="text-sm italic text-base-content/80">
                                &quot;{review.feedback}&quot;
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-action">
              <button className="btn" onClick={() => setShowReviewsModal(false)}>
                Close
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowReviewsModal(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
