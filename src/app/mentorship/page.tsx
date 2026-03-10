"use client";

import { useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/contexts/AuthContext";
import { useMentorship } from "@/contexts/MentorshipContext";
import Link from "next/link";
import type { PublicMentor } from "@/types/mentorship";
import ProfileAvatar from "@/components/ProfileAvatar";

import DiscordValidationBanner from "@/components/mentorship/DiscordValidationBanner";
import MentorshipHero from "@/components/mentorship/MentorshipHero";
import HowItWorks from "@/components/mentorship/HowItWorks";
import MentorshipStats from "@/components/mentorship/MentorshipStats";

export default function MentorshipPage() {
  const router = useRouter();
  const { setShowLoginPopup } = useContext(AuthContext);
  const { user, profile, loading } = useMentorship();
  const [mentors, setMentors] = useState<PublicMentor[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(true);
  const [filter, setFilter] = useState("");
  const [pendingRedirect, setPendingRedirect] = useState<
    "mentor" | "mentee" | null
  >(null);

  // Fetch public mentors
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
        setLoadingMentors(false);
      }
    };

    fetchMentors();
  }, []);

  // Handle redirect after login
  useEffect(() => {
    if (!loading && user && pendingRedirect) {
      router.push(`/mentorship/onboarding?role=${pendingRedirect}`);
      setPendingRedirect(null);
    }
  }, [loading, user, pendingRedirect, router]);

  const handleRoleClick = (role: "mentor" | "mentee") => {
    if (!user) {
      // Store pending redirect and show login
      setPendingRedirect(role);
      setShowLoginPopup(true);
    } else if (!profile) {
      // User logged in but no profile - go to onboarding
      router.push(`/mentorship/onboarding?role=${role}`);
    }
    // If user has profile, they should see the dashboard button instead
  };

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

  return (
    <div className="space-y-8">
      {/* Discord Validation Warning */}
      {profile && (
        <DiscordValidationBanner
          discordUsernameValidated={profile.discordUsernameValidated}
        />
      )}

      {/* Hero Section */}
      <MentorshipHero
        profile={profile}
        loading={loading}
        onRoleClickAction={handleRoleClick}
      />

      {/* Mentorship Stats from API */}
      <MentorshipStats />

      {/* How It Works */}
      <HowItWorks />

      {/* Browse Mentors Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold">
              <span className="text-primary">🌟</span> Browse Mentors
            </h3>
            <p className="text-base-content/70 text-sm">
              Meet the amazing professionals who volunteer their time to guide
              and support others.
            </p>
          </div>

          {/* Search/Filter */}
          <div className="form-control w-full md:w-80">
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
        {loadingMentors ? (
          <div className="flex justify-center items-center py-12">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : filteredMentors.length === 0 ? (
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
                    <ProfileAvatar photoURL={mentor.photoURL} displayName={mentor.displayName} size="xl" ring />
                    <div className="flex-1 min-w-0">
                      <h3 className="card-title text-lg">
                        {mentor.displayName}
                      </h3>
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
                            .map(
                              (d) => d.charAt(0).toUpperCase() + d.slice(1, 3)
                            )
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
      </div>
    </div>
  );
}
