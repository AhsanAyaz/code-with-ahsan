"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useMentorship } from "@/contexts/MentorshipContext";
import { useToast } from "@/contexts/ToastContext";
import { authFetch } from "@/lib/apiClient";
import { Roadmap } from "@/types/mentorship";

export const dynamic = "force-dynamic";

export default function MyRoadmapsPage() {
  const { user, profile, loading } = useMentorship();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch user's roadmaps
  useEffect(() => {
    const fetchRoadmaps = async () => {
      if (!user) return;

      setLoadingRoadmaps(true);
      try {
        const response = await fetch(`/api/roadmaps?creatorId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          setRoadmaps(data.roadmaps || []);
        }
      } catch (error) {
        console.error("Error fetching roadmaps:", error);
      } finally {
        setLoadingRoadmaps(false);
      }
    };

    if (user) {
      fetchRoadmaps();
    }
  }, [user]);

  // Submit draft for review
  const handleSubmitForReview = async (roadmapId: string) => {
    setActionLoading(roadmapId);
    try {
      const response = await authFetch(`/api/roadmaps/${roadmapId}`, {
        method: "PUT",
        body: JSON.stringify({ action: "submit" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit roadmap");
      }

      // Update local state
      setRoadmaps((prev) =>
        prev.map((r) =>
          r.id === roadmapId ? { ...r, status: "pending" as const } : r
        )
      );
      showSuccessToast("Roadmap submitted for review!");
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to submit");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete roadmap
  const handleDeleteRoadmap = async (roadmapId: string) => {
    setActionLoading(roadmapId);
    try {
      const response = await authFetch(`/api/roadmaps/${roadmapId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete roadmap");
      }

      // Remove from local state
      setRoadmaps((prev) => prev.filter((r) => r.id !== roadmapId));
      showSuccessToast("Roadmap deleted successfully!");
      setDeleteConfirmId(null);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  // Check authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="alert alert-warning">
          <span>Please sign in to view your roadmaps.</span>
        </div>
        <Link href="/mentorship/dashboard" className="btn btn-primary mt-4">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (profile?.role !== "mentor") {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="alert alert-error">
          <span>Only mentors can create and manage roadmaps.</span>
        </div>
        <Link href="/mentorship/dashboard" className="btn btn-ghost mt-4">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="badge badge-ghost">Draft</span>;
      case "pending":
        return <span className="badge badge-warning">Pending Review</span>;
      case "approved":
        return <span className="badge badge-success">Published</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Breadcrumbs */}
      <div className="text-sm breadcrumbs mb-4">
        <ul>
          <li>
            <Link href="/mentorship/dashboard">Dashboard</Link>
          </li>
          <li>
            <Link href="/roadmaps">Roadmaps</Link>
          </li>
          <li>My Roadmaps</li>
        </ul>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">My Roadmaps</h1>
          <Link href="/roadmaps/new" className="btn btn-primary">
            + Create New Roadmap
          </Link>
        </div>
        <p className="text-base-content/70">
          Manage your learning roadmaps and track their approval status
        </p>
      </div>

      {/* Roadmaps List */}
      {loadingRoadmaps ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : roadmaps.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-base-content/70 mb-4">
            You haven't created any roadmaps yet
          </p>
          <Link href="/roadmaps/new" className="btn btn-primary">
            Create Your First Roadmap
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {roadmaps.map((roadmap) => (
            <div key={roadmap.id} className="card bg-base-200 shadow-md">
              <div className="card-body">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="card-title text-xl mb-2">{roadmap.title}</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(roadmap.status)}
                      <span className="badge badge-outline">{roadmap.domain}</span>
                      <span className="badge badge-outline">{roadmap.difficulty}</span>
                      <span className="text-sm text-base-content/60">
                        v{roadmap.draftVersionNumber || roadmap.version}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {roadmap.description && (
                  <p className="text-base-content/80 mb-4">
                    {roadmap.description}
                  </p>
                )}

                {/* Pending Draft Indicator */}
                {roadmap.hasPendingDraft && (
                  <div className="alert alert-info mb-4">
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
                    <span>
                      <strong>Draft v{roadmap.draftVersionNumber} is under review.</strong> Your
                      published version (v{roadmap.version}) remains visible to the public.
                    </span>
                  </div>
                )}

                {/* Admin Feedback */}
                {(roadmap as any).feedback && (
                  <div className="alert alert-warning mb-4">
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
                    <div>
                      <h3 className="font-bold">Admin Requested Changes</h3>
                      <p className="text-sm mt-1">{(roadmap as any).feedback}</p>
                      {(roadmap as any).feedbackAt && (() => {
                        try {
                          const date = new Date((roadmap as any).feedbackAt);
                          if (!isNaN(date.getTime())) {
                            return (
                              <p className="text-xs text-warning-content/80 mt-1">
                                {format(date, "MMM d, yyyy")}
                              </p>
                            );
                          }
                        } catch (e) {
                          console.error("Invalid feedbackAt date:", (roadmap as any).feedbackAt);
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-sm text-base-content/60 mb-4">
                  <div>Created: {format(new Date(roadmap.createdAt), "MMM d, yyyy")}</div>
                  <div>Last updated: {format(new Date(roadmap.updatedAt), "MMM d, yyyy")}</div>
                  {roadmap.status === "approved" && roadmap.approvedAt && (
                    <div>Approved: {format(new Date(roadmap.approvedAt), "MMM d, yyyy")}</div>
                  )}
                </div>

                {/* Actions */}
                <div className="card-actions justify-end">
                  {/* Preview button - always visible */}
                  <Link
                    href={`/roadmaps/${roadmap.id}`}
                    target="_blank"
                    className="btn btn-ghost btn-sm"
                  >
                    👁️ Preview
                  </Link>

                  {/* Edit button - for drafts or approved without pending draft */}
                  {(roadmap.status === "draft" ||
                    (roadmap.status === "approved" && !roadmap.hasPendingDraft)) && (
                    <Link
                      href={`/roadmaps/${roadmap.id}/edit`}
                      className="btn btn-primary btn-sm"
                    >
                      ✏️ Edit
                    </Link>
                  )}

                  {/* Submit button - only for drafts */}
                  {roadmap.status === "draft" && (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleSubmitForReview(roadmap.id)}
                      disabled={actionLoading === roadmap.id}
                    >
                      {actionLoading === roadmap.id ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Submitting...
                        </>
                      ) : (
                        "Submit for Review"
                      )}
                    </button>
                  )}

                  {/* Pending status - no actions needed */}
                  {roadmap.status === "pending" && (
                    <span className="btn btn-sm btn-disabled">
                      ⏳ Awaiting Admin Review
                    </span>
                  )}

                  {/* Draft under review - no edit until approved/rejected */}
                  {roadmap.hasPendingDraft && (
                    <span className="btn btn-sm btn-disabled">
                      ⏳ Draft v{roadmap.draftVersionNumber} Under Review
                    </span>
                  )}

                  {/* Delete button - for drafts and pending (not approved) */}
                  {roadmap.status !== "approved" && (
                    <button
                      className="btn btn-error btn-sm btn-outline"
                      onClick={() => setDeleteConfirmId(roadmap.id)}
                      disabled={actionLoading === roadmap.id}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Delete Roadmap?</h3>
            <p className="py-4">
              Are you sure you want to delete this roadmap? This action cannot be undone.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setDeleteConfirmId(null)}
                disabled={actionLoading === deleteConfirmId}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={() => handleDeleteRoadmap(deleteConfirmId)}
                disabled={actionLoading === deleteConfirmId}
              >
                {actionLoading === deleteConfirmId ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setDeleteConfirmId(null)}></div>
        </div>
      )}
    </div>
  );
}
