"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MatchWithProfile } from "@/types/mentorship";
import ProfileAvatar from "@/components/ProfileAvatar";

interface CurrentMenteesSectionProps {
  userId: string;
}

function formatStartDate(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MenteeRow({ match }: { match: MatchWithProfile }) {
  const startDate = formatStartDate(match.approvedAt);
  const status = match.status || "active";

  return (
    <div className="flex items-center gap-4 p-4 bg-base-200/50 rounded-box hover:bg-base-200 transition-colors">
      <ProfileAvatar
        photoURL={match.partnerProfile?.photoURL}
        displayName={match.partnerProfile?.displayName}
        size="lg"
        ring
      />
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate">
          {match.partnerProfile?.displayName || "Mentee"}
        </div>
        <div className="text-xs text-base-content/60 truncate">
          {match.partnerProfile?.currentRole || "Developer"}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="badge badge-success badge-sm capitalize">{status}</span>
          {startDate && (
            <span className="text-xs text-base-content/60">
              Since {startDate}
            </span>
          )}
          <Link
            href={`/mentorship/dashboard/${match.id}`}
            className="btn btn-primary btn-xs"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CurrentMenteesSection({
  userId,
}: CurrentMenteesSectionProps) {
  const [mentees, setMentees] = useState<MatchWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/mentorship/my-matches?uid=${userId}&role=mentor`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setMentees(data.activeMatches || []);
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to load mentees:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center">
          <h3 className="card-title flex items-center gap-2">
            <span className="text-2xl">🤝</span> Current Mentees
            {mentees.length > 0 && (
              <span className="badge badge-success badge-sm">
                {mentees.length}
              </span>
            )}
          </h3>
          <Link
            href="/mentorship/my-matches"
            className="btn btn-ghost btn-xs text-primary"
          >
            View All
          </Link>
        </div>
        <p className="text-sm text-base-content/70">
          Mentees you are actively mentoring.
        </p>

        <div className="divider"></div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-24 bg-base-200 rounded-box animate-pulse"
              ></div>
            ))}
          </div>
        ) : mentees.length === 0 ? (
          <div className="text-center py-8 bg-base-200/50 rounded-box">
            <div className="text-4xl mb-2">🌱</div>
            <p className="text-base-content/70">
              You don&apos;t have any active mentees yet.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {mentees.map((match) => (
              <MenteeRow key={match.id} match={match} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
