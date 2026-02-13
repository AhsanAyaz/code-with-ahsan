"use client";

import { useState } from "react";
import { Project } from "@/types/mentorship";

interface EnrichedProject extends Project {
  memberCount: number;
  applicationCount: number;
  invitationCount: number;
}

interface DeleteProjectDialogProps {
  project: EnrichedProject;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

export default function DeleteProjectDialog({
  project,
  onConfirm,
  onCancel,
}: DeleteProjectDialogProps) {
  const [step, setStep] = useState<"impact" | "reason">("impact");
  const [reason, setReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirmDelete = async () => {
    if (reason.length < 10) return;

    setIsDeleting(true);
    setError("");

    try {
      await onConfirm(reason);
      // Dialog will be closed by parent on success
    } catch (err: any) {
      setError(err.message || "Failed to delete project");
      setIsDeleting(false);
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

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        {step === "impact" ? (
          /* Step 1: Impact Summary */
          <>
            <h3 className="font-bold text-2xl text-error">Delete Project</h3>

            {/* Project info card */}
            <div className="card bg-base-200 mt-4">
              <div className="card-body p-4">
                <div className="flex items-start justify-between gap-4">
                  <h4 className="font-semibold text-lg">{project.title}</h4>
                  <span className={`badge ${getStatusBadgeClass(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                <div className="text-sm text-base-content/80">
                  Creator: {project.creatorProfile?.displayName || "Unknown"}
                </div>
              </div>
            </div>

            {/* Impact summary */}
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
              <div className="text-sm">
                <p className="font-semibold mb-2">This action will affect:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{project.memberCount} team member(s) will lose access</li>
                  <li>{project.applicationCount} application(s) will be deleted</li>
                  <li>{project.invitationCount} invitation(s) will be deleted</li>
                  {project.discordChannelId && (
                    <li>Discord channel and all messages will be permanently deleted</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Irreversibility warning */}
            <div className="alert alert-error mt-4">
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
              <span className="text-sm">
                <strong>This action cannot be undone.</strong> All project data will be
                permanently deleted.
              </span>
            </div>

            {/* Buttons */}
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={onCancel}>
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={() => setStep("reason")}
              >
                Continue to Delete
              </button>
            </div>
          </>
        ) : (
          /* Step 2: Reason Input */
          <>
            <h3 className="font-bold text-2xl text-error">Deletion Reason Required</h3>

            <p className="py-4 text-sm text-base-content/80">
              Please provide a reason for deleting this project. This will be logged for
              audit trail and sent to all affected team members via Discord.
            </p>

            {/* Textarea */}
            <div className="form-control">
              <textarea
                className="textarea textarea-bordered w-full h-32"
                placeholder="Enter deletion reason (e.g., policy violation, duplicate project, creator request)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                autoFocus
                disabled={isDeleting}
              />
              <label className="label">
                <span className="label-text-alt">
                  {reason.length}/10 minimum characters
                </span>
                <span
                  className={`label-text-alt ${
                    reason.length >= 10 ? "text-success" : "text-error"
                  }`}
                >
                  {reason.length >= 10 ? "Ready" : "Minimum 10 characters required"}
                </span>
              </label>
            </div>

            {/* Error message */}
            {error && (
              <div className="alert alert-error mt-4">
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
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setStep("impact")}
                disabled={isDeleting}
              >
                Back
              </button>
              <button
                className="btn btn-error"
                onClick={handleConfirmDelete}
                disabled={reason.length < 10 || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Deleting...
                  </>
                ) : (
                  "Confirm Delete"
                )}
              </button>
            </div>
          </>
        )}
      </div>
      <div className="modal-backdrop" onClick={onCancel}></div>
    </div>
  );
}
