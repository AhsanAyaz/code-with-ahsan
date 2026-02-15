"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { Project } from "@/types/mentorship";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import { format } from "date-fns";
import Link from "next/link";
import ProjectFilters from "@/components/admin/ProjectFilters";
import DeleteProjectDialog from "@/components/admin/DeleteProjectDialog";
import DeclineProjectDialog from "@/components/admin/DeclineProjectDialog";
import DeletionSummaryModal from "@/components/admin/DeletionSummaryModal";
import ContactInfo from "@/components/mentorship/ContactInfo";
import ProfileAvatar from "@/components/ProfileAvatar";

interface EnrichedProject extends Project {
  memberCount: number;
  applicationCount: number;
  invitationCount: number;
}

interface DeletionSummary {
  projectTitle: string;
  membersRemoved: number;
  applicationsDeleted: number;
  invitationsDeleted: number;
  discordChannelDeleted: boolean;
  membersNotified: number;
  notificationsFailed: number;
}

export default function AdminProjectsPage() {
  const toast = useToast();
  const [projects, setProjects] = useState<EnrichedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    search: "",
    fromDate: "",
    toDate: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<EnrichedProject | null>(null);
  const [declineTarget, setDeclineTarget] = useState<EnrichedProject | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deletionSummary, setDeletionSummary] = useState<DeletionSummary | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        const params = new URLSearchParams();
        if (filters.status) params.set("status", filters.status);
        if (filters.search) params.set("search", filters.search);
        if (filters.fromDate) params.set("fromDate", filters.fromDate);
        if (filters.toDate) params.set("toDate", filters.toDate);

        const response = await fetch(`/api/admin/projects?${params.toString()}`, {
          headers: token ? { "x-admin-token": token } : {},
        });

        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        } else {
          toast.error("Failed to load projects");
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [filters, toast]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ status: "", search: "", fromDate: "", toDate: "" });
  };

  const handleApprove = async (project: EnrichedProject) => {
    setActionLoading(project.id);

    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-admin-token": token } : {}),
        },
        body: JSON.stringify({ action: "approve" }),
      });

      if (response.ok) {
        toast.success("Project approved successfully");
        // Update project status in list
        setProjects((prev) =>
          prev.map((p) =>
            p.id === project.id ? { ...p, status: "active" } : p
          )
        );
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to approve project");
      }
    } catch (error) {
      console.error("Error approving project:", error);
      toast.error("Failed to approve project");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineConfirm = async (reason: string) => {
    if (!declineTarget) return;

    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      const response = await fetch(`/api/admin/projects/${declineTarget.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-admin-token": token } : {}),
        },
        body: JSON.stringify({ action: "decline", declineReason: reason }),
      });

      if (response.ok) {
        toast.success("Project declined");
        // Update project status in list
        setProjects((prev) =>
          prev.map((p) =>
            p.id === declineTarget.id ? { ...p, status: "declined" } : p
          )
        );
        // Close dialog
        setDeclineTarget(null);
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to decline project");
      }
    } catch (error) {
      console.error("Error declining project:", error);
      throw error; // Re-throw so dialog can show error
    }
  };

  const handleDeleteConfirm = async (reason: string) => {
    if (!deleteTarget) return;

    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      const response = await fetch(`/api/admin/projects/${deleteTarget.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-admin-token": token } : {}),
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        const data = await response.json();
        // Remove from list
        setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        // Close dialog
        setDeleteTarget(null);
        // Show summary
        setDeletionSummary(data.summary);
        // Show toast
        toast.success(`Project "${deleteTarget.title}" deleted successfully`);
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      throw error; // Re-throw so dialog can show error
    }
  };


  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "badge-warning";
      case "active":
        return "badge-success";
      case "completed":
        return "badge-info";
      case "declined":
        return "badge-error";
      default:
        return "badge-ghost";
    }
  };

  const getDifficultyBadgeClass = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "badge-success";
      case "intermediate":
        return "badge-warning";
      case "advanced":
        return "badge-error";
      default:
        return "badge-ghost";
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "N/A";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "MMM d, yyyy");
  };

  const formatTimestamp = (date: Date | undefined) => {
    if (!date) return "N/A";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "MMM d, yyyy h:mm a");
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold">Projects Management</h1>
        <p className="text-base-content/60 mt-1">
          View and manage all projects in the system
        </p>
      </div>

      {/* Filters */}
      <ProjectFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        resultCount={projects.length}
      />

      {/* Loading state */}
      {loading ? (
        <div className="grid gap-4">
          <div className="skeleton h-48 w-full"></div>
          <div className="skeleton h-48 w-full"></div>
          <div className="skeleton h-48 w-full"></div>
        </div>
      ) : projects.length === 0 ? (
        /* Empty state */
        <div className="text-center py-12 space-y-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto text-base-content/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <div>
            <h3 className="text-lg font-semibold">No projects found</h3>
            <p className="text-base-content/60 mt-1">
              Try adjusting your filters
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleClearFilters}>
            Clear Filters
          </button>
        </div>
      ) : (
        /* Projects grid */
        <div className="grid gap-4">
          {projects.map((project) => (
            <div key={project.id} className="card bg-base-200 shadow-md">
              <div className="card-body">
                {/* Header row: Title + Status */}
                <div className="flex items-start justify-between gap-4">
                  <h3 className="card-title text-xl">{project.title}</h3>
                  <span className={`badge ${getStatusBadgeClass(project.status)}`}>
                    {project.status}
                  </span>
                </div>

                {/* Creator info */}
                <div className="flex items-center gap-3 mt-2">
                  <ProfileAvatar
                    photoURL={project.creatorProfile?.photoURL}
                    displayName={project.creatorProfile?.displayName}
                    size="md"
                  />
                  <div className="text-sm">
                    <div className="font-semibold">
                      {project.creatorProfile?.displayName || "Unknown"}
                    </div>
                    {/* Discord contact info */}
                    <ContactInfo
                      discordUsername={project.creatorProfile?.discordUsername}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-base-content/80 mt-2">
                  {truncateText(project.description, 150)}
                </p>

                {/* Tech stack */}
                {project.techStack && project.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {project.techStack.map((tech, idx) => (
                      <span key={idx} className="badge badge-sm badge-outline">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-3 bg-base-300 rounded-lg">
                  <div className="text-center">
                    <div className="text-xs text-base-content/60">Team</div>
                    <div className="text-sm font-semibold">
                      {project.memberCount}/{project.maxTeamSize}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-base-content/60">Applications</div>
                    <div className="text-sm font-semibold">
                      {project.applicationCount}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-base-content/60">Invitations</div>
                    <div className="text-sm font-semibold">
                      {project.invitationCount}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-base-content/60">Difficulty</div>
                    <div>
                      <span className={`badge badge-sm ${getDifficultyBadgeClass(project.difficulty)}`}>
                        {project.difficulty}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timestamps row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 text-xs text-base-content/60">
                  <div>
                    <span className="font-semibold">Created:</span>{" "}
                    {formatDate(project.createdAt)}
                  </div>
                  {project.lastActivityAt && (
                    <div>
                      <span className="font-semibold">Last activity:</span>{" "}
                      {formatTimestamp(project.lastActivityAt)}
                    </div>
                  )}
                  {project.approvedAt && (
                    <div>
                      <span className="font-semibold">Approved:</span>{" "}
                      {formatDate(project.approvedAt)}
                    </div>
                  )}
                  {project.completedAt && (
                    <div>
                      <span className="font-semibold">Completed:</span>{" "}
                      {formatDate(project.completedAt)}
                    </div>
                  )}
                </div>

                {/* GitHub and Discord links */}
                <div className="flex flex-wrap gap-3 mt-3">
                  {project.githubRepo && (
                    <a
                      href={project.githubRepo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary text-sm flex items-center gap-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      GitHub
                    </a>
                  )}
                  {project.discordChannelUrl && (
                    <a
                      href={project.discordChannelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary text-sm flex items-center gap-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                      </svg>
                      Discord
                    </a>
                  )}
                </div>

                {/* Actions dropdown */}
                <div className="card-actions justify-end mt-4">
                  <div className="dropdown dropdown-end">
                    <button tabIndex={0} className="btn btn-sm btn-ghost gap-2">
                      Actions
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
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    <ul
                      tabIndex={0}
                      className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
                    >
                      <li>
                        <Link href={`/projects/${project.id}`} target="_blank">
                          View Project
                        </Link>
                      </li>
                      <li>
                        <Link href={`/projects/${project.id}/edit`} target="_blank">
                          Edit Project
                        </Link>
                      </li>
                      {project.status === "pending" && (
                        <>
                          <li className="border-t border-base-300 pt-2">
                            <button
                              className="text-success"
                              onClick={() => handleApprove(project)}
                              disabled={actionLoading === project.id}
                            >
                              {actionLoading === project.id ? (
                                <>
                                  <span className="loading loading-spinner loading-xs"></span>
                                  Approving...
                                </>
                              ) : (
                                "Approve"
                              )}
                            </button>
                          </li>
                          <li>
                            <button
                              className="text-warning"
                              onClick={() => setDeclineTarget(project)}
                            >
                              Decline
                            </button>
                          </li>
                        </>
                      )}
                      <li className="border-t border-base-300 pt-2">
                        <button
                          className="text-error"
                          onClick={() => setDeleteTarget(project)}
                        >
                          Delete Project
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <DeleteProjectDialog
          project={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Decline confirmation dialog */}
      {declineTarget && (
        <DeclineProjectDialog
          project={declineTarget}
          onConfirm={handleDeclineConfirm}
          onCancel={() => setDeclineTarget(null)}
        />
      )}

      {/* Deletion summary modal */}
      {deletionSummary && (
        <DeletionSummaryModal
          summary={deletionSummary}
          onClose={() => setDeletionSummary(null)}
        />
      )}
    </div>
  );
}
