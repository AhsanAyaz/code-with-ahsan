"use client";

import Link from "next/link";
import type { User } from "firebase/auth";
import type { MentorshipProfile } from "@/types/mentorship";

type MentorshipHeroProps = {
  user: User | null;
  profile: MentorshipProfile | null;
  loading: boolean;
  onRoleClick: (role: "mentor" | "mentee") => void;
};

export default function MentorshipHero({
  user,
  profile,
  loading,
  onRoleClick,
}: MentorshipHeroProps) {
  return (
    <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content">
      <div className="card-body text-center py-10">
        <h2 className="text-3xl md:text-4xl font-bold">
          Find a Mentor or Share Your Expertise
        </h2>
        <p className="opacity-90 max-w-2xl mx-auto mt-2">
          Accelerate your career with 1-on-1 guidance from experienced
          professionals, or give back by mentoring the next generation. Our
          structured mentorship program creates meaningful, lasting connections.
        </p>

        <div className="card-actions justify-center mt-6 gap-4 flex-wrap">
          {loading ? (
            <span className="loading loading-spinner loading-md"></span>
          ) : profile ? (
            <Link
              href="/mentorship/dashboard"
              className="btn btn-lg bg-white/20 hover:bg-white/30 border-none"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <button
                onClick={() => onRoleClick("mentee")}
                className="btn btn-lg bg-white/20 hover:bg-white/30 border-none"
              >
                Find a Mentor
              </button>
              <button
                onClick={() => onRoleClick("mentor")}
                className="btn btn-lg bg-white/20 hover:bg-white/30 border-none"
              >
                Become a Mentor
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
