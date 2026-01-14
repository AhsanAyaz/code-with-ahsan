"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { PublicMentor } from "@/types/mentorship";

export default function MentorsShowcasePage() {
  const [mentors, setMentors] = useState<PublicMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const response = await fetch("/api/mentorship/mentors?public=true");
        if (response.ok) {
          const data = await response.json();
          setMentors(data.mentors || []);
        }
      } catch (error) {
        console.error("Error fetching mentors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMentors();
  }, []);

  const filteredMentors = filter
    ? mentors.filter(
        (m) =>
          m.expertise?.some((e) =>
            e.toLowerCase().includes(filter.toLowerCase())
          ) ||
          m.displayName?.toLowerCase().includes(filter.toLowerCase()) ||
          m.currentRole?.toLowerCase().includes(filter.toLowerCase())
      )
    : mentors;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">
          <span className="text-primary">🌟</span> Community Mentors
        </h1>
        <p className="text-base-content/70 max-w-2xl mx-auto">
          Meet the amazing professionals who volunteer their time to guide and
          support others in their career journeys. These mentors have opted to
          be recognized for their contributions to our community.
        </p>
      </div>

      {/* Stats Banner */}
      <div className="stats shadow w-full bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="stat">
          <div className="stat-title">Active Mentors</div>
          <div className="stat-value text-primary">{mentors.length}</div>
          <div className="stat-desc">Ready to help</div>
        </div>
        <div className="stat">
          <div className="stat-title">Active Mentorships</div>
          <div className="stat-value text-secondary">
            {mentors.reduce((sum, m) => sum + m.activeMenteeCount, 0)}
          </div>
          <div className="stat-desc">Ongoing relationships</div>
        </div>
        <div className="stat">
          <div className="stat-title">Mentorships Completed</div>
          <div className="stat-value text-accent">
            {mentors.reduce((sum, m) => sum + m.completedMentorships, 0)}
          </div>
          <div className="stat-desc">Success stories</div>
        </div>
      </div>

      {/* Search/Filter */}
      <div className="form-control">
        <div className="input-group">
          <input
            type="text"
            placeholder="Search by name, role, or expertise..."
            className="input input-bordered w-full"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Mentors Grid */}
      {filteredMentors.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold">No mentors found</h3>
            <p className="text-base-content/70">
              {filter
                ? "Try adjusting your search terms"
                : "Be the first to become a public mentor!"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.map((mentor) => (
            <div
              key={mentor.uid}
              className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all"
            >
              <div className="card-body">
                {/* Header with Avatar */}
                <div className="flex items-start gap-4">
                  <div className="avatar">
                    <div className="w-16 h-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                      {mentor.photoURL ? (
                        <img
                          src={mentor.photoURL}
                          alt={mentor.displayName || "Mentor"}
                        />
                      ) : (
                        <div className="bg-primary text-primary-content flex items-center justify-center text-2xl font-bold w-full h-full">
                          {mentor.displayName?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="card-title text-lg">{mentor.displayName}</h3>
                    <p className="text-sm text-base-content/70 truncate">
                      {mentor.currentRole}
                    </p>
                  </div>
                </div>

                {/* Expertise Tags */}
                {mentor.expertise && mentor.expertise.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {mentor.expertise.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="badge badge-primary badge-sm"
                      >
                        {skill}
                      </span>
                    ))}
                    {mentor.expertise.length > 4 && (
                      <span className="badge badge-ghost badge-sm">
                        +{mentor.expertise.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Bio */}
                {mentor.bio && (
                  <p className="text-sm text-base-content/70 mt-3 line-clamp-2">
                    {mentor.bio}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-base-200">
                  <div className="text-center flex-1">
                    <div className="text-lg font-bold text-primary">
                      {mentor.activeMenteeCount}
                    </div>
                    <div className="text-xs text-base-content/60">Active</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-lg font-bold text-secondary">
                      {mentor.completedMentorships}
                    </div>
                    <div className="text-xs text-base-content/60">
                      Completed
                    </div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-lg font-bold text-accent">
                      {mentor.maxMentees}
                    </div>
                    <div className="text-xs text-base-content/60">Max</div>
                  </div>
                </div>

                {/* Availability */}
                {mentor.availability &&
                  Object.keys(mentor.availability).length > 0 && (
                    <div className="flex items-center gap-1 mt-3 text-xs text-base-content/60">
                      <span>📅</span>
                      <span className="capitalize">
                        {Object.keys(mentor.availability)
                          .map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3))
                          .join(", ")}
                      </span>
                    </div>
                  )}

                {/* View Profile */}
                <div className="card-actions mt-4">
                  <Link
                    href={`/mentorship/mentors/${mentor.username || mentor.uid}`}
                    className="btn btn-primary btn-sm btn-block"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content">
        <div className="card-body text-center">
          <h3 className="card-title justify-center text-2xl">
            Want to become a mentor?
          </h3>
          <p className="opacity-90">
            Share your expertise and make a difference in someone's career
          </p>
          <div className="card-actions justify-center mt-4">
            <Link
              href="/mentorship/onboarding?role=mentor"
              className="btn btn-ghost bg-white/20 hover:bg-white/30"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
