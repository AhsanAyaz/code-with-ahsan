"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProfileAvatar from "@/components/ProfileAvatar";
import { MatchWithProfile } from "@/types/mentorship";

interface CurrentMenteesCardProps {
  /** The logged-in mentor's uid */
  userId: string;
}

/**
 * Shows the logged-in mentor's current (active) mentees on their profile.
 * Reuses GET /api/mentorship/my-matches which returns activeMatches with the
 * mentee attached as `partnerProfile`. Handles 0, 1, or many mentees.
 */
export default function CurrentMenteesCard({ userId }: CurrentMenteesCardProps) {
  const [mentees, setMentees] = useState<MatchWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchMentees = async () => {
      try {
        const res = await fetch(
          `/api/mentorship/my-matches?uid=${userId}&role=mentor`,
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setMentees(data.activeMatches || []);
        }
      } catch (error) {
        console.error("Failed to load current mentees:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (userId) fetchMentees();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h3 className="card-title">
            🎓 Current Mentees
            {!loading && mentees.length > 0 && (
              <span className="badge badge-success badge-sm">
                {mentees.length}
              </span>
            )}
          </h3>
          {mentees.length > 0 && (
            <Link
              href="/mentorship/my-matches"
              className="btn btn-ghost btn-xs text-primary"
            >
              View All
            </Link>
          )}
        </div>

        <p className="text-sm text-base-content/70">
          Mentees you are actively mentoring.
        </p>

        <div className="divider"></div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-16 bg-base-200 rounded-box animate-pulse"
              ></div>
            ))}
          </div>
        ) : mentees.length === 0 ? (
          <div className="text-center py-8 bg-base-200/50 rounded-box">
            <div className="text-4xl mb-2">🌱</div>
            <p className="text-base-content/70">
              You don&apos;t have any active mentees yet.
            </p>
            <p className="text-sm text-base-content/50 mt-1">
              When you accept mentee requests, they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {mentees.map((match) => (
              <li key={match.id}>
                <Link
                  href={`/mentorship/dashboard/${match.id}`}
                  className="flex items-center gap-4 p-3 bg-base-200/50 rounded-box hover:bg-base-200 transition-colors"
                >
                  <ProfileAvatar
                    photoURL={match.partnerProfile?.photoURL}
                    displayName={match.partnerProfile?.displayName}
                    size="lg"
                    ring
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">
                      {match.partnerProfile?.displayName || "Unknown"}
                    </div>
                    {match.partnerProfile?.currentRole && (
                      <div className="text-xs text-base-content/60 truncate">
                        {match.partnerProfile.currentRole}
                      </div>
                    )}
                    <div className="text-xs text-base-content/50 mt-0.5">
                      Mentoring since{" "}
                      {match.approvedAt
                        ? new Date(match.approvedAt).toLocaleDateString()
                        : "N/A"}
                    </div>
                  </div>
                  <span className="badge badge-success badge-sm shrink-0">
                    Active
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
