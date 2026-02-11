"use client";

import Link from "next/link";
import Image from "next/image";
import { Project, ProjectDifficulty } from "@/types/mentorship";

interface ShowcaseCardProps {
  project: Project;
}

export default function ShowcaseCard({ project }: ShowcaseCardProps) {
  const difficultyColors: Record<ProjectDifficulty, string> = {
    beginner: "badge-success",
    intermediate: "badge-warning",
    advanced: "badge-error",
  };

  const truncatedDescription =
    project.description.length > 150
      ? project.description.substring(0, 150) + "..."
      : project.description;

  // Format completion date
  const completedDate = project.completedAt
    ? new Date(project.completedAt as unknown as string).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow h-full">
      <div className="card-body">
        {/* Header with title and completion badge */}
        <div className="flex items-start justify-between gap-2">
          <Link href={`/projects/${project.id}`} className="flex-1">
            <h2 className="card-title text-lg hover:text-primary transition-colors cursor-pointer">
              {project.title}
            </h2>
          </Link>
          <span className="badge badge-info badge-sm whitespace-nowrap">Completed</span>
        </div>

        {/* Creator */}
        <div className="flex items-center gap-2 mb-1">
          {project.creatorProfile?.photoURL && (
            <Image
              src={project.creatorProfile.photoURL}
              alt={project.creatorProfile.displayName}
              width={20}
              height={20}
              className="rounded-full"
            />
          )}
          <span className="text-sm text-base-content/70">
            {project.creatorProfile?.displayName}
          </span>
          {completedDate && (
            <span className="text-xs text-base-content/50 ml-auto">
              {completedDate}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-base-content/70 mb-2">{truncatedDescription}</p>

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-1 mb-2">
          {project.techStack.slice(0, 4).map((tech, index) => (
            <span key={index} className="badge badge-xs badge-outline">
              {tech}
            </span>
          ))}
          {project.techStack.length > 4 && (
            <span className="badge badge-xs badge-outline">
              +{project.techStack.length - 4}
            </span>
          )}
        </div>

        {/* Difficulty */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`badge badge-xs ${difficultyColors[project.difficulty]}`}>
            {project.difficulty}
          </span>
        </div>

        {/* Action Links */}
        <div className="card-actions justify-end mt-auto">
          {project.demoUrl && (
            <a
              href={project.demoUrl as string}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
            >
              View Demo
            </a>
          )}
          <Link href={`/projects/${project.id}`} className="btn btn-ghost btn-sm">
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}
