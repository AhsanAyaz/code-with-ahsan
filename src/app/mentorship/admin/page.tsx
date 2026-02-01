"use client";

import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useMentorship, MentorshipProfile } from "@/contexts/MentorshipContext";
import Link from "next/link";
import { useDebouncedCallback } from "use-debounce";
import { format } from "date-fns";
import { useStreamerMode } from "@/hooks/useStreamerMode";
import { getAnonymizedDisplayName, getAnonymizedEmail, getAnonymizedDiscord } from "@/utils/streamer-mode";

interface AdminStats {
  totalMentors: number;
  totalMentees: number;
  totalMatches: number;
  activeMatches: number;
  pendingMatches: number;
  completedGoals: number;
  totalGoals: number;
  totalSessions: number;
  averageRating: number;
  lowRatingAlerts: number;
}

interface Alert {
  id: string;
  type: string;
  sessionId: string;
  rating: number;
  feedback: string;
  createdAt: string;
  resolved: boolean;
}

interface ProfileWithDetails extends MentorshipProfile {
  cvUrl?: string;
  majorProjects?: string;
  adminNotes?: string;
  acceptedAt?: string;
  disabledSessionsCount?: number;
  avgRating?: number;
  ratingCount?: number;
}

interface Review {
  id: string;
  mentorId: string;
  menteeId: string;
  sessionId: string;
  rating: number;
  feedback?: string;
  createdAt: string;
  menteeName?: string;
  menteeEmail?: string;
  menteePhoto?: string;
}

interface MentorshipWithPartner {
  id: string;
  status: string;
  discordChannelId?: string;
  discordChannelUrl?: string;
  approvedAt?: string;
  lastContactAt?: string;
  requestedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  partnerProfile?: MentorshipProfile;
}

interface GroupedMentorship {
  profile: MentorshipProfile;
  mentorships: MentorshipWithPartner[];
}

interface MentorshipSummary {
  totalMentors: number;
  totalMentees: number;
  activeMentorships: number;
  completedMentorships: number;
}

type TabType = "overview" | "pending-mentors" | "all-mentors" | "all-mentees";

const ADMIN_TOKEN_KEY = "mentorship_admin_token";

