"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMentorship } from "@/contexts/MentorshipContext";
import TeamRoster from "@/components/projects/TeamRoster";
import ApplicationForm from "@/components/projects/ApplicationForm";
import Link from "next/link";
import Image from "next/image";
import ToastContainer, { ToastMessage, ToastType } from "@/components/ui/Toast";
import { authFetch } from "@/lib/apiClient";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  Project,
  ProjectMember,
  ProjectApplication,
  ProjectInvitation,
  ProjectDifficulty,
  MentorshipRole,
} from "@/types/mentorship";

export const dynamic = "force-dynamic";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { user, profile, loading: authLoading } = useMentorship();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [applications, setApplications] = useState<ProjectApplication[]>([]);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [userApplication, setUserApplication] = useState<ProjectApplication | null>(null);
  const [userInvitation, setUserInvitation] = useState<ProjectInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [declineFeedback, setDeclineFeedback] = useState<Record<string, string>>({});
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmClass: string;
    onConfirm: () => void;
  } | null>(null);

  const isCreator = user && project?.creatorId === user.uid;
  const isMember = members.some((m) => m.userId === user?.uid);

  const getSkillLevelFromRole = (role: MentorshipRole): ProjectDifficulty | undefined => {
    if (role === "mentor") return "advanced";
    if (role === "mentee") return "beginner";
    return undefined;
  };

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

  const showConfirm = (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    confirmClass?: string;
    onConfirm: () => void;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: opts.title,
      message: opts.message,
      confirmLabel: opts.confirmLabel || "Confirm",
      confirmClass: opts.confirmClass || "btn-primary",
      onConfirm: () => {
        setConfirmModal(null);
        opts.onConfirm();
      },
    });
  };

  // Fetch project data
  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch project
      const projectRes = await fetch(`/api/projects/${projectId}`);
      if (!projectRes.ok) {
        throw new Error("Project not found");
      }
      const projectData = await projectRes.json();
      setProject(projectData.project);

      // Fetch members
      const membersRes = await fetch(`/api/projects/${projectId}/members`);
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members || []);
      }

      // Fetch user's application status if logged in
      if (user) {
        const appRes = await fetch(
          `/api/projects/${projectId}/applications?userId=${user.uid}`
        );
        if (appRes.ok) {
          const appData = await appRes.json();
          if (appData.applications?.length > 0) {
            setUserApplication(appData.applications[0]);
          }
        }

        // Fetch pending invitations for current user
        const invRes = await fetch(`/api/projects/${projectId}/invitations`);
        if (invRes.ok) {
          const invData = await invRes.json();
          const userInv = invData.invitations?.find(
            (inv: ProjectInvitation) => inv.userId === user.uid && inv.status === "pending"
          );
          if (userInv) {
            setUserInvitation(userInv);
          }
        }
      }

      // Fetch applications if creator
      if (user && projectData.project.creatorId === user.uid) {
        const appsRes = await fetch(`/api/projects/${projectId}/applications`);
        if (appsRes.ok) {
          const appsData = await appsRes.json();
          setApplications(
            appsData.applications?.filter((app: ProjectApplication) => app.status === "pending") ||
              []
          );
        }

        // Fetch all invitations if creator
        const invsRes = await fetch(`/api/projects/${projectId}/invitations`);
        if (invsRes.ok) {
          const invsData = await invsRes.json();
          setInvitations(invsData.invitations || []);
        }
      }
    } catch (err) {
      console.error("Error fetching project:", err);
      setError("Failed to load project data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && !authLoading) {
      fetchProjectData();
    }
  }, [projectId, user, authLoading]);

  const handleApproveApplication = async (userId: string) => {
    try {
      const response = await authFetch(
        `/api/projects/${projectId}/applications/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        }
      );

      if (response.ok) {
        fetchProjectData();
        showToast("Application approved!", "success");
      } else {
        const data = await response.json();
        showToast(data.error || "Failed to approve application", "error");
      }
    } catch (error) {
      console.error("Error approving application:", error);
      showToast("An error occurred", "error");
    }
  };

  const handleDeclineApplication = async (userId: string) => {
    const feedback = declineFeedback[userId];
    try {
      const response = await authFetch(
        `/api/projects/${projectId}/applications/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "decline", feedback }),
        }
      );

      if (response.ok) {
        fetchProjectData();
        setDeclineFeedback((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        showToast("Application declined", "success");
      } else {
        const data = await response.json();
        showToast(data.error || "Failed to decline application", "error");
      }
    } catch (error) {
      console.error("Error declining application:", error);
      showToast("An error occurred", "error");
    }
  };

  const handleInvite = async () => {
    if (!inviteInput.trim()) return;

    setInviteLoading(true);
    try {
      const input = inviteInput.trim();
      const isEmail = input.includes("@");

      const response = await authFetch(`/api/projects/${projectId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitedBy: user?.uid,
          ...(isEmail ? { email: input } : { discordUsername: input }),
        }),
      });

      if (response.ok) {
        setInviteInput("");
        fetchProjectData();
        showToast("Invitation sent successfully!", "success");
      } else {
        const data = await response.json();
        showToast(data.error || "Failed to send invitation", "error");
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      showToast("An error occurred", "error");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!userInvitation) return;

    try {
      const response = await authFetch(
        `/api/projects/${projectId}/invitations/${user?.uid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "accept" }),
        }
      );

      if (response.ok) {
        fetchProjectData();
        showToast("Invitation accepted!", "success");
      } else {
        const data = await response.json();
        showToast(data.error || "Failed to accept invitation", "error");
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      showToast("An error occurred", "error");
    }
  };

  const handleDeclineInvitation = async () => {
    if (!userInvitation) return;

    try {
      const response = await authFetch(
        `/api/projects/${projectId}/invitations/${user?.uid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "decline" }),
        }
      );

      if (response.ok) {
        fetchProjectData();
        showToast("Invitation declined", "success");
      } else {
        const data = await response.json();
        showToast(data.error || "Failed to decline invitation", "error");
      }
    } catch (error) {
      console.error("Error declining invitation:", error);
      showToast("An error occurred", "error");
    }
  };

  const handleLeaveProject = () => {
    showConfirm({
      title: "Leave Project",
      message: "Are you sure you want to leave this project?",
      confirmLabel: "Leave",
      confirmClass: "btn-error",
      onConfirm: async () => {
        setLeaveLoading(true);
        try {
          const response = await authFetch(`/api/projects/${projectId}/leave`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user?.uid }),
          });
          if (response.ok) {
            fetchProjectData();
            showToast("You have left the project", "success");
          } else {
            const data = await response.json();
            showToast(data.error || "Failed to leave project", "error");
          }
        } catch (error) {
          console.error("Error leaving project:", error);
          showToast("An error occurred", "error");
        } finally {
          setLeaveLoading(false);
        }
      },
    });
  };

  const handleRemoveMember = (memberId: string) => {
    showConfirm({
      title: "Remove Member",
      message: "Are you sure you want to remove this member from the project?",
      confirmLabel: "Remove",
      confirmClass: "btn-error",
      onConfirm: async () => {
        setRemovingMemberId(memberId);
        try {
          const response = await authFetch(
            `/api/projects/${projectId}/members/${memberId}`,
            {
              method: "DELETE",
              body: JSON.stringify({ requestorId: user?.uid }),
            }
          );

          if (response.ok) {
            fetchProjectData();
            showToast("Member removed successfully", "success");
          } else {
            const data = await response.json();
            showToast(data.error || "Failed to remove member", "error");
          }
        } catch (error) {
          console.error("Error removing member:", error);
          showToast("An error occurred", "error");
        } finally {
          setRemovingMemberId(null);
        }
      },
    });
  };

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto p-8">
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
          <span>{error || "Project not found"}</span>
        </div>
        <Link href="/projects/discover" className="btn btn-ghost mt-4">
          Back to Discovery
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
            <div className="flex items-center gap-2 mb-3">
              {project.creatorProfile?.photoURL && (
                <Image
                  src={project.creatorProfile.photoURL}
                  alt={project.creatorProfile.displayName}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className="text-base-content/70">
                Created by {project.creatorProfile?.displayName}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <span className="badge badge-lg">{project.status}</span>
          <span className={`badge badge-lg ${difficultyColors[project.difficulty]}`}>
            {project.difficulty}
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Description</h2>
        <p className="text-base-content/80 whitespace-pre-wrap">{project.description}</p>
      </div>

      {/* Tech Stack */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Tech Stack</h2>
        <div className="flex flex-wrap gap-2">
          {project.techStack.map((tech, index) => (
            <span key={index} className="badge badge-lg badge-outline">
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Links */}
      {(project.githubRepo || (project.discordChannelUrl && (isCreator || isMember))) && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Links</h2>
          {project.githubRepo && (
            <div>
              <a
                href={project.githubRepo}
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary"
              >
                GitHub Repository
              </a>
            </div>
          )}
          {project.discordChannelUrl && (isCreator || isMember) && (
            <div>
              <a
                href={project.discordChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary"
              >
                Discord Channel
              </a>
            </div>
          )}
        </div>
      )}

      {/* Team Roster */}
      <TeamRoster
        project={project}
        members={members}
        isCreator={!!isCreator}
        onRemoveMember={isCreator ? handleRemoveMember : undefined}
      />

      {/* Leave Project Button */}
      {isMember && !isCreator && (
        <div className="flex justify-end">
          <button
            onClick={handleLeaveProject}
            className="btn btn-outline btn-error btn-sm"
            disabled={leaveLoading}
          >
            {leaveLoading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Leaving...
              </>
            ) : (
              "Leave Project"
            )}
          </button>
        </div>
      )}

      {/* Creator Section: Applications and Invitations */}
      {isCreator && (
        <div className="space-y-6">
          {/* Pending Applications */}
          {applications.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Pending Applications</h2>
              <div className="space-y-4">
                {applications.map((app) => (
                  <div key={app.id} className="card bg-base-200 shadow-md">
                    <div className="card-body">
                      <div className="flex items-center gap-3 mb-3">
                        {app.userProfile?.photoURL && (
                          <Image
                            src={app.userProfile.photoURL}
                            alt={app.userProfile.displayName}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        )}
                        <div>
                          <div className="font-semibold">
                            {app.userProfile?.displayName}
                          </div>
                          {app.userProfile?.username && (
                            <div className="text-sm text-base-content/70">
                              @{app.userProfile.username}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm mb-3">{app.message}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveApplication(app.userId)}
                          className="btn btn-success btn-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const showFeedback = !declineFeedback[app.userId];
                            if (showFeedback) {
                              setDeclineFeedback((prev) => ({ ...prev, [app.userId]: "" }));
                            } else {
                              handleDeclineApplication(app.userId);
                            }
                          }}
                          className="btn btn-error btn-sm"
                        >
                          Decline
                        </button>
                      </div>
                      {declineFeedback[app.userId] !== undefined && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            placeholder="Optional feedback for applicant..."
                            className="textarea textarea-bordered w-full"
                            value={declineFeedback[app.userId]}
                            onChange={(e) =>
                              setDeclineFeedback((prev) => ({
                                ...prev,
                                [app.userId]: e.target.value,
                              }))
                            }
                          />
                          <button
                            onClick={() => handleDeclineApplication(app.userId)}
                            className="btn btn-error btn-sm"
                          >
                            Confirm Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invitation Form */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Invite Team Members</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Email or Discord username"
                className="input input-bordered flex-1"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                disabled={inviteLoading}
              />
              <button
                onClick={handleInvite}
                className="btn btn-primary"
                disabled={inviteLoading || !inviteInput.trim()}
              >
                {inviteLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Inviting...
                  </>
                ) : (
                  "Invite"
                )}
              </button>
            </div>
          </div>

          {/* Sent Invitations */}
          {invitations.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Sent Invitations</h2>
              <div className="space-y-3">
                {invitations.map((inv) => {
                  const statusBadge: Record<string, string> = {
                    pending: "badge-warning",
                    accepted: "badge-success",
                    declined: "badge-error",
                  };
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between bg-base-200 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        {inv.userProfile?.photoURL && (
                          <Image
                            src={inv.userProfile.photoURL}
                            alt={inv.userProfile.displayName}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        )}
                        <div>
                          <div className="font-medium">
                            {inv.userProfile?.displayName || "Invited User"}
                          </div>
                          {inv.userProfile?.discordUsername && (
                            <div className="text-sm text-base-content/60">
                              @{inv.userProfile.discordUsername}
                            </div>
                          )}
                        </div>
                      </div>
                      <span
                        className={`badge ${statusBadge[inv.status] || "badge-ghost"}`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Non-creator, Non-member: Application Form */}
      {user && !isCreator && !isMember && !userApplication && !userInvitation && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Apply to Join</h2>
          <ApplicationForm
            projectId={projectId}
            project={project}
            userId={user.uid}
            userSkillLevel={getSkillLevelFromRole(profile?.role ?? null)}
            onSuccess={fetchProjectData}
          />
        </div>
      )}

      {/* User has already applied */}
      {userApplication && !isMember && (
        <div className="alert alert-info">
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-bold">Application Status: {userApplication.status}</h3>
            {userApplication.status === "pending" && (
              <div className="text-sm">
                Your application is pending review by the project creator.
              </div>
            )}
            {userApplication.status === "declined" && userApplication.feedback && (
              <div className="text-sm">Feedback: {userApplication.feedback}</div>
            )}
          </div>
        </div>
      )}

      {/* User has pending invitation */}
      {userInvitation && !isMember && (
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h2 className="card-title">You've Been Invited!</h2>
            <p>
              The project creator has invited you to join this project. Accept the
              invitation to become a team member.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAcceptInvitation}
                className="btn btn-success"
              >
                Accept Invitation
              </button>
              <button
                onClick={handleDeclineInvitation}
                className="btn btn-ghost"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unauthenticated users */}
      {!user && (
        <div className="alert alert-warning">
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
            <h3 className="font-bold">Sign in to apply</h3>
            <div className="text-sm">
              <Link href="/mentorship/dashboard" className="link">
                Sign in to your account
              </Link>{" "}
              to apply to this project.
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          confirmClass={confirmModal.confirmClass}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
