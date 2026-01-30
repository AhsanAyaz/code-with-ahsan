"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useMentorship, MentorshipProfile } from "@/contexts/MentorshipContext";
import MentorCard from "@/components/mentorship/MentorCard";
import Link from "next/link";

type RequestStatus = "none" | "pending" | "declined" | "active" | "completed";

export default function BrowseMentorsPage() {
  const router = useRouter();
  const { setShowLoginPopup } = useContext(AuthContext);
  const toast = useToast();
  const { user, profile, loading, profileLoading } = useMentorship();
  const [mentors, setMentors] = useState<MentorshipProfile[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState<string>("");
  const [requestingMentor, setRequestingMentor] = useState<string | null>(null);
  const [withdrawingMentor, setWithdrawingMentor] = useState<string | null>(null);
  // Track request status per mentor (pending, declined, active, completed, or none)
  const [mentorRequestStatus, setMentorRequestStatus] = useState<
    Map<string, RequestStatus>
  >(new Map());
  // Track session IDs and rating status for completed mentorships
  const [mentorSessionInfo, setMentorSessionInfo] = useState<
    Map<string, { sessionId: string; hasRated: boolean }>
  >(new Map());
  // Track match IDs for pending requests (needed for withdraw)
  const [pendingMatchIds, setPendingMatchIds] = useState<Map<string, string>>(
    new Map()
  );

  useEffect(() => {
    if (!loading && !profileLoading && !user) {
      setShowLoginPopup(true);
    }
  }, [loading, profileLoading, user, setShowLoginPopup]);

  useEffect(() => {
    if (!loading && !profileLoading && profile && profile.role !== "mentee") {
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

    if (user && profile?.role === "mentee") {
      fetchMentors();
    }
  }, [user, profile]);

  // Fetch mentee's existing requests to show correct status
  useEffect(() => {
    const fetchMyRequests = async () => {
      if (!user) return;
      try {
        const response = await fetch(
          `/api/mentorship/mentee-requests?menteeId=${user.uid}`,
        );
        if (response.ok) {
          const data = await response.json();
          const statusMap = new Map<string, RequestStatus>();
          const sessionInfoMap = new Map<
            string,
            { sessionId: string; hasRated: boolean }
          >();

          const pendingMap = new Map<string, string>();

          // Map each mentor's request status
          for (const request of data.requests || []) {
            statusMap.set(request.mentorId, request.status as RequestStatus);
            // Store session info for completed mentorships to enable rating
            if (request.status === "completed") {
              sessionInfoMap.set(request.mentorId, {
                sessionId: request.sessionId || request.id,
                hasRated: request.hasRated || false,
              });
            }
            // Store match IDs for pending requests to enable withdraw
            if (request.status === "pending") {
              pendingMap.set(request.mentorId, request.sessionId || request.id);
            }
          }

          setMentorRequestStatus(statusMap);
          setMentorSessionInfo(sessionInfoMap);
          setPendingMatchIds(pendingMap);
        }
      } catch (error) {
        console.error("Error fetching mentee requests:", error);
      }
    };

    if (user && profile?.role === "mentee") {
      fetchMyRequests();
    }
  }, [user, profile]);

  const handleRequestMatch = async (mentorId: string) => {
    if (!user) return;

    setRequestingMentor(mentorId);
    try {
      const response = await fetch("/api/mentorship/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menteeId: user.uid,
          mentorId,
        }),
      });

      if (response.ok) {
        // Update status to pending
        setMentorRequestStatus((prev) =>
          new Map(prev).set(mentorId, "pending"),
        );
      } else {
        const error = await response.json();
        if (response.status === 409) {
          // Already requested - update with actual status
          setMentorRequestStatus((prev) =>
            new Map(prev).set(mentorId, error.status || "pending"),
          );
        } else {
          toast.error("Failed to send request: " + error.error);
        }
      }
    } catch (error) {
      console.error("Error requesting match:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setRequestingMentor(null);
    }
  };

  const handleWithdraw = async (mentorId: string) => {
    if (!user) return;
    const matchId = pendingMatchIds.get(mentorId);
    if (!matchId) return;

    setWithdrawingMentor(mentorId);
    try {
      const response = await fetch("/api/mentorship/match", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          action: "withdraw",
          menteeId: user.uid,
        }),
      });

      if (response.ok) {
        setMentorRequestStatus((prev) => {
          const updated = new Map(prev);
          updated.delete(mentorId);
          return updated;
        });
        setPendingMatchIds((prev) => {
          const updated = new Map(prev);
          updated.delete(mentorId);
          return updated;
        });
        toast.success("Request withdrawn successfully.");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to withdraw request");
      }
    } catch (error) {
      console.error("Error withdrawing request:", error);
      toast.error("Failed to withdraw request. Please try again.");
    } finally {
      setWithdrawingMentor(null);
    }
  };

  const handleRateNow = async (
    mentorId: string,
    sessionId: string,
    rating: number,
    feedback: string,
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
        // Update session info to mark as rated
        setMentorSessionInfo((prev) => {
          const updated = new Map(prev);
          const existing = updated.get(mentorId);
          if (existing) {
            updated.set(mentorId, { ...existing, hasRated: true });
          }
          return updated;
        });
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
          <h2 className="card-title justify-center text-2xl">
            Access Required
          </h2>
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
            const sessionInfo = mentorSessionInfo.get(mentor.uid);
            return (
              <MentorCard
                key={mentor.uid}
                mentor={{
                  ...mentor,
                  sessionId: sessionInfo?.sessionId,
                  hasRated: sessionInfo?.hasRated,
                }}
                onRequestMatch={handleRequestMatch}
                isRequesting={requestingMentor === mentor.uid}
                requestStatus={mentorRequestStatus.get(mentor.uid) || "none"}
                onRateNow={handleRateNow}
                onWithdraw={handleWithdraw}
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
    </div>
  );
}
