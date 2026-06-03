import Link from "next/link";
import { Archive, Trophy } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";
import {
  getLeaderboard,
  getMonthlyLeaderboard,
} from "@/services/ChallengeService";
import { formatLeaderboardMonth } from "@/lib/challenges";
import type { LeaderboardEntry } from "@/types/challenges";

export const dynamic = "force-dynamic";



/**
 * Helper component to render a leaderboard table.
 * Used for both the monthly and all-time leaderboards on the main page.
 */
function LeaderboardTable({
  entries,
  emptyLabel,
}: {
  entries: LeaderboardEntry[];
  emptyLabel: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-base-300 bg-base-200 p-8 text-center">
        <p className="font-semibold">{emptyLabel}</p>
        <p className="text-sm text-base-content/70 mt-2">
          Approved submissions will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-base-300">
      <table className="table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Participant</th>
            <th>Points</th>
            <th>Challenges</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={entry.userId}>
              <td className="font-bold">#{index + 1}</td>
              <td>
                <div className="flex items-center gap-3">
                  <ProfileAvatar
                    photoURL={entry.userAvatar}
                    displayName={entry.username}
                    size="sm"
                  />
                  <span className="font-semibold">{entry.username}</span>
                </div>
              </td>
              <td>{entry.totalPoints}</td>
              <td>{entry.challengesCompleted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The Global Challenges Leaderboard.
 * Fetches and displays the top 50 participants for both the current month
 * and all-time rankings using Server-Side Rendering (SSR).
 */
export default async function ChallengeLeaderboardPage() {
  const [allTimeLeaderboard, monthly] = await Promise.all([
    getLeaderboard(50),
    getMonthlyLeaderboard(undefined, 50),
  ]);

  return (
    <div className="page-padding">
      <div className="max-w-6xl mx-auto space-y-8">
        <section className="bg-base-200 border border-base-300 rounded-lg p-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <p className="text-sm text-primary font-semibold mb-2">
                Community Challenge Leaderboard
              </p>
              <h1 className="text-4xl font-bold">Build, submit, score</h1>
              <p className="text-base-content/70 mt-3 max-w-2xl">
                Each accepted challenge submission currently awards 10 points.
                Submissions are visible immediately in the gallery.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/challenges" className="btn btn-primary">
                <Trophy className="w-4 h-4" aria-hidden="true" />
                Active Challenge
              </Link>
              <Link href="/challenges/archive" className="btn btn-outline">
                <Archive className="w-4 h-4" aria-hidden="true" />
                Past Challenges
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="stats bg-base-200 border border-base-300 shadow-sm">
            <div className="stat">
              <div className="stat-title">Base Points</div>
              <div className="stat-value">10</div>
              <div className="stat-desc">per submission</div>
            </div>
          </div>
          <div className="stats bg-base-200 border border-base-300 shadow-sm">
            <div className="stat">
              <div className="stat-title">Monthly Entries</div>
              <div className="stat-value">{monthly.leaderboard.length}</div>
              <div className="stat-desc">{formatLeaderboardMonth(monthly.month)}</div>
            </div>
          </div>
          <div className="stats bg-base-200 border border-base-300 shadow-sm">
            <div className="stat">
              <div className="stat-title">All-Time Entries</div>
              <div className="stat-value">{allTimeLeaderboard.length}</div>
              <div className="stat-desc">top 50 shown</div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">
              {formatLeaderboardMonth(monthly.month)} Leaderboard
            </h2>
            <LeaderboardTable
              entries={monthly.leaderboard}
              emptyLabel="No monthly submissions yet"
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">All-Time Leaderboard</h2>
            <LeaderboardTable
              entries={allTimeLeaderboard}
              emptyLabel="No leaderboard entries yet"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
