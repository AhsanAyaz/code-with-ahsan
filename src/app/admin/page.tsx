"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { AdminStats, Alert } from "@/types/admin";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";

export default function AdminOverviewPage() {
  const toast = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

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
    </div>
  );
}
