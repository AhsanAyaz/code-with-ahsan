"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/apiClient";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import { useToast } from "@/contexts/ToastContext";
import { ActivitySummaryPanel } from "./ActivitySummaryPanel";
import { CronFlagsPanel } from "./CronFlagsPanel";
import { StrikePanel } from "./StrikePanel";
import { OffboardConfirmModal } from "./OffboardConfirmModal";
import { AlumniTransitionButton } from "./AlumniTransitionButton";

type MemberDetail = {
  profile: { displayName?: string; email?: string };
  subdoc: {
    cohortId?: string;
    cohortEndDate?: string | null;
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
  const toast = useToast();
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offboardOpen, setOffboardOpen] = useState(false);
  const [discordRetryNeeded, setDiscordRetryNeeded] = useState<{
    displayName: string;
  } | null>(null);
  const [retryingDiscord, setRetryingDiscord] = useState(false);

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

  const retryDiscord = useCallback(async () => {
    setRetryingDiscord(true);
    try {
      const res = await fetch(`/api/ambassador/members/${uid}/offboard`, {
        method: "POST",
        headers: adminHeaders(),
      });

      if (res.status === 409) {
        // Already inactive — treat as retry success (Discord may have been removed)
        toast.success("Discord role retried.");
        setDiscordRetryNeeded(null);
        return;
      }

      if (!res.ok) {
        toast.error("Discord role removal failed again. Try again later.");
        return;
      }

      const data = (await res.json()) as {
        success: boolean;
        discordRemoved: boolean;
        emailSent: boolean;
      };

      if (data.discordRemoved) {
        toast.success("Discord role removed.");
        setDiscordRetryNeeded(null);
      } else {
        toast.error("Discord role removal failed again. Try again later.");
      }
    } catch {
      toast.error("Discord role removal failed again. Try again later.");
    } finally {
      setRetryingDiscord(false);
    }
  }, [uid, toast]);

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
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          {detail.subdoc.cohortId && (
            <p className="text-base-content/70">Cohort: {detail.subdoc.cohortId}</p>
          )}
        </div>
        <button
          type="button"
          className="btn btn-outline btn-error btn-sm"
          onClick={() => setOffboardOpen(true)}
          disabled={!(detail.subdoc.active ?? true)}
        >
          Offboard ambassador
        </button>
      </header>

      {discordRetryNeeded && (
        <div role="alert" className="alert alert-error">
          <div>
            <h3 className="font-bold">Discord role removal failed</h3>
            <span>{"Discord role removal failed — retry below. The Firestore record has already been updated."}</span>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm btn-error"
            onClick={retryDiscord}
            disabled={retryingDiscord}
          >
            {retryingDiscord ? "Retrying…" : "Retry Discord removal"}
          </button>
        </div>
      )}

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

      <div className="divider" />

      <AlumniTransitionButton
        uid={uid}
        displayName={displayName}
        cohortEndDate={detail.subdoc.cohortEndDate ?? null}
        subdocActive={detail.subdoc.active ?? false}
        onCompleted={load}
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

      <OffboardConfirmModal
        uid={uid}
        displayName={displayName}
        isOpen={offboardOpen}
        onClose={() => setOffboardOpen(false)}
        onCompleted={(result) => {
          if (!result.discordRemoved) {
            setDiscordRetryNeeded({ displayName });
          }
          load();
        }}
      />
    </div>
  );
}
