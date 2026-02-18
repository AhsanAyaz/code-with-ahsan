"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useMentorship } from "@/contexts/MentorshipContext";
import MentorRegistrationForm from "@/components/mentorship/MentorRegistrationForm";
import MenteeRegistrationForm from "@/components/mentorship/MenteeRegistrationForm";
import Link from "next/link";
import { DEFAULT_MAX_MENTEES } from "@/lib/mentorship-constants";
import MentorAnnouncementCard from "@/components/mentorship/MentorAnnouncementCard";
import AvailabilityManager from "@/components/mentorship/AvailabilityManager";
import BookingsList from "@/components/mentorship/BookingsList";
import { authFetch } from "@/lib/apiClient";
import { TimeSlotAvailability, UnavailableDate } from "@/types/mentorship";

export default function SettingsPage() {
  const router = useRouter();
  const { setShowLoginPopup } = useContext(AuthContext);
  const toast = useToast();
  const { user, profile, loading, profileLoading, refreshProfile } =
    useMentorship();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillLevel, setSkillLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [skillLevelLoading, setSkillLevelLoading] = useState(false);

  // Availability management state
  const [availability, setAvailability] = useState<TimeSlotAvailability | null>(null);
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([]);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [calendarConnecting, setCalendarConnecting] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);


  useEffect(() => {
    if (!loading && !profileLoading && !user) {
      setShowLoginPopup(true);
    }
  }, [loading, profileLoading, user, setShowLoginPopup]);

  useEffect(() => {
    if (!loading && !profileLoading && user && !profile) {
      router.push("/mentorship/onboarding");
    }
  }, [loading, profileLoading, user, profile, router]);

  // Initialize skill level from profile
  useEffect(() => {
    if (profile) {
      setSkillLevel(profile.skillLevel || "beginner");
    }
  }, [profile]);

  // Load availability data for mentors
  useEffect(() => {
    if (profile?.uid && profile.role === "mentor") {
      fetch(`/api/mentorship/availability?mentorId=${profile.uid}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.availability) setAvailability(data.availability);
          if (data.unavailableDates) setUnavailableDates(data.unavailableDates);
          setIsCalendarConnected(!!data.googleCalendarConnected);
        })
        .catch((err) => console.error("Failed to load availability:", err));
    }
  }, [profile?.uid, profile?.role]);

  // Check for calendar connection status from URL params (after OAuth redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calendarStatus = params.get("calendar");
    if (calendarStatus === "connected") {
      toast.success("Google Calendar connected successfully!");
      setIsCalendarConnected(true);
      setCalendarError(null); // Clear any previous errors
      // Clean URL
      window.history.replaceState({}, "", "/profile");
    } else if (calendarStatus === "error") {
      const errorMsg = "Failed to connect Google Calendar. Please try again.";
      setCalendarError(errorMsg);
      toast.error(errorMsg);
      window.history.replaceState({}, "", "/profile");
    }
  }, [toast]);

  const handleSkillLevelChange = async (newSkillLevel: "beginner" | "intermediate" | "advanced") => {
    if (!user) return;

    setSkillLevelLoading(true);
    try {
      const response = await fetch("/api/mentorship/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          skillLevel: newSkillLevel,
        }),
      });

      if (response.ok) {
        setSkillLevel(newSkillLevel);
        await refreshProfile();
        toast.success("Skill level updated successfully!");
      } else {
        const error = await response.json();
        toast.error("Failed to update skill level: " + error.error);
      }
    } catch (error) {
      console.error("Error updating skill level:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setSkillLevelLoading(false);
    }
  };

  const handleCalendarConnect = async () => {
    setCalendarConnecting(true);
    setCalendarError(null); // Clear previous errors
    try {
      const res = await authFetch("/api/mentorship/calendar/auth");
      const data = await res.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else if (data.error) {
        // Show specific error from API
        const errorMsg = data.error === "Google Calendar integration not configured"
          ? "Google Calendar integration is not available. Please contact the administrator to configure Google OAuth credentials."
          : data.error;
        setCalendarError(errorMsg);
        toast.error(errorMsg);
      } else {
        setCalendarError("Calendar integration not available");
        toast.error("Calendar integration not available");
      }
    } catch (error) {
      const errorMsg = "Failed to initiate calendar connection. Please try again later.";
      setCalendarError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setCalendarConnecting(false);
    }
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!user) return;

    setIsSubmitting(true);


    try {
      const response = await fetch("/api/mentorship/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          ...data,
        }),
      });

      if (response.ok) {
        await refreshProfile();
        toast.success("Your profile has been updated successfully!");
      } else {
        const error = await response.json();
        toast.error("Failed to update profile: " + error.error);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <h2 className="card-title justify-center text-2xl">
            Access Required
          </h2>
          <p className="text-base-content/70 mt-2">
            Please sign in and complete your profile.
          </p>
          <div className="card-actions justify-center mt-6">
            <Link href="/mentorship/dashboard" className="btn btn-primary">
              Go to Mentorship Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Convert availability back to boolean format if needed
  const mentorInitialData =
    profile.role === "mentor"
      ? {
          username: profile.username || "",
          displayName: profile.displayName || "",
          photoURL: profile.photoURL || "",
          discordUsername: profile.discordUsername || "",
          discordUsernameValidated: profile.discordUsernameValidated,
          expertise: profile.expertise || [],
          currentRole: profile.currentRole || "",
          bio: profile.bio || "",
          maxMentees: profile.maxMentees || DEFAULT_MAX_MENTEES,
          availability: profile.availability
            ? Object.keys(profile.availability).reduce(
                (acc, day) => ({ ...acc, [day]: true }),
                {},
              )
            : {},
          isPublic: profile.isPublic ?? true,
          cvUrl: profile.cvUrl || "",
          linkedinUrl: profile.linkedinUrl || "",
          majorProjects: profile.majorProjects || "",
        }
      : undefined;

  const menteeInitialData =
    profile.role === "mentee"
      ? {
          displayName: profile.displayName || "",
          education: profile.education || "",
          skillsSought: profile.skillsSought || [],
          careerGoals: profile.careerGoals || "",
          mentorshipGoals: profile.mentorshipGoals || "",
          learningStyle: profile.learningStyle || "mixed",
          discordUsername: profile.discordUsername || "",
          discordUsernameValidated: profile.discordUsernameValidated,
        }
      : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Profile Settings</h2>
          <p className="text-base-content/70">
            Update your {profile.role} profile details
          </p>
        </div>
        <Link href="/mentorship/dashboard" className="btn btn-ghost btn-sm">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Success Message */}


      {/* Skill Level Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">💡 Skill Level</h3>
          <p className="text-sm text-base-content/70">
            Your skill level helps us match you with appropriate projects and learning opportunities.
          </p>

          <div className="divider"></div>

          <div className="form-control max-w-xs">
            <label className="label">
              <span className="label-text font-semibold">Current Skill Level</span>
            </label>
            <div className="flex gap-2">
              {(["beginner", "intermediate", "advanced"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleSkillLevelChange(level)}
                  disabled={skillLevelLoading}
                  className={`btn ${
                    skillLevel === level ? "btn-primary" : "btn-outline btn-ghost"
                  } flex-1 capitalize`}
                >
                  {level}
                </button>
              ))}
            </div>
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                {skillLevel === "beginner" && "Learning the fundamentals"}
                {skillLevel === "intermediate" && "Building real-world projects"}
                {skillLevel === "advanced" && "Expert-level experience"}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">
            {profile.role === "mentor"
              ? "🎯 Mentor Profile"
              : "🚀 Mentee Profile"}
          </h3>

          <div className="divider"></div>

          {profile.role === "mentor" ? (
            <MentorRegistrationForm
              key={`mentor-${profile.updatedAt?.toString()}`}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              initialData={mentorInitialData}
              userId={user.uid}
              mode="edit"
            />
          ) : (
            <MenteeRegistrationForm
              key={`mentee-${profile.updatedAt?.toString()}`}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              initialData={menteeInitialData}
              mode="edit"
            />
          )}

          {/* Mentor Announcement Section - Moved to Bottom */}
          {profile.role === "mentor" && user && (
            <div className="mt-12">
              <div className="divider"></div>
              <MentorAnnouncementCard
                userId={user.uid}
                userName={profile.displayName}
                userPhotoURL={profile.photoURL}
                announcementUrl={profile.mentor_announcement}
              />
            </div>
          )}
        </div>
      </div>

      {/* Availability Management Section - Mentors Only */}
      {profile?.role === "mentor" && (
        <>
          {/* Section Divider */}
          <div className="divider text-lg font-semibold mt-8">Time Slot Availability</div>

          {/* Google Calendar Connection */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-lg">Google Calendar Integration</h3>
              <p className="text-sm opacity-70">
                Connect your Google Calendar to automatically create events with Google Meet links when mentees book sessions.
              </p>
              <div className="mt-2 space-y-3">
                {isCalendarConnected ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 text-success">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Google Calendar connected</span>
                      </div>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={handleCalendarConnect}
                        disabled={calendarConnecting}
                      >
                        {calendarConnecting ? (
                          <span className="loading loading-spinner loading-sm"></span>
                        ) : (
                          "Reconnect"
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handleCalendarConnect}
                    disabled={calendarConnecting}
                  >
                    {calendarConnecting ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      "Connect Google Calendar"
                    )}
                  </button>
                )}

                {/* Display error message if calendar connection fails */}
                {calendarError && (
                  <div className="alert alert-warning">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="stroke-current shrink-0 h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span>{calendarError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Weekly Availability and Override Dates */}
          <AvailabilityManager
            userId={profile.uid}
            initialAvailability={availability || undefined}
            initialUnavailableDates={unavailableDates}
            isCalendarConnected={isCalendarConnected}
          />

          {/* Upcoming Bookings */}
          <div className="mt-6">
            <BookingsList userId={profile.uid} role="mentor" />
          </div>
        </>
      )}
    </div>
  );
}
