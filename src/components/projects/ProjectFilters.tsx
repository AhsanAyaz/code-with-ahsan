"use client";

import { ProjectDifficulty } from "@/types/mentorship";

interface ProjectFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  techFilter: string[];
  setTechFilter: (value: string[]) => void;
  difficultyFilter: ProjectDifficulty | "all";
  setDifficultyFilter: (value: ProjectDifficulty | "all") => void;
  availableTechs: string[];
}

export default function ProjectFilters({
  searchTerm,
  setSearchTerm,
  techFilter,
  setTechFilter,
  difficultyFilter,
  setDifficultyFilter,
  availableTechs,
}: ProjectFiltersProps) {
  const handleTechToggle = (tech: string) => {
    if (techFilter.includes(tech)) {
      setTechFilter(techFilter.filter((t) => t !== tech));
    } else {
      setTechFilter([...techFilter, tech]);
    }
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Search Input */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Search Projects</span>
        </label>
        <input
          type="text"
          placeholder="Search by name or description..."
          className="input input-bordered w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
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

      {/* Tech Stack Filter */}
      {availableTechs.length > 0 && (
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Tech Stack</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {availableTechs.map((tech) => (
              <button
                key={tech}
                onClick={() => handleTechToggle(tech)}
                className={`badge badge-lg cursor-pointer transition-colors ${
                  techFilter.includes(tech)
                    ? "badge-primary"
                    : "badge-outline"
                }`}
              >
                {tech}
              </button>
            ))}
          </div>
          {techFilter.length > 0 && (
            <button
              onClick={() => setTechFilter([])}
              className="btn btn-ghost btn-sm mt-2"
            >
              Clear Tech Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
