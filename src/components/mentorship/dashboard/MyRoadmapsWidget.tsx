import Link from "next/link";
import { Roadmap } from "@/types/mentorship";
import RoadmapActionsDropdown from "@/components/roadmaps/RoadmapActionsDropdown";

interface MyRoadmapsWidgetProps {
  roadmaps: Roadmap[];
  loading?: boolean;
}

export default function MyRoadmapsWidget({ roadmaps, loading = false }: MyRoadmapsWidgetProps) {
  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="h-7 w-48 bg-base-200 rounded animate-pulse mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-base-200 rounded-box animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">🗺️</span> My Roadmaps
              {roadmaps.length > 0 && (
                <span className="badge badge-info badge-sm">
                  {roadmaps.length}
                </span>
              )}
            </h3>
            <Link href="/roadmaps/new" className="btn btn-ghost btn-xs text-info">
              + New
            </Link>
          </div>
          <Link href="/roadmaps/my" className="btn btn-ghost btn-xs text-primary">
            Browse All
          </Link>
        </div>

        {roadmaps.length === 0 ? (
          <div className="text-center py-6 bg-base-200/50 rounded-box">
            <p className="text-base-content/70 mb-4">
              You haven&apos;t created any roadmaps yet.
            </p>
            <Link href="/roadmaps/new" className="btn btn-outline btn-info btn-sm">
              Create First Roadmap
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {roadmaps.slice(0, 3).map((roadmap) => (
              <div
                key={roadmap.id}
                className="flex items-center justify-between p-3 bg-base-200/50 rounded-box hover:bg-base-200 transition-colors border border-transparent hover:border-info/20"
              >
                <Link href={`/roadmaps/${roadmap.id}`} className="flex-1 flex flex-col min-w-0 mr-4">
                  <span className="font-bold text-sm truncate flex items-center gap-2">
                    {roadmap.title}
                    {/* Show warning icon if there's admin feedback on a pending/draft version */}
                    {(roadmap as any).feedback && (
                      <span className="tooltip tooltip-right text-warning" data-tip="Admin Requested Changes">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-base-content/60 capitalize">
                    {roadmap.domain.replace("-", " ")}
                  </span>
                </Link>
                <div className="flex items-center gap-2">
                  <span
                    className={`badge badge-sm shrink-0 ${
                      roadmap.status === "approved" || roadmap.status === "active"
                        ? "badge-success"
                        : roadmap.status === "pending"
                        ? "badge-warning"
                        : "badge-ghost"
                    }`}
                  >
                    {roadmap.status}
                  </span>
                  
                  <RoadmapActionsDropdown roadmap={roadmap} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
