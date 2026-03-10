"use client";

import { useEffect, useState } from "react";
import { Star, Users, UserCheck, BookOpen, CheckCircle, MessageCircle } from "lucide-react";

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

type StatItem = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

function buildStats(data: StatsResponse): StatItem[] {
  const items: StatItem[] = [
    {
      label: "Mentors",
      value: data.community.mentors.toLocaleString(),
      icon: UserCheck,
      color: "text-primary",
    },
    {
      label: "Mentees",
      value: data.community.mentees.toLocaleString(),
      icon: Users,
      color: "text-secondary",
    },
    {
      label: "Active Mentorships",
      value: data.community.activeMentorships.toLocaleString(),
      icon: BookOpen,
      color: "text-accent",
    },
    {
      label: "Completed Mentorships",
      value: data.community.completedMentorships.toLocaleString(),
      icon: CheckCircle,
      color: "text-success",
    },
    {
      label: "Avg Rating",
      value: `${data.community.averageRating.toFixed(1)} / 5`,
      icon: Star,
      color: "text-warning",
    },
  ];

  if (data.social?.discord) {
    items.push({
      label: "Discord Members",
      value: data.social.discord.count.toLocaleString(),
      icon: MessageCircle,
      color: "text-info",
    });
  }

  return items;
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="skeleton w-10 h-10 rounded-lg"></div>
          <div className="skeleton w-16 h-6 rounded"></div>
          <div className="skeleton w-24 h-4 rounded"></div>
        </div>
      ))}
    </div>
  );
}

export default function CommunityStats() {
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

  // Hide section on error
  if (error) return null;

  return (
    <section className="py-16 px-4 sm:px-8 md:px-12 lg:px-16 bg-base-200 relative overflow-hidden">
      {/* Section header */}
      <div className="mb-10 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-3 text-base-content">
          Community in{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            Numbers
          </span>
        </h2>
        <p className="text-base-content/60 text-base max-w-xl mx-auto">
          Live stats — refreshed every 5 minutes from our community data.
        </p>
      </div>

      {loading ? (
        <StatsSkeleton />
      ) : (
        stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {buildStats(stats).map((stat, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center gap-2 p-4 rounded-lg bg-base-100 border border-base-300 hover:shadow-md transition-shadow"
              >
                <div
                  className={`w-10 h-10 rounded-lg bg-base-200 flex items-center justify-center ${stat.color}`}
                >
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-base-content/60 text-xs font-medium leading-tight">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </section>
  );
}
