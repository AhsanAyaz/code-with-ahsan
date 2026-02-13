"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMentorship } from "@/contexts/MentorshipContext";
import { authFetch } from "@/lib/apiClient";
import { canEditProject } from "@/lib/permissions";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import Link from "next/link";
import { Project } from "@/types/mentorship";
import type { PermissionUser } from "@/lib/permissions";

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { user, profile, loading: authLoading } = useMentorship();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [techStack, setTechStack] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [maxTeamSize, setMaxTeamSize] = useState(4);

  // Check admin status
  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
      // Simple check - token exists and not expired
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          setIsAdmin(true);
        }
      } catch {
        setIsAdmin(false);
      }
    }
  }, []);

  // Fetch project and validate authorization
  useEffect(() => {
    const fetchProject = async () => {
      if (authLoading) return;

      try {
        setLoading(true);
        setError("");

        // Fetch project
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
          throw new Error("Project not found");
        }

        const data = await response.json();
        const projectData = data.project;
        setProject(projectData);

        // Check authorization
        const permissionUser: PermissionUser | null = user
          ? {
              uid: user.uid,
              role: profile?.role || "mentee",
              status: profile?.status,
              isAdmin: isAdmin,
            }
          : null;

        const canEdit = canEditProject(permissionUser, projectData);

        if (!canEdit) {
          setError("You don't have permission to edit this project");
          setTimeout(() => {
            router.push(`/projects/${projectId}`);
          }, 2000);
          return;
        }

        // Pre-populate form
        setTitle(projectData.title || "");
        setDescription(projectData.description || "");
        setGithubRepo(projectData.githubRepo || "");
        setTechStack(projectData.techStack?.join(", ") || "");
        setDifficulty(projectData.difficulty || "intermediate");
        setMaxTeamSize(projectData.maxTeamSize || 4);
      } catch (err: any) {
        console.error("Error loading project:", err);
        setError(err.message || "Failed to load project");
        setTimeout(() => {
          router.push(`/projects/${projectId}`);
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, user, profile, authLoading, isAdmin, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    // Client-side validation
    if (title.trim().length < 3 || title.trim().length > 100) {
      setError("Title must be between 3 and 100 characters");
      setSaving(false);
      return;
    }

    if (description.trim().length < 10 || description.trim().length > 2000) {
      setError("Description must be between 10 and 2000 characters");
      setSaving(false);
      return;
    }

    // Parse tech stack
    const techStackArray = techStack
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      const requestBody = {
        title: title.trim(),
        description: description.trim(),
        githubRepo: githubRepo.trim() || undefined,
        techStack: techStackArray,
        difficulty,
        maxTeamSize,
      };

      let response;

      if (isAdmin) {
        // Admin: include x-admin-token header
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        response = await fetch(`/api/projects/${projectId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "x-admin-token": token } : {}),
          },
          body: JSON.stringify(requestBody),
        });
      } else {
        // Creator: use authFetch for Firebase Auth token
        response = await authFetch(`/api/projects/${projectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
      }

      if (response.ok) {
        // Success - navigate back to project detail page
        router.push(`/projects/${projectId}`);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update project");
        setSaving(false);
      }
    } catch (err: any) {
      console.error("Error updating project:", err);
      setError("An error occurred while updating the project");
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-base-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="skeleton h-8 w-48 mb-8"></div>
          <div className="skeleton h-12 w-full mb-4"></div>
          <div className="skeleton h-32 w-full mb-4"></div>
          <div className="skeleton h-12 w-full mb-4"></div>
          <div className="skeleton h-12 w-full mb-4"></div>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-base-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="alert alert-error mb-4">
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
          <Link href={`/projects/${projectId}`} className="btn btn-ghost">
            Back to Project
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Edit Project</h2>
            <p className="text-base-content/70">
              Update project details and settings
            </p>
          </div>
          <Link href={`/projects/${projectId}`} className="btn btn-ghost btn-sm">
            ← Back to Project
          </Link>
        </div>

        {/* Form Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">Project Details</h3>
            <div className="divider"></div>

            {/* Error alert */}
            {error && (
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
                <span>{error}</span>
              </div>
            )}

            {/* Edit form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Title</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input input-bordered"
                  required
                  minLength={3}
                  maxLength={100}
                  disabled={saving}
                />
                <label className="label">
                  <span className="label-text-alt">{title.length}/100 characters</span>
                </label>
              </div>

              {/* Description */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Description</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="textarea textarea-bordered h-32"
                  required
                  minLength={10}
                  maxLength={2000}
                  disabled={saving}
                />
                <label className="label">
                  <span className="label-text-alt">{description.length}/2000 characters</span>
                </label>
              </div>

              {/* GitHub Repo */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">GitHub Repository (optional)</span>
                </label>
                <input
                  type="url"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  className="input input-bordered"
                  placeholder="https://github.com/username/repo"
                  disabled={saving}
                />
              </div>

              {/* Tech Stack */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Tech Stack (comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  className="input input-bordered"
                  placeholder="React, TypeScript, Node.js"
                  disabled={saving}
                />
              </div>

              {/* Difficulty */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Difficulty</span>
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="select select-bordered"
                  disabled={saving}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {/* Max Team Size */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Max Team Size</span>
                </label>
                <input
                  type="number"
                  value={maxTeamSize}
                  onChange={(e) => setMaxTeamSize(parseInt(e.target.value))}
                  className="input input-bordered"
                  min={1}
                  max={20}
                  required
                  disabled={saving}
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 justify-end">
                <Link
                  href={`/projects/${projectId}`}
                  className="btn btn-ghost"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
