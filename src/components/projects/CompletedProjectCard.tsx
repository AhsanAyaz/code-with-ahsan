"use client";

import { useRouter } from "next/navigation";
import { Project, ProjectDifficulty } from "@/types/mentorship";
import ProfileAvatar from "@/components/ProfileAvatar";

interface CompletedProjectCardProps {
  project: Project;
}

export default function CompletedProjectCard({
  project,
}: CompletedProjectCardProps) {
  const router = useRouter();

  const difficultyColors: Record<ProjectDifficulty, string> = {
    beginner: "badge-success",
    intermediate: "badge-warning",
    advanced: "badge-error",
  };

  const truncatedDescription =
    project.description.length > 120
      ? project.description.substring(0, 120) + "..."
      : project.description;

  const truncatedDemoDescription =
    project.demoDescription && project.demoDescription.length > 80
      ? project.demoDescription.substring(0, 80) + "..."
      : project.demoDescription;

  const completedAtFormatted = project.completedAt
    ? new Date(project.completedAt).toLocaleDateString()
    : null;

  return (
    <div
      className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow h-full cursor-pointer"
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      <div className="card-body">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="card-title text-lg">{project.title}</h2>
          <span className="badge badge-sm badge-info">completed</span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <ProfileAvatar
            photoURL={project.creatorProfile?.photoURL}
            displayName={project.creatorProfile?.displayName}
            size="xs"
          />
          <span className="text-sm text-base-content/70">
            {project.creatorProfile?.displayName}
          </span>
        </div>

        <p className="text-sm text-base-content/70 mb-3">
          {truncatedDescription}
        </p>

        <div className="flex items-center gap-2 mb-3">
          <span
            className={`badge badge-sm ${difficultyColors[project.difficulty]}`}
          >
            Difficulty: {project.difficulty}
          </span>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {project.techStack.slice(0, 4).map((tech, index) => (
            <span key={index} className="badge badge-sm badge-outline">
              {tech}
            </span>
          ))}
          {project.techStack.length > 4 && (
            <span className="badge badge-sm badge-outline">
              +{project.techStack.length - 4}
            </span>
          )}
        </div>

        {completedAtFormatted && (
          <div className="text-xs text-base-content/60 mb-3">
            Completed: {completedAtFormatted}
          </div>
        )}

        {project.demoUrl && (
          <div className="mt-auto">
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
              onClick={(e) => e.stopPropagation()}
            >
              View Demo
            </a>
            {truncatedDemoDescription && (
              <p className="text-xs text-base-content/60 mt-1">
                {truncatedDemoDescription}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
