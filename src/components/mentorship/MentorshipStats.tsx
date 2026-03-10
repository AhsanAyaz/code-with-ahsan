"use client";

import { useEffect, useState } from "react";
import { UserCheck, BookOpen, CheckCircle, Star } from "lucide-react";

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
    <div className="stats shadow w-full bg-gradient-to-r from-primary/10 to-secondary/10">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="stat">
          <div className="skeleton h-4 w-24 mb-2 rounded"></div>
          <div className="skeleton h-8 w-16 mb-1 rounded"></div>
          <div className="skeleton h-3 w-20 rounded"></div>
        </div>
      ))}
    </div>
  );
}

export default function MentorshipStats() {
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

  if (loading) return <StatsSkeleton />;

  if (!stats) return null;

  return (
    <div className="stats shadow w-full bg-gradient-to-r from-primary/10 to-secondary/10">
      <div className="stat">
        <div className="stat-figure text-primary">
          <UserCheck className="w-8 h-8" />
        </div>
        <div className="stat-title">Active Mentors</div>
        <div className="stat-value text-primary">
          {stats.community.mentors.toLocaleString()}
        </div>
        <div className="stat-desc">Ready to help</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-secondary">
          <BookOpen className="w-8 h-8" />
        </div>
        <div className="stat-title">Active Mentorships</div>
        <div className="stat-value text-secondary">
          {stats.community.activeMentorships.toLocaleString()}
        </div>
        <div className="stat-desc">Ongoing relationships</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-accent">
          <CheckCircle className="w-8 h-8" />
        </div>
        <div className="stat-title">Completed</div>
        <div className="stat-value text-accent">
          {stats.community.completedMentorships.toLocaleString()}
        </div>
        <div className="stat-desc">Success stories</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-warning">
          <Star className="w-8 h-8" />
        </div>
        <div className="stat-title">Avg Rating</div>
        <div className="stat-value text-warning">
          {stats.community.averageRating.toFixed(1)}
        </div>
        <div className="stat-desc">Out of 5.0</div>
      </div>
    </div>
  );
}
