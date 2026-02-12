"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useMentorship } from "@/contexts/MentorshipContext";
import RoadmapCard from "@/components/roadmaps/RoadmapCard";
import RoadmapFilters from "@/components/roadmaps/RoadmapFilters";
import { Roadmap, RoadmapDomain, ProjectDifficulty } from "@/types/mentorship";

export const dynamic = "force-dynamic";

function RoadmapsCatalogContent() {
  const { user, profile } = useMentorship();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state (NOT synced to URL params per research decision)
  const [searchTerm, setSearchTerm] = useState("");
  const [domainFilter, setDomainFilter] = useState<RoadmapDomain | "all">("all");
  const [difficultyFilter, setDifficultyFilter] = useState<ProjectDifficulty | "all">("all");

  // Fetch approved roadmaps on mount
  useEffect(() => {
    const fetchRoadmaps = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/roadmaps?status=approved");
        if (!response.ok) {
          throw new Error("Failed to fetch roadmaps");
        }
        const data = await response.json();
        setRoadmaps(data.roadmaps || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching roadmaps:", err);
        setError("Failed to load roadmaps. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmaps();
  }, []);

  // Client-side filtering logic
  const filteredRoadmaps = roadmaps.filter((roadmap) => {
    // Search: title OR description contains searchTerm (case-insensitive)
    if (searchTerm) {
      const matches =
        roadmap.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        roadmap.description?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matches) return false;
    }

    // Domain filter
    if (domainFilter !== "all" && roadmap.domain !== domainFilter) {
      return false;
    }

    // Difficulty filter
    if (difficultyFilter !== "all" && roadmap.difficulty !== difficultyFilter) {
      return false;
    }

    return true;
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
      {/* Breadcrumbs */}
      <div className="text-sm breadcrumbs mb-4">
        <ul>
          <li>
            <Link href="/mentorship/dashboard">Dashboard</Link>
          </li>
          <li>Roadmaps</li>
        </ul>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Learning Roadmaps</h1>
          {profile?.role === "mentor" && (
            <div className="flex gap-2">
              <Link href="/roadmaps/my" className="btn btn-ghost">
                My Roadmaps
              </Link>
              <Link href="/roadmaps/new" className="btn btn-primary">
                + Create Roadmap
              </Link>
            </div>
          )}
        </div>
        <p className="text-base-content/70">
          Browse curated learning paths created by mentors to guide your journey
        </p>
      </div>

      <RoadmapFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        domainFilter={domainFilter}
        setDomainFilter={setDomainFilter}
        difficultyFilter={difficultyFilter}
        setDifficultyFilter={setDifficultyFilter}
      />

      {filteredRoadmaps.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-base-content/70">
            No roadmaps found matching your filters
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-base-content/70">
            Showing {filteredRoadmaps.length} of {roadmaps.length} roadmaps
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRoadmaps.map((roadmap) => (
              <RoadmapCard key={roadmap.id} roadmap={roadmap} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function RoadmapsCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      }
    >
      <RoadmapsCatalogContent />
    </Suspense>
  );
}
