"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { Roadmap } from "@/types/mentorship";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import Link from "next/link";
import { format } from "date-fns";
import { getAuth } from "firebase/auth";
import { getApp } from "firebase/app";
import { useDebouncedCallback } from "use-debounce";

const DOMAIN_LABELS: Record<string, string> = {
  "web-dev": "Web Dev",
  frontend: "Frontend",
  backend: "Backend",
  ml: "ML",
  ai: "AI",
  mcp: "MCP",
  agents: "Agents",
  "prompt-engineering": "Prompt Engineering",
};

export default function AdminRoadmapsPage() {
  const toast = useToast();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [filters, setFilters] = useState({
    status: "pending" as string,
    domain: "" as string,
    author: "" as string,
  });
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const debouncedAuthorChange = useDebouncedCallback((value: string) => {
    setFilters((prev) => ({ ...prev, author: value }));
  }, 300);

  const hasActiveFilters =
    filters.status !== "pending" || filters.domain || filters.author;

  useEffect(() => {
    const fetchRoadmaps = async () => {
      setLoadingRoadmaps(true);
      try {
        const params = new URLSearchParams();
        params.set("admin", "true");
        params.set("filter", filters.status);
        if (filters.domain) params.set("domain", filters.domain);
        if (filters.author) params.set("author", filters.author);

        const response = await fetch(`/api/roadmaps?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setRoadmaps(data.roadmaps || []);
        }
      } catch (error) {
        console.error("Error fetching roadmaps:", error);
        toast.error("Failed to load roadmaps");
      } finally {
        setLoadingRoadmaps(false);
      }
    };

    fetchRoadmaps();
  }, [toast, filters]);

  const handleClearFilters = () => {
    setFilters({ status: "pending", domain: "", author: "" });
  };

  const handleApprove = async (id: string, hasPendingDraft?: boolean) => {
    setActionLoading(id);
    try {
      const auth = getAuth(getApp());
      const user = auth.currentUser;
      const authToken = user ? await user.getIdToken() : null;
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);

      const response = await fetch(`/api/roadmaps/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(token ? { "x-admin-token": token } : {}),
        },
        body: JSON.stringify({
          action: hasPendingDraft ? "approve-draft" : "approve",
        }),
      });

      if (response.ok) {
        toast.success("Roadmap approved successfully");
        setRoadmaps(roadmaps.filter((r) => r.id !== id));
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to approve roadmap");
      }
    } catch (error) {
      console.error("Error approving roadmap:", error);
      toast.error("Failed to approve roadmap");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestChanges = async (id: string) => {
    const feedback = prompt(
      "Please provide feedback for the roadmap author (min 10 characters):",
    );
    if (!feedback || feedback.length < 10) {
      toast.error("Feedback must be at least 10 characters");
      return;
    }

    setActionLoading(id);
    try {
      const auth = getAuth(getApp());
      const user = auth.currentUser;
      const authToken = user ? await user.getIdToken() : null;
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);

      const response = await fetch(`/api/roadmaps/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(token ? { "x-admin-token": token } : {}),
        },
        body: JSON.stringify({ action: "request-changes", feedback }),
      });

      if (response.ok) {
        toast.success("Feedback sent to author");
        setRoadmaps(roadmaps.filter((r) => r.id !== id));
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

  const handleDelete = async (id: string, title: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the roadmap "${title}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setActionLoading(id);
    try {
      const auth = getAuth(getApp());
      const user = auth.currentUser;
      const authToken = user ? await user.getIdToken() : null;
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);

      const response = await fetch(`/api/roadmaps/${id}`, {
        method: "DELETE",
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(token ? { "x-admin-token": token } : {}),
        },
      });

      if (response.ok) {
        toast.success("Roadmap deleted");
        setRoadmaps(roadmaps.filter((r) => r.id !== id));
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete roadmap");
      }
    } catch (error) {
      console.error("Error deleting roadmap:", error);
      toast.error("Failed to delete roadmap");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Roadmaps - Admin Review</h1>
      </div>

      {/* Filter bar */}
      <div className="card bg-base-200 shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end flex-wrap">
          {/* Status dropdown */}
          <div className="form-control flex-1 w-full md:w-auto">
            <label className="label">
              <span className="label-text">Status</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="pending">Pending Review</option>
              <option value="all">All Roadmaps</option>
              <option value="approved">Approved</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {/* Domain dropdown */}
          <div className="form-control flex-1 w-full md:w-auto">
            <label className="label">
              <span className="label-text">Domain</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={filters.domain}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, domain: e.target.value }))
              }
            >
              <option value="">All Domains</option>
              {Object.entries(DOMAIN_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Author input */}
          <div className="form-control flex-1 w-full md:w-auto">
            <label className="label">
              <span className="label-text">Author</span>
            </label>
            <input
              type="text"
              placeholder="Filter by author name..."
              className="input input-bordered w-full"
              defaultValue={filters.author}
              onChange={(e) => debouncedAuthorChange(e.target.value)}
            />
          </div>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <button
              className="btn btn-ghost btn-sm gap-2 md:self-end"
              onClick={handleClearFilters}
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Clear Filters
            </button>
          )}
        </div>

        {/* Result count */}
        <div className="mt-4 text-sm text-base-content/60">
          {hasActiveFilters ? (
            <span>{roadmaps.length} roadmaps (filtered)</span>
          ) : (
            <span>{roadmaps.length} roadmaps</span>
          )}
        </div>
      </div>

      {loadingRoadmaps ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : roadmaps.length === 0 ? (
        <div className="text-center py-12 text-base-content/60">
          No roadmaps found
        </div>
      ) : (
        <div className="grid gap-4">
          {roadmaps.map((roadmap) => (
            <div key={roadmap.id} className="card bg-base-200 shadow-md">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <h3 className="card-title flex-1">{roadmap.title}</h3>
                  {roadmap.hasPendingDraft && (
                    <span className="badge badge-info badge-sm">
                      Draft v{roadmap.draftVersionNumber} Pending
                    </span>
                  )}
                </div>
                {roadmap.description && (
                  <p className="text-sm text-base-content/80">
                    {roadmap.description.length > 200
                      ? `${roadmap.description.substring(0, 200)}...`
                      : roadmap.description}
                  </p>
                )}
                <div className="mt-2 space-y-2 text-sm">
                  <div>
                    <span className="font-semibold">Author:</span>{" "}
                    {roadmap.creatorProfile?.displayName || "Unknown"}
                  </div>
                  <div>
                    <span className="font-semibold">Status:</span>{" "}
                    <span
                      className={`badge badge-sm ${
                        roadmap.status === "approved"
                          ? "badge-success"
                          : roadmap.status === "pending"
                            ? "badge-warning"
                            : "badge-ghost"
                      }`}
                    >
                      {roadmap.status}
                    </span>
                    {roadmap.hasPendingDraft && (
                      <span className="ml-2 text-xs text-info">
                        + draft version awaiting approval
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold">Domain:</span>{" "}
                    <span className="badge badge-sm badge-outline">
                      {DOMAIN_LABELS[roadmap.domain] || roadmap.domain}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Difficulty:</span>{" "}
                    <span
                      className={`badge badge-sm ${
                        roadmap.difficulty === "beginner"
                          ? "badge-success"
                          : roadmap.difficulty === "intermediate"
                            ? "badge-warning"
                            : "badge-error"
                      }`}
                    >
                      {roadmap.difficulty}
                    </span>
                  </div>
                  {roadmap.estimatedHours && (
                    <div>
                      <span className="font-semibold">Estimated:</span>{" "}
                      {roadmap.estimatedHours} hours
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">Current Version:</span>{" "}
                    {roadmap.version}
                  </div>
                  <div className="text-xs text-base-content/60">
                    Submitted:{" "}
                    {roadmap.createdAt
                      ? format(
                          new Date(roadmap.createdAt as unknown as string),
                          "MMM d, yyyy",
                        )
                      : "Unknown"}
                  </div>
                </div>
                <div className="card-actions justify-end mt-4">
                  <Link
                    href={`/roadmaps/${roadmap.id}${roadmap.hasPendingDraft ? "?preview=draft" : ""}`}
                    target="_blank"
                    className="btn btn-primary btn-sm"
                  >
                    Preview
                  </Link>
                  {(roadmap.status === "pending" ||
                    roadmap.hasPendingDraft) && (
                    <>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() =>
                          handleApprove(roadmap.id, roadmap.hasPendingDraft)
                        }
                        disabled={actionLoading === roadmap.id}
                      >
                        {actionLoading === roadmap.id ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            Approving...
                          </>
                        ) : roadmap.hasPendingDraft ? (
                          `Approve v${roadmap.draftVersionNumber}`
                        ) : (
                          "Approve"
                        )}
                      </button>
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => handleRequestChanges(roadmap.id)}
                        disabled={actionLoading === roadmap.id}
                      >
                        Request Changes
                      </button>
                    </>
                  )}
                  <button
                    className="btn btn-error btn-sm"
                    onClick={() => handleDelete(roadmap.id, roadmap.title)}
                    disabled={actionLoading === roadmap.id}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
