"use client";

import Link from "next/link";
import Image from "next/image";
import { Project, ProjectDifficulty } from "@/types/mentorship";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const difficultyColors: Record<ProjectDifficulty, string> = {
    beginner: "badge-success",
    intermediate: "badge-warning",
    advanced: "badge-error",
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
          <h2 className="card-title text-lg">{project.title}</h2>

          <div className="flex items-center gap-2 mb-2">
            {project.creatorProfile?.photoURL && (
              <Image
                src={project.creatorProfile.photoURL}
                alt={project.creatorProfile.displayName}
                width={24}
                height={24}
                className="rounded-full"
              />
            )}
            <span className="text-sm text-base-content/70">
              {project.creatorProfile?.displayName}
            </span>
          </div>

          <p className="text-sm text-base-content/70 mb-3">
            {truncatedDescription}
          </p>

          <div className="flex items-center gap-2 mb-3">
            <span className={`badge badge-sm ${difficultyColors[project.difficulty]}`}>
              {project.difficulty}
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
