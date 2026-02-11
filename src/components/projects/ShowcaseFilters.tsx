"use client";

interface ShowcaseFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  techFilter: string[];
  setTechFilter: (value: string[]) => void;
  sortOrder: "newest" | "oldest";
  setSortOrder: (value: "newest" | "oldest") => void;
  availableTechs: string[];
}

export default function ShowcaseFilters({
  searchTerm,
  setSearchTerm,
  techFilter,
  setTechFilter,
  sortOrder,
  setSortOrder,
  availableTechs,
}: ShowcaseFiltersProps) {
  const handleTechToggle = (tech: string) => {
    if (techFilter.includes(tech)) {
      setTechFilter(techFilter.filter((t) => t !== tech));
    } else {
      setTechFilter([...techFilter, tech]);
    }
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Search */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Search Showcase</span>
        </label>
        <input
          type="text"
          placeholder="Search by project name or description..."
          className="input input-bordered w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Sort by completion date */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Sort by Completion Date</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
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
                  techFilter.includes(tech) ? "badge-primary" : "badge-outline"
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
