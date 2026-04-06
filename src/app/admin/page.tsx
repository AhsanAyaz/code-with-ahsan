"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/contexts/ToastContext";
import { AdminStats, Alert } from "@/types/admin";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";

// Types

/** Shape of the response from DELETE /api/mentorship/admin/sessions/delete-archived-channels */
interface BulkDeleteResult {
  success: boolean;
  message: string;
  deleted: number;
  failed: number;
}

// Component

export default function AdminOverviewPage() {
  const toast = useToast();

  // Dashboard stats state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Bulk-delete channels state
  /** Whether the confirmation modal is visible */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  /** Tracks an in-progress delete request */
  const [deleting, setDeleting] = useState(false);
  /** Stores the result summary after deletion */
  const [deleteResult, setDeleteResult] = useState<BulkDeleteResult | null>(
    null
  );

  // Keep a ref to the DaisyUI dialog element so we can call showModal / close
  const dialogRef = useRef<HTMLDialogElement>(null);

  // ── Fetch stats on mount 
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        const response = await fetch("/api/mentorship/admin/stats", {
          headers: token ? { "x-admin-token": token } : {},
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
          setAlerts(data.alerts || []);
        }
      } catch (error) {
        console.error("Error fetching admin stats:", error);
        toast.error("Failed to load stats");
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [toast]);

  // ── Sync modal open / close with DaisyUI dialog 
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (showDeleteModal) {
      // Reset previous result when re-opening
      setDeleteResult(null);
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [showDeleteModal]);

  // ── Handlers 

  /** Opens the confirmation modal. */
  const handleOpenDeleteModal = () => setShowDeleteModal(true);

  /** Closes the confirmation modal (also resets state). */
  const handleCloseDeleteModal = () => setShowDeleteModal(false);

  /**
   * Sends the DELETE request to the bulk-cleanup API and shows the result.
   * We keep the modal open after completion so the admin can read the summary.
   */
  const handleConfirmDelete = async () => {
    setDeleting(true);
    setDeleteResult(null);

    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      const response = await fetch(
        "/api/mentorship/admin/sessions/delete-archived-channels",
        {
          method: "DELETE",
          headers: token ? { "x-admin-token": token } : {},
        }
      );

      const data: BulkDeleteResult = await response.json();

      if (response.ok && data.success) {
        setDeleteResult(data);
        // Success toast with channel count
        toast.success(
          `Cleanup complete — ${data.deleted} channel(s) deleted.`
        );
      } else {
        toast.error(data.message || "Failed to delete archived channels.");
        handleCloseDeleteModal();
      }
    } catch (error) {
      console.error("Error deleting archived channels:", error);
      toast.error("An unexpected error occurred. Please try again.");
      handleCloseDeleteModal();
    } finally {
      setDeleting(false);
    }
  };

  // Render

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>

        {/* Delete Archived Channels — danger action */}
        <button
          id="admin-delete-archived-channels-btn"
          onClick={handleOpenDeleteModal}
          className="btn btn-error btn-outline btn-sm gap-2"
          title="Permanently delete Discord channels for all completed/cancelled sessions"
        >
          {/* Trash icon */}
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete All Archived Channels
        </button>
      </div>

      {/* ── Alerts Section ────────────────────────────────────────────────────── */}
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
            <h3 className="font-bold">{alerts.length} Low Rating Alert(s)</h3>
            <p className="text-sm">
              Sessions that received 1-star ratings need attention.
            </p>
          </div>
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
            {/* Total Mentors */}
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

            {/* Total Mentees */}
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

            {/* Active Matches */}
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
                <div className="stat-desc">of {stats.totalMatches} total</div>
              </div>
            </div>

            {/* Avg Session Rating */}
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

            {/* Pending Projects */}
            <div className="stats shadow bg-base-100">
              <div className="stat">
                <div className="stat-figure text-warning">
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="stat-title">Pending Projects</div>
                <div className="stat-value text-warning">
                  {stats.pendingProjects}
                </div>
                <div className="stat-desc">awaiting review</div>
              </div>
            </div>

            {/* Pending Roadmaps */}
            <div className="stats shadow bg-base-100">
              <div className="stat">
                <div className="stat-figure text-warning">
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
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                </div>
                <div className="stat-title">Pending Roadmaps</div>
                <div className="stat-value text-warning">
                  {stats.pendingRoadmaps}
                </div>
                <div className="stat-desc">awaiting review</div>
              </div>
            </div>
          </div>
        )
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          Confirmation Modal — Delete All Archived Discord Channels
          Uses the native HTML <dialog> element wrapped with DaisyUI modal classes.
          ═══════════════════════════════════════════════════════════════════════ */}
      <dialog
        ref={dialogRef}
        id="admin-delete-channels-modal"
        className="modal"
        onClose={handleCloseDeleteModal}
      >
        <div className="modal-box max-w-lg">
          {/* ── Modal header ────────────────────────────────────────────────── */}
          <h3 className="font-bold text-xl text-error flex items-center gap-2">
            {/* Warning icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 shrink-0"
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
            Delete All Archived Channels
          </h3>

          {/* ── Modal body — changes between confirmation prompt and result ───── */}
          <div className="py-4 space-y-3 text-sm">
            {deleteResult ? (
              /* ── Post-deletion result summary ─────────────────────────────── */
              <div className="space-y-3">
                <div
                  className={`alert ${deleteResult.failed === 0 ? "alert-success" : "alert-warning"
                    }`}
                >
                  <span>{deleteResult.message}</span>
                </div>

                <ul className="list-disc list-inside text-base-content/80 space-y-1">
                  <li>
                    <span className="font-semibold text-success">
                      {deleteResult.deleted}
                    </span>{" "}
                    channel(s) successfully deleted from Discord.
                  </li>
                  {deleteResult.failed > 0 && (
                    <li>
                      <span className="font-semibold text-error">
                        {deleteResult.failed}
                      </span>{" "}
                      channel(s) could not be deleted (see server logs for
                      details).
                    </li>
                  )}
                </ul>
              </div>
            ) : (
              /* ── Confirmation prompt ──────────────────────────────────────── */
              <div className="space-y-3">
                <p>
                  This action will{" "}
                  <strong className="text-error">
                    permanently delete all Discord channels
                  </strong>{" "}
                  associated with mentorship sessions that have a status of{" "}
                  <code className="bg-base-200 px-1 rounded">completed</code> or{" "}
                  <code className="bg-base-200 px-1 rounded">cancelled</code>.
                </p>
                <p>
                  The action is{" "}
                  <strong>irreversible</strong> — deleted channels cannot be
                  recovered.
                </p>
                <div className="alert alert-warning text-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-5 w-5"
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
                  <span>
                    Are you sure you want to proceed? This will remove all
                    message history from those channels on Discord.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Modal footer / action buttons ─────────────────────────────────── */}
          <div className="modal-action">
            {deleteResult ? (
              /* After deletion: only a "Close" button */
              <button
                id="admin-delete-channels-close-btn"
                className="btn btn-primary"
                onClick={handleCloseDeleteModal}
              >
                Close
              </button>
            ) : (
              /* Before deletion: Cancel + Confirm */
              <>
                <button
                  id="admin-delete-channels-cancel-btn"
                  className="btn btn-ghost"
                  onClick={handleCloseDeleteModal}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  id="admin-delete-channels-confirm-btn"
                  className="btn btn-error"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Deleting…
                    </>
                  ) : (
                    "Yes, Delete All"
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Clicking the backdrop closes the dialog */}
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}