export default function AdminPage() {
  const { setShowLoginPopup } = useContext(AuthContext);
  const toast = useToast();
  const { user, loading } = useMentorship();
  const { isStreamerMode, toggleStreamerMode } = useStreamerMode();

  // Admin password authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [profiles, setProfiles] = useState<ProfileWithDetails[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reviews modal state
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviewMentor, setReviewMentor] = useState<ProfileWithDetails | null>(
    null
  );
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Mentorship mapping state
  const [mentorshipData, setMentorshipData] = useState<GroupedMentorship[]>([]);
  const [loadingMentorships, setLoadingMentorships] = useState(false);
  const [mentorshipSummary, setMentorshipSummary] = useState<MentorshipSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Inline Discord edit state
  const [editingDiscord, setEditingDiscord] = useState<string | null>(null); // composite key: "profile-{uid}" for main profile, "{mentorshipId}-{uid}" for partner
  const [editingDiscordValue, setEditingDiscordValue] = useState("");
  const [savingDiscord, setSavingDiscord] = useState(false);

  // Mentorship status management state
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null); // sessionId being updated
  const [deletingSession, setDeletingSession] = useState<string | null>(null); // sessionId being deleted
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<{id: string, partnerName: string} | null>(null);
  const [regeneratingChannel, setRegeneratingChannel] = useState<string | null>(null); // sessionId being regenerated

  // Mentor filter state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    status: "all" as "all" | "accepted" | "declined" | "pending" | "disabled",
    mentees: "all" as "all" | "with" | "without",
    rating: "all" as "all" | "rated" | "unrated",
    discord: "all" as "all" | "with" | "without",
  });
  const activeFilterCount = Object.values(filters).filter(v => v !== "all").length;

  // Debounced search handler
  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page on search
  }, 300);

  // Check for existing admin session on mount
  useEffect(() => {
    const checkAdminSession = async () => {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      if (!token) {
        setCheckingAuth(false);
        return;
      }
      try {
        const response = await fetch("/api/mentorship/admin/auth", {
          method: "GET",
          headers: { "x-admin-token": token },
        });
        const data = await response.json();
        if (data.valid) {
          setIsAdminAuthenticated(true);
        } else {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
        }
      } catch (error) {
        console.error("Error checking admin session:", error);
        localStorage.removeItem(ADMIN_TOKEN_KEY);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAdminSession();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      setShowLoginPopup(true);
    }
  }, [loading, user, setShowLoginPopup]);

  // Handle admin login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setAuthError("");
    try {
      const response = await fetch("/api/mentorship/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });
      const data = await response.json();
      if (response.ok && data.token) {
        localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
        setIsAdminAuthenticated(true);
        setAdminPassword("");
      } else {
        setAuthError(data.error || "Invalid password");
      }
    } catch (error) {
      console.error("Admin login error:", error);
      setAuthError("Authentication failed. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  };

  // Handle admin logout
  const handleAdminLogout = async () => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
      try {
        await fetch("/api/mentorship/admin/auth", {
          method: "DELETE",
          headers: { "x-admin-token": token },
        });
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setIsAdminAuthenticated(false);
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/mentorship/admin/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
          setAlerts(data.alerts || []);
        }
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (isAdminAuthenticated) {
      fetchStats();
    }
  }, [isAdminAuthenticated]);

  // Fetch profiles based on active tab
  useEffect(() => {
    const fetchProfiles = async () => {
      if (activeTab === "overview") return;

      setLoadingProfiles(true);
      try {
        let url = "/api/mentorship/admin/profiles?";
        if (activeTab === "pending-mentors") {
          url += "role=mentor&status=pending";
        } else if (activeTab === "all-mentors") {
          url += "role=mentor";
        } else if (activeTab === "all-mentees") {
          url += "role=mentee";
        }

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setProfiles(data.profiles || []);
        }
      } catch (error) {
        console.error("Error fetching profiles:", error);
      } finally {
        setLoadingProfiles(false);
      }
    };

    if (isAdminAuthenticated) {
      fetchProfiles();
    }
  }, [isAdminAuthenticated, activeTab]);

  // Fetch mentorship data for All Mentors and All Mentees tabs
  useEffect(() => {
    const fetchMentorshipData = async () => {
      if (activeTab !== "all-mentors" && activeTab !== "all-mentees") {
        setMentorshipData([]);
        setMentorshipSummary(null);
        return;
      }

      setLoadingMentorships(true);
      try {
        const role = activeTab === "all-mentors" ? "mentor" : "mentee";
        const response = await fetch(`/api/mentorship/admin/matches?role=${role}`);
        if (response.ok) {
          const data = await response.json();
          setMentorshipData(data.matches || []);
          setMentorshipSummary(data.summary || null);
        }
      } catch (error) {
        console.error("Error fetching mentorship data:", error);
      } finally {
        setLoadingMentorships(false);
      }
    };

    if (isAdminAuthenticated) {
      fetchMentorshipData();
    }
  }, [isAdminAuthenticated, activeTab]);

  const handleStatusChange = async (
    uid: string,
    newStatus: "accepted" | "declined" | "disabled",
    reactivateSessions = false
  ) => {
    setActionLoading(uid);
    try {
      const response = await fetch("/api/mentorship/admin/profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, status: newStatus, reactivateSessions }),
      });

      if (response.ok) {
        const data = await response.json();

        // When re-enabling, fetch the updated profile to get accurate disabledSessionsCount
        let updatedDisabledCount: number | undefined = undefined;
        if (newStatus === "accepted" && !reactivateSessions) {
          // Fetch current disabled sessions count for this user
          const profileRes = await fetch(
            `/api/mentorship/admin/profiles?role=${profiles.find((p) => p.uid === uid)?.role}`
          );
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            const updatedProfile = profileData.profiles?.find(
              (p: ProfileWithDetails) => p.uid === uid
            );
            updatedDisabledCount = updatedProfile?.disabledSessionsCount ?? 0;
          }
        }

        // Update local state
        setProfiles((prev) =>
          prev.map((p) =>
            p.uid === uid
              ? {
                  ...p,
                  status: newStatus,
                  // Use fetched count, or reset to 0 if reactivated
                  disabledSessionsCount: reactivateSessions
                    ? 0
                    : (updatedDisabledCount ?? p.disabledSessionsCount),
                }
              : p
          )
        );

        // If we're on pending tab and accepted/declined, remove from list
        if (activeTab === "pending-mentors") {
          setProfiles((prev) => prev.filter((p) => p.uid !== uid));
        }

        // Show success message if sessions were reactivated
        if (data.reactivatedSessions > 0) {
          toast.success(
            `${data.reactivatedSessions} mentorship session(s) have been reactivated.`
          );
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await fetch("/api/mentorship/admin/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, resolved: true }),
      });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  const handleViewReviews = async (mentor: ProfileWithDetails) => {
    setReviewMentor(mentor);
    setShowReviewsModal(true);
    setLoadingReviews(true);

    try {
      const response = await fetch(
        `/api/mentorship/admin/reviews?mentorId=${mentor.uid}`
      );
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "pending":
        return <span className="badge badge-warning">Pending</span>;
      case "accepted":
        return <span className="badge badge-success">Accepted</span>;
      case "declined":
        return <span className="badge badge-error">Declined</span>;
      case "disabled":
        return <span className="badge badge-neutral">Disabled</span>;
      default:
        return <span className="badge badge-ghost">Unknown</span>;
    }
  };

  const getMentorshipStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="badge badge-success badge-sm">Active</span>;
      case "completed":
        return <span className="badge badge-neutral badge-sm">Completed</span>;
      case "pending":
        return <span className="badge badge-warning badge-sm">Pending</span>;
      case "cancelled":
        return <span className="badge badge-error badge-sm">Cancelled</span>;
      default:
        return <span className="badge badge-ghost badge-sm">{status}</span>;
    }
  };

  // Handle inline Discord username save
  const handleDiscordSave = async (uid: string, newUsername: string) => {
    // Validate format client-side first
    if (newUsername && !/^[a-z0-9_.]{2,32}$/.test(newUsername)) {
      toast.error("Invalid Discord username format. Use 2-32 lowercase characters (letters, numbers, underscore, period).");
      return;
    }

    setSavingDiscord(true);
    try {
      const response = await fetch("/api/mentorship/admin/profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, discordUsername: newUsername })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Update failed");
      }

      // Update local state - find and update the profile in mentorshipData
      setMentorshipData(prev => prev.map(group => ({
        ...group,
        profile: group.profile.uid === uid
          ? { ...group.profile, discordUsername: newUsername || undefined }
          : group.profile,
        mentorships: group.mentorships.map(m => ({
          ...m,
          partnerProfile: m.partnerProfile?.uid === uid
            ? { ...m.partnerProfile, discordUsername: newUsername || undefined }
            : m.partnerProfile
        }))
      })));

      // Also update profiles state if on pending-mentors tab
      setProfiles(prev => prev.map(p =>
        p.uid === uid ? { ...p, discordUsername: newUsername || undefined } : p
      ));

      toast.success("Discord username updated");
      setEditingDiscord(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update Discord username");
    } finally {
      setSavingDiscord(false);
    }
  };

  // Handle mentorship session status change (complete/revert)
  const handleSessionStatusChange = async (sessionId: string, newStatus: "active" | "completed") => {
    setUpdatingStatus(sessionId);
    try {
      const response = await fetch("/api/mentorship/admin/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, status: newStatus })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Update failed");
      }

      // Update local state - move the mentorship to the correct status group
      setMentorshipData(prev => prev.map(group => ({
        ...group,
        mentorships: group.mentorships.map(m =>
          m.id === sessionId ? { ...m, status: newStatus } : m
        )
      })));

      toast.success(newStatus === "completed" ? "Mentorship marked as completed" : "Mentorship reverted to active");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update mentorship status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Handle mentorship session deletion
  const handleDeleteMentorship = async () => {
    if (!sessionToDelete) return;

    setDeletingSession(sessionToDelete.id);
    try {
      const response = await fetch(`/api/mentorship/admin/sessions?id=${sessionToDelete.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Delete failed");
      }

      // Update local state - remove the mentorship from the list
      setMentorshipData(prev => prev.map(group => ({
        ...group,
        mentorships: group.mentorships.filter(m => m.id !== sessionToDelete.id)
      })));

      toast.success("Mentorship deleted successfully");
      setShowDeleteModal(false);
      setSessionToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete mentorship");
    } finally {
      setDeletingSession(null);
    }
  };

  // Handle Discord channel regeneration
  const handleRegenerateChannel = async (sessionId: string) => {
    setRegeneratingChannel(sessionId);
    try {
      const response = await fetch("/api/mentorship/admin/sessions/regenerate-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Channel regeneration failed");
      }

      const data = await response.json();

      // Update local state with new channel URL
      setMentorshipData(prev => prev.map(group => ({
        ...group,
        mentorships: group.mentorships.map(m =>
          m.id === sessionId ? { ...m, discordChannelUrl: data.channelUrl } : m
        )
      })));

      // Show success toast with channel URL info
      toast.success(`Discord channel created! URL: ${data.channelUrl}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate Discord channel");
    } finally {
      setRegeneratingChannel(null);
    }
  };

  // Filter mentorship data by search query and filters
  const filteredMentorshipData = mentorshipData.filter((item) => {
    const profile = item.profile;

    // Apply filters on All Mentors and All Mentees tabs
    if (activeTab === "all-mentors" || activeTab === "all-mentees") {
      // Status filter
      if (filters.status !== "all" && profile.status !== filters.status) {
        return false;
      }
      // Default: hide declined unless explicitly filtering for them
      if (filters.status === "all" && profile.status === "declined") {
        return false;
      }

      // Relationships filter (has active mentorships or not)
      const hasRelationships = item.mentorships.some(m => m.status === "active");
      if (filters.mentees === "with" && !hasRelationships) return false;
      if (filters.mentees === "without" && hasRelationships) return false;

      // Rating filter (only applicable to mentors)
      if (activeTab === "all-mentors") {
        const profileWithDetails = profile as ProfileWithDetails;
        const hasRating = profileWithDetails.avgRating !== undefined && profileWithDetails.avgRating > 0;
        if (filters.rating === "rated" && !hasRating) return false;
        if (filters.rating === "unrated" && hasRating) return false;
      }

      // Discord filter
      const hasDiscord = profile.discordUsername && profile.discordUsername.trim() !== "";
      if (filters.discord === "with" && !hasDiscord) return false;
      if (filters.discord === "without" && hasDiscord) return false;
    }

    // Search query filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      profile.displayName?.toLowerCase().includes(query) ||
      profile.email?.toLowerCase().includes(query) ||
      profile.discordUsername?.toLowerCase().includes(query)
    );
    return matchesSearch;
  });

  // Paginate filtered data
  const totalPages = Math.ceil(filteredMentorshipData.length / pageSize);
  const paginatedData = filteredMentorshipData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Loading states
  if (loading || checkingAuth) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  // User must be logged in first
  if (!user) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <h2 className="card-title justify-center text-2xl">
            Sign In Required
          </h2>
          <p className="text-base-content/70 mt-2">
            Please sign in to access the admin panel.
          </p>
          <div className="card-actions justify-center mt-6">
            <button
              className="btn btn-primary"
              onClick={() => setShowLoginPopup(true)}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin password protection - show login form
  if (!isAdminAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="card bg-base-100 shadow-xl w-full max-w-md">
          <div className="card-body">
            <div className="text-center mb-4">
              <div className="text-5xl mb-4">🔐</div>
              <h2 className="card-title justify-center text-2xl">
                Admin Access
              </h2>
              <p className="text-base-content/70 mt-2">
                Enter the admin password to continue.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">
                    Admin Password
                  </span>
                </label>
                <input
                  type="password"
                  placeholder="Enter admin password"
                  className={`input input-bordered w-full ${authError ? "input-error" : ""}`}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={loggingIn}
                  autoFocus
                />
                {authError && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {authError}
                    </span>
                  </label>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loggingIn || !adminPassword}
              >
                {loggingIn ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Authenticating...
                  </>
                ) : (
                  "Access Admin Panel"
                )}
              </button>
            </form>

            <div className="divider">OR</div>

            <Link
              href="/mentorship/dashboard"
              className="btn btn-ghost btn-sm w-full"
            >
              ← Back to Dashboard
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
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <p className="text-base-content/70">
            Manage mentors, mentees, and program metrics
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleStreamerMode} className={`btn btn-sm ${isStreamerMode ? 'btn-secondary' : 'btn-ghost'}`}>
            {isStreamerMode ? '🎥 Streamer Mode: ON' : '👁️ Streamer Mode: OFF'}
          </button>
          <button onClick={handleAdminLogout} className="btn btn-ghost btn-sm">
            🔓 Logout Admin
          </button>
          <Link href="/mentorship/dashboard" className="btn btn-ghost btn-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-boxed bg-base-200 p-1">
        <button
          role="tab"
          className={`tab ${activeTab === "overview" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Overview
        </button>
        <button
          role="tab"
          className={`tab ${activeTab === "pending-mentors" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("pending-mentors")}
        >
          ⏳ Pending Mentors
          {stats &&
            profiles.filter(
              (p) => p.role === "mentor" && p.status === "pending"
            ).length > 0 && (
              <span className="badge badge-warning badge-sm ml-2">
                {
                  profiles.filter(
                    (p) => p.role === "mentor" && p.status === "pending"
                  ).length
                }
              </span>
            )}
        </button>
        <button
          role="tab"
          className={`tab ${activeTab === "all-mentors" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("all-mentors")}
        >
          🎯 All Mentors
        </button>
        <button
          role="tab"
          className={`tab ${activeTab === "all-mentees" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("all-mentees")}
        >
          🚀 All Mentees
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <>
          {/* Alerts Section */}
          {alerts.length > 0 && (
            <div className="alert alert-error">
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
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="font-bold">
                  {alerts.length} Low Rating Alert(s)
                </h3>
                <p className="text-sm">
                  Sessions that received 1-star ratings need attention.
                </p>
              </div>
              <button
                className="btn btn-sm"
                onClick={() =>
                  (
                    document.getElementById("alerts-modal") as HTMLDialogElement
                  )?.showModal()
                }
              >
                View Alerts
              </button>
            </div>
          )}

          {/* Stats Grid */}
          {loadingStats ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : (
            stats && (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stats shadow bg-base-100">
                  <div className="stat">
                    <div className="stat-figure text-primary">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <div className="stat-title">Total Mentors</div>
                    <div className="stat-value text-primary">
                      {stats.totalMentors}
                    </div>
                  </div>
                </div>

                <div className="stats shadow bg-base-100">
                  <div className="stat">
                    <div className="stat-figure text-secondary">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v-1a6 6 0 00-3-5.197"
                        />
                      </svg>
                    </div>
                    <div className="stat-title">Total Mentees</div>
                    <div className="stat-value text-secondary">
                      {stats.totalMentees}
                    </div>
                  </div>
                </div>

                <div className="stats shadow bg-base-100">
                  <div className="stat">
                    <div className="stat-figure text-success">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="stat-title">Active Matches</div>
                    <div className="stat-value text-success">
                      {stats.activeMatches}
                    </div>
                    <div className="stat-desc">
                      of {stats.totalMatches} total
                    </div>
                  </div>
                </div>

                <div className="stats shadow bg-base-100">
                  <div className="stat">
                    <div className="stat-figure text-info">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </div>
                    <div className="stat-title">Avg Session Rating</div>
                    <div className="stat-value text-info">
                      {stats.averageRating.toFixed(1)}
                    </div>
                    <div className="stat-desc">out of 5 stars</div>
                  </div>
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* Profile Lists */}
      {activeTab === "pending-mentors" && (
        <div className="space-y-4">
          {loadingProfiles ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : profiles.length === 0 ? (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center py-12">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-xl font-semibold">No pending mentors</h3>
                <p className="text-base-content/70">
                  All mentor registrations have been reviewed!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {profiles.map((p) => (
                <div key={p.uid} className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      {/* Avatar and Basic Info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="avatar">
                          <div className="w-16 h-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                            {p.photoURL ? (
                              <img
                                src={p.photoURL}
                                alt={getAnonymizedDisplayName(p.displayName, p.uid, isStreamerMode) || "Profile"}
                              />
                            ) : (
                              <div className="bg-primary text-primary-content flex items-center justify-center text-2xl font-bold w-full h-full">
                                {getAnonymizedDisplayName(p.displayName, p.uid, isStreamerMode)?.charAt(0) || "?"}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold">
                              {getAnonymizedDisplayName(p.displayName, p.uid, isStreamerMode)}
                            </h3>
                            {getStatusBadge(p.status)}
                            <span className="badge badge-outline">
                              {p.role === "mentor" ? "🎯 Mentor" : "🚀 Mentee"}
                            </span>
                          </div>
                          <p className="text-sm text-base-content/70">
                            {getAnonymizedEmail(p.email, p.uid, isStreamerMode)}
                          </p>
                          {p.currentRole && (
                            <p className="text-sm text-base-content/70 mt-1">
                              {p.currentRole}
                            </p>
                          )}

                          {/* Expertise Tags */}
                          {p.expertise && p.expertise.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {p.expertise.map((skill) => (
                                <span
                                  key={skill}
                                  className="badge badge-primary badge-sm"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Star Rating (for mentors) - clickable to view reviews */}
                          {p.role === "mentor" && (p.ratingCount ?? 0) > 0 && (
                            <button
                              className="flex items-center gap-1 mt-2 hover:bg-base-200 rounded px-2 py-1 -mx-2 transition-colors cursor-pointer"
                              onClick={() => handleViewReviews(p)}
                            >
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <svg
                                    key={star}
                                    className={`w-4 h-4 ${star <= (p.avgRating ?? 0) ? "text-yellow-400" : "text-base-content/20"}`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="text-xs text-base-content/60">
                                {p.avgRating} ({p.ratingCount} reviews)
                              </span>
                              <svg
                                className="w-3 h-3 text-base-content/40"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {p.status === "pending" && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              disabled={actionLoading === p.uid}
                              onClick={() =>
                                handleStatusChange(p.uid, "accepted")
                              }
                            >
                              {actionLoading === p.uid ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : (
                                "✓ Accept"
                              )}
                            </button>
                            <button
                              className="btn btn-error btn-sm"
                              disabled={actionLoading === p.uid}
                              onClick={() =>
                                handleStatusChange(p.uid, "declined")
                              }
                            >
                              {actionLoading === p.uid ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : (
                                "✗ Decline"
                              )}
                            </button>
                          </>
                        )}
                        {p.status !== "disabled" && p.status !== "pending" && (
                          <button
                            className="btn btn-warning btn-sm"
                            disabled={actionLoading === p.uid}
                            onClick={() =>
                              handleStatusChange(p.uid, "disabled")
                            }
                          >
                            {actionLoading === p.uid ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                              "🚫 Disable"
                            )}
                          </button>
                        )}
                        {p.status === "disabled" && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              disabled={actionLoading === p.uid}
                              onClick={() =>
                                handleStatusChange(p.uid, "accepted")
                              }
                            >
                              {actionLoading === p.uid ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : (
                                "✓ Re-enable"
                              )}
                            </button>
                          </>
                        )}
                        {/* Show re-enable sessions button for accepted users with disabled sessions */}
                        {p.status === "accepted" &&
                          (p.disabledSessionsCount ?? 0) > 0 && (
                            <button
                              className="btn btn-info btn-sm"
                              disabled={actionLoading === p.uid}
                              onClick={() =>
                                handleStatusChange(p.uid, "accepted", true)
                              }
                            >
                              {actionLoading === p.uid ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : (
                                `🔄 Re-enable ${p.disabledSessionsCount} Session(s)`
                              )}
                            </button>
                          )}
                      </div>
                    </div>

                    {/* Expandable Details */}
                    <div className="collapse collapse-arrow bg-base-200 mt-4">
                      <input type="checkbox" />
                      <div className="collapse-title font-medium">
                        View Full Profile Details
                      </div>
                      <div className="collapse-content">
                        <div className="grid md:grid-cols-2 gap-4 pt-2">
                          {/* Bio */}
                          {p.bio && (
                            <div>
                              <h4 className="font-semibold text-sm mb-1">
                                Bio
                              </h4>
                              <p className="text-sm text-base-content/70">
                                {p.bio}
                              </p>
                            </div>
                          )}

                          {/* CV Link */}
                          {p.cvUrl && (
                            <div>
                              <h4 className="font-semibold text-sm mb-1">
                                CV / Resume
                              </h4>
                              <a
                                href={p.cvUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link link-primary text-sm"
                              >
                                View CV →
                              </a>
                            </div>
                          )}

                          {/* Major Projects */}
                          {p.majorProjects && (
                            <div className="md:col-span-2">
                              <h4 className="font-semibold text-sm mb-1">
                                Major Projects & Experience
                              </h4>
                              <p className="text-sm text-base-content/70 whitespace-pre-wrap">
                                {p.majorProjects}
                              </p>
                            </div>
                          )}

                          {/* Career Goals (for mentees) */}
                          {p.careerGoals && (
                            <div className="md:col-span-2">
                              <h4 className="font-semibold text-sm mb-1">
                                Career Goals
                              </h4>
                              <p className="text-sm text-base-content/70">
                                {p.careerGoals}
                              </p>
                            </div>
                          )}

                          {/* Registration Info */}
                          <div>
                            <h4 className="font-semibold text-sm mb-1">
                              Registered
                            </h4>
                            <p className="text-sm text-base-content/70">
                              {p.createdAt
                                ? new Date(p.createdAt).toLocaleDateString()
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Mentors / All Mentees Tabs - Relationship View */}
      {(activeTab === "all-mentors" || activeTab === "all-mentees") && (
        <div className="space-y-4">
          {/* Summary Stats Header */}
          {mentorshipSummary && (
            <div className="stats shadow bg-base-100 w-full">
              <div className="stat">
                <div className="stat-title">Total Mentors</div>
                <div className="stat-value text-primary text-2xl">
                  {mentorshipSummary.totalMentors}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Total Mentees</div>
                <div className="stat-value text-secondary text-2xl">
                  {mentorshipSummary.totalMentees}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Active Mentorships</div>
                <div className="stat-value text-success text-2xl">
                  {mentorshipSummary.activeMentorships}
                </div>
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="form-control">
            <input
              type="text"
              placeholder="Search by name, email, or Discord..."
              className="input input-bordered w-full"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>

          {/* Filter Button - On All Mentors and All Mentees tabs */}
          {(activeTab === "all-mentors" || activeTab === "all-mentees") && (
            <div className="flex items-center gap-2">
              <button
                className="btn btn-outline btn-sm gap-2"
                onClick={() => setShowFilterModal(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="badge badge-primary badge-sm">{activeFilterCount}</span>
                )}
              </button>
              {activeFilterCount > 0 && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setFilters({
                    status: "all",
                    mentees: "all",
                    rating: "all",
                    discord: "all",
                  })}
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Loading State */}
          {loadingMentorships ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="flex items-start gap-4">
                      <div className="skeleton w-16 h-16 rounded-full shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-4 w-1/3"></div>
                        <div className="skeleton h-3 w-1/2"></div>
                        <div className="skeleton h-3 w-2/3"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMentorshipData.length === 0 ? (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center py-12">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-xl font-semibold">
                  No {activeTab === "all-mentors" ? "mentors" : "mentees"} found
                </h3>
                <p className="text-base-content/70">
                  {searchQuery
                    ? "Try adjusting your search query."
                    : (activeTab === "all-mentors" || activeTab === "all-mentees") && activeFilterCount > 0
                      ? `No ${activeTab === "all-mentors" ? "mentors" : "mentees"} match your filters. Try adjusting or clearing filters.`
                      : "No profiles found in this category."}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Relationship Cards */}
              <div className="grid gap-4">
                {paginatedData.map((item) => {
                  const p = item.profile;
                  const activeMentorships = item.mentorships.filter(
                    (m) => m.status === "active"
                  );
                  const completedMentorships = item.mentorships.filter(
                    (m) => m.status === "completed"
                  );
                  const pendingMentorships = item.mentorships.filter(
                    (m) => m.status === "pending"
                  );
                  const cancelledMentorships = item.mentorships.filter(
                    (m) => m.status === "cancelled"
                  );
                  const activeRelationshipCount = activeMentorships.length;
                  const relationshipLabel =
                    activeTab === "all-mentors" ? "mentees" : "mentors";

                  return (
                    <div key={p.uid} className="card bg-base-100 shadow-xl">
                      <div className="card-body">
                        {/* Profile Header */}
                        <div className="flex items-start gap-4">
                          <div className="avatar">
                            <div className="w-16 h-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                              {p.photoURL ? (
                                <img
                                  src={p.photoURL}
                                  alt={getAnonymizedDisplayName(p.displayName, p.uid, isStreamerMode) || "Profile"}
                                />
                              ) : (
                                <div className="bg-primary text-primary-content flex items-center justify-center text-2xl font-bold w-full h-full">
                                  {getAnonymizedDisplayName(p.displayName, p.uid, isStreamerMode)?.charAt(0) || "?"}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-bold">
                                {getAnonymizedDisplayName(p.displayName, p.uid, isStreamerMode)}
                              </h3>
                              {getStatusBadge(p.status)}
                              <span className="badge badge-outline">
                                {p.role === "mentor" ? "🎯 Mentor" : "🚀 Mentee"}
                              </span>
                              <span
                                className={`badge ${activeRelationshipCount === 0 ? "badge-ghost" : "badge-info"}`}
                              >
                                {activeRelationshipCount} {relationshipLabel}
                              </span>
                              {/* Profile button for mentors */}
                              {activeTab === "all-mentors" && (
                                <Link
                                  href={`/mentorship/mentors/${p.username || p.uid}?admin=1`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-ghost btn-sm btn-circle"
                                  title="View profile (admin)"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                  </svg>
                                </Link>
                              )}
                              {/* Restore button for declined mentors */}
                              {activeTab === "all-mentors" && p.status === "declined" && (
                                <button
                                  className="btn btn-success btn-sm"
                                  disabled={actionLoading === p.uid}
                                  onClick={() => handleStatusChange(p.uid, "accepted")}
                                >
                                  {actionLoading === p.uid ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                  ) : (
                                    "Restore"
                                  )}
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-base-content/70">
                              {getAnonymizedEmail(p.email, p.uid, isStreamerMode)}
                            </p>
                            {/* Inline Discord Edit for main profile */}
                            <div className="text-sm text-base-content/70">
                              <span className="inline-flex items-center gap-1">
                                Discord:{" "}
                                {editingDiscord === `profile-${p.uid}` ? (
                                  <span className="inline-flex items-center gap-1">
                                    <input
                                      type="text"
                                      className="input input-xs input-bordered w-32"
                                      value={editingDiscordValue}
                                      onChange={(e) => setEditingDiscordValue(e.target.value.toLowerCase())}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          handleDiscordSave(p.uid, editingDiscordValue);
                                        } else if (e.key === "Escape") {
                                          setEditingDiscord(null);
                                        }
                                      }}
                                      onBlur={() => {
                                        // Small delay to allow button click to register
                                        setTimeout(() => {
                                          if (editingDiscord === `profile-${p.uid}` && !savingDiscord) {
                                            handleDiscordSave(p.uid, editingDiscordValue);
                                          }
                                        }, 150);
                                      }}
                                      placeholder="username"
                                      disabled={savingDiscord}
                                      autoFocus
                                    />
                                    {savingDiscord && (
                                      <span className="loading loading-spinner loading-xs"></span>
                                    )}
                                  </span>
                                ) : (
                                  <button
                                    className="inline-flex items-center gap-1 hover:bg-base-200 rounded px-1 -ml-1 cursor-pointer"
                                    onClick={() => {
                                      setEditingDiscord(`profile-${p.uid}`);
                                      setEditingDiscordValue(p.discordUsername || "");
                                    }}
                                  >
                                    <span className={p.discordUsername ? "" : "italic text-base-content/40"}>
                                      {getAnonymizedDiscord(p.discordUsername, p.uid, isStreamerMode) || "not set"}
                                    </span>
                                    <svg className="w-3 h-3 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                )}
                              </span>
                            </div>
                            {p.currentRole && (
                              <p className="text-sm text-base-content/70 mt-1">
                                {p.currentRole}
                              </p>
                            )}

                            {/* Expertise Tags */}
                            {p.expertise && p.expertise.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {p.expertise.map((skill) => (
                                  <span
                                    key={skill}
                                    className="badge badge-primary badge-sm"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Active Mentorships Collapse */}
                        {activeMentorships.length > 0 && (
                          <div className="collapse collapse-arrow bg-base-200 mt-4">
                            <input type="checkbox" defaultChecked />
                            <div className="collapse-title font-medium">
                              Active Mentorships ({activeMentorships.length})
                            </div>
                            <div className="collapse-content">
                              <div className="space-y-3 pt-2">
                                {activeMentorships.map((mentorship) => (
                                  <div
                                    key={mentorship.id}
                                    className="card bg-base-100"
                                  >
                                    <div className="card-body p-4">
                                      <div className="flex items-start gap-3">
                                        <div className="avatar">
                                          <div className="w-12 h-12 rounded-full">
                                            {mentorship.partnerProfile?.photoURL ? (
                                              <img
                                                src={
                                                  mentorship.partnerProfile.photoURL
                                                }
                                                alt={getAnonymizedDisplayName(mentorship.partnerProfile?.displayName, mentorship.partnerProfile?.uid || "partner", isStreamerMode) || "Partner"}
                                              />
                                            ) : (
                                              <div className="bg-secondary text-secondary-content flex items-center justify-center text-lg font-bold w-full h-full">
                                                {getAnonymizedDisplayName(mentorship.partnerProfile?.displayName, mentorship.partnerProfile?.uid || "partner", isStreamerMode)?.charAt(0) || "?"}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-semibold">
                                              {getAnonymizedDisplayName(mentorship.partnerProfile?.displayName, mentorship.partnerProfile?.uid || "partner", isStreamerMode) || "Unknown"}
                                            </h4>
                                            {getMentorshipStatusBadge(
                                              mentorship.status
                                            )}
                                          </div>
                                          <p className="text-xs text-base-content/60">
                                            {getAnonymizedEmail(mentorship.partnerProfile?.email, mentorship.partnerProfile?.uid || "partner", isStreamerMode)}
                                          </p>
                                          {/* Inline Discord Edit for partner */}
                                          {mentorship.partnerProfile && (
                                            <div className="text-xs text-base-content/60">
                                              <span className="inline-flex items-center gap-1">
                                                Discord:{" "}
                                                {editingDiscord === `${mentorship.id}-${mentorship.partnerProfile.uid}` ? (
                                                  <span className="inline-flex items-center gap-1">
                                                    <input
                                                      type="text"
                                                      className="input input-xs input-bordered w-28"
                                                      value={editingDiscordValue}
                                                      onChange={(e) => setEditingDiscordValue(e.target.value.toLowerCase())}
                                                      onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                          handleDiscordSave(mentorship.partnerProfile!.uid, editingDiscordValue);
                                                        } else if (e.key === "Escape") {
                                                          setEditingDiscord(null);
                                                        }
                                                      }}
                                                      onBlur={() => {
                                                        setTimeout(() => {
                                                          if (editingDiscord === `${mentorship.id}-${mentorship.partnerProfile?.uid}` && !savingDiscord) {
                                                            handleDiscordSave(mentorship.partnerProfile!.uid, editingDiscordValue);
                                                          }
                                                        }, 150);
                                                      }}
                                                      placeholder="username"
                                                      disabled={savingDiscord}
                                                      autoFocus
                                                    />
                                                    {savingDiscord && (
                                                      <span className="loading loading-spinner loading-xs"></span>
                                                    )}
                                                  </span>
                                                ) : (
                                                  <button
                                                    className="inline-flex items-center gap-1 hover:bg-base-200 rounded px-1 -ml-1 cursor-pointer"
                                                    onClick={() => {
                                                      setEditingDiscord(`${mentorship.id}-${mentorship.partnerProfile!.uid}`);
                                                      setEditingDiscordValue(mentorship.partnerProfile?.discordUsername || "");
                                                    }}
                                                  >
                                                    <span className={mentorship.partnerProfile.discordUsername ? "" : "italic text-base-content/40"}>
                                                      {getAnonymizedDiscord(mentorship.partnerProfile.discordUsername, mentorship.partnerProfile.uid, isStreamerMode) || "not set"}
                                                    </span>
                                                    <svg className="w-3 h-3 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                  </button>
                                                )}
                                              </span>
                                            </div>
                                          )}

                                          {/* Discord Channel Link */}
                                          <div className="mt-2">
                                            {mentorship.discordChannelUrl ? (
                                              <a
                                                href={mentorship.discordChannelUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="link link-primary text-sm"
                                              >
                                                Discord Channel
                                              </a>
                                            ) : (
                                              <div className="badge badge-warning badge-sm gap-1">
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  className="h-3 w-3"
                                                  fill="none"
                                                  viewBox="0 0 24 24"
                                                  stroke="currentColor"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                  />
                                                </svg>
                                                No Discord channel
                                              </div>
                                            )}
                                          </div>

                                          {/* Dates */}
                                          <div className="text-xs text-base-content/50 mt-2 space-y-1">
                                            {mentorship.approvedAt && (
                                              <div>
                                                Started:{" "}
                                                {format(
                                                  new Date(mentorship.approvedAt),
                                                  "MMM d, yyyy"
                                                )}
                                              </div>
                                            )}
                                            {mentorship.lastContactAt && (
                                              <div>
                                                Last activity:{" "}
                                                {format(
                                                  new Date(
                                                    mentorship.lastContactAt
                                                  ),
                                                  "MMM d, yyyy"
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          {/* Action Buttons */}
                                          <div className="flex flex-wrap gap-2 mt-3">
                                            <button
                                              className="btn btn-success btn-xs"
                                              disabled={updatingStatus === mentorship.id}
                                              onClick={() => handleSessionStatusChange(mentorship.id, "completed")}
                                            >
                                              {updatingStatus === mentorship.id ? (
                                                <span className="loading loading-spinner loading-xs"></span>
                                              ) : (
                                                "Complete"
                                              )}
                                            </button>
                                            <button
                                              className="btn btn-info btn-xs"
                                              disabled={regeneratingChannel === mentorship.id}
                                              onClick={() => handleRegenerateChannel(mentorship.id)}
                                            >
                                              {regeneratingChannel === mentorship.id ? (
                                                <span className="loading loading-spinner loading-xs"></span>
                                              ) : (
                                                "Regenerate Channel"
                                              )}
                                            </button>
                                            <button
                                              className="btn btn-error btn-xs btn-outline"
                                              onClick={() => {
                                                setSessionToDelete({
                                                  id: mentorship.id,
                                                  partnerName: mentorship.partnerProfile?.displayName || "Unknown"
                                                });
                                                setShowDeleteModal(true);
                                              }}
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Completed Mentorships Collapse */}
                        {completedMentorships.length > 0 && (
                          <div className="collapse collapse-arrow bg-base-200 mt-4">
                            <input type="checkbox" />
                            <div className="collapse-title font-medium">
                              Completed Mentorships ({completedMentorships.length})
                            </div>
                            <div className="collapse-content">
                              <div className="space-y-3 pt-2">
                                {completedMentorships.map((mentorship) => (
                                  <div
                                    key={mentorship.id}
                                    className="card bg-base-100"
                                  >
                                    <div className="card-body p-4">
                                      <div className="flex items-start gap-3">
                                        <div className="avatar">
                                          <div className="w-12 h-12 rounded-full">
                                            {mentorship.partnerProfile?.photoURL ? (
                                              <img
                                                src={
                                                  mentorship.partnerProfile.photoURL
                                                }
                                                alt={getAnonymizedDisplayName(mentorship.partnerProfile?.displayName, mentorship.partnerProfile?.uid || "partner", isStreamerMode) || "Partner"}
                                              />
                                            ) : (
                                              <div className="bg-secondary text-secondary-content flex items-center justify-center text-lg font-bold w-full h-full">
                                                {getAnonymizedDisplayName(mentorship.partnerProfile?.displayName, mentorship.partnerProfile?.uid || "partner", isStreamerMode)?.charAt(0) || "?"}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-semibold">
                                              {getAnonymizedDisplayName(mentorship.partnerProfile?.displayName, mentorship.partnerProfile?.uid || "partner", isStreamerMode) || "Unknown"}
                                            </h4>
                                            {getMentorshipStatusBadge(
                                              mentorship.status
                                            )}
                                          </div>
                                          <p className="text-xs text-base-content/60">
                                            {getAnonymizedEmail(mentorship.partnerProfile?.email, mentorship.partnerProfile?.uid || "partner", isStreamerMode)}
                                          </p>
                                          {/* Inline Discord Edit for partner */}
                                          {mentorship.partnerProfile && (
                                            <div className="text-xs text-base-content/60">
                                              <span className="inline-flex items-center gap-1">
                                                Discord:{" "}
                                                {editingDiscord === `${mentorship.id}-${mentorship.partnerProfile.uid}` ? (
                                                  <span className="inline-flex items-center gap-1">
                                                    <input
                                                      type="text"
                                                      className="input input-xs input-bordered w-28"
                                                      value={editingDiscordValue}
                                                      onChange={(e) => setEditingDiscordValue(e.target.value.toLowerCase())}
                                                      onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                          handleDiscordSave(mentorship.partnerProfile!.uid, editingDiscordValue);
                                                        } else if (e.key === "Escape") {
                                                          setEditingDiscord(null);
                                                        }
                                                      }}
                                                      onBlur={() => {
                                                        setTimeout(() => {
                                                          if (editingDiscord === `${mentorship.id}-${mentorship.partnerProfile?.uid}` && !savingDiscord) {
                                                            handleDiscordSave(mentorship.partnerProfile!.uid, editingDiscordValue);
                                                          }
                                                        }, 150);
                                                      }}
                                                      placeholder="username"
                                                      disabled={savingDiscord}
                                                      autoFocus
                                                    />
                                                    {savingDiscord && (
                                                      <span className="loading loading-spinner loading-xs"></span>
                                                    )}
                                                  </span>
                                                ) : (
                                                  <button
                                                    className="inline-flex items-center gap-1 hover:bg-base-200 rounded px-1 -ml-1 cursor-pointer"
                                                    onClick={() => {
                                                      setEditingDiscord(`${mentorship.id}-${mentorship.partnerProfile!.uid}`);
                                                      setEditingDiscordValue(mentorship.partnerProfile?.discordUsername || "");
                                                    }}
                                                  >
                                                    <span className={mentorship.partnerProfile.discordUsername ? "" : "italic text-base-content/40"}>
                                                      {getAnonymizedDiscord(mentorship.partnerProfile.discordUsername, mentorship.partnerProfile.uid, isStreamerMode) || "not set"}
                                                    </span>
                                                    <svg className="w-3 h-3 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                  </button>
                                                )}
                                              </span>
                                            </div>
                                          )}

                                          {/* Dates */}
                                          <div className="text-xs text-base-content/50 mt-2 space-y-1">
                                            {mentorship.approvedAt && (
                                              <div>
                                                Started:{" "}
                                                {format(
                                                  new Date(mentorship.approvedAt),
                                                  "MMM d, yyyy"
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          {/* Action Buttons */}
                                          <div className="flex flex-wrap gap-2 mt-3">
                                            <button
                                              className="btn btn-warning btn-xs"
                                              disabled={updatingStatus === mentorship.id}
                                              onClick={() => handleSessionStatusChange(mentorship.id, "active")}
                                            >
                                              {updatingStatus === mentorship.id ? (
                                                <span className="loading loading-spinner loading-xs"></span>
                                              ) : (
                                                "Revert to Active"
                                              )}
                                            </button>
                                            <button
                                              className="btn btn-info btn-xs"
                                              disabled={regeneratingChannel === mentorship.id}
                                              onClick={() => handleRegenerateChannel(mentorship.id)}
                                            >
                                              {regeneratingChannel === mentorship.id ? (
                                                <span className="loading loading-spinner loading-xs"></span>
                                              ) : (
                                                "Regenerate Channel"
                                              )}
                                            </button>
                                            <button
                                              className="btn btn-error btn-xs btn-outline"
                                              onClick={() => {
                                                setSessionToDelete({
                                                  id: mentorship.id,
                                                  partnerName: mentorship.partnerProfile?.displayName || "Unknown"
                                                });
                                                setShowDeleteModal(true);
                                              }}
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Pending Mentorships Collapse */}
                        {pendingMentorships.length > 0 && (
                          <div className="collapse collapse-arrow bg-base-200 mt-4">
                            <input type="checkbox" />
                            <div className="collapse-title font-medium">
                              Pending Mentorships ({pendingMentorships.length})
                            </div>
                            <div className="collapse-content">
                              <div className="space-y-3 pt-2">
                                {pendingMentorships.map((mentorship) => (
                                  <div
                                    key={mentorship.id}
                                    className="card bg-base-100"
                                  >
                                    <div className="card-body p-4">
                                      <div className="flex items-start gap-3">
                                        <div className="avatar">
                                          <div className="w-12 h-12 rounded-full">
                                            {mentorship.partnerProfile?.photoURL ? (
                                              <img
                                                src={
                                                  mentorship.partnerProfile.photoURL
                                                }
                                                alt={getAnonymizedDisplayName(mentorship.partnerProfile?.displayName, mentorship.partnerProfile?.uid || "partner", isStreamerMode) || "Partner"}
                                              />
                                            ) : (
                                              <div className="bg-secondary text-secondary-content flex items-center justify-center text-lg font-bold w-full h-full">
                                                {getAnonymizedDisplayName(mentorship.partnerProfile?.displayName, mentorship.partnerProfile?.uid || "partner", isStreamerMode)?.charAt(0) || "?"}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-semibold">
                                              {getAnonymizedDisplayName(mentorship.partnerProfile?.displayName, mentorship.partnerProfile?.uid || "partner", isStreamerMode) || "Unknown"}
                                            </h4>
                                            {getMentorshipStatusBadge(
                                              mentorship.status
                                            )}
                                          </div>
                                          <p className="text-xs text-base-content/60">
                                            {getAnonymizedEmail(mentorship.partnerProfile?.email, mentorship.partnerProfile?.uid || "partner", isStreamerMode)}
                                          </p>
                                          {/* Inline Discord Edit for partner */}
                                          {mentorship.partnerProfile && (
                                            <div className="text-xs text-base-content/60">
                                              <span className="inline-flex items-center gap-1">
                                                Discord:{" "}
                                                {editingDiscord === `${mentorship.id}-${mentorship.partnerProfile.uid}` ? (
                                                  <span className="inline-flex items-center gap-1">
                                                    <input
                                                      type="text"
                                                      className="input input-xs input-bordered w-28"
                                                      value={editingDiscordValue}
                                                      onChange={(e) => setEditingDiscordValue(e.target.value.toLowerCase())}
                                                      onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                          handleDiscordSave(mentorship.partnerProfile!.uid, editingDiscordValue);
                                                        } else if (e.key === "Escape") {
                                                          setEditingDiscord(null);
                                                        }
                                                      }}
                                                      onBlur={() => {
                                                        setTimeout(() => {
                                                          if (editingDiscord === `${mentorship.id}-${mentorship.partnerProfile?.uid}` && !savingDiscord) {
                                                            handleDiscordSave(mentorship.partnerProfile!.uid, editingDiscordValue);
                                                          }
                                                        }, 150);
                                                      }}
                                                      placeholder="username"
                                                      disabled={savingDiscord}
                                                      autoFocus
                                                    />
                                                    {savingDiscord && (
                                                      <span className="loading loading-spinner loading-xs"></span>
                                                    )}
                                                  </span>
                                                ) : (
                                                  <button
                                                    className="inline-flex items-center gap-1 hover:bg-base-200 rounded px-1 -ml-1 cursor-pointer"
                                                    onClick={() => {
                                                      setEditingDiscord(`${mentorship.id}-${mentorship.partnerProfile!.uid}`);
                                                      setEditingDiscordValue(mentorship.partnerProfile?.discordUsername || "");
                                                    }}
                                                  >
                                                    <span className={mentorship.partnerProfile.discordUsername ? "" : "italic text-base-content/40"}>
                                                      {getAnonymizedDiscord(mentorship.partnerProfile.discordUsername, mentorship.partnerProfile.uid, isStreamerMode) || "not set"}
                                                    </span>
                                                    <svg className="w-3 h-3 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                  </button>
                                                )}
                                              </span>
                                            </div>
                                          )}

                                          {/* Dates */}
                                          <div className="text-xs text-base-content/50 mt-2 space-y-1">
                                            {mentorship.requestedAt && (
                                              <div>
                                                Requested:{" "}
                                                {format(
                                                  new Date(mentorship.requestedAt),
                                                  "MMM d, yyyy"
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          {/* Action Buttons */}
                                          <div className="flex flex-wrap gap-2 mt-3">
                                            <button
                                              className="btn btn-error btn-xs btn-outline"
                                              onClick={() => {
                                                setSessionToDelete({
                                                  id: mentorship.id,
                                                  partnerName: mentorship.partnerProfile?.displayName || "Unknown"
                                                });
                                                setShowDeleteModal(true);
                                              }}
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Cancelled Mentorships Collapse */}
                        {cancelledMentorships.length > 0 && (
                          <div className="collapse collapse-arrow bg-base-200 mt-4">
                            <input type="checkbox" />
                            <div className="collapse-title font-medium">
                              Cancelled Mentorships ({cancelledMentorships.length})
                            </div>
                            <div className="collapse-content">
                              <div className="space-y-3 pt-2">
                                {cancelledMentorships.map((mentorship) => (
                                  <div
                                    key={mentorship.id}
                                    className="card bg-base-100"
                                  >
                                    <div className="card-body p-4">
                                      <div className="flex items-start gap-3">
                                        <div className="avatar">
                                          <div className="w-12 h-12 rounded-full">
                                            {mentorship.partnerProfile?.photoURL ? (
                                              <img
                                                src={
                                                  mentorship.partnerProfile.photoURL
                                                }
                                                alt={getAnonymizedDisplayName(mentorship.partnerProfile?.displayName, mentorship.partnerProfile?.uid || "partner", isStreamerMode) || "Partner"}
                                              />
                                            ) : (
                                              <div className="bg-secondary text-secondary-content flex items-center justify-center text-lg font-bold w-full h-full">
                                                {getAnonymizedDisplayName(mentorship.partnerProfile?.displayName, mentorship.partnerProfile?.uid || "partner", isStreamerMode)?.charAt(0) || "?"}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-semibold">
                                              {getAnonymizedDisplayName(mentorship.partnerProfile?.displayName, mentorship.partnerProfile?.uid || "partner", isStreamerMode) || "Unknown"}
                                            </h4>
                                            {getMentorshipStatusBadge(
                                              mentorship.status
                                            )}
                                          </div>
                                          <p className="text-xs text-base-content/60">
                                            {getAnonymizedEmail(mentorship.partnerProfile?.email, mentorship.partnerProfile?.uid || "partner", isStreamerMode)}
                                          </p>
                                          {/* Inline Discord Edit for partner */}
                                          {mentorship.partnerProfile && (
                                            <div className="text-xs text-base-content/60">
                                              <span className="inline-flex items-center gap-1">
                                                Discord:{" "}
                                                {editingDiscord === `${mentorship.id}-${mentorship.partnerProfile.uid}` ? (
                                                  <span className="inline-flex items-center gap-1">
                                                    <input
                                                      type="text"
                                                      className="input input-xs input-bordered w-28"
                                                      value={editingDiscordValue}
                                                      onChange={(e) => setEditingDiscordValue(e.target.value.toLowerCase())}
                                                      onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                          handleDiscordSave(mentorship.partnerProfile!.uid, editingDiscordValue);
                                                        } else if (e.key === "Escape") {
                                                          setEditingDiscord(null);
                                                        }
                                                      }}
                                                      onBlur={() => {
                                                        setTimeout(() => {
                                                          if (editingDiscord === `${mentorship.id}-${mentorship.partnerProfile?.uid}` && !savingDiscord) {
                                                            handleDiscordSave(mentorship.partnerProfile!.uid, editingDiscordValue);
                                                          }
                                                        }, 150);
                                                      }}
                                                      placeholder="username"
                                                      disabled={savingDiscord}
                                                      autoFocus
                                                    />
                                                    {savingDiscord && (
                                                      <span className="loading loading-spinner loading-xs"></span>
                                                    )}
                                                  </span>
                                                ) : (
                                                  <button
                                                    className="inline-flex items-center gap-1 hover:bg-base-200 rounded px-1 -ml-1 cursor-pointer"
                                                    onClick={() => {
                                                      setEditingDiscord(`${mentorship.id}-${mentorship.partnerProfile!.uid}`);
                                                      setEditingDiscordValue(mentorship.partnerProfile?.discordUsername || "");
                                                    }}
                                                  >
                                                    <span className={mentorship.partnerProfile.discordUsername ? "" : "italic text-base-content/40"}>
                                                      {getAnonymizedDiscord(mentorship.partnerProfile.discordUsername, mentorship.partnerProfile.uid, isStreamerMode) || "not set"}
                                                    </span>
                                                    <svg className="w-3 h-3 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                  </button>
                                                )}
                                              </span>
                                            </div>
                                          )}

                                          {/* Cancellation Info */}
                                          <div className="text-xs text-base-content/50 mt-2 space-y-1">
                                            {mentorship.cancelledAt && (
                                              <div>
                                                Cancelled:{" "}
                                                {format(
                                                  new Date(mentorship.cancelledAt),
                                                  "MMM d, yyyy"
                                                )}
                                              </div>
                                            )}
                                            {mentorship.cancellationReason && (
                                              <div>
                                                Reason: {mentorship.cancellationReason}
                                              </div>
                                            )}
                                          </div>

                                          {/* Action Buttons */}
                                          <div className="flex flex-wrap gap-2 mt-3">
                                            <button
                                              className="btn btn-error btn-xs btn-outline"
                                              onClick={() => {
                                                setSessionToDelete({
                                                  id: mentorship.id,
                                                  partnerName: mentorship.partnerProfile?.displayName || "Unknown"
                                                });
                                                setShowDeleteModal(true);
                                              }}
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* No Relationships Message */}
                        {item.mentorships.length === 0 && (
                          <div className="collapse collapse-arrow bg-base-200 mt-4">
                            <input type="checkbox" />
                            <div className="collapse-title font-medium">
                              Mentorships (0)
                            </div>
                            <div className="collapse-content">
                              <p className="text-sm text-base-content/60 pt-2">
                                {activeTab === "all-mentors"
                                  ? "No mentees assigned"
                                  : "No mentors assigned"}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <div className="join">
                    <button
                      className="join-item btn btn-sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      «
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          className={`join-item btn btn-sm ${currentPage === page ? "btn-active" : ""}`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      )
                    )}
                    <button
                      className="join-item btn btn-sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Alerts Modal */}
      <dialog id="alerts-modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Low Rating Alerts</h3>
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="card bg-base-200">
                <div className="card-body p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">
                        Session received 1-star rating
                      </div>
                      {alert.feedback && (
                        <p className="text-sm text-base-content/70 mt-1">
                          &quot;{alert.feedback}&quot;
                        </p>
                      )}
                      <div className="text-xs text-base-content/50 mt-2">
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Reviews Modal */}
      {showReviewsModal && reviewMentor && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
              onClick={() => setShowReviewsModal(false)}
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="avatar">
                <div className="w-16 h-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                  {reviewMentor.photoURL ? (
                    <img
                      src={reviewMentor.photoURL}
                      alt={getAnonymizedDisplayName(reviewMentor.displayName, reviewMentor.uid, isStreamerMode) || "Mentor"}
                    />
                  ) : (
                    <div className="bg-primary text-primary-content flex items-center justify-center text-2xl font-bold w-full h-full">
                      {getAnonymizedDisplayName(reviewMentor.displayName, reviewMentor.uid, isStreamerMode)?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {getAnonymizedDisplayName(reviewMentor.displayName, reviewMentor.uid, isStreamerMode)}
                </h3>
                <p className="text-sm text-base-content/60">
                  Reviews & Ratings
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${star <= (reviewMentor.avgRating ?? 0) ? "text-yellow-400" : "text-base-content/20"}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="font-semibold">
                    {reviewMentor.avgRating}
                  </span>
                  <span className="text-base-content/50">
                    ({reviewMentor.ratingCount} reviews)
                  </span>
                </div>
              </div>
            </div>

            <div className="divider"></div>

            {/* Reviews List */}
            {loadingReviews ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8 text-base-content/60">
                <div className="text-4xl mb-2">📭</div>
                <p>No reviews found</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {reviews.map((review) => (
                  <div key={review.id} className="card bg-base-200 shadow-sm">
                    <div className="card-body p-4">
                      {/* Reviewer Info */}
                      <div className="flex items-start gap-3">
                        <div className="avatar">
                          <div className="w-10 h-10 rounded-full">
                            {review.menteePhoto ? (
                              <img
                                src={review.menteePhoto}
                                alt={getAnonymizedDisplayName(review.menteeName, review.menteeId, isStreamerMode) || "Mentee"}
                              />
                            ) : (
                              <div className="bg-secondary text-secondary-content flex items-center justify-center text-sm font-bold w-full h-full">
                                {getAnonymizedDisplayName(review.menteeName, review.menteeId, isStreamerMode)?.charAt(0) || "?"}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <p className="font-semibold">
                                {getAnonymizedDisplayName(review.menteeName, review.menteeId, isStreamerMode) || "Anonymous"}
                              </p>
                              <p className="text-xs text-base-content/50">
                                {getAnonymizedEmail(review.menteeEmail, review.menteeId, isStreamerMode)}
                              </p>
                            </div>
                            <div className="text-xs text-base-content/50">
                              {review.createdAt
                                ? new Date(review.createdAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )
                                : "N/A"}
                            </div>
                          </div>

                          {/* Star Rating */}
                          <div className="flex items-center gap-1 mt-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${star <= review.rating ? "text-yellow-400" : "text-base-content/20"}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            <span className="text-sm font-medium ml-1">
                              {review.rating}/5
                            </span>
                          </div>

                          {/* Feedback */}
                          {review.feedback && (
                            <div className="mt-3 p-3 bg-base-100 rounded-lg">
                              <p className="text-sm italic text-base-content/80">
                                "{review.feedback}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-action">
              <button
                className="btn"
                onClick={() => setShowReviewsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowReviewsModal(false)}>close</button>
          </form>
        </dialog>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              Filter {activeTab === "all-mentors" ? "Mentors" : "Mentees"}
            </h3>

            {/* Status Filter */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">Status</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as typeof filters.status }))}
              >
                <option value="all">All Statuses</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="pending">Pending</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {/* Relationships Filter */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">
                  {activeTab === "all-mentors" ? "Mentees" : "Mentors"}
                </span>
              </label>
              <select
                className="select select-bordered w-full"
                value={filters.mentees}
                onChange={(e) => setFilters(prev => ({ ...prev, mentees: e.target.value as typeof filters.mentees }))}
              >
                <option value="all">All</option>
                <option value="with">
                  With Active {activeTab === "all-mentors" ? "Mentees" : "Mentors"}
                </option>
                <option value="without">
                  Without Active {activeTab === "all-mentors" ? "Mentees" : "Mentors"}
                </option>
              </select>
            </div>

            {/* Rating Filter - Only for Mentors */}
            {activeTab === "all-mentors" && (
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-medium">Rating</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={filters.rating}
                  onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value as typeof filters.rating }))}
                >
                  <option value="all">All</option>
                  <option value="rated">Rated</option>
                  <option value="unrated">Unrated</option>
                </select>
              </div>
            )}

            {/* Discord Filter */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">Discord Username</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={filters.discord}
                onChange={(e) => setFilters(prev => ({ ...prev, discord: e.target.value as typeof filters.discord }))}
              >
                <option value="all">All</option>
                <option value="with">Has Discord Username</option>
                <option value="without">Missing Discord Username</option>
              </select>
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setFilters({
                    status: "all",
                    mentees: "all",
                    rating: "all",
                    discord: "all",
                  });
                }}
              >
                Clear All
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowFilterModal(false);
                  setCurrentPage(1); // Reset pagination when filters change
                }}
              >
                Apply Filters
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowFilterModal(false)}>close</button>
          </form>
        </dialog>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && sessionToDelete && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-error">Delete Mentorship</h3>
            <p className="py-4">
              Are you sure you want to delete the mentorship with{" "}
              <span className="font-semibold">{sessionToDelete.partnerName}</span>?
            </p>
            <p className="text-sm text-base-content/70">
              This action cannot be undone. The mentorship session will be permanently removed.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSessionToDelete(null);
                }}
                disabled={deletingSession === sessionToDelete.id}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={handleDeleteMentorship}
                disabled={deletingSession === sessionToDelete.id}
              >
                {deletingSession === sessionToDelete.id ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Deleting...
                  </>
                ) : (
                  "Delete Mentorship"
                )}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setSessionToDelete(null);
              }}
            >
              close
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}
