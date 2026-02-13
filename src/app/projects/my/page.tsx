"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMentorship } from "@/contexts/MentorshipContext";
import ProjectCard from "@/components/projects/ProjectCard";
import { Project, ProjectInvitation, ProjectDifficulty } from "@/types/mentorship";
import Link from "next/link";
import { authFetch } from "@/lib/apiClient";
import ToastContainer, { ToastMessage, ToastType } from "@/components/ui/Toast";
import Image from "next/image";

export const dynamic = "force-dynamic";

interface InvitationWithProject extends ProjectInvitation {
  project?: {
    id: string;
    title: string;
    status: string;
    difficulty: ProjectDifficulty;
    techStack: string[];
    creatorProfile?: {
      displayName: string;
      photoURL: string;
      username?: string;
    };
    maxTeamSize: number;
    memberCount: number;
  } | null;
}

export default function MyProjectsPage() {
  const { user, loading: authLoading } = useMentorship();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"created" | "joined" | "invitations">("created");
  const [projects, setProjects] = useState<Project[]>([]);
  const [invitations, setInvitations] = useState<InvitationWithProject[]>([]);
  const [invitationCount, setInvitationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const difficultyColors: Record<ProjectDifficulty, string> = {
    beginner: "badge-success",
    intermediate: "badge-warning",
    advanced: "badge-error",
  };

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/mentorship/dashboard");
    }
  }, [authLoading, user, router]);

  // Fetch invitation count on mount
  useEffect(() => {
    if (!user) return;

    const fetchInvitationCount = async () => {
      try {
        const response = await authFetch("/api/projects/invitations/my");
        if (response.ok) {
          const data = await response.json();
          setInvitationCount(data.invitations?.length || 0);
          setInvitations(data.invitations || []);
        }
      } catch (err) {
        console.error("Error fetching invitation count:", err);
      }
    };

    fetchInvitationCount();
  }, [user]);

  // Fetch projects when tab changes or user loads
  useEffect(() => {
    if (!user) return;

    if (activeTab === "invitations") {
      // Use already-fetched invitations data
      setInvitationsLoading(false);
      return;
    }

    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const url =
          activeTab === "created"
            ? `/api/projects?creatorId=${user.uid}`
            : `/api/projects?member=${user.uid}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch projects");
        }
        const data = await response.json();
        setProjects(data.projects || []);
      } catch (err) {
        console.error("Error fetching projects:", err);
        setError("Failed to load projects. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user, activeTab]);

  const handleAcceptInvitation = async (projectId: string, userId: string, invId: string) => {
    setActionLoadingId(invId);
    try {
      const response = await authFetch(
        `/api/projects/${projectId}/invitations/${userId}`,
        {
          method: "PUT",
          body: JSON.stringify({ action: "accept" }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to accept invitation");
      }

      // Remove invitation from local state
      setInvitations((prev) => prev.filter((inv) => inv.id !== invId));
      setInvitationCount((prev) => Math.max(0, prev - 1));
      showToast("Invitation accepted! You've joined the project.", "success");
    } catch (err) {
      console.error("Error accepting invitation:", err);
      showToast(
        err instanceof Error ? err.message : "Failed to accept invitation",
        "error"
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineInvitation = async (projectId: string, userId: string, invId: string) => {
    setActionLoadingId(invId);
    try {
      const response = await authFetch(
        `/api/projects/${projectId}/invitations/${userId}`,
        {
          method: "PUT",
          body: JSON.stringify({ action: "decline" }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to decline invitation");
      }

      // Remove invitation from local state
      setInvitations((prev) => prev.filter((inv) => inv.id !== invId));
      setInvitationCount((prev) => Math.max(0, prev - 1));
      showToast("Invitation declined.", "success");
    } catch (err) {
      console.error("Error declining invitation:", err);
      showToast(
        err instanceof Error ? err.message : "Failed to decline invitation",
        "error"
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setDeletingProjectId(projectId);
    try {
      const response = await authFetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete project");
      }

      // Remove project from local state
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setConfirmDeleteId(null);
      showToast("Project deleted successfully", "success");
    } catch (err) {
      console.error("Error deleting project:", err);
      showToast(
        err instanceof Error ? err.message : "Failed to delete project",
        "error"
      );
    } finally {
      setDeletingProjectId(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Projects</h1>
          <p className="text-base-content/70">
            View projects you&apos;ve created or joined
          </p>
        </div>
        {activeTab === "created" && (
          <Link href="/projects/new" className="btn btn-primary">
            Create Project
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${activeTab === "created" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("created")}
        >
          Created
        </button>
        <button
          className={`tab ${activeTab === "joined" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("joined")}
        >
          Joined
        </button>
        <button
          className={`tab ${activeTab === "invitations" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("invitations")}
        >
          Invitations
          {invitationCount > 0 && (
            <span className="badge badge-primary badge-sm ml-2">{invitationCount}</span>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === "invitations" ? (
        invitationsLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-base-content/70 mb-4">
              No pending invitations
            </p>
            <Link href="/projects/discover" className="btn btn-primary">
              Discover Projects
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {invitations.map((inv) => {
              if (!inv.project) return null;
              const project = inv.project;
              return (
                <div key={inv.id} className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <h2 className="card-title">
                      <Link
                        href={`/projects/${inv.projectId}`}
                        className="hover:text-primary"
                      >
                        {project.title}
                      </Link>
                    </h2>

                    <div className="flex gap-2 flex-wrap mt-2">
                      <span className={`badge ${difficultyColors[project.difficulty]}`}>
                        {project.difficulty}
                      </span>
                    </div>

                    {/* Tech Stack */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {project.techStack.slice(0, 4).map((tech) => (
                        <span key={tech} className="badge badge-outline badge-sm">
                          {tech}
                        </span>
                      ))}
                      {project.techStack.length > 4 && (
                        <span className="badge badge-outline badge-sm">
                          +{project.techStack.length - 4}
                        </span>
                      )}
                    </div>

                    {/* Creator */}
                    {project.creatorProfile && (
                      <div className="flex items-center gap-2 mt-3">
                        {project.creatorProfile.photoURL && (
                          <div className="avatar">
                            <div className="w-6 h-6 rounded-full">
                              <Image
                                src={project.creatorProfile.photoURL}
                                alt={project.creatorProfile.displayName}
                                width={24}
                                height={24}
                              />
                            </div>
                          </div>
                        )}
                        <span className="text-sm text-base-content/70">
                          by {project.creatorProfile.displayName}
                        </span>
                      </div>
                    )}

                    {/* Team Capacity */}
                    <div className="text-sm text-base-content/70 mt-2">
                      Team: {project.memberCount || 0} / {project.maxTeamSize} members
                    </div>

                    {/* Action Buttons */}
                    <div className="card-actions justify-end mt-4">
                      <button
                        onClick={() => handleDeclineInvitation(inv.projectId, inv.userId, inv.id)}
                        className="btn btn-ghost btn-sm"
                        disabled={actionLoadingId === inv.id}
                      >
                        {actionLoadingId === inv.id ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          "Decline"
                        )}
                      </button>
                      <button
                        onClick={() => handleAcceptInvitation(inv.projectId, inv.userId, inv.id)}
                        className="btn btn-success btn-sm"
                        disabled={actionLoadingId === inv.id}
                      >
                        {actionLoadingId === inv.id ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          "Accept"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : error ? (
        <div className="alert alert-error">
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
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-base-content/70 mb-4">
            {activeTab === "created"
              ? "You haven't created any projects yet."
              : "You haven't joined any projects yet."}
          </p>
          <Link href="/projects/discover" className="btn btn-primary">
            Discover Projects
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="relative">
              <ProjectCard project={project} />
              {activeTab === "created" && (project.status === "pending" || project.status === "declined") && (
                <div className="absolute top-2 right-2 flex gap-2">
                  {/* Edit button - shown for both pending and declined */}
                  <Link
                    href={`/projects/${project.id}/edit`}
                    className="btn btn-primary btn-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Edit
                  </Link>

                  {/* Delete button - only for declined projects */}
                  {project.status === "declined" && (
                    <>
                      {confirmDeleteId === project.id ? (
                        <div className="flex gap-2 bg-base-100 rounded-lg p-2 shadow-lg">
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="btn btn-error btn-xs"
                            disabled={deletingProjectId === project.id}
                          >
                            {deletingProjectId === project.id ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                              "Confirm Delete"
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="btn btn-ghost btn-xs"
                            disabled={deletingProjectId === project.id}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setConfirmDeleteId(project.id);
                          }}
                          className="btn btn-error btn-xs"
                          title="Delete declined project"
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
