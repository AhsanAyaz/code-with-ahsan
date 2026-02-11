"use client";

import { useState, useActionState } from "react";
import { Project, ProjectDifficulty } from "@/types/mentorship";
import { detectSkillMismatch } from "@/lib/validation/skillMatch";
import { authFetch } from "@/lib/apiClient";

interface ApplicationFormProps {
  projectId: string;
  project: Project;
  userId: string;
  userSkillLevel?: ProjectDifficulty;
  onSuccess: () => void;
}

interface FormState {
  success?: boolean;
  error?: string;
}

export default function ApplicationForm({
  projectId,
  project,
  userId,
  userSkillLevel,
  onSuccess,
}: ApplicationFormProps) {
  const [message, setMessage] = useState("");

  // Detect skill mismatch
  const mismatch = detectSkillMismatch(userSkillLevel, project.difficulty);

  const applyAction = async (
    prevState: FormState,
    formData: FormData
  ): Promise<FormState> => {
    try {
      const message = formData.get("message") as string;

      // Client-side validation
      if (!message || message.trim().length < 10) {
        return { error: "Message must be at least 10 characters" };
      }

      if (message.trim().length > 500) {
        return { error: "Message must be less than 500 characters" };
      }

      // POST to API
      const response = await authFetch(`/api/projects/${projectId}/applications`, {
        method: "POST",
        body: JSON.stringify({
          userId,
          message: message.trim(),
        }),
      });

      if (response.status === 409) {
        return { error: "You have already applied to this project" };
      }

      if (response.status === 403) {
        return { error: "You cannot apply to this project" };
      }

      if (!response.ok) {
        const data = await response.json();
        return { error: data.error || "Failed to submit application" };
      }

      onSuccess();
      return { success: true };
    } catch (error) {
      console.error("Error submitting application:", error);
      return { error: "An unexpected error occurred" };
    }
  };

  const [state, formAction, isPending] = useActionState(applyAction, {});

  if (state.success) {
    return (
      <div className="alert alert-success">
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
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Application submitted successfully! The creator will review it soon.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Skill Mismatch Warning */}
      {mismatch.hasWarning && (
        <div
          className={`alert ${
            mismatch.severity === "warning" ? "alert-warning" : "alert-info"
          }`}
        >
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
          <span>{mismatch.message}</span>
        </div>
      )}

      {state.error && (
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
          <span>{state.error}</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">
              Application Message <span className="text-error">*</span>
            </span>
          </label>
          <textarea
            name="message"
            placeholder="Tell the creator why you'd like to join this project..."
            className="textarea textarea-bordered w-full h-32"
            required
            disabled={isPending}
            minLength={10}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <label className="label">
            <span className="label-text-alt">
              {message.length}/500 characters
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Submitting...
            </>
          ) : (
            "Submit Application"
          )}
        </button>
      </form>
    </div>
  );
}
