import Link from "next/link";
import { MentorshipProfile } from "@/types/mentorship";
import type { User } from "firebase/auth";

interface QuickLinksWidgetProps {
  profile: MentorshipProfile;
  user: User;
  stats: {
    myRoadmaps?: number;
    totalRoadmaps?: number;
  };
}

export default function QuickLinksWidget({
  profile,
  user,
  stats,
}: QuickLinksWidgetProps) {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">🔗</span> Quick Links
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {profile.role === "mentee" && (
            <Link
              href="/mentorship/browse"
              className="btn btn-outline btn-block h-auto py-4 flex flex-col gap-2"
            >
              <span className="text-2xl">🔍</span>
              <span className="text-xs">Browse Mentors</span>
            </Link>
          )}

          {profile.role === "mentor" && (
            <Link
              href={`/mentorship/mentors/${profile.username || user.uid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-block h-auto py-4 flex flex-col gap-2"
            >
              <span className="text-2xl">👤</span>
              <span className="text-xs">View Profile</span>
            </Link>
          )}

          {profile.role === "mentor" && profile.status === "accepted" && (
            <Link
              href="/projects/new"
              className="btn btn-outline btn-primary btn-block h-auto py-4 flex flex-col gap-2"
            >
              <span className="text-2xl">✨</span>
              <span className="text-xs">Create Project</span>
            </Link>
          )}

          <Link
            href="/mentorship/goals"
            className="btn btn-outline btn-block h-auto py-4 flex flex-col gap-2"
          >
            <span className="text-2xl">🎯</span>
            <span className="text-xs">Goals</span>
          </Link>

          <Link
            href="/profile"
            className="btn btn-outline btn-block h-auto py-4 flex flex-col gap-2"
          >
            <span className="text-2xl">⚙️</span>
            <span className="text-xs">Settings</span>
          </Link>

          <Link
            href="/mentorship"
            className="btn btn-outline btn-block h-auto py-4 flex flex-col gap-2"
          >
            <span className="text-2xl">🌟</span>
            <span className="text-xs">Community</span>
          </Link>

          <Link
            href="/roadmaps"
            className="btn btn-outline btn-block h-auto py-4 flex flex-col gap-2"
          >
            <span className="text-2xl">🗺️</span>
            <span className="text-xs">Roadmaps</span>
          </Link>

          {profile.role === "mentor" && profile.status === "accepted" && (
            <Link
              href="/roadmaps/new"
              className="btn btn-outline btn-info btn-block h-auto py-4 flex flex-col gap-2"
            >
              <span className="text-2xl">📝</span>
              <span className="text-xs">New Roadmap</span>
            </Link>
          )}

          {profile.role === "mentor" && stats.myRoadmaps && stats.myRoadmaps > 0 && (
            <Link
              href="/roadmaps/my"
              className="btn btn-outline btn-info btn-block h-auto py-4 flex flex-col gap-2"
            >
              <span className="text-2xl">📚</span>
              <span className="text-xs">My Roadmaps</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
