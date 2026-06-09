import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, Medal, Send, Trophy, Users } from "lucide-react";
import SubmissionGallery from "@/components/challenges/SubmissionGallery";
import MarkdownRenderer from "@/components/roadmaps/MarkdownRenderer";
import ProfileAvatar from "@/components/ProfileAvatar";
import {
  getChallenge,
  getChallengeParticipantsCount,
  getChallengeParticipantsWithStatus,
  getLeaderboard,
  getSubmissionsForChallenge,
} from "@/services/ChallengeService";
import ParticipateButton from "@/components/challenges/ParticipateButton";
import {
  CHALLENGE_STATUS_BADGE_CLASSES,
  formatChallengeDateRange,
} from "@/lib/challenges";
import type {
  ChallengeParticipantStatus,
  LeaderboardEntry,
} from "@/types/challenges";

export const dynamic = "force-dynamic";

const rankEmoji = ["🥇", "🥈", "🥉"];

/**
 * Helper component to render a condensed "top 10" leaderboard for a specific challenge.
 */
function MiniLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-base-300 bg-base-200 p-6 text-center">
        <Trophy
          className="w-8 h-8 mx-auto text-base-content/30 mb-2"
          aria-hidden="true"
        />
        <p className="font-semibold text-sm">No entries yet</p>
        <p className="text-xs text-base-content/60 mt-1">
          Submit a project to be the first on the leaderboard!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.slice(0, 10).map((entry, index) => (
        <div
          key={entry.userId}
          className="flex items-center gap-3 p-3 rounded-lg bg-base-200 border border-base-300"
        >
          <span className="w-7 text-center text-base font-bold shrink-0">
            {index < 3 ? rankEmoji[index] : `#${index + 1}`}
          </span>
          <ProfileAvatar
            photoURL={entry.userAvatar}
            displayName={entry.username}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{entry.username}</p>
            <p className="text-xs text-base-content/60">
              {entry.challengesCompleted} challenge
              {entry.challengesCompleted !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-sm text-primary">
              {entry.totalPoints}
            </p>
            <p className="text-xs text-base-content/60">pts</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Lists everyone who joined the challenge with their submission status.
 */
function ParticipantsList({
  participants,
}: {
  participants: ChallengeParticipantStatus[];
}) {
  if (participants.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-base-300 bg-base-200 p-6 text-center">
        <Users
          className="w-8 h-8 mx-auto text-base-content/30 mb-2"
          aria-hidden="true"
        />
        <p className="font-semibold text-sm">No participants yet</p>
        <p className="text-xs text-base-content/60 mt-1">
          Be the first to join this challenge!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
      {participants.map((participant) => (
        <div
          key={participant.userId}
          className="flex items-center gap-3 p-3 rounded-lg bg-base-200 border border-base-300"
        >
          <ProfileAvatar
            photoURL={participant.userAvatar}
            displayName={participant.userName}
            size="sm"
          />
          <p className="font-semibold text-sm truncate min-w-0 flex-1">
            {participant.userName}
          </p>
          <span
            className={`badge badge-sm shrink-0 ${
              participant.submitted ? "badge-success" : "badge-ghost"
            }`}
          >
            {participant.submitted ? "Submitted" : "Not submitted"}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Individual Challenge Detail Page.
 * Displays the full brief, timeline, deliverables, a mini leaderboard,
 * and a gallery of user submissions. Uses SSR to fetch data.
 */
export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = await getChallenge(id);

  if (!challenge) {
    notFound();
  }

  const [submissions, leaderboard, participantCount, participants] =
    await Promise.all([
      getSubmissionsForChallenge(challenge.id),
      getLeaderboard(10),
      getChallengeParticipantsCount(challenge.id),
      getChallengeParticipantsWithStatus(challenge.id),
    ]);

  const statusBadgeClass = CHALLENGE_STATUS_BADGE_CLASSES[challenge.status];

  return (
    <div className="page-padding">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="text-sm breadcrumbs">
          <ul>
            <li>
              <Link href="/challenges">Challenges</Link>
            </li>
            <li>{challenge.title}</li>
          </ul>
        </div>

        {/* Hero section */}
        <section className="bg-base-200 border border-base-300 rounded-2xl p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="badge badge-primary">{challenge.topic}</span>
                <span className="badge badge-outline capitalize">
                  {challenge.difficulty}
                </span>
                <span className={`badge capitalize ${statusBadgeClass}`}>
                  {challenge.status}
                </span>
              </div>
              <h1 className="text-4xl font-bold mb-3">{challenge.title}</h1>
              <p className="text-lg text-base-content/75">
                {challenge.description}
              </p>
            </div>

            <div className="bg-base-100 border border-base-300 rounded-xl p-5 min-w-60 space-y-4">
              <div>
                <p className="text-xs text-base-content/60 uppercase tracking-wide font-semibold mb-1">
                  Timeline
                </p>
                <p className="font-semibold text-sm">
                  {formatChallengeDateRange(challenge.startDate, challenge.endDate, "long")}
                </p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-bold">{submissions.length}</p>
                  <p className="text-xs text-base-content/60">Submissions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{participantCount}</p>
                  <p className="text-xs text-base-content/60">Participants</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-7">
            {challenge.status === "active" && (
              <div className="flex gap-2">
                <Link
                  href={`/challenges/${challenge.id}/submit`}
                  className="btn btn-primary"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  Submit Project
                </Link>
                <ParticipateButton challengeId={challenge.id} />
              </div>
            )}
            <Link href="/challenges/leaderboard" className="btn btn-outline">
              <Trophy className="w-4 h-4" aria-hidden="true" />
              Full Leaderboard
            </Link>
            <Link href="/challenges/archive" className="btn btn-ghost">
              <Archive className="w-4 h-4" aria-hidden="true" />
              Past Challenges
            </Link>
          </div>
        </section>

        {/* Main content grid */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          {/* Left: Brief + Gallery */}
          <article className="space-y-8 min-w-0">
            {challenge.brief && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Challenge Brief</h2>
                <div className="bg-base-100 border border-base-300 rounded-xl p-6">
                  <MarkdownRenderer content={challenge.brief} />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Submissions Gallery</h2>
                <span className="badge badge-lg">{submissions.length}</span>
              </div>
              <SubmissionGallery submissions={submissions} />
            </div>
          </article>

          {/* Right: Sidebar */}
          <aside className="space-y-5">
            {/* Leaderboard */}
            <div className="bg-base-200 border border-base-300 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Medal className="w-5 h-5 text-primary" aria-hidden="true" />
                  Leaderboard
                </h2>
                <Link
                  href="/challenges/leaderboard"
                  className="text-xs link link-primary"
                >
                  See all →
                </Link>
              </div>
              <MiniLeaderboard entries={leaderboard} />
            </div>

            {/* Participants */}
            <div className="bg-base-200 border border-base-300 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" aria-hidden="true" />
                  Participants
                </h2>
                <span className="badge badge-lg">{participantCount}</span>
              </div>
              <ParticipantsList participants={participants} />
            </div>

            {/* Deliverables */}
            <div className="bg-base-200 border border-base-300 rounded-xl p-5">
              <h2 className="font-bold text-lg mb-3">Deliverables</h2>
              {challenge.deliverables.length > 0 ? (
                <ul className="list-disc list-inside space-y-2 text-sm text-base-content/75">
                  {challenge.deliverables.map((deliverable) => (
                    <li key={deliverable}>{deliverable}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-base-content/70">
                  Repository URL, optional live demo URL, and a short project
                  summary.
                </p>
              )}
            </div>

            {/* Resources */}
            {challenge.resources.length > 0 && (
              <div className="bg-base-200 border border-base-300 rounded-xl p-5">
                <h2 className="font-bold text-lg mb-3">Resources</h2>
                <ul className="space-y-2">
                  {challenge.resources.map((resource) => (
                    <li key={`${resource.title}-${resource.url}`}>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link link-primary text-sm"
                      >
                        {resource.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}
