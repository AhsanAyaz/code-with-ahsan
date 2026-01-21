"use client";

import { useState, useEffect, useContext, use } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useMentorship, MentorshipProfile } from "@/contexts/MentorshipContext";
import Link from "next/link";
import GoalTracker from "@/components/mentorship/GoalTracker";
import SessionScheduler from "@/components/mentorship/SessionScheduler";
import LearningHub from "@/components/mentorship/LearningHub";
import ContactInfo from "@/components/mentorship/ContactInfo";

interface MatchDetails {
  id: string;
  mentorId: string;
  menteeId: string;
  status: string;
  approvedAt: string;
  discordChannelUrl?: string;
  announcementImageUrl?: string;
  partner: MentorshipProfile;
}

// DEV_MODE: Set to true to bypass authentication for testing form layouts
const DEV_MODE = false;

// Mock data for DEV_MODE testing
const MOCK_MATCH_DETAILS: MatchDetails = {
  id: "test-match-id",
  mentorId: "mentor-123",
  menteeId: "mentee-456",
  status: "active",
  approvedAt: "2025-01-01T00:00:00Z",
  discordChannelUrl: "",
  partner: {
    uid: "test-partner",
    role: "mentee",
    displayName: "Test Mentee",
    email: "test@example.com",
    photoURL: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    education: "BS Computer Science",
    skillsSought: ["React", "TypeScript"],
  },
};

