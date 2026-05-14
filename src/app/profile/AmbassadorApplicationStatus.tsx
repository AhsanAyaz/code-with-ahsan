"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useMentorship } from "@/contexts/MentorshipContext";
import { authFetch } from "@/lib/apiClient";
import type { ApplicationStatus } from "@/types/ambassador";

/**
 * APPLY-07: Surface ambassador application status on the profile page.
 *
 * Fetches GET /api/ambassador/applications/me on mount.
 * Returns null while loading (to avoid layout shift).
 * Shows "Apply now" CTA if no applications; otherwise shows status badge(s).
 */

type MeApplication = {
  applicationId: string;
  status: ApplicationStatus;
  targetCohortId: string;
  submittedAt?: { _seconds: number } | string;
  decidedAt?: { _seconds: number } | string;
  discordRoleAssigned?: boolean;
  discordRetryNeeded?: boolean;
};

const BADGE_CLASS: Record<ApplicationStatus, string> = {
  submitted: "badge badge-info",
  under_review: "badge badge-warning",
  accepted: "badge badge-success",
  declined: "badge badge-error",
};

const BADGE_LABEL: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  accepted: "Accepted",
  declined: "Declined",
};

function formatTs(ts: MeApplication["submittedAt"]): string {
  if (!ts) return "";
  if (typeof ts === "string") return new Date(ts).toLocaleDateString();
  if (typeof ts === "object" && "_seconds" in ts)
    return new Date(ts._seconds * 1000).toLocaleDateString();
  return "";
}

export default function AmbassadorApplicationStatus() {
  const { user } = useMentorship();
  const [items, setItems] = useState<MeApplication[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const res = await authFetch("/api/ambassador/applications/me");
        if (!res.ok) {
          setItems([]);
          return;
        }
        const body = await res.json();
        // NOTE: /api/ambassador/applications/me returns `{ items: [...] }`.
        setItems((body.items as MeApplication[]) ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [user]);

  // Return null while loading — avoids layout shift on profile page
  if (loading) return null;

  if (!items || items.length === 0) {
    return (
      <section className="card bg-base-200 mb-4">
        <div className="card-body p-4">
          <h3 className="font-semibold">Ambassador Program</h3>
          <p className="text-sm">
            Applications are open.{" "}
            <Link href="/ambassadors/apply" className="link link-primary">
              Apply now
            </Link>
            .
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="card bg-base-200 mb-4">
      <div className="card-body p-4">
        <h3 className="font-semibold">Ambassador Application Status</h3>
        <ul className="space-y-2 mt-2">
          {items.map((a) => (
            <li key={a.applicationId} className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={BADGE_CLASS[a.status]}>
                  {BADGE_LABEL[a.status]}
                </span>
                <span className="text-sm opacity-70">
                  Submitted {formatTs(a.submittedAt)}
                </span>
                {a.status === "accepted" && a.discordRetryNeeded && (
                  <span className="badge badge-warning badge-sm">
                    Discord pending — admin will retry
                  </span>
                )}
              </div>
              {a.decidedAt && (
                <span className="text-xs opacity-60">
                  Decided {formatTs(a.decidedAt)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
