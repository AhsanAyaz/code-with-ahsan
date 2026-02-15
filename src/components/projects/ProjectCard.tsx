"use client";

import Link from "next/link";
import { Project, ProjectDifficulty } from "@/types/mentorship";
import ProfileAvatar from "@/components/ProfileAvatar";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const difficultyColors: Record<ProjectDifficulty, string> = {
    beginner: "badge-success",
    intermediate: "badge-warning",
    advanced: "badge-error",
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "badge-warning";
      case "active":
        return "badge-success";
      case "completed":
        return "badge-info";
      case "declined":
        return "badge-error";
      default:
        return "badge-ghost";
    }
  };

  // Truncate description to 120 characters
  const truncatedDescription =
    project.description.length > 120
      ? project.description.substring(0, 120) + "..."
      : project.description;

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow h-full cursor-pointer">
        <div className="card-body">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="card-title text-lg">{project.title}</h2>
            <span className={`badge badge-sm ${getStatusBadgeClass(project.status)}`}>
              {project.status}
            </span>
            {project.pendingApplicationCount != null && project.pendingApplicationCount > 0 && (
              <span className="badge badge-primary badge-sm whitespace-nowrap">
                {project.pendingApplicationCount} pending
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <ProfileAvatar photoURL={project.creatorProfile?.photoURL} displayName={project.creatorProfile?.displayName} size="xs" />
            <span className="text-sm text-base-content/70">
              {project.creatorProfile?.displayName}
            </span>
          </div>

          <p className="text-sm text-base-content/70 mb-3">
            {truncatedDescription}
          </p>

          <div className="flex items-center gap-2 mb-3">
            <span className={`badge badge-sm ${difficultyColors[project.difficulty]}`}>
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

          <div className="text-xs text-base-content/60">
            Max team: {project.maxTeamSize} members
          </div>
        </div>
      </div>
    </Link>
  );
}
