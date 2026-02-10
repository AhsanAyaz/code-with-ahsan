"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMentorship } from "@/contexts/MentorshipContext";
import ProjectCard from "@/components/projects/ProjectCard";
import { Project } from "@/types/mentorship";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function MyProjectsPage() {
  const { user, loading: authLoading } = useMentorship();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"created" | "joined">("created");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/mentorship/dashboard");
    }
  }, [authLoading, user, router]);

  // Fetch projects when tab changes or user loads
  useEffect(() => {
    if (!user) return;

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

  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Projects</h1>
        <p className="text-base-content/70">
          View projects you&apos;ve created or joined
        </p>
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
      </div>

      {/* Content */}
      {loading ? (
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
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
