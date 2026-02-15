import { useState, useEffect } from "react";
import Link from "next/link";
import { Project, RoadmapDomain } from "@/types/mentorship";
import { mapDomainToTechStack } from "@/lib/recommendations";

interface RelatedProjectsWidgetProps {
  domain: RoadmapDomain;
}

export default function RelatedProjectsWidget({
  domain,
}: RelatedProjectsWidgetProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      const techStack = mapDomainToTechStack(domain);
      if (techStack.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const query = techStack.slice(0, 10).join(","); // Limit to 10 for Firestore array-contains-any
        const response = await fetch(`/api/projects?techStack=${query}&status=active`);
        if (response.ok) {
          const data = await response.json();
          // Prioritize active projects with similar difficulty if possible, but simpler query for now
          setProjects(data.projects.slice(0, 4));
        }
      } catch (error) {
        console.error("Error fetching related projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [domain]);

  if (loading || projects.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-2xl">🏗️</span> Projects Using This Stack
      </h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {projects.map((project) => (
          <Link
            href={`/projects/${project.id}`}
            key={project.id}
            className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow border border-base-200"
          >
            <div className="card-body p-4">
              <h4 className="font-bold text-sm line-clamp-2 min-h-[40px]">
                {project.title}
              </h4>
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="badge badge-xs badge-outline capitalize">
                  {project.difficulty}
                </span>
                <span className="text-xs text-base-content/60 ml-auto">
                  {project.memberCount}/{project.maxTeamSize} members
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
