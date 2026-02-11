"use client";

import { useState, useEffect, useActionState } from "react";
import { useMentorship } from "@/contexts/MentorshipContext";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { authFetch } from "@/lib/apiClient";
import dynamicImport from "next/dynamic";
import type { RoadmapDomain, ProjectDifficulty, Roadmap } from "@/types/mentorship";

// Force dynamic rendering to prevent prerender errors with client-side context
export const dynamic = 'force-dynamic';

// Dynamic import for MDEditor to prevent SSR issues
const MDEditor = dynamicImport(() => import("@uiw/react-md-editor"), { ssr: false });

interface FormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  version?: number;
}

const DOMAIN_OPTIONS: { value: RoadmapDomain; label: string }[] = [
  { value: "web-dev", label: "Web Development" },
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "ml", label: "Machine Learning" },
  { value: "ai", label: "AI" },
  { value: "mcp", label: "MCP Servers" },
  { value: "agents", label: "AI Agents" },
  { value: "prompt-engineering", label: "Prompt Engineering" },
];

const DIFFICULTY_OPTIONS: { value: ProjectDifficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function EditRoadmapPage() {
  const { user, profile, loading } = useMentorship();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Roadmap state
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Controlled form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState<RoadmapDomain>("web-dev");
  const [difficulty, setDifficulty] = useState<ProjectDifficulty>("intermediate");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [content, setContent] = useState("");
  const [changeDescription, setChangeDescription] = useState("");

  // Fetch roadmap on mount
  useEffect(() => {
    const fetchRoadmap = async () => {
      setLoadingRoadmap(true);
      setLoadError(null);
      try {
        const response = await fetch(`/api/roadmaps/${id}`);
        if (!response.ok) {
          const data = await response.json();
          setLoadError(data.error || "Failed to load roadmap");
          return;
        }

        const data = await response.json();
        const roadmapData = data.roadmap;
        setRoadmap(roadmapData);

        // Populate form fields
        setTitle(roadmapData.title || "");
        setDescription(roadmapData.description || "");
        setDomain(roadmapData.domain || "web-dev");
        setDifficulty(roadmapData.difficulty || "intermediate");
        setEstimatedHours(roadmapData.estimatedHours ? String(roadmapData.estimatedHours) : "");
        setContent(roadmapData.content || "");
      } catch (error) {
        console.error("Error fetching roadmap:", error);
        setLoadError("An unexpected error occurred while loading the roadmap");
      } finally {
        setLoadingRoadmap(false);
      }
    };

    if (id) {
      fetchRoadmap();
    }
  }, [id]);

  const editRoadmapAction = async (
    prevState: FormState,
    formData: FormData
  ): Promise<FormState> => {
    try {
      // Client-side validation using controlled state
      const fieldErrors: Record<string, string> = {};

      if (!title || title.trim().length < 3 || title.trim().length > 100) {
        fieldErrors.title = "Title must be between 3 and 100 characters";
      }

      if (content.trim().length < 50) {
        fieldErrors.content = "Roadmap content must be at least 50 characters";
      }

      const parsedEstimatedHours = estimatedHours ? parseFloat(estimatedHours) : undefined;
      if (parsedEstimatedHours !== undefined && (isNaN(parsedEstimatedHours) || parsedEstimatedHours <= 0 || parsedEstimatedHours > 1000)) {
        fieldErrors.estimatedHours = "Estimated hours must be a positive number up to 1000";
      }

      if (changeDescription.trim().length > 200) {
        fieldErrors.changeDescription = "Change description must be 200 characters or less";
      }

      if (Object.keys(fieldErrors).length > 0) {
        return { fieldErrors };
      }

      // PUT to API to edit roadmap
      const response = await authFetch(`/api/roadmaps/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          title: title.trim(),
          description: description.trim() || undefined,
          domain,
          difficulty,
          estimatedHours: parsedEstimatedHours,
          content: content.trim(),
          changeDescription: changeDescription.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        return { error: data.error || "Failed to update roadmap" };
      }

      const data = await response.json();
      return { success: true, version: data.version };
    } catch (error) {
      console.error("Error editing roadmap:", error);
      return { error: "An unexpected error occurred" };
    }
  };

  const [state, formAction, isPending] = useActionState(editRoadmapAction, {});

  // Check authentication
  if (loading || loadingRoadmap) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
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
            <p className="font-semibold">Authentication Required</p>
            <p className="text-sm">Please sign in to edit roadmaps.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
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
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{loadError}</p>
          </div>
        </div>
        <div className="mt-4">
          <Link href="/roadmaps" className="btn btn-ghost">
            Back to Roadmaps
          </Link>
        </div>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="alert alert-warning">
          <p>Roadmap not found</p>
        </div>
        <div className="mt-4">
          <Link href="/roadmaps" className="btn btn-ghost">
            Back to Roadmaps
          </Link>
        </div>
      </div>
    );
  }

  // Permission check - only owner can edit (admin approval is separate)
  const isOwner = roadmap.creatorId === user.uid;

  if (!isOwner) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
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
          <div>
            <p className="font-semibold">Permission Denied</p>
            <p className="text-sm">You don&apos;t have permission to edit this roadmap.</p>
          </div>
        </div>
        <div className="mt-4">
          <Link href="/roadmaps" className="btn btn-ghost">
            Back to Roadmaps
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (state.success) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
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
          <div>
            <p className="font-semibold">Roadmap Updated!</p>
            <p className="text-sm">
              Your roadmap has been updated to version {state.version}. It has been returned to draft status for re-review.
            </p>
          </div>
        </div>
        <div className="mt-6 flex gap-4">
          <Link href="/roadmaps" className="btn btn-primary">
            Back to Roadmaps
          </Link>
          <button
            onClick={() => router.refresh()}
            className="btn btn-ghost"
          >
            Edit Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Edit Roadmap</h1>
        <p className="text-base-content/70">
          Currently editing version {roadmap.version}
        </p>
        <Link href="/roadmaps" className="link link-primary text-sm">
          Back to Roadmaps
        </Link>
      </div>

      {/* Admin Feedback Banner */}
      {(roadmap as any).feedback && (
        <div className="alert alert-warning mb-6">
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
            <p className="font-semibold">Admin Feedback</p>
            <p className="text-sm">{(roadmap as any).feedback}</p>
          </div>
        </div>
      )}

      {state.error && (
        <div className="alert alert-error mb-6">
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

      <form action={formAction} className="space-y-6">
        {/* Title */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Title *</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Complete Web Development Roadmap 2024"
            className={`input input-bordered w-full ${state.fieldErrors?.title ? "input-error" : ""}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
          />
          {state.fieldErrors?.title && (
            <label className="label">
              <span className="label-text-alt text-error">{state.fieldErrors.title}</span>
            </label>
          )}
        </div>

        {/* Description */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Description (optional)</span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full"
            placeholder="Briefly describe what this roadmap covers..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </div>

        {/* Domain */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Domain *</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={domain}
            onChange={(e) => setDomain(e.target.value as RoadmapDomain)}
            required
          >
            {DOMAIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Difficulty *</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as ProjectDifficulty)}
            required
          >
            {DIFFICULTY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Estimated Hours */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Estimated Hours (optional)</span>
          </label>
          <input
            type="number"
            placeholder="e.g., 40"
            className={`input input-bordered w-full ${state.fieldErrors?.estimatedHours ? "input-error" : ""}`}
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
            min="0"
            max="1000"
            step="0.5"
          />
          {state.fieldErrors?.estimatedHours && (
            <label className="label">
              <span className="label-text-alt text-error">{state.fieldErrors.estimatedHours}</span>
            </label>
          )}
        </div>

        {/* Content */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Roadmap Content *</span>
            <span className="label-text-alt">Markdown supported</span>
          </label>
          <div data-color-mode="light">
            <MDEditor
              value={content}
              onChange={(val) => setContent(val || "")}
              height={400}
              preview="edit"
            />
          </div>
          {state.fieldErrors?.content && (
            <label className="label">
              <span className="label-text-alt text-error">{state.fieldErrors.content}</span>
            </label>
          )}
        </div>

        {/* Change Description */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Change Description (optional)</span>
          </label>
          <textarea
            className={`textarea textarea-bordered w-full ${state.fieldErrors?.changeDescription ? "textarea-error" : ""}`}
            placeholder="Briefly describe what changed in this version..."
            value={changeDescription}
            onChange={(e) => setChangeDescription(e.target.value)}
            rows={2}
            maxLength={200}
          />
          <label className="label">
            <span className="label-text-alt">{changeDescription.length}/200 characters</span>
          </label>
          {state.fieldErrors?.changeDescription && (
            <label className="label">
              <span className="label-text-alt text-error">{state.fieldErrors.changeDescription}</span>
            </label>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
          <Link href="/roadmaps" className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
