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
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">🏗️</span> My Projects
            {projects.length > 0 && (
              <span className="badge badge-primary badge-sm">
                {projects.length}
              </span>
            )}
          </h3>
          <Link href="/projects" className="btn btn-ghost btn-xs text-primary">
            Browse All
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-6 bg-base-200/50 rounded-box">
            <p className="text-base-content/70 mb-4">
              You haven&apos;t joined any projects yet.
            </p>
            <Link href="/projects" className="btn btn-outline btn-sm">
              Explore Projects
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {projects.map((project) => (
              <Link
                href={`/projects/${project.id}`}
                key={project.id}
                className="p-4 bg-base-200/50 rounded-box hover:bg-base-200 transition-colors border border-transparent hover:border-primary/20"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold truncate mr-2">
                    {project.title}
                  </span>
                  <span
                    className={`badge badge-xs ${
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
                <div className="flex justify-between items-center">
                  <span className="text-xs text-base-content/60">
                    {project.creatorId === userId ? (
                      <span className="text-primary font-medium">Owner</span>
                    ) : (
                      "Member"
                    )}
                  </span>
                  {project.pendingApplicationCount !== undefined &&
                    project.pendingApplicationCount > 0 && (
                      <span className="badge badge-error badge-xs">
                        {project.pendingApplicationCount} apps
                      </span>
                    )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
