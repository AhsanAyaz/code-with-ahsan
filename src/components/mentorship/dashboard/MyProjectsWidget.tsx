import Link from "next/link";
import { Project } from "@/types/mentorship";

interface MyProjectsWidgetProps {
  projects: Project[];
  userId: string;
  loading?: boolean;
}

export default function MyProjectsWidget({
  projects,
  userId,
  loading = false,
}: MyProjectsWidgetProps) {
  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="h-7 w-48 bg-base-200 rounded animate-pulse mb-4"></div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-base-200 rounded-box animate-pulse"></div>
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
              <span className="text-2xl">🏗️</span> My Projects
              {projects.length > 0 && (
                <span className="badge badge-primary badge-sm">
                  {projects.length}
                </span>
              )}
            </h3>
            <Link href="/projects/new" className="btn btn-ghost btn-xs text-primary">
              + New
            </Link>
          </div>
          <Link href="/projects/my" className="btn btn-ghost btn-xs text-primary">
            Browse All
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-6 bg-base-200/50 rounded-box">
            <p className="text-base-content/70 mb-4">
              You haven&apos;t joined any projects yet.
            </p>
            <Link href="/projects/discover" className="btn btn-outline btn-sm">
              Explore Projects
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {projects.slice(0, 3).map((project) => (
              <div
                key={project.id}
                className="bg-base-200/50 rounded-box hover:bg-base-200 transition-colors border border-transparent hover:border-primary/20 relative"
              >
                <Link href={`/projects/${project.id}`} className="block p-6">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <span className="font-bold truncate flex-1">
                      {project.title}
                    </span>
                    <span
                      className={`badge badge-xs shrink-0 ${
                        project.status === "active"
                          ? "badge-success"
                          : project.status === "completed"
                          ? "badge-info"
                          : "badge-ghost"
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-xs text-base-content/60">
                      {project.creatorId === userId ? (
                        <span className="text-primary font-medium">Owner</span>
                      ) : (
                        "Member"
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {project.pendingApplicationCount !== undefined &&
                        project.pendingApplicationCount > 0 && (
                          <span className="badge badge-error badge-xs">
                            {project.pendingApplicationCount} apps
                          </span>
                        )}
                    </div>
                  </div>
                </Link>

                {/* Edit Button - Outside main link to avoid nested <a> tags */}
                {project.creatorId === userId && (
                  <Link
                    href={`/projects/${project.id}/edit`}
                    className="btn btn-xs btn-circle btn-ghost bg-base-100 hover:bg-primary hover:text-primary-content tooltip tooltip-left absolute bottom-5 right-5 z-10"
                    data-tip="Edit Project"
                  >
                    ✎
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
