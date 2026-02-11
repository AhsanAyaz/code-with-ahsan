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

export default function SettingsPage() {
  const router = useRouter();
  const { setShowLoginPopup } = useContext(AuthContext);
  const toast = useToast();
  const { user, profile, loading, profileLoading, refreshProfile } =
    useMentorship();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillLevel, setSkillLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [skillLevelLoading, setSkillLevelLoading] = useState(false);


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
    </div>
  );
}
