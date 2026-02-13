"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import {
  ProfileWithDetails,
  Review,
  MentorshipWithPartner,
  GroupedMentorship,
  MentorshipSummary,
} from "@/types/admin";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import { useStreamerMode } from "@/hooks/useStreamerMode";
import {
  getAnonymizedDisplayName,
  getAnonymizedEmail,
  getAnonymizedDiscord,
} from "@/utils/streamer-mode";
import Link from "next/link";
import { useDebouncedCallback } from "use-debounce";
import { format } from "date-fns";

export default function AllMentorsPage() {
  const toast = useToast();
  const { isStreamerMode } = useStreamerMode();

  // Mentorship mapping state
  const [mentorshipData, setMentorshipData] = useState<GroupedMentorship[]>([]);
  const [loadingMentorships, setLoadingMentorships] = useState(false);
  const [mentorshipSummary, setMentorshipSummary] =
    useState<MentorshipSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInputValue, setSearchInputValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Inline Discord edit state
  const [editingDiscord, setEditingDiscord] = useState<string | null>(null);
  const [editingDiscordValue, setEditingDiscordValue] = useState("");
  const [savingDiscord, setSavingDiscord] = useState(false);

  // Mentorship status management state
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<{
    id: string;
    partnerName: string;
  } | null>(null);
  const [regeneratingChannel, setRegeneratingChannel] = useState<string | null>(
    null
  );

  // Reviews modal state
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviewMentor, setReviewMentor] = useState<ProfileWithDetails | null>(
    null
  );
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Filter state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    status: "all" as "all" | "accepted" | "declined" | "pending" | "disabled",
    mentors: "all" as "all" | "with" | "without",
    discord: "all" as "all" | "with" | "without",
  });
  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== "all"
  ).length;

  // Profile state for status operations
  const [profiles, setProfiles] = useState<ProfileWithDetails[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Debounced search handler
  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, 300);

  // Fetch mentorship data
  useEffect(() => {
    const fetchMentorshipData = async () => {
      setLoadingMentorships(true);
      try {
        const response = await fetch("/api/mentorship/admin/matches?role=mentee");
        if (response.ok) {
          const data = await response.json();
          setMentorshipData(data.matches || []);
          setMentorshipSummary(data.summary || null);
        }
      } catch (error) {
        console.error("Error fetching mentorship data:", error);
        toast.error("Failed to load mentorship data");
      } finally {
        setLoadingMentorships(false);
      }
    };

    fetchMentorshipData();
  }, [toast]);

  // Fetch profiles for status operations
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const response = await fetch("/api/mentorship/admin/profiles?role=mentee");
        if (response.ok) {
          const data = await response.json();
          setProfiles(data.profiles || []);
        }
      } catch (error) {
        console.error("Error fetching profiles:", error);
      }
    };

    fetchProfiles();
  }, []);

  const handleDiscordSave = async (uid: string, newUsername: string) => {
    // Validate format client-side first
    if (newUsername && !/^[a-z0-9_.]{2,32}$/.test(newUsername)) {
      toast.error(
        "Invalid Discord username format. Use 2-32 lowercase characters (letters, numbers, underscore, period)."
      );
      return;
    }

    setSavingDiscord(true);
    try {
      const response = await fetch("/api/mentorship/admin/profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, discordUsername: newUsername }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Update failed");
      }

      // Update local state
      setMentorshipData((prev) =>
        prev.map((group) => ({
          ...group,
          profile:
            group.profile.uid === uid
              ? { ...group.profile, discordUsername: newUsername || undefined }
              : group.profile,
          mentorships: group.mentorships.map((m) => ({
            ...m,
            partnerProfile:
              m.partnerProfile?.uid === uid
                ? { ...m.partnerProfile, discordUsername: newUsername || undefined }
                : m.partnerProfile,
          })),
        }))
      );

      toast.success("Discord username updated");
      setEditingDiscord(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update Discord username"
      );
    } finally {
      setSavingDiscord(false);
    }
  };

  const handleSessionStatusChange = async (
    sessionId: string,
    newStatus: "active" | "completed"
  ) => {
    setUpdatingStatus(sessionId);
    try {
      const response = await fetch("/api/mentorship/admin/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Update failed");
      }

      // Update local state
      setMentorshipData((prev) =>
        prev.map((group) => ({
          ...group,
          mentorships: group.mentorships.map((m) =>
            m.id === sessionId ? { ...m, status: newStatus } : m
          ),
        }))
      );

      toast.success(
        newStatus === "completed"
          ? "Mentorship marked as completed"
          : "Mentorship reverted to active"
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update mentorship status"
      );
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDeleteMentorship = async () => {
    if (!sessionToDelete) return;

    setDeletingSession(sessionToDelete.id);
    try {
      const response = await fetch(
        `/api/mentorship/admin/sessions?id=${sessionToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Delete failed");
      }

      // Update local state
      setMentorshipData((prev) =>
        prev.map((group) => ({
          ...group,
          mentorships: group.mentorships.filter((m) => m.id !== sessionToDelete.id),
        }))
      );

      toast.success("Mentorship deleted successfully");
      setShowDeleteModal(false);
      setSessionToDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete mentorship"
      );
    } finally {
      setDeletingSession(null);
    }
  };

  const handleRegenerateChannel = async (sessionId: string) => {
    setRegeneratingChannel(sessionId);
    try {
      const response = await fetch(
        "/api/mentorship/admin/sessions/regenerate-channel",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Channel regeneration failed");
      }

      const data = await response.json();

      // Update local state with new channel URL
      setMentorshipData((prev) =>
        prev.map((group) => ({
          ...group,
          mentorships: group.mentorships.map((m) =>
            m.id === sessionId ? { ...m, discordChannelUrl: data.channelUrl } : m
          ),
        }))
      );

      toast.success(`Discord channel created! URL: ${data.channelUrl}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to regenerate Discord channel"
      );
    } finally {
      setRegeneratingChannel(null);
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

        // Update local state
        setProfiles((prev) =>
          prev.map((p) =>
            p.uid === uid
              ? {
                  ...p,
                  status: newStatus,
                  disabledSessionsCount: reactivateSessions
                    ? 0
                    : p.disabledSessionsCount,
                }
              : p
          )
        );

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
        return <span className="badge badge-info badge-sm">Completed</span>;
      case "pending":
        return <span className="badge badge-warning badge-sm">Pending</span>;
      case "cancelled":
        return <span className="badge badge-error badge-sm">Cancelled</span>;
      default:
        return <span className="badge badge-ghost badge-sm">{status}</span>;
    }
  };

  // Filter logic
  const filteredMentorshipData = mentorshipData.filter((item) => {
    const profile = item.profile;

    // Status filter
    if (filters.status !== "all" && profile.status !== filters.status) {
      return false;
    }
    // Default: hide declined unless explicitly filtering for them
    if (filters.status === "all" && profile.status === "declined") {
      return false;
    }

    // Relationships filter (has active mentorships or not)
    const hasRelationships = item.mentorships.some((m) => m.status === "active");
    if (filters.mentors === "with" && !hasRelationships) return false;
    if (filters.mentors === "without" && hasRelationships) return false;

    // Discord filter
    const hasDiscord =
      profile.discordUsername && profile.discordUsername.trim() !== "";
    if (filters.discord === "with" && !hasDiscord) return false;
    if (filters.discord === "without" && hasDiscord) return false;

    // Search query filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      profile.displayName?.toLowerCase().includes(query) ||
      profile.email?.toLowerCase().includes(query) ||
      profile.discordUsername?.toLowerCase().includes(query);
    return matchesSearch;
  });

  // Paginate filtered data
  const totalPages = Math.ceil(filteredMentorshipData.length / pageSize);
  const paginatedData = filteredMentorshipData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">All Mentees</h1>

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
          value={searchInputValue}
          onChange={(e) => {
            setSearchInputValue(e.target.value);
            debouncedSearch(e.target.value);
          }}
        />
      </div>

      {/* Filter Button */}
      <div className="flex items-center gap-2">
        <button
          className="btn btn-outline btn-sm gap-2"
          onClick={() => setShowFilterModal(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="badge badge-primary badge-sm">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() =>
              setFilters({
                status: "all",
                mentors: "all",
                discord: "all",
              })
            }
          >
            Clear
          </button>
        )}
      </div>

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
            <h3 className="text-xl font-semibold">No mentors found</h3>
            <p className="text-base-content/70">
              {searchQuery
                ? "Try adjusting your search query."
                : activeFilterCount > 0
                ? "No mentors match your filters. Try adjusting or clearing filters."
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
                              alt={
                                getAnonymizedDisplayName(
                                  p.displayName,
                                  p.uid,
                                  isStreamerMode
                                ) || "Profile"
                              }
                            />
                          ) : (
                            <div className="bg-primary text-primary-content flex items-center justify-center text-2xl font-bold w-full h-full">
                              {getAnonymizedDisplayName(
                                p.displayName,
                                p.uid,
                                isStreamerMode
                              )?.charAt(0) || "?"}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold">
                            {getAnonymizedDisplayName(
                              p.displayName,
                              p.uid,
                              isStreamerMode
                            )}
                          </h3>
                          {getStatusBadge(p.status)}
                          <span className="badge badge-outline">
                            {p.role === "mentee" ? "🎯 Mentor" : "🚀 Mentee"}
                          </span>
                          <span
                            className={`badge ${
                              activeRelationshipCount === 0
                                ? "badge-ghost"
                                : "badge-info"
                            }`}
                          >
                            {activeRelationshipCount} mentors
                          </span>
                          {/* Restore button for declined mentees */}
                          {p.status === "declined" && (
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
                                  onChange={(e) =>
                                    setEditingDiscordValue(
                                      e.target.value.toLowerCase()
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleDiscordSave(p.uid, editingDiscordValue);
                                    } else if (e.key === "Escape") {
                                      setEditingDiscord(null);
                                    }
                                  }}
                                  onBlur={() => {
                                    setTimeout(() => {
                                      if (
                                        editingDiscord === `profile-${p.uid}` &&
                                        !savingDiscord
                                      ) {
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
                                <span
                                  className={
                                    p.discordUsername
                                      ? ""
                                      : "italic text-base-content/40"
                                  }
                                >
                                  {getAnonymizedDiscord(
                                    p.discordUsername,
                                    p.uid,
                                    isStreamerMode
                                  ) || "not set"}
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
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                  />
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
                              <MentorshipCard
                                key={mentorship.id}
                                mentorship={mentorship}
                                isStreamerMode={isStreamerMode}
                                editingDiscord={editingDiscord}
                                setEditingDiscord={setEditingDiscord}
                                editingDiscordValue={editingDiscordValue}
                                setEditingDiscordValue={setEditingDiscordValue}
                                savingDiscord={savingDiscord}
                                handleDiscordSave={handleDiscordSave}
                                getMentorshipStatusBadge={getMentorshipStatusBadge}
                                updatingStatus={updatingStatus}
                                handleSessionStatusChange={handleSessionStatusChange}
                                regeneratingChannel={regeneratingChannel}
                                handleRegenerateChannel={handleRegenerateChannel}
                                setSessionToDelete={setSessionToDelete}
                                setShowDeleteModal={setShowDeleteModal}
                                showCompleteButton={true}
                                showRevertButton={false}
                              />
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
                              <MentorshipCard
                                key={mentorship.id}
                                mentorship={mentorship}
                                isStreamerMode={isStreamerMode}
                                editingDiscord={editingDiscord}
                                setEditingDiscord={setEditingDiscord}
                                editingDiscordValue={editingDiscordValue}
                                setEditingDiscordValue={setEditingDiscordValue}
                                savingDiscord={savingDiscord}
                                handleDiscordSave={handleDiscordSave}
                                getMentorshipStatusBadge={getMentorshipStatusBadge}
                                updatingStatus={updatingStatus}
                                handleSessionStatusChange={handleSessionStatusChange}
                                regeneratingChannel={regeneratingChannel}
                                handleRegenerateChannel={handleRegenerateChannel}
                                setSessionToDelete={setSessionToDelete}
                                setShowDeleteModal={setShowDeleteModal}
                                showCompleteButton={false}
                                showRevertButton={true}
                              />
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
                              <MentorshipCard
                                key={mentorship.id}
                                mentorship={mentorship}
                                isStreamerMode={isStreamerMode}
                                editingDiscord={editingDiscord}
                                setEditingDiscord={setEditingDiscord}
                                editingDiscordValue={editingDiscordValue}
                                setEditingDiscordValue={setEditingDiscordValue}
                                savingDiscord={savingDiscord}
                                handleDiscordSave={handleDiscordSave}
                                getMentorshipStatusBadge={getMentorshipStatusBadge}
                                updatingStatus={updatingStatus}
                                handleSessionStatusChange={handleSessionStatusChange}
                                regeneratingChannel={regeneratingChannel}
                                handleRegenerateChannel={handleRegenerateChannel}
                                setSessionToDelete={setSessionToDelete}
                                setShowDeleteModal={setShowDeleteModal}
                                showCompleteButton={false}
                                showRevertButton={false}
                              />
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
                              <div key={mentorship.id} className="card bg-base-100">
                                <div className="card-body p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="avatar">
                                      <div className="w-12 h-12 rounded-full">
                                        {mentorship.partnerProfile?.photoURL ? (
                                          <img
                                            src={mentorship.partnerProfile.photoURL}
                                            alt={
                                              getAnonymizedDisplayName(
                                                mentorship.partnerProfile?.displayName,
                                                mentorship.partnerProfile?.uid ||
                                                  "partner",
                                                isStreamerMode
                                              ) || "Partner"
                                            }
                                          />
                                        ) : (
                                          <div className="bg-secondary text-secondary-content flex items-center justify-center text-lg font-bold w-full h-full">
                                            {getAnonymizedDisplayName(
                                              mentorship.partnerProfile?.displayName,
                                              mentorship.partnerProfile?.uid ||
                                                "partner",
                                              isStreamerMode
                                            )?.charAt(0) || "?"}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-semibold">
                                          {getAnonymizedDisplayName(
                                            mentorship.partnerProfile?.displayName,
                                            mentorship.partnerProfile?.uid || "partner",
                                            isStreamerMode
                                          ) || "Unknown"}
                                        </h4>
                                        {getMentorshipStatusBadge(mentorship.status)}
                                      </div>
                                      <p className="text-xs text-base-content/60">
                                        {getAnonymizedEmail(
                                          mentorship.partnerProfile?.email,
                                          mentorship.partnerProfile?.uid || "partner",
                                          isStreamerMode
                                        )}
                                      </p>
                                      {mentorship.cancelledAt && (
                                        <div className="text-xs text-base-content/50 mt-2">
                                          Cancelled:{" "}
                                          {format(
                                            new Date(mentorship.cancelledAt),
                                            "MMM d, yyyy"
                                          )}
                                        </div>
                                      )}
                                      {mentorship.cancellationReason && (
                                        <div className="mt-2 p-2 bg-base-200 rounded text-xs">
                                          <span className="font-semibold">Reason: </span>
                                          {mentorship.cancellationReason}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* No mentorships message */}
                    {item.mentorships.length === 0 && (
                      <div className="collapse collapse-arrow bg-base-200 mt-4">
                        <input type="checkbox" />
                        <div className="collapse-title font-medium">
                          Mentorships (0)
                        </div>
                        <div className="collapse-content">
                          <p className="text-sm text-base-content/60 pt-2">
                            No mentors assigned
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`join-item btn btn-sm ${
                      currentPage === page ? "btn-active" : ""
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
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
                      alt={
                        getAnonymizedDisplayName(
                          reviewMentor.displayName,
                          reviewMentor.uid,
                          isStreamerMode
                        ) || "Mentor"
                      }
                    />
                  ) : (
                    <div className="bg-primary text-primary-content flex items-center justify-center text-2xl font-bold w-full h-full">
                      {getAnonymizedDisplayName(
                        reviewMentor.displayName,
                        reviewMentor.uid,
                        isStreamerMode
                      )?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {getAnonymizedDisplayName(
                    reviewMentor.displayName,
                    reviewMentor.uid,
                    isStreamerMode
                  )}
                </h3>
                <p className="text-sm text-base-content/60">Reviews & Ratings</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${
                          star <= (reviewMentor.avgRating ?? 0)
                            ? "text-yellow-400"
                            : "text-base-content/20"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="font-semibold">{reviewMentor.avgRating}</span>
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
                                alt={
                                  getAnonymizedDisplayName(
                                    review.menteeName,
                                    review.menteeId,
                                    isStreamerMode
                                  ) || "Mentee"
                                }
                              />
                            ) : (
                              <div className="bg-secondary text-secondary-content flex items-center justify-center text-sm font-bold w-full h-full">
                                {getAnonymizedDisplayName(
                                  review.menteeName,
                                  review.menteeId,
                                  isStreamerMode
                                )?.charAt(0) || "?"}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <p className="font-semibold">
                                {getAnonymizedDisplayName(
                                  review.menteeName,
                                  review.menteeId,
                                  isStreamerMode
                                ) || "Anonymous"}
                              </p>
                              <p className="text-xs text-base-content/50">
                                {getAnonymizedEmail(
                                  review.menteeEmail,
                                  review.menteeId,
                                  isStreamerMode
                                )}
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
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? "text-yellow-400"
                                    : "text-base-content/20"
                                }`}
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
              <button className="btn" onClick={() => setShowReviewsModal(false)}>
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
            <h3 className="font-bold text-lg mb-4">Filter Mentees</h3>

            {/* Status Filter */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">Status</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: e.target.value as typeof filters.status,
                  }))
                }
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
                <span className="label-text font-medium">Mentors</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={filters.mentors}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    mentors: e.target.value as typeof filters.mentors,
                  }))
                }
              >
                <option value="all">All</option>
                <option value="with">With Active Mentors</option>
                <option value="without">Without Active Mentors</option>
              </select>
            </div>

            {/* Discord Filter */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">Discord Username</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={filters.discord}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    discord: e.target.value as typeof filters.discord,
                  }))
                }
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
                    mentors: "all",
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
                  setCurrentPage(1);
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
              This action cannot be undone. The mentorship session will be
              permanently removed.
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

// Helper component for mentorship cards to reduce duplication
function MentorshipCard({
  mentorship,
  isStreamerMode,
  editingDiscord,
  setEditingDiscord,
  editingDiscordValue,
  setEditingDiscordValue,
  savingDiscord,
  handleDiscordSave,
  getMentorshipStatusBadge,
  updatingStatus,
  handleSessionStatusChange,
  regeneratingChannel,
  handleRegenerateChannel,
  setSessionToDelete,
  setShowDeleteModal,
  showCompleteButton,
  showRevertButton,
}: {
  mentorship: MentorshipWithPartner;
  isStreamerMode: boolean;
  editingDiscord: string | null;
  setEditingDiscord: (val: string | null) => void;
  editingDiscordValue: string;
  setEditingDiscordValue: (val: string) => void;
  savingDiscord: boolean;
  handleDiscordSave: (uid: string, username: string) => void;
  getMentorshipStatusBadge: (status: string) => React.JSX.Element;
  updatingStatus: string | null;
  handleSessionStatusChange: (id: string, status: "active" | "completed") => void;
  regeneratingChannel: string | null;
  handleRegenerateChannel: (id: string) => void;
  setSessionToDelete: (val: { id: string; partnerName: string }) => void;
  setShowDeleteModal: (val: boolean) => void;
  showCompleteButton: boolean;
  showRevertButton: boolean;
}) {
  return (
    <div className="card bg-base-100">
      <div className="card-body p-4">
        <div className="flex items-start gap-3">
          <div className="avatar">
            <div className="w-12 h-12 rounded-full">
              {mentorship.partnerProfile?.photoURL ? (
                <img
                  src={mentorship.partnerProfile.photoURL}
                  alt={
                    getAnonymizedDisplayName(
                      mentorship.partnerProfile?.displayName,
                      mentorship.partnerProfile?.uid || "partner",
                      isStreamerMode
                    ) || "Partner"
                  }
                />
              ) : (
                <div className="bg-secondary text-secondary-content flex items-center justify-center text-lg font-bold w-full h-full">
                  {getAnonymizedDisplayName(
                    mentorship.partnerProfile?.displayName,
                    mentorship.partnerProfile?.uid || "partner",
                    isStreamerMode
                  )?.charAt(0) || "?"}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold">
                {getAnonymizedDisplayName(
                  mentorship.partnerProfile?.displayName,
                  mentorship.partnerProfile?.uid || "partner",
                  isStreamerMode
                ) || "Unknown"}
              </h4>
              {getMentorshipStatusBadge(mentorship.status)}
            </div>
            <p className="text-xs text-base-content/60">
              {getAnonymizedEmail(
                mentorship.partnerProfile?.email,
                mentorship.partnerProfile?.uid || "partner",
                isStreamerMode
              )}
            </p>
            {/* Inline Discord Edit for partner */}
            {mentorship.partnerProfile && (
              <div className="text-xs text-base-content/60">
                <span className="inline-flex items-center gap-1">
                  Discord:{" "}
                  {editingDiscord ===
                  `${mentorship.id}-${mentorship.partnerProfile.uid}` ? (
                    <span className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        className="input input-xs input-bordered w-28"
                        value={editingDiscordValue}
                        onChange={(e) =>
                          setEditingDiscordValue(e.target.value.toLowerCase())
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleDiscordSave(
                              mentorship.partnerProfile!.uid,
                              editingDiscordValue
                            );
                          } else if (e.key === "Escape") {
                            setEditingDiscord(null);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            if (
                              editingDiscord ===
                                `${mentorship.id}-${mentorship.partnerProfile?.uid}` &&
                              !savingDiscord
                            ) {
                              handleDiscordSave(
                                mentorship.partnerProfile!.uid,
                                editingDiscordValue
                              );
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
                        setEditingDiscord(
                          `${mentorship.id}-${mentorship.partnerProfile!.uid}`
                        );
                        setEditingDiscordValue(
                          mentorship.partnerProfile?.discordUsername || ""
                        );
                      }}
                    >
                      <span
                        className={
                          mentorship.partnerProfile.discordUsername
                            ? ""
                            : "italic text-base-content/40"
                        }
                      >
                        {getAnonymizedDiscord(
                          mentorship.partnerProfile.discordUsername,
                          mentorship.partnerProfile.uid,
                          isStreamerMode
                        ) || "not set"}
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
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
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
                  Started: {format(new Date(mentorship.approvedAt), "MMM d, yyyy")}
                </div>
              )}
              {mentorship.lastContactAt && (
                <div>
                  Last activity:{" "}
                  {format(new Date(mentorship.lastContactAt), "MMM d, yyyy")}
                </div>
              )}
              {mentorship.requestedAt && !mentorship.approvedAt && (
                <div>
                  Requested:{" "}
                  {format(new Date(mentorship.requestedAt), "MMM d, yyyy")}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {showCompleteButton && (
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
              )}
              {showRevertButton && (
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
              )}
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
                    partnerName: mentorship.partnerProfile?.displayName || "Unknown",
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
  );
}
