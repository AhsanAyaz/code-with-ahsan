import Link from "next/link";
import { MatchWithProfile } from "@/types/mentorship";

interface ActiveMatchesWidgetProps {
  matches: MatchWithProfile[];
  role: "mentor" | "mentee";
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
              <div
                key={match.id}
                className="flex items-center gap-4 p-4 bg-base-200/50 rounded-box hover:bg-base-200 transition-colors"
              >
                <div className="avatar">
                  <div className="w-12 h-12 rounded-full ring ring-primary ring-offset-base-100 ring-offset-1">
                    {match.partnerProfile?.photoURL ? (
                      <img
                        src={match.partnerProfile.photoURL}
                        alt={match.partnerProfile.displayName || "User"}
                      />
                    ) : (
                      <div className="bg-primary text-primary-content flex items-center justify-center font-bold text-lg">
                        {match.partnerProfile?.displayName?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                </div>
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
                    {match.partnerProfile?.discordUsername && (
                      <a
                        href={`https://discord.com/users/${match.partnerProfile.discordUsername}`} // This might need ID not username, but fallback to profile
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-xs"
                      >
                        Message
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
