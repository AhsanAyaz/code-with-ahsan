"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useMentorship, MentorshipProfile } from "@/contexts/MentorshipContext";
import MentorCard from "@/components/mentorship/MentorCard";
import WithdrawToProceedDialog from "@/components/mentorship/WithdrawToProceedDialog";
import { useMatchRequests } from "@/lib/mentorship/useMatchRequests";
import Link from "next/link";
import { hasRole } from "@/lib/permissions";

export default function BrowseMentorsPage() {
  const router = useRouter();
  const { setShowLoginPopup } = useContext(AuthContext);
  const toast = useToast();
  const { user, profile, loading, profileLoading } = useMentorship();
  const [mentors, setMentors] = useState<MentorshipProfile[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState<string>("");

  const isMentee = hasRole(profile, "mentee");
  const {
    statusMap,
    sessionInfo,
    requestingMentor,
    withdrawingMentor,
    conflict,
    switching,
    requestMatch,
    withdraw,
    confirmSwitch,
    cancelConflict,
    refresh,
  } = useMatchRequests(user?.uid, Boolean(user && isMentee));

  useEffect(() => {
    if (!loading && !profileLoading && !user) {
      setShowLoginPopup(true);
    }
  }, [loading, profileLoading, user, setShowLoginPopup]);

  useEffect(() => {
    if (!loading && !profileLoading && profile && !hasRole(profile, "mentee")) {
      router.push("/mentorship");
    }
  }, [loading, profileLoading, profile, router]);

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

    if (user && isMentee) {
      fetchMentors();
    }
  }, [user, isMentee]);

  const handleRateNow = async (
    mentorId: string,
    sessionId: string,
    rating: number,
    feedback: string
  ) => {
    if (!user) return;
    try {
      const response = await fetch("/api/mentorship/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId,
          menteeId: user.uid,
          sessionId,
          rating,
          feedback,
        }),
      });

      if (response.ok) {
        await refresh();
        toast.success("Thank you for your feedback!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to submit rating");
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("An error occurred. Please try again.");
    }
  };

  const filteredMentors = mentors.filter((mentor) => {
    const matchesSearch =
      searchQuery === "" ||
      mentor.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.currentRole?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.bio?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesExpertise =
      selectedExpertise === "" || mentor.expertise?.includes(selectedExpertise);

    return matchesSearch && matchesExpertise;
  });

  const allExpertise = [...new Set(mentors.flatMap((m) => m.expertise || []))];

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
          <h2 className="card-title justify-center text-2xl">Access Required</h2>
          <p className="text-base-content/70 mt-2">
            Please sign in and complete your mentee profile to browse mentors.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Find Your Mentor</h2>
          <p className="text-base-content/70">
            Browse experienced professionals ready to guide you
          </p>
        </div>
        <Link href="/mentorship/dashboard" className="btn btn-ghost btn-sm">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="form-control flex-1">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Search by name, role, or bio..."
                  className="input input-bordered w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <select
              className="select select-bordered"
              value={selectedExpertise}
              onChange={(e) => setSelectedExpertise(e.target.value)}
            >
              <option value="">All Expertise</option>
              {allExpertise.map((exp) => (
                <option key={exp} value={exp}>
                  {exp}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loadingMentors ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : filteredMentors.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold">No mentors found</h3>
            <p className="text-base-content/70">
              {mentors.length === 0
                ? "No mentors have registered yet. Check back soon!"
                : "Try adjusting your search or filter criteria"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.map((mentor) => {
            const info = sessionInfo.get(mentor.uid);
            return (
              <MentorCard
                key={mentor.uid}
                mentor={{
                  ...mentor,
                  sessionId: info?.sessionId,
                  hasRated: info?.hasRated,
                }}
                onRequestMatch={(id) => requestMatch(id, mentor.displayName)}
                isRequesting={requestingMentor === mentor.uid}
                requestStatus={statusMap.get(mentor.uid) || "none"}
                onRateNow={handleRateNow}
                onWithdraw={withdraw}
                isWithdrawing={withdrawingMentor === mentor.uid}
                currentUserId={user?.uid}
              />
            );
          })}
        </div>
      )}

      {/* Stats */}
      {mentors.length > 0 && (
        <div className="text-center text-base-content/60 text-sm">
          Showing {filteredMentors.length} of {mentors.length} mentors
        </div>
      )}

      <WithdrawToProceedDialog
        conflict={conflict}
        isSwitching={switching}
        onConfirm={confirmSwitch}
        onCancel={cancelConflict}
      />
    </div>
  );
}
