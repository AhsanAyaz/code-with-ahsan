"use client";

import { useState, useActionState } from "react";
import { useMentorship } from "@/contexts/MentorshipContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Force dynamic rendering to prevent prerender errors with client-side context
export const dynamic = 'force-dynamic';

interface FormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  projectId?: string;
}

export default function CreateProjectPage() {
  const { user, profile, loading } = useMentorship();
  const router = useRouter();

  const createProjectAction = async (
    prevState: FormState,
    formData: FormData
  ): Promise<FormState> => {
    try {
      // Extract form fields
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const githubRepo = formData.get("githubRepo") as string;
      const techStackRaw = formData.get("techStack") as string;
      const difficulty = formData.get("difficulty") as string;
      const maxTeamSizeRaw = formData.get("maxTeamSize") as string;

      // Client-side validation
      const fieldErrors: Record<string, string> = {};

      if (!title || title.trim().length < 3 || title.trim().length > 100) {
        fieldErrors.title = "Title must be between 3 and 100 characters";
      }

      if (
        !description ||
        description.trim().length < 10 ||
        description.trim().length > 2000
      ) {
        fieldErrors.description =
          "Description must be between 10 and 2000 characters";
      }

      if (Object.keys(fieldErrors).length > 0) {
        return { fieldErrors };
      }

      // Parse tech stack
      const techStack = techStackRaw
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const maxTeamSize = parseInt(maxTeamSizeRaw, 10) || 4;

      // POST to API
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          githubRepo: githubRepo.trim() || undefined,
          techStack,
          difficulty,
          maxTeamSize,
          creatorId: user?.uid,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        return { error: data.error || "Failed to create project" };
      }

      const data = await response.json();
      return { success: true, projectId: data.projectId };
    } catch (error) {
      console.error("Error creating project:", error);
      return { error: "An unexpected error occurred" };
    }
  };

  const [state, formAction, isPending] = useActionState(createProjectAction, {});

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
      <div className="max-w-2xl mx-auto p-8">
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
              Please sign in to create a project.{" "}
              <Link href="/mentorship/dashboard" className="link">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (profile?.role !== "mentor" || profile?.status !== "accepted") {
    return (
      <div className="max-w-2xl mx-auto p-8">
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
            <h3 className="font-bold">Access Denied</h3>
            <div className="text-sm">
              Only accepted mentors can create projects.{" "}
              <Link href="/mentorship/dashboard" className="link">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show success state
  if (state.success) {
    return (
      <div className="max-w-2xl mx-auto p-8">
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
            <h3 className="font-bold">Project Created Successfully!</h3>
            <div className="text-sm">
              Your project has been submitted for admin review. You'll be
              notified once it's approved.
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-4">
          <button
            className="btn btn-primary"
            onClick={() => router.push("/mentorship/dashboard")}
          >
            Go to Dashboard
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => router.push("/projects/new")}
          >
            Create Another Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
      <p className="text-base-content/70 mb-6">
        Submit a project proposal for admin review. Once approved, a Discord
        channel will be created for collaboration.
      </p>

      {/* Project Guidelines */}
      <div className="collapse collapse-arrow bg-info/10 border border-info/20 mb-6">
        <input type="checkbox" />
        <div className="collapse-title text-lg font-medium flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-info"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Project Submission Guidelines
        </div>
        <div className="collapse-content text-sm space-y-3">
          <div>
            <h3 className="font-semibold text-base mb-2">What Makes a Great Project:</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Clear learning objectives and skill-building opportunities</li>
              <li>Realistic scope for team size and timeline (2-8 weeks recommended)</li>
              <li>Well-defined milestones and deliverables</li>
              <li>Active mentor involvement and regular check-ins</li>
              <li>Real-world applications that solve actual problems</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-base mb-2">What to Include:</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Detailed description of the project goal and expected outcomes</li>
              <li>Required skills and recommended experience level</li>
              <li>Tech stack and tools to be used</li>
              <li>GitHub repository with README and contribution guidelines</li>
              <li>Clear expectations for team member contributions</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-base mb-2">What to Avoid:</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Overly ambitious projects with unclear scope</li>
              <li>Projects without active mentor guidance</li>
              <li>Duplicate or very similar existing projects</li>
              <li>Projects requiring expensive tools or paid services</li>
              <li>Vague descriptions or missing technical details</li>
            </ul>
          </div>
          <div className="alert alert-warning mt-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-5 w-5"
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
            <span className="text-xs">
              All team members must be on Discord. Projects are publicly visible,
              but team member details are only shown to logged-in users.
            </span>
          </div>
        </div>
      </div>

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
              Project Title <span className="text-error">*</span>
            </span>
          </label>
          <input
            type="text"
            name="title"
            placeholder="My Awesome Project"
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
            <span className="label-text font-semibold">
              Description <span className="text-error">*</span>
            </span>
          </label>
          <textarea
            name="description"
            placeholder="Describe your project, its goals, and what you hope to achieve..."
            className="textarea textarea-bordered w-full h-32"
            required
            disabled={isPending}
            minLength={10}
            maxLength={2000}
          />
          {state.fieldErrors?.description && (
            <label className="label">
              <span className="label-text-alt text-error">
                {state.fieldErrors.description}
              </span>
            </label>
          )}
        </div>

        {/* GitHub Repository */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">
              GitHub Repository URL
            </span>
          </label>
          <input
            type="url"
            name="githubRepo"
            placeholder="https://github.com/username/repo"
            className="input input-bordered w-full"
            disabled={isPending}
          />
          <label className="label">
            <span className="label-text-alt">Optional</span>
          </label>
        </div>

        {/* Tech Stack */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Tech Stack</span>
          </label>
          <input
            type="text"
            name="techStack"
            placeholder="React, Node.js, PostgreSQL"
            className="input input-bordered w-full"
            disabled={isPending}
          />
          <label className="label">
            <span className="label-text-alt">
              Comma-separated list of technologies
            </span>
          </label>
        </div>

        {/* Difficulty */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">
              Difficulty <span className="text-error">*</span>
            </span>
          </label>
          <select
            name="difficulty"
            className="select select-bordered w-full"
            required
            disabled={isPending}
            defaultValue="intermediate"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* Max Team Size */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">
              Max Team Size <span className="text-error">*</span>
            </span>
          </label>
          <input
            type="number"
            name="maxTeamSize"
            min="1"
            max="10"
            defaultValue="4"
            className="input input-bordered w-full"
            required
            disabled={isPending}
          />
          <label className="label">
            <span className="label-text-alt">
              Maximum number of team members (1-10)
            </span>
          </label>
        </div>

        {/* Submit Button */}
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
            "Submit Project Proposal"
          )}
        </button>
      </form>
    </div>
  );
}