export default function RelationshipDashboard({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { setShowLoginPopup } = useContext(AuthContext);
  const toast = useToast();
  const { user, profile, loading, profileLoading } = useMentorship();
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(
    DEV_MODE ? MOCK_MATCH_DETAILS : null,
  );
  const [loadingMatch, setLoadingMatch] = useState(!DEV_MODE);
  const [activeTab, setActiveTab] = useState<
    "discord" | "goals" | "sessions" | "resources"
  >(DEV_MODE ? "sessions" : "goals");
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completing, setCompleting] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removalReason, setRemovalReason] = useState("");
  const [removing, setRemoving] = useState(false);

  // Announcement image state
  const [announcementImage, setAnnouncementImage] = useState<string | null>(
    null,
  );
  const [loadingAnnouncementImage, setLoadingAnnouncementImage] =
    useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    // Skip auth redirect in DEV_MODE
    if (!DEV_MODE && !loading && !profileLoading && !user) {
      setShowLoginPopup(true);
    }
  }, [loading, profileLoading, user, setShowLoginPopup]);

  useEffect(() => {
    const fetchMatchDetails = async () => {
      if (DEV_MODE) return; // Skip fetching in DEV_MODE
      if (!user || !profile) return;

      try {
        const response = await fetch(
          `/api/mentorship/dashboard/${resolvedParams.matchId}?uid=${user.uid}`,
        );
        if (response.ok) {
          const data = await response.json();
          setMatchDetails(data.match);
        } else if (response.status === 403 || response.status === 404) {
          router.push("/mentorship/my-matches");
        }
      } catch (error) {
        console.error("Error fetching match details:", error);
      } finally {
        setLoadingMatch(false);
      }
    };

    if (user && profile) {
      fetchMatchDetails();
    }
  }, [user, profile, resolvedParams.matchId, router]);

  const handleCompleteMentorship = async () => {
    if (!matchDetails || !user) return;
    setCompleting(true);
    try {
      const response = await fetch(
        `/api/mentorship/dashboard/${resolvedParams.matchId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.uid,
            action: "complete",
            completionNotes: completionNotes.trim() || null,
          }),
        },
      );
      if (response.ok) {
        toast.success(
          "🎉 Congratulations! This mentorship has been marked as complete.",
        );
        router.push("/mentorship/my-matches");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to complete mentorship");
      }
    } catch (error) {
      console.error("Error completing mentorship:", error);
      toast.error("Failed to complete mentorship. Please try again.");
    } finally {
      setCompleting(false);
      setShowCompleteModal(false);
    }
  };

  const handleRemoveMentee = async () => {
    if (!matchDetails || !user) return;
    setRemoving(true);
    try {
      const response = await fetch(
        `/api/mentorship/dashboard/${resolvedParams.matchId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.uid,
            action: "remove",
            removalReason: removalReason.trim() || null,
          }),
        },
      );
      if (response.ok) {
        toast.success("Mentee has been removed from your list.");
        router.push("/mentorship/my-matches");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to remove mentee");
      }
    } catch (error) {
      console.error("Error removing mentee:", error);
      toast.error("Failed to remove mentee. Please try again.");
    } finally {
      setRemoving(false);
      setShowRemoveModal(false);
    }
  };

  // Fetch existing announcement image on load
  useEffect(() => {
    const fetchAnnouncementImage = async () => {
      if (!matchDetails?.id) return;
      setLoadingAnnouncementImage(true);
      try {
        const response = await fetch(
          `/api/mentorship/announcement-image?matchId=${matchDetails.id}`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.announcementImageUrl) {
            setAnnouncementImage(data.announcementImageUrl);
          }
        }
      } catch (error) {
        console.error("Error fetching announcement image:", error);
      } finally {
        setLoadingAnnouncementImage(false);
      }
    };
    fetchAnnouncementImage();
  }, [matchDetails?.id]);

  const generateAnnouncementImage = async (regenerate = false) => {
    if (!matchDetails || !profile) return;

    setGeneratingImage(true);
    try {
      // If regenerating, delete existing first
      if (regenerate && announcementImage) {
        await fetch(
          `/api/mentorship/announcement-image?matchId=${matchDetails.id}`,
          { method: "DELETE" },
        );
      }

      // Get mentor info
      const mentorProfile =
        profile.role === "mentor" ? profile : matchDetails.partner;
      const menteeProfile =
        profile.role === "mentee" ? profile : matchDetails.partner;

      const response = await fetch("/api/mentorship/announcement-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: matchDetails.id,
          menteeName: menteeProfile.displayName,
          mentorName: mentorProfile.displayName,
          menteePhotoURL: menteeProfile.photoURL || undefined,
          mentorPhotoURL: mentorProfile.photoURL || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAnnouncementImage(data.announcementImageUrl || data.image);
        setShowImageModal(true);
        toast.success(
          regenerate ? "Image regenerated!" : "Announcement image created!",
        );
      } else {
        toast.error(data.error || "Failed to generate image");
      }
    } catch (error) {
      console.error("Error generating announcement image:", error);
      toast.error("Failed to generate announcement image");
    } finally {
      setGeneratingImage(false);
    }
  };

  const shareToTwitter = () => {
    const mentorName =
      profile?.role === "mentor"
        ? profile.displayName
        : matchDetails?.partner.displayName;
    const text = encodeURIComponent(
      `🎉 I am now a mentee of ${mentorName} in the Code with Ahsan Mentorship Program! #Mentorship #CodeWithAhsan #LearningJourney`,
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const shareToLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://codewithahsan.dev/mentorship")}`,
      "_blank",
    );
  };

  const shareToFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://codewithahsan.dev/mentorship")}`,
      "_blank",
    );
  };

  if (!DEV_MODE && (loading || profileLoading || loadingMatch)) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!DEV_MODE && (!user || !profile || !matchDetails)) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <h2 className="card-title justify-center text-2xl">Access Denied</h2>
          <p className="text-base-content/70 mt-2">
            You don&apos;t have access to this mentorship dashboard.
          </p>
          <div className="card-actions justify-center mt-6">
            <Link href="/mentorship/my-matches" className="btn btn-primary">
              View My Matches
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // In DEV_MODE, matchDetails is always MOCK_MATCH_DETAILS which is non-null
  // Need to ensure TypeScript knows this
  const currentMatchDetails = matchDetails!;
  const currentIsMentor = DEV_MODE ? false : profile?.role === "mentor";
  const currentUserId = DEV_MODE ? "dev-user-123" : (user?.uid ?? "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-r from-primary/10 to-secondary/10 shadow-lg">
        <div className="card-body">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="avatar">
                <div className="w-16 h-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                  {currentMatchDetails.partner.photoURL ? (
                    <img
                      src={currentMatchDetails.partner.photoURL}
                      alt={currentMatchDetails.partner.displayName || "Partner"}
                    />
                  ) : (
                    <div className="bg-primary text-primary-content flex items-center justify-center text-2xl font-bold">
                      {currentMatchDetails.partner.displayName?.charAt(0) ||
                        "?"}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-base-content/60">
                  {currentIsMentor ? "Your Mentee" : "Your Mentor"}
                </div>
                <h2 className="text-2xl font-bold">
                  {currentMatchDetails.partner.displayName}
                </h2>
                <p className="text-base-content/70">
                  {currentMatchDetails.partner.currentRole ||
                    currentMatchDetails.partner.education ||
                    ""}
                </p>
                <ContactInfo
                  email={currentMatchDetails.partner.email}
                  discordUsername={currentMatchDetails.partner.discordUsername}
                  className="mt-2"
                />
              </div>
            </div>
            <Link
              href="/mentorship/my-matches"
              className="btn btn-ghost btn-sm"
            >
              ← Back to Matches
            </Link>
          </div>

          {/* Connection Info & Discord */}
          <div className="flex flex-wrap gap-4 mt-4 items-center">
            <div className="text-sm text-base-content/60">
              <span className="font-semibold">Connected:</span>{" "}
              {currentMatchDetails.approvedAt
                ? new Date(currentMatchDetails.approvedAt).toLocaleDateString()
                : "N/A"}
            </div>
            <div className="badge badge-success">Active</div>

            {/* Complete Mentorship Button (Mentor only) */}
            {currentIsMentor && (
              <button
                className="btn btn-sm btn-outline btn-success gap-2"
                onClick={() => setShowCompleteModal(true)}
              >
                ✅ Mark as Complete
              </button>
            )}

            {/* Remove Mentee Button (Mentor only) */}
            {currentIsMentor && (
              <button
                className="btn btn-sm btn-outline btn-error gap-2"
                onClick={() => setShowRemoveModal(true)}
              >
                ❌ Remove Mentee
              </button>
            )}

            {/* Discord Channel Link */}
            {currentMatchDetails.discordChannelUrl ? (
              <a
                href={currentMatchDetails.discordChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-primary gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Open Discord
              </a>
            ) : (
              <span className="text-sm text-base-content/50">
                Discord channel pending...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-boxed bg-base-200 p-1">
        <button
          role="tab"
          className={`tab ${activeTab === "goals" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("goals")}
        >
          🎯 Goals
        </button>
        <button
          role="tab"
          className={`tab ${activeTab === "sessions" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("sessions")}
        >
          📅 Sessions
        </button>
        <button
          role="tab"
          className={`tab ${activeTab === "resources" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("resources")}
        >
          📚 Learning Hub
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "goals" && (
          <GoalTracker
            matchId={resolvedParams.matchId}
            currentUserId={currentUserId}
            isMentor={currentIsMentor}
          />
        )}
        {activeTab === "sessions" && (
          <SessionScheduler
            matchId={resolvedParams.matchId}
            currentUserId={currentUserId}
            isMentor={currentIsMentor}
            menteeEmail={
              currentIsMentor ? currentMatchDetails.partner.email : undefined
            }
          />
        )}
        {activeTab === "resources" && <LearningHub />}
      </div>

      {/* Announcement Image Section - Mentees Only */}
      {!currentIsMentor && (
        <div className="card bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">
              <span className="text-2xl">🎉</span> Share Your Mentorship Journey
            </h3>
            <p className="text-base-content/70 text-sm">
              Create and share an announcement image to celebrate your
              mentorship!
            </p>

            {loadingAnnouncementImage ? (
              <div className="flex justify-center py-4">
                <span className="loading loading-spinner loading-md"></span>
              </div>
            ) : announcementImage ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img
                    src={announcementImage}
                    alt="Mentorship Announcement"
                    className="max-w-full max-h-48 rounded-lg shadow cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setShowImageModal(true)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowImageModal(true)}
                  >
                    View & Share
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => generateAnnouncementImage(true)}
                    disabled={generatingImage}
                  >
                    {generatingImage ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Regenerating...
                      </>
                    ) : (
                      "Regenerate Image"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="card-actions mt-2">
                <button
                  className="btn btn-accent"
                  onClick={() => generateAnnouncementImage(false)}
                  disabled={generatingImage}
                >
                  {generatingImage ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Generating...
                    </>
                  ) : (
                    "Generate Announcement Image"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcement Image Modal */}
      {showImageModal && announcementImage && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">
              🎉 Share Your Mentorship Announcement!
            </h3>
            <div className="flex justify-center">
              <img
                src={announcementImage}
                alt="Mentorship Announcement"
                className="max-w-full rounded-lg shadow-lg"
              />
            </div>

            {/* Share Buttons */}
            <div className="mt-6">
              <p className="text-sm text-base-content/70 mb-3 text-center">
                Share your achievement with the world! 🌍
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button className="btn btn-info gap-2" onClick={shareToTwitter}>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Share on X
                </button>
                <button
                  className="btn btn-primary gap-2"
                  onClick={shareToLinkedIn}
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  Share on LinkedIn
                </button>
                <button
                  className="btn gap-2"
                  style={{ backgroundColor: "#1877F2", color: "white" }}
                  onClick={shareToFacebook}
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Share on Facebook
                </button>
              </div>
            </div>

            <div className="modal-action">
              <a
                href={announcementImage}
                download={`mentorship-announcement-${resolvedParams.matchId}.png`}
                className="btn btn-success gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download Image
              </a>
              <button
                className="btn btn-ghost"
                onClick={() => setShowImageModal(false)}
              >
                Close
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowImageModal(false)}>close</button>
          </form>
        </dialog>
      )}

      {/* Complete Mentorship Modal */}
      {showCompleteModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg flex items-center gap-2">
              🎓 Complete Mentorship
            </h3>
            <p className="py-4 text-base-content/70">
              Are you sure you want to mark this mentorship with{" "}
              <strong>{currentMatchDetails.partner.displayName}</strong> as
              complete? This action will move it to your completed mentorships
              and cannot be undone.
            </p>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">
                  Completion Notes (Optional)
                </span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="Share any final thoughts, achievements, or feedback about this mentorship journey..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
              />
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowCompleteModal(false);
                  setCompletionNotes("");
                }}
                disabled={completing}
              >
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={handleCompleteMentorship}
                disabled={completing}
              >
                {completing ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Completing...
                  </>
                ) : (
                  "✓ Confirm Completion"
                )}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowCompleteModal(false)}>close</button>
          </form>
        </dialog>
      )}

      {/* Remove Mentee Modal */}
      {showRemoveModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg flex items-center gap-2 text-error">
              ❌ Remove Mentee
            </h3>
            <p className="py-4 text-base-content/70">
              Are you sure you want to remove{" "}
              <strong>{currentMatchDetails.partner.displayName}</strong> from
              your mentee list? This will end the mentorship and archive the
              Discord channel.
            </p>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">
                  Reason (Optional)
                </span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="This is for internal records only and won't be shared with the mentee..."
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
              />
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowRemoveModal(false);
                  setRemovalReason("");
                }}
                disabled={removing}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={handleRemoveMentee}
                disabled={removing}
              >
                {removing ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Removing...
                  </>
                ) : (
                  "Confirm Removal"
                )}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowRemoveModal(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
