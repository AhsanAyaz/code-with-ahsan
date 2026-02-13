"use client";

import { useState } from "react";
import { Project } from "@/types/mentorship";

interface EnrichedProject extends Project {
  memberCount: number;
  applicationCount: number;
  invitationCount: number;
}

interface DeclineProjectDialogProps {
  project: EnrichedProject;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

export default function DeclineProjectDialog({
  project,
  onConfirm,
  onCancel,
}: DeclineProjectDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirmDecline = async () => {
    if (reason.length < 10) return;

    setIsSubmitting(true);
    setError("");

    try {
      await onConfirm(reason);
      // Dialog will be closed by parent on success
    } catch (err: any) {
      setError(err.message || "Failed to decline project");
      setIsSubmitting(false);
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
        <h3 className="font-bold text-2xl text-warning">Decline Project</h3>

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

        <p className="py-4 text-sm text-base-content/80">
          Please provide a reason for declining this project. This will be sent to the
          project creator via Discord DM.
        </p>

        {/* Textarea */}
        <div className="form-control">
          <textarea
            className="textarea textarea-bordered w-full h-32"
            placeholder="Enter reason for declining (e.g., incomplete proposal, out of scope, needs more detail)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
            disabled={isSubmitting}
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
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className="btn btn-error"
            onClick={handleConfirmDecline}
            disabled={reason.length < 10 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Declining...
              </>
            ) : (
              "Confirm Decline"
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onCancel}></div>
    </div>
  );
}
