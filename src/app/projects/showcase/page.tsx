"use client";

import { useState, useEffect, Suspense } from "react";
import ShowcaseCard from "@/components/projects/ShowcaseCard";
import ShowcaseFilters from "@/components/projects/ShowcaseFilters";
import { Project } from "@/types/mentorship";
import Link from "next/link";

export const dynamic = "force-dynamic";

function ShowcaseContent() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [techFilter, setTechFilter] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    const fetchShowcase = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/projects/showcase");
        if (!response.ok) throw new Error("Failed to fetch showcase");
        const data = await response.json();
        setProjects(data.projects || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching showcase:", err);
        setError("Failed to load showcase. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchShowcase();
  }, []);

  // Extract unique tech stacks from all showcase projects
  const availableTechs = Array.from(
    new Set(projects.flatMap((p) => p.techStack))
  ).sort();

  // Client-side filtering and sorting
  const filteredProjects = projects
    .filter((project) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          project.title.toLowerCase().includes(searchLower) ||
          project.description.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Tech stack filter (any match)
      if (techFilter.length > 0) {
        const hasMatchingTech = techFilter.some((tech) =>
          project.techStack.includes(tech)
        );
        if (!hasMatchingTech) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by completion date
      const dateA = a.completedAt ? new Date(a.completedAt as unknown as string).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt as unknown as string).getTime() : 0;
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
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
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
          <h1 className="text-3xl font-bold mb-2">Project Showcase</h1>
          <p className="text-base-content/70">
            Explore completed projects and their demos from our community
          </p>
        </div>
        <Link href="/projects/discover" className="btn btn-ghost btn-sm">
          Active Projects
        </Link>
      </div>

      <ShowcaseFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        techFilter={techFilter}
        setTechFilter={setTechFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        availableTechs={availableTechs}
      />

      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-base-content/70">
            {projects.length === 0
              ? "No completed projects yet. Check back soon!"
              : "No projects match your filters"}
          </p>
          {projects.length === 0 && (
            <Link href="/projects/discover" className="btn btn-primary mt-4">
              Discover Active Projects
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-base-content/70">
            Showing {filteredProjects.length} of {projects.length} completed projects
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ShowcaseCard key={project.id} project={project} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ShowcasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      }
    >
      <ShowcaseContent />
    </Suspense>
  );
}
