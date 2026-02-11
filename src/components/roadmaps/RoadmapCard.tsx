"use client";

import Link from "next/link";
import Image from "next/image";
import { Roadmap } from "@/types/mentorship";

interface RoadmapCardProps {
  roadmap: Roadmap;
}

export default function RoadmapCard({ roadmap }: RoadmapCardProps) {
  // Truncate description to 150 characters
  const truncatedDescription =
    roadmap.description && roadmap.description.length > 150
      ? roadmap.description.substring(0, 150) + "..."
      : roadmap.description || "";

  // Map domain values to readable labels
  const domainLabels: Record<string, string> = {
    "web-dev": "Web Development",
    "frontend": "Frontend",
    "backend": "Backend",
    "ml": "Machine Learning",
    "ai": "AI",
    "mcp": "MCP Servers",
    "agents": "AI Agents",
    "prompt-engineering": "Prompt Engineering",
  };

  return (
    <Link href={`/roadmaps/${roadmap.id}`}>
      <div className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow h-full cursor-pointer">
        <div className="card-body">
          <h2 className="card-title text-lg">{roadmap.title}</h2>

          <div className="flex items-center gap-2 mb-2">
            {roadmap.creatorProfile?.photoURL && (
              <Image
                src={roadmap.creatorProfile.photoURL}
                alt={roadmap.creatorProfile.displayName}
                width={24}
                height={24}
                className="rounded-full"
              />
            )}
            <span className="text-sm text-base-content/70">
              {roadmap.creatorProfile?.displayName}
            </span>
          </div>

          <p className="text-sm text-base-content/70 mb-3">
            {truncatedDescription}
          </p>

          <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-primary badge-sm">
              {domainLabels[roadmap.domain] || roadmap.domain}
            </span>
            <span className="badge badge-secondary badge-sm">
              {roadmap.difficulty}
            </span>
          </div>

          {roadmap.estimatedHours && (
            <div className="text-xs text-base-content/60">
              Estimated: {roadmap.estimatedHours} hours
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
