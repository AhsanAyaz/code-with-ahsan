"use client";

import { useState, useActionState } from "react";
import { useMentorship } from "@/contexts/MentorshipContext";
import { useToast } from "@/contexts/ToastContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authFetch } from "@/lib/apiClient";
import dynamicImport from "next/dynamic";
import type { RoadmapDomain, ProjectDifficulty } from "@/types/mentorship";

// Force dynamic rendering to prevent prerender errors with client-side context
export const dynamic = 'force-dynamic';

// Dynamic import for MDEditor to prevent SSR issues
const MDEditor = dynamicImport(() => import("@uiw/react-md-editor"), { ssr: false });

interface FormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  roadmapId?: string;
  wasSubmitted?: boolean;
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

export default function CreateRoadmapPage() {
  const { user, profile, loading } = useMentorship();
  const { success: showSuccessToast } = useToast();
  const router = useRouter();

  // Controlled form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState<RoadmapDomain>("web-dev");
  const [difficulty, setDifficulty] = useState<ProjectDifficulty>("intermediate");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [content, setContent] = useState(`# Your Roadmap Title

## Overview
Brief introduction to what this roadmap covers and who it's for.

## Prerequisites
- Prerequisite 1
- Prerequisite 2

## Learning Path

### Phase 1: Foundations
**Duration:** X weeks

Key concepts to learn:
- Concept 1
- Concept 2

**Resources:**
- [Resource Title](https://example.com) - Description
- [Another Resource](https://example.com)

### Phase 2: Intermediate Topics
**Duration:** X weeks

Building on foundations...

### Phase 3: Advanced Topics
**Duration:** X weeks

Deep dive into...

## Projects
Build these projects to practice:
1. **Beginner Project** - Description
2. **Intermediate Project** - Description
3. **Advanced Project** - Description

## Resources
- **Documentation:** [Link](https://example.com)
- **Community:** [Link](https://example.com)
- **Tools:** List of recommended tools

## Next Steps
Where to go after completing this roadmap.
`);
  const [submitAction, setSubmitAction] = useState<"draft" | "submit">("draft");

  const createRoadmapAction = async (
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

      if (Object.keys(fieldErrors).length > 0) {
        return { fieldErrors };
      }

      // POST to API to create roadmap
      const response = await authFetch("/api/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          domain,
          difficulty,
          estimatedHours: parsedEstimatedHours,
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        return { error: data.error || "Failed to create roadmap" };
      }

      const data = await response.json();
      const roadmapId = data.id;

      // If submitAction is "submit", make a second PUT call to submit for review
      if (submitAction === "submit") {
        const submitResponse = await authFetch(`/api/roadmaps/${roadmapId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submit",
          }),
        });

        if (!submitResponse.ok) {
          const submitData = await submitResponse.json();
          return { error: submitData.error || "Failed to submit roadmap for review" };
        }
      }

      return { success: true, roadmapId, wasSubmitted: submitAction === "submit" };
    } catch (error) {
      console.error("Error creating roadmap:", error);
      return { error: "An unexpected error occurred" };
    }
  };

  const [state, formAction, isPending] = useActionState(createRoadmapAction, {});

  // Handle success: show toast and redirect
  if (state.success && !isPending) {
    const message = (state as any).wasSubmitted
      ? "Roadmap submitted for review!"
      : "Roadmap saved as draft!";
    showSuccessToast(message);
    router.push("/roadmaps/my");
    return null;
  }

  // Check authentication and role
  if (loading) {
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
            <h3 className="font-bold">Authentication Required</h3>
            <div className="text-sm">
              Please sign in to create a roadmap.{" "}
              <Link href="/mentorship/dashboard" className="link">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is an accepted mentor
  if (profile?.role !== "mentor" || profile?.status !== "accepted") {
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
            <h3 className="font-bold">Access Restricted</h3>
            <div className="text-sm">
              Only accepted mentors can create roadmaps. Please apply to become a mentor first.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <Link
        href="/mentorship/dashboard"
        className="btn btn-ghost btn-sm mb-4"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold mb-2">Create Roadmap</h1>
      <p className="text-base-content/70 mb-6">
        Share your expertise by creating a learning roadmap. Help others navigate their learning journey with structured guidance and resources.
      </p>

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
            <span className="label-text font-semibold">
              Roadmap Title <span className="text-error">*</span>
            </span>
          </label>
          <input
            type="text"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Full-Stack Web Development Roadmap"
            className="input input-bordered w-full"
            required
            disabled={isPending}
            minLength={3}
            maxLength={100}
          />
          {state.fieldErrors?.title && (
            <label className="label">
              <span className="label-text-alt text-error">
                {state.fieldErrors.title}
              </span>
            </label>
          )}
        </div>

        {/* Description */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Description</span>
          </label>
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief summary for listings (optional, max 500 characters)"
            className="textarea textarea-bordered w-full h-24"
            disabled={isPending}
            maxLength={500}
          />
          <label className="label">
            <span className="label-text-alt">Optional - Brief summary shown in roadmap listings</span>
          </label>
        </div>

        {/* Domain */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">
              Domain Category <span className="text-error">*</span>
            </span>
          </label>
          <select
            name="domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value as RoadmapDomain)}
            className="select select-bordered w-full"
            required
            disabled={isPending}
          >
            {DOMAIN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">
              Difficulty Level <span className="text-error">*</span>
            </span>
          </label>
          <select
            name="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as ProjectDifficulty)}
            className="select select-bordered w-full"
            required
            disabled={isPending}
          >
            {DIFFICULTY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Estimated Hours */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Estimated Hours</span>
          </label>
          <input
            type="number"
            name="estimatedHours"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
            placeholder="e.g., 40"
            className="input input-bordered w-full"
            disabled={isPending}
            min="1"
            max="1000"
          />
          <label className="label">
            <span className="label-text-alt">Optional - Approximate time to complete</span>
          </label>
          {state.fieldErrors?.estimatedHours && (
            <label className="label">
              <span className="label-text-alt text-error">
                {state.fieldErrors.estimatedHours}
              </span>
            </label>
          )}
        </div>

        {/* Markdown Editor */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-semibold">Roadmap Content <span className="text-error">*</span></span>
          </label>
          <div data-color-mode="light" className="w-full">
            <MDEditor
              value={content}
              onChange={(val) => setContent(val || "")}
              height={500}
              preview="live"
              style={{ width: '100%' }}
            />
          </div>
          <label className="label">
            <span className="label-text-alt">Supports GitHub Flavored Markdown - Replace template with your content</span>
            <span className="label-text-alt">{content.length} characters</span>
          </label>
          {state.fieldErrors?.content && (
            <label className="label">
              <span className="label-text-alt text-error">
                {state.fieldErrors.content}
              </span>
            </label>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-end">
          <button
            type="submit"
            className="btn btn-outline"
            disabled={isPending}
            onClick={() => setSubmitAction("draft")}
          >
            {isPending && submitAction === "draft" ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Saving...
              </>
            ) : (
              "Save as Draft"
            )}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending}
            onClick={() => setSubmitAction("submit")}
          >
            {isPending && submitAction === "submit" ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Submitting...
              </>
            ) : (
              "Submit for Review"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
