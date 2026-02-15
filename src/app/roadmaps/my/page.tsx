"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useMentorship } from "@/contexts/MentorshipContext";
import { useToast } from "@/contexts/ToastContext";
import { authFetch } from "@/lib/apiClient";
import { Roadmap } from "@/types/mentorship";
import RoadmapActionsDropdown from "@/components/roadmaps/RoadmapActionsDropdown";

export const dynamic = "force-dynamic";

export default function MyRoadmapsPage() {
  const { user, profile, loading } = useMentorship();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(true);

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

  // Callback for dropdown actions to update local state
  const handleAction = (action: string, roadmapId: string) => {
    if (action === "submit") {
      setRoadmaps((prev) =>
        prev.map((r) =>
          r.id === roadmapId ? { ...r, status: "pending" as const } : r
        )
      );
    } else if (action === "delete") {
      setRoadmaps((prev) => prev.filter((r) => r.id !== roadmapId));
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
                  <RoadmapActionsDropdown roadmap={roadmap} onAction={handleAction} />
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
