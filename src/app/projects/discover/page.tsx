"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import debounce from "lodash.debounce";
import { useMentorship } from "@/contexts/MentorshipContext";
import ProjectCard from "@/components/projects/ProjectCard";
import ProjectFilters from "@/components/projects/ProjectFilters";
import { Project, ProjectDifficulty } from "@/types/mentorship";
import Link from "next/link";

export const dynamic = "force-dynamic";

function DiscoverProjectsContent() {
  const { profile, loading: authLoading } = useMentorship();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch projects on mount
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

  // Debounced URL update (500ms)
  const updateURL = useCallback(
    debounce((search: string, tech: string[], difficulty: string) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (tech.length > 0) params.set("tech", tech.join(","));
      if (difficulty !== "all") params.set("difficulty", difficulty);

      const newURL = params.toString()
        ? `/projects/discover?${params.toString()}`
        : "/projects/discover";
      router.push(newURL, { scroll: false });
    }, 500),
    [router]
  );

  // Update URL when filters change
  useEffect(() => {
    updateURL(searchTerm, techFilter, difficultyFilter);
  }, [searchTerm, techFilter, difficultyFilter, updateURL]);

  // Extract unique tech stacks
  const availableTechs = Array.from(
    new Set(projects.flatMap((p) => p.techStack))
  ).sort();

  // Client-side filtering
  const filteredProjects = projects.filter((project) => {
    // Search filter (case-insensitive, matches title and description)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        project.title.toLowerCase().includes(searchLower) ||
        project.description.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Difficulty filter
    if (difficultyFilter !== "all" && project.difficulty !== difficultyFilter) {
      return false;
    }

    // Tech stack filter (any match)
    if (techFilter.length > 0) {
      const hasMatchingTech = techFilter.some((tech) =>
        project.techStack.includes(tech)
      );
      if (!hasMatchingTech) return false;
    }

    return true;
  });

  if (loading || authLoading) {
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
            Find active projects to join and collaborate with mentors and peers
          </p>
        </div>
        {profile && (
          <Link href="/projects/new" className="btn btn-primary">
            Create a Project
          </Link>
        )}
      </div>

      <ProjectFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        techFilter={techFilter}
        setTechFilter={setTechFilter}
        difficultyFilter={difficultyFilter}
        setDifficultyFilter={setDifficultyFilter}
        availableTechs={availableTechs}
      />

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
    </div>
  );
}

export default function DiscoverProjectsPage() {
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
