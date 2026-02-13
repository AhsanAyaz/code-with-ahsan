"use client";

import { useDebouncedCallback } from "use-debounce";

interface ProjectFiltersProps {
  filters: {
    status: string;
    search: string;
    fromDate: string;
    toDate: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  resultCount: number;
}

export default function ProjectFilters({
  filters,
  onFilterChange,
  onClearFilters,
  resultCount,
}: ProjectFiltersProps) {
  // Debounced search handler
  const debouncedSearchChange = useDebouncedCallback((value: string) => {
    onFilterChange("search", value);
  }, 300);

  const hasActiveFilters =
    filters.status || filters.search || filters.fromDate || filters.toDate;

  return (
    <div className="card bg-base-200 shadow-md p-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
        {/* Status dropdown */}
        <div className="form-control flex-1 w-full md:w-auto">
          <label className="label">
            <span className="label-text">Status</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={filters.status}
            onChange={(e) => onFilterChange("status", e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="declined">Declined</option>
          </select>
        </div>

        {/* Search input */}
        <div className="form-control flex-1 w-full md:w-auto">
          <label className="label">
            <span className="label-text">Search</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by title or description..."
              className="input input-bordered w-full pl-10"
              defaultValue={filters.search}
              onChange={(e) => debouncedSearchChange(e.target.value)}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Date range: From */}
        <div className="form-control w-full md:w-auto">
          <label className="label">
            <span className="label-text">From</span>
          </label>
          <input
            type="date"
            className="input input-bordered w-full"
            value={filters.fromDate}
            onChange={(e) => onFilterChange("fromDate", e.target.value)}
          />
        </div>

        {/* Date range: To */}
        <div className="form-control w-full md:w-auto">
          <label className="label">
            <span className="label-text">To</span>
          </label>
          <input
            type="date"
            className="input input-bordered w-full"
            value={filters.toDate}
            onChange={(e) => onFilterChange("toDate", e.target.value)}
          />
        </div>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            className="btn btn-ghost btn-sm gap-2 md:self-end"
            onClick={onClearFilters}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Clear Filters
          </button>
        )}
      </div>

      {/* Result count */}
      <div className="mt-4 text-sm text-base-content/60">
        {hasActiveFilters ? (
          <span>{resultCount} projects (filtered)</span>
        ) : (
          <span>{resultCount} projects</span>
        )}
      </div>
    </div>
  );
}
