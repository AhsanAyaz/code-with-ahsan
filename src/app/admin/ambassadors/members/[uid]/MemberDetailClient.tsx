"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/apiClient";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import { ActivitySummaryPanel } from "./ActivitySummaryPanel";
import { CronFlagsPanel } from "./CronFlagsPanel";
import { StrikePanel } from "./StrikePanel";

type MemberDetail = {
  profile: { displayName?: string; email?: string };
  subdoc: {
    cohortId?: string;
    strikes?: number;
    referralCode?: string;
    timezone?: string;
    active?: boolean;
  };
  recentEvents: Array<{
    id: string;
    date: string;
    type: string;
    attendanceEstimate: number;
    hidden: boolean;
  }>;
  recentReports: Array<{
    id: string;
    month: string;
    submittedAt: string;
  }>;
  unresolvedFlags: Array<{
    id: string;
    type: "missing_report" | "missing_discord_role";
    period?: string;
    flaggedAt: string;
  }>;
  referralsCount: number;
};

function adminHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  return { "x-admin-token": token ?? "" };
}

export function MemberDetailClient({ uid }: { uid: string }) {
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authFetch(`/api/ambassador/members/${uid}`, {
        headers: adminHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as MemberDetail;
      setDetail(json);
    } catch {
      setError("Could not load member detail. Check your connection and try again.");
    }
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div role="alert" className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="py-12 text-center">
        <span className="loading loading-spinner loading-md" aria-label="Loading member detail" />
      </div>
    );
  }

  const displayName = detail.profile.displayName ?? uid;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">{displayName}</h1>
        {detail.subdoc.cohortId && (
          <p className="text-base-content/70">Cohort: {detail.subdoc.cohortId}</p>
        )}
      </header>

      <ActivitySummaryPanel
        eventsCount={detail.recentEvents.filter((e) => !e.hidden).length}
        referralsCount={detail.referralsCount}
        reportsCount={detail.recentReports.length}
        strikes={detail.subdoc.strikes ?? 0}
      />

      <CronFlagsPanel flags={detail.unresolvedFlags} />

      <StrikePanel
        uid={uid}
        displayName={displayName}
        strikes={detail.subdoc.strikes ?? 0}
        onStrikeIncremented={load}
      />

      <section className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Report History</h2>
          {detail.recentReports.length === 0 ? (
            <div className="alert alert-info">
              <span>
                No reports submitted yet. Reports appear here once an ambassador submits their monthly self-report.
              </span>
            </div>
          ) : (
            <ul className="list-disc pl-5">
              {detail.recentReports.map((r) => (
                <li key={r.id}>
                  {r.month} — submitted {new Date(r.submittedAt).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Logged Events</h2>
          {detail.recentEvents.length === 0 ? (
            <div className="alert alert-info">
              <span>
                No events logged. Events appear here once an ambassador logs an activity from their report page.
              </span>
            </div>
          ) : (
            <ul className="list-disc pl-5">
              {detail.recentEvents.map((e) => (
                <li key={e.id}>
                  {new Date(e.date).toLocaleDateString()} — {e.type} ({e.attendanceEstimate} attendees)
                  {e.hidden && <span className="badge badge-error ml-2">Hidden</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
