"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import debounce from "lodash.debounce";
import ProjectCard from "@/components/projects/ProjectCard";
import CompletedProjectCard from "@/components/projects/CompletedProjectCard";
import ProjectFilters from "@/components/projects/ProjectFilters";
import { Project, ProjectDifficulty } from "@/types/mentorship";
import Link from "next/link";

export const dynamic = "force-dynamic";

function DiscoverProjectsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [completedProjects, setCompletedProjects] = useState<Project[]>([]);
  const [completedFetched, setCompletedFetched] = useState(false);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Initialize filters from URL params
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [techFilter, setTechFilter] = useState<string[]>(
    searchParams.get("tech")?.split(",").filter(Boolean) || []
  );
  const [difficultyFilter, setDifficultyFilter] = useState<
    ProjectDifficulty | "all"
  >((searchParams.get("difficulty") as ProjectDifficulty | "all") || "all");

  // Fetch active projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/projects?status=active");
        if (!response.ok) {
          throw new Error("Failed to fetch projects");
        }
        const data = await response.json();
        setProjects(data.projects || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching projects:", err);
        setError("Failed to load projects. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Handle tab change
  const handleTabChange = useCallback(
    async (tab: "active" | "completed") => {
      setActiveTab(tab);
      // Reset filters when switching tabs
      setSearchTerm("");
      setTechFilter([]);
      setDifficultyFilter("all");

      if (tab === "completed" && !completedFetched) {
        try {
          setLoadingCompleted(true);
          const response = await fetch("/api/projects?status=completed");
          if (!response.ok) {
            throw new Error("Failed to fetch completed projects");
          }
          const data = await response.json();
          // Sort by completedAt descending (newest first) by default
          const sorted = (data.projects || []).sort(
            (a: Project, b: Project) => {
              const aDate = a.completedAt
                ? new Date(a.completedAt).getTime()
                : 0;
              const bDate = b.completedAt
                ? new Date(b.completedAt).getTime()
                : 0;
              return bDate - aDate;
            }
          );
          setCompletedProjects(sorted);
          setCompletedFetched(true);
        } catch (err) {
          console.error("Error fetching completed projects:", err);
        } finally {
          setLoadingCompleted(false);
        }
      }
    },
    [completedFetched]
  );

  // Debounced URL update (500ms) — only for active tab
  const updateURL = useCallback(
    debounce((search: string, tech: string[], difficulty: string) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (tech.length > 0) params.set("tech", tech.join(","));
      if (difficulty !== "all") params.set("difficulty", difficulty);

      const newURL = params.toString()
        ? `/projects?${params.toString()}`
        : "/projects";
      router.push(newURL, { scroll: false });
    }, 500),
    [router]
  );

  // Update URL when filters change (active tab only)
  useEffect(() => {
    if (activeTab === "active") {
      updateURL(searchTerm, techFilter, difficultyFilter);
    }
  }, [searchTerm, techFilter, difficultyFilter, updateURL, activeTab]);

  // Extract unique tech stacks for active tab
  const availableTechs = Array.from(
    new Set(projects.flatMap((p) => p.techStack))
  ).sort();

  // Extract unique tech stacks for completed tab
  const availableCompletedTechs = Array.from(
    new Set(completedProjects.flatMap((p) => p.techStack))
  ).sort();

  // Client-side filtering for active projects
  const filteredProjects = projects.filter((project) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        project.title.toLowerCase().includes(searchLower) ||
        project.description.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    if (difficultyFilter !== "all" && project.difficulty !== difficultyFilter) {
      return false;
    }
    if (techFilter.length > 0) {
      const hasMatchingTech = techFilter.some((tech) =>
        project.techStack.includes(tech)
      );
      if (!hasMatchingTech) return false;
    }
    return true;
  });

  // Client-side filtering and sorting for completed projects
  const filteredCompletedProjects = completedProjects
    .filter((project) => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          project.title.toLowerCase().includes(searchLower) ||
          project.description.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (
        difficultyFilter !== "all" &&
        project.difficulty !== difficultyFilter
      ) {
        return false;
      }
      if (techFilter.length > 0) {
        const hasMatchingTech = techFilter.some((tech) =>
          project.techStack.includes(tech)
        );
        if (!hasMatchingTech) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aDate = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bDate = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return sortOrder === "newest" ? bDate - aDate : aDate - bDate;
    });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-8">
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
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Discover Projects</h1>
          <p className="text-base-content/70">
            {activeTab === "active"
              ? "Find active projects to join and collaborate with mentors and peers"
              : "Browse completed projects and their demos"}
          </p>
        </div>
        <Link href="/projects/new" className="btn btn-primary">
          Create a Project
        </Link>
      </div>

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-bordered mb-6">
        <button
          role="tab"
          className={`tab ${activeTab === "active" ? "tab-active" : ""}`}
          onClick={() => handleTabChange("active")}
        >
          Active Projects
        </button>
        <button
          role="tab"
          className={`tab ${activeTab === "completed" ? "tab-active" : ""}`}
          onClick={() => handleTabChange("completed")}
        >
          Completed Projects
        </button>
      </div>

      <ProjectFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        techFilter={techFilter}
        setTechFilter={setTechFilter}
        difficultyFilter={difficultyFilter}
        setDifficultyFilter={setDifficultyFilter}
        availableTechs={
          activeTab === "active" ? availableTechs : availableCompletedTechs
        }
      />

      {/* Active tab content */}
      {activeTab === "active" && (
        <>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-base-content/70">
                No active projects found
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-base-content/70">
                Showing {filteredProjects.length} of {projects.length} projects
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Completed tab content */}
      {activeTab === "completed" && (
        <>
          {loadingCompleted ? (
            <div className="flex justify-center items-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-base-content/70">
                  {completedFetched
                    ? `Showing ${filteredCompletedProjects.length} of ${completedProjects.length} completed projects`
                    : ""}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-base-content/70">Sort:</label>
                  <select
                    className="select select-bordered select-sm"
                    value={sortOrder}
                    onChange={(e) =>
                      setSortOrder(e.target.value as "newest" | "oldest")
                    }
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </div>
              </div>

              {filteredCompletedProjects.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-lg text-base-content/70">
                    No completed projects found
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCompletedProjects.map((project) => (
                    <CompletedProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      }
    >
      <DiscoverProjectsContent />
    </Suspense>
  );
}
