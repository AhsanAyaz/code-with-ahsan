import Link from "next/link";
import { MatchWithProfile } from "@/types/mentorship";
import ProfileAvatar from "@/components/ProfileAvatar";

interface ActiveMatchesWidgetProps {
  matches: MatchWithProfile[];
  role: "mentor" | "mentee";
}

// Component to handle individual match card
function MatchCard({ match }: { match: MatchWithProfile }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-base-200/50 rounded-box hover:bg-base-200 transition-colors">
      <ProfileAvatar photoURL={match.partnerProfile?.photoURL} displayName={match.partnerProfile?.displayName} size="lg" ring />
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate">
          {match.partnerProfile?.displayName}
        </div>
        <div className="text-xs text-base-content/60 truncate">
          {match.partnerProfile?.currentRole || "Developer"}
        </div>
        <div className="flex gap-2 mt-2">
          <Link
            href={`/mentorship/dashboard/${match.id}`}
            className="btn btn-primary btn-xs"
          >
            Dashboard
          </Link>
          {match.discordChannelUrl && (
            <a
              href={match.discordChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-xs gap-1"
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Channel
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActiveMatchesWidget({
  matches,
  role,
}: ActiveMatchesWidgetProps) {
  return (
    <div className="card bg-base-100 shadow-xl col-span-1 md:col-span-2">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">🤝</span> Active Mentorships
            {matches.length > 0 && (
              <span className="badge badge-success badge-sm">
                {matches.length}
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

        {matches.length === 0 ? (
          <div className="text-center py-8 bg-base-200/50 rounded-box">
            <div className="text-4xl mb-2">🌱</div>
            <p className="text-base-content/70 mb-4">
              {role === "mentee"
                ? "You don't have any active mentors yet."
                : "You don't have any active mentees yet."}
            </p>
            {role === "mentee" && (
              <Link href="/mentorship/browse" className="btn btn-primary btn-sm">
                Find a Mentor
              </Link>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
