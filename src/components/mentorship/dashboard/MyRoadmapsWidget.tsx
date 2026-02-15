import Link from "next/link";
import { Roadmap } from "@/types/mentorship";

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
            {roadmaps.map((roadmap) => (
              <Link
                href={`/roadmaps/${roadmap.id}`}
                key={roadmap.id}
                className="flex items-center justify-between p-3 bg-base-200/50 rounded-box hover:bg-base-200 transition-colors border border-transparent hover:border-info/20"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-sm truncate max-w-[200px]">
                    {roadmap.title}
                  </span>
                  <span className="text-xs text-base-content/60 capitalize">
                    {roadmap.domain.replace("-", " ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`badge badge-sm ${
                      roadmap.status === "approved" || roadmap.status === "active"
                        ? "badge-success"
                        : roadmap.status === "pending"
                        ? "badge-warning"
                        : "badge-ghost"
                    }`}
                  >
                    {roadmap.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
