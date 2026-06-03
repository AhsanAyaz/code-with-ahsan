'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Archive, Trophy, Zap } from 'lucide-react';
import ChallengeCard from '@/components/challenges/ChallengeCard';
import type { Challenge, ChallengeStatus } from '@/types/challenges';

type FilterTab = 'all' | ChallengeStatus;

const TABS: { label: string; value: FilterTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Past', value: 'past' },
];

/**
 * Main Public Challenges Hub.
 * Features a dynamic spotlight banner for the currently active challenge,
 * filterable tabs (All, Active, Upcoming, Past), and responsive masonry-style grids.
 */
export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/challenges');
        if (!res.ok) throw new Error('Failed to load challenges');
        const data = await res.json();
        setChallenges(data.challenges || []);
        setError(null);
        // Default to "active" tab if there's an active challenge
        if ((data.challenges || []).some((c: Challenge) => c.status === 'active')) {
          setActiveTab('active');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load challenges. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchChallenges();
  }, []);

  const counts = useMemo(() => ({
    all: challenges.length,
    active: challenges.filter(c => c.status === 'active').length,
    upcoming: challenges.filter(c => c.status === 'upcoming').length,
    past: challenges.filter(c => c.status === 'past').length,
  }), [challenges]);

  const filtered = useMemo(
    () => activeTab === 'all' ? challenges : challenges.filter(c => c.status === activeTab),
    [challenges, activeTab]
  );

  const activeChallenge = challenges.find(c => c.status === 'active');

  return (
    <div className="page-padding">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Hero */}
        <section className="bg-base-200 border border-base-300 rounded-2xl p-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="text-sm text-primary font-semibold mb-2">
                Monthly Community Challenges
              </p>
              <h1 className="text-4xl font-bold">Build. Submit. Level up.</h1>
              <p className="text-base-content/70 mt-3 max-w-2xl">
                Every month a new themed challenge drops. Build a real project,
                share your work, and earn points on the community leaderboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link href="/challenges/leaderboard" className="btn btn-primary">
                <Trophy className="w-4 h-4" aria-hidden="true" />
                Leaderboard
              </Link>
              <Link href="/challenges/archive" className="btn btn-outline">
                <Archive className="w-4 h-4" aria-hidden="true" />
                Archive
              </Link>
            </div>
          </div>
        </section>

        {/* Active challenge spotlight */}
        {!loading && activeChallenge && (
          <section className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 text-primary">
                <Zap className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs text-primary font-semibold uppercase tracking-wider">Active now</p>
                <p className="font-bold">{activeChallenge.title}</p>
              </div>
            </div>
            <div className="sm:ml-auto flex gap-2 shrink-0">
              <Link href={`/challenges/${activeChallenge.id}`} className="btn btn-sm btn-primary">
                View Challenge
              </Link>
              <Link href={`/challenges/${activeChallenge.id}/submit`} className="btn btn-sm btn-outline">
                Submit Project
              </Link>
            </div>
          </section>
        )}

        {/* Filter tabs + count */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="tabs tabs-boxed bg-base-200">
              {TABS.map(tab => (
                <button
                  key={tab.value}
                  id={`tab-${tab.value}`}
                  role="tab"
                  aria-selected={activeTab === tab.value}
                  className={`tab gap-2 ${activeTab === tab.value ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab(tab.value)}
                  disabled={loading}
                >
                  {tab.label}
                  {!loading && (
                    <span className="badge badge-sm">
                      {counts[tab.value]}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {!loading && (
              <p className="text-sm text-base-content/60">
                {filtered.length} challenge{filtered.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Content area */}
          {loading ? (
            <div className="flex justify-center py-20">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : error ? (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-base-300 bg-base-200 py-16 text-center">
              <Trophy className="w-10 h-10 mx-auto text-base-content/30 mb-3" aria-hidden="true" />
              <h2 className="text-xl font-semibold">No {activeTab !== 'all' ? activeTab : ''} challenges yet</h2>
              <p className="text-base-content/60 mt-2 text-sm">
                {activeTab === 'active'
                  ? 'There is no active challenge right now. Check upcoming or past challenges.'
                  : activeTab === 'upcoming'
                  ? 'No upcoming challenges are scheduled yet. Check back soon!'
                  : 'No challenges found. The first one will appear here once created.'}
              </p>
              {activeTab !== 'all' && (
                <button
                  className="btn btn-sm btn-ghost mt-4"
                  onClick={() => setActiveTab('all')}
                >
                  View all challenges
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(challenge => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
