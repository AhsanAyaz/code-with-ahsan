"use client";

import { RoadmapDomain, ProjectDifficulty } from "@/types/mentorship";

interface RoadmapFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  domainFilter: RoadmapDomain | "all";
  setDomainFilter: (value: RoadmapDomain | "all") => void;
  difficultyFilter: ProjectDifficulty | "all";
  setDifficultyFilter: (value: ProjectDifficulty | "all") => void;
}

const DOMAIN_OPTIONS = [
  { value: "all", label: "All Domains" },
  { value: "web-dev", label: "Web Development" },
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "ml", label: "Machine Learning" },
  { value: "ai", label: "AI" },
  { value: "mcp", label: "MCP Servers" },
  { value: "agents", label: "AI Agents" },
  { value: "prompt-engineering", label: "Prompt Engineering" },
];

export default function RoadmapFilters({
  searchTerm,
  setSearchTerm,
  domainFilter,
  setDomainFilter,
  difficultyFilter,
  setDifficultyFilter,
}: RoadmapFiltersProps) {
  return (
    <div className="space-y-4 mb-6">
      {/* Search Input */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Search Roadmaps</span>
        </label>
        <input
          type="text"
          placeholder="Search by title or description..."
          className="input input-bordered w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Domain Filter */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Domain</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={domainFilter}
          onChange={(e) =>
            setDomainFilter(e.target.value as RoadmapDomain | "all")
          }
        >
          {DOMAIN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Difficulty Filter */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Difficulty Level</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={difficultyFilter}
          onChange={(e) =>
            setDifficultyFilter(e.target.value as ProjectDifficulty | "all")
          }
        >
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
    </div>
  );
}
