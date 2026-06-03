"use client";

import { useContext, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Trophy } from 'lucide-react';
import { AuthContext } from '@/contexts/AuthContext';
import { useMentorship } from '@/contexts/MentorshipContext';
import { authFetch } from '@/lib/apiClient';
import { useToast } from '@/contexts/ToastContext';
import {
  CHALLENGE_DIFFICULTY_BADGE_CLASSES,
  CHALLENGE_STATUS_BADGE_CLASSES,
  formatChallengeDateRange,
} from '@/lib/challenges';
import type { Challenge } from '@/types/challenges';

/**
 * Displays a summary card for a single Challenge.
 * Used heavily on the main /challenges archive and dashboard views.
 * Handles the "Participate" action directly if the user is logged in.
 */
export default function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const { setShowLoginPopup } = useContext(AuthContext);
  const { user } = useMentorship();
  const toast = useToast();
  const [joining, setJoining] = useState(false);

  const handleJoin = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      setShowLoginPopup(true);
      return;
    }

    setJoining(true);

    try {
      const response = await authFetch(`/api/challenges/${challenge.id}/participants`, {
        method: 'POST',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to join challenge');
      }

      toast.success('You joined the challenge! You can now submit your project.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to join challenge';
      toast.error(message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <article className="card bg-base-200 border border-base-300 shadow-sm hover:shadow-md transition-shadow h-full">
      <div className="card-body">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-primary font-semibold">{challenge.topic}</p>
            <Link href={`/challenges/${challenge.id}`} className="card-title text-xl mt-1 block hover:underline">
              {challenge.title}
            </Link>
          </div>
          <Trophy className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
        </div>

        <p className="text-sm text-base-content/70 line-clamp-3 mt-3">
          {challenge.description}
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          <span className={`badge ${CHALLENGE_STATUS_BADGE_CLASSES[challenge.status]}`}>
            {challenge.status}
          </span>
          <span className={`badge ${CHALLENGE_DIFFICULTY_BADGE_CLASSES[challenge.difficulty]}`}>
            {challenge.difficulty}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-base-content/60 mt-5">
          <CalendarDays className="w-4 h-4" aria-hidden="true" />
          <span>{formatChallengeDateRange(challenge.startDate, challenge.endDate)}</span>
        </div>

        {challenge.status === 'active' && (
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/challenges/${challenge.id}`} className="btn btn-sm btn-outline">
              View
            </Link>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? 'Joining...' : 'Participate'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
