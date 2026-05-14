"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/apiClient";

type LeaderboardEntry = {
  uid: string;
  displayName: string;
  photoURL: string;
  count: number;
  rank: number;
};

type LeaderboardData = {
  view: "cumulative" | "this_month";
  cohortId: string | null;
  graceActive: boolean;
  graceEndDate: string | null;
  month: string | null;
  top3: {
    referrals: LeaderboardEntry[];
    events: LeaderboardEntry[];
    reportsOnTime: LeaderboardEntry[];
  };
  ownRank: {
    referrals: number | null;
    events: number | null;
    reportsOnTime: number | null;
  };
  updatedAt: string | null;
};

type LeaderboardResponse = LeaderboardData | { snapshot: null };

export function LeaderboardPanel({ cohortId }: { cohortId: string | null }) {
  const [view, setView] = useState<"cumulative" | "this_month">("cumulative");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshot = useCallback(
    async (viewArg: "cumulative" | "this_month") => {
      setLoading(true);
      setError(null);
      let cancelled = false;
      try {
        const res = await authFetch(
          `/api/ambassador/dashboard/leaderboard?view=${viewArg}`
        );
        if (!res.ok) {
          if (!cancelled) {
            setError(
              "Could not load leaderboard. Check your connection and try again."
            );
          }
          return;
        }
        const json = (await res.json()) as LeaderboardResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) {
          setError(
            "Could not load leaderboard. Check your connection and try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
      return () => {
        cancelled = true;
      };
    },
    []
  );

  useEffect(() => {
    if (!cohortId) return;
    fetchSnapshot(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortId]);

  if (!cohortId) {
    return (
      <section className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Cohort Leaderboard</h2>
          <div className="alert alert-info">
            <span>
              You are not currently assigned to a cohort. The leaderboard will
              be available once your cohort is set up.
            </span>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Cohort Leaderboard</h2>
          <div role="alert" className="alert alert-error">
            <span>
              Could not load leaderboard. Check your connection and try again.
            </span>
          </div>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Cohort Leaderboard</h2>
          <div className="py-4 text-center">
            <span className="loading loading-spinner loading-md" />
          </div>
        </div>
      </section>
    );
  }

  if ("snapshot" in data && data.snapshot === null) {
    return (
      <section className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Cohort Leaderboard</h2>
          <div className="alert alert-info">
            <span>
              Leaderboard data is being computed. Check back in a few minutes.
            </span>
          </div>
        </div>
      </section>
    );
  }

  const leaderboard = data as LeaderboardData;

  if (leaderboard.graceActive) {
    const graceEndDate = leaderboard.graceEndDate;
    const weeksRemaining = graceEndDate
      ? Math.max(
          1,
          Math.ceil(
            (Date.parse(graceEndDate) - Date.now()) / (7 * 24 * 60 * 60 * 1000)
          )
        )
      : 1;

    return (
      <section className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Cohort Leaderboard</h2>
          <div role="alert" className="alert alert-info">
            <span>
              Leaderboard unlocks in {weeksRemaining} week(s). Build momentum —
              your activity is already being tracked.
            </span>
          </div>
        </div>
      </section>
    );
  }

  const { top3, ownRank, updatedAt } = leaderboard;

  const minutesAgo = updatedAt
    ? Math.max(0, Math.round((Date.now() - Date.parse(updatedAt)) / 60000))
    : 0;

  const maxRows = Math.max(
    top3.referrals.length,
    top3.events.length,
    top3.reportsOnTime.length,
    3
  );

  const rows = Array.from({ length: maxRows }, (_, i) => i);

  async function handleViewChange(newView: "cumulative" | "this_month") {
    setView(newView);
    await fetchSnapshot(newView);
  }

  return (
    <section className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="card-title">Cohort Leaderboard</h2>
          <div role="tablist" className="tabs tabs-boxed">
            <button
              role="tab"
              className={`tab ${view === "cumulative" ? "tab-active" : ""}`}
              onClick={() => handleViewChange("cumulative")}
              aria-selected={view === "cumulative"}
            >
              All time
            </button>
            <button
              role="tab"
              className={`tab ${view === "this_month" ? "tab-active" : ""}`}
              onClick={() => handleViewChange("this_month")}
              aria-selected={view === "this_month"}
            >
              This month
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Referrals</th>
                <th>Events Hosted</th>
                <th>Reports On Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 3).map((i) => (
                <tr key={i}>
                  <td>
                    {top3.referrals[i]
                      ? `#${top3.referrals[i].rank} ${top3.referrals[i].displayName} (${top3.referrals[i].count})`
                      : "—"}
                  </td>
                  <td>
                    {top3.events[i]
                      ? `#${top3.events[i].rank} ${top3.events[i].displayName} (${top3.events[i].count})`
                      : "—"}
                  </td>
                  <td>
                    {top3.reportsOnTime[i]
                      ? `#${top3.reportsOnTime[i].rank} ${top3.reportsOnTime[i].displayName} (${top3.reportsOnTime[i].count})`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {(ownRank.referrals !== null ||
                ownRank.events !== null ||
                ownRank.reportsOnTime !== null) && (
                <tr className="bg-primary/10">
                  <td
                    aria-label="Your rank in the referrals category"
                  >
                    {ownRank.referrals !== null
                      ? `Your rank: #${ownRank.referrals}`
                      : "—"}
                  </td>
                  <td
                    aria-label="Your rank in the events category"
                  >
                    {ownRank.events !== null
                      ? `Your rank: #${ownRank.events}`
                      : "—"}
                  </td>
                  <td
                    aria-label="Your rank in the reportsOnTime category"
                  >
                    {ownRank.reportsOnTime !== null
                      ? `Your rank: #${ownRank.reportsOnTime}`
                      : "—"}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p aria-live="polite" className="text-sm text-base-content/60">
            Updated {minutesAgo} minutes ago
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => fetchSnapshot(view)}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
    </section>
  );
}
