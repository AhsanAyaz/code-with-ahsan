import { useState, useEffect } from "react";
import Link from "next/link";
import { Roadmap } from "@/types/mentorship";
import { mapTechStackToDomains } from "@/lib/recommendations";

interface RecommendedRoadmapsWidgetProps {
  techStack: string[];
}

export default function RecommendedRoadmapsWidget({
  techStack,
}: RecommendedRoadmapsWidgetProps) {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!techStack || techStack.length === 0) {
        setLoading(false);
        return;
      }

      const domains = mapTechStackToDomains(techStack);
      if (domains.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const query = domains.join(",");
        const response = await fetch(`/api/roadmaps?domain=${query}&status=approved`);
        if (response.ok) {
          const data = await response.json();
          // Filter out roadmaps that don't match any domain (just in case API returns loose matches)
          // and limit to top 4
          setRoadmaps(data.roadmaps.slice(0, 4));
        }
      } catch (error) {
        console.error("Error fetching recommended roadmaps:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [techStack]);

  if (loading || roadmaps.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-2xl">🗺️</span> Recommended Learning Paths
      </h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roadmaps.map((roadmap) => (
          <Link
            href={`/roadmaps/${roadmap.id}`}
            key={roadmap.id}
            className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow border border-base-200"
          >
            <div className="card-body p-4">
              <h4 className="font-bold text-sm line-clamp-2 min-h-[40px]">
                {roadmap.title}
              </h4>
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="badge badge-xs badge-outline capitalize">
                  {roadmap.domain.replace("-", " ")}
                </span>
                <span className="badge badge-xs badge-ghost capitalize">
                  {roadmap.difficulty}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
