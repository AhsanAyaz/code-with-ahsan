"use client";

import { useEffect, useState } from "react";
import { MessageCircle, UserCheck, BookOpen, Star } from "lucide-react";

type StatsResponse = {
  community: {
    mentors: number;
    mentees: number;
    activeMentorships: number;
    completedMentorships: number;
    averageRating: number;
  };
  social: Record<string, { label: string; count: number; url: string }>;
  cachedAt: string;
};

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <div className="skeleton w-8 h-8 rounded-lg shrink-0"></div>
          <div className="flex flex-col gap-1">
            <div className="skeleton w-14 h-5 rounded"></div>
            <div className="skeleton w-20 h-3 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CommunityStatsBar() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch stats");
        return res.json() as Promise<StatsResponse>;
      })
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return null;

  const statItems = stats
    ? [
        {
          label: "Discord Members",
          value: stats.social?.discord?.count?.toLocaleString() ?? "4,300+",
          icon: MessageCircle,
          color: "text-info",
        },
        {
          label: "Active Mentors",
          value: stats.community.mentors.toLocaleString(),
          icon: UserCheck,
          color: "text-primary",
        },
        {
          label: "Active Mentorships",
          value: stats.community.activeMentorships.toLocaleString(),
          icon: BookOpen,
          color: "text-secondary",
        },
        {
          label: "Avg Rating",
          value: `${stats.community.averageRating.toFixed(1)} / 5`,
          icon: Star,
          color: "text-warning",
        },
      ]
    : [];

  return (
    <section className="bg-base-200 border-y border-base-300 page-padding py-6">
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <StatsSkeleton />
        ) : (
          stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statItems.map((stat, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 rounded-lg bg-base-100 border border-base-300"
                >
                  <div
                    className={`w-8 h-8 rounded-lg bg-base-200 flex items-center justify-center shrink-0 ${stat.color}`}
                  >
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${stat.color}`}>
                      {stat.value}
                    </div>
                    <div className="text-base-content/60 text-xs font-medium">
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </section>
  );
}
