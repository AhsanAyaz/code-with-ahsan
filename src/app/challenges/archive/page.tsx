"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Search, Trophy } from "lucide-react";
import ChallengeCard from "@/components/challenges/ChallengeCard";
import type { Challenge, ChallengeDifficulty } from "@/types/challenges";

export const dynamic = "force-dynamic";

/**
 * Challenge Archive Page.
 * Displays exclusively 'past' challenges, allowing users to filter by 
 * topic, difficulty, and perform text-based searches.
 */
export default function ChallengeArchivePage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState<ChallengeDifficulty | "all">("all");

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/challenges?status=past");
        if (!response.ok) {
          throw new Error("Failed to load challenges");
        }
        const data = await response.json();
        setChallenges(data.challenges || []);
        setError(null);
      } catch (fetchError) {
        console.error("Error fetching challenge archive:", fetchError);
        setError("Failed to load challenge archive. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, []);

  const topics = useMemo(
    () => Array.from(new Set(challenges.map((challenge) => challenge.topic))).sort(),
    [challenges]
  );

  const filteredChallenges = challenges.filter((challenge) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        challenge.title.toLowerCase().includes(search) ||
        challenge.description.toLowerCase().includes(search) ||
        challenge.topic.toLowerCase().includes(search);

      if (!matchesSearch) return false;
    }

    if (topicFilter !== "all" && challenge.topic !== topicFilter) {
      return false;
    }

    if (difficultyFilter !== "all" && challenge.difficulty !== difficultyFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="page-padding">
      <div className="max-w-6xl mx-auto space-y-8">
        <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-sm text-primary font-semibold mb-2">
              Challenge Archive
            </p>
            <h1 className="text-4xl font-bold">Past Community Challenges</h1>
            <p className="text-base-content/70 mt-3 max-w-2xl">
              Browse completed monthly prompts, project galleries, topics, and
              difficulty levels.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/challenges" className="btn btn-outline">
              Active Challenge
            </Link>
            <Link href="/challenges/leaderboard" className="btn btn-primary">
              <Trophy className="w-4 h-4" aria-hidden="true" />
              Leaderboard
            </Link>
          </div>
        </section>

        <section className="bg-base-200 border border-base-300 rounded-lg p-5">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_220px] gap-4">
            <label className="form-control">
              <span className="label-text mb-2 flex items-center gap-2">
                <Search className="w-4 h-4" aria-hidden="true" />
                Search
              </span>
              <input
                type="search"
                className="input input-bordered w-full"
                placeholder="Search title, topic, or description"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <label className="form-control">
              <span className="label-text mb-2 flex items-center gap-2">
                <Filter className="w-4 h-4" aria-hidden="true" />
                Topic
              </span>
              <select
                className="select select-bordered w-full"
                value={topicFilter}
                onChange={(event) => setTopicFilter(event.target.value)}
              >
                <option value="all">All topics</option>
                {topics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text mb-2">Difficulty</span>
              <select
                className="select select-bordered w-full"
                value={difficultyFilter}
                onChange={(event) =>
                  setDifficultyFilter(event.target.value as ChallengeDifficulty | "all")
                }
              >
                <option value="all">All levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        ) : filteredChallenges.length === 0 ? (
          <div className="text-center py-16 bg-base-200 rounded-lg border border-base-300">
            <h2 className="text-xl font-semibold">No challenges found</h2>
            <p className="text-base-content/70 mt-2">
              Try clearing your filters or check back after the first challenge closes.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-base-content/60">
              Showing {filteredChallenges.length} of {challenges.length} past challenges
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredChallenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
