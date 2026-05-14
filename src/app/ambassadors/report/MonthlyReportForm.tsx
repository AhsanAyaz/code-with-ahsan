"use client";

/**
 * Phase 4 (REPORT-01): MonthlyReportForm — 3-field self-report + server-driven already-submitted state.
 *
 * UI copy strings are sourced verbatim from .planning/phases/04-activity-subsystem/04-UI-SPEC.md
 * §Copywriting — Monthly Report. DO NOT edit copy without updating the UI-SPEC.
 *
 * Visual hierarchy (UI-SPEC §Visual Hierarchy Notes):
 *   - Focal point on /ambassadors/report
 *   - Status badge renders alongside page heading (separate component, Task 5)
 *   - EventList is subordinate — renders below
 */
import { useState } from "react";
import { authFetch } from "@/lib/apiClient";
import { useToast } from "@/contexts/ToastContext";
import { type ReportCurrent } from "./ReportStatusBadge";

// WR-01: CurrentResponse is the same shape as ReportCurrent — use the shared type
// from ReportStatusBadge to avoid duplication (see also IN-02).
type CurrentResponse = ReportCurrent;

const MAX_CHARS = 2000;

function formatMonthHuman(monthKey: string): string {
  // "2026-04" -> "April 2026"
  const [yearStr, monthStr] = monthKey.split("-");
  const y = Number(yearStr);
  const m = Number(monthStr);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return monthKey;
  const date = new Date(Date.UTC(y, m - 1, 1));
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

type Props = {
  /** WR-01: current report state lifted to ReportPageClient — avoids double-fetching. */
  current: CurrentResponse | null;
  /** WR-01: callback so this form can update the shared state after submission. */
  onCurrentChange: (next: CurrentResponse) => void;
};

export function MonthlyReportForm({ current, onCurrentChange }: Props) {
  const toast = useToast();
  const [whatWorked, setWhatWorked] = useState("");
  const [whatBlocked, setWhatBlocked] = useState("");
  const [whatNeeded, setWhatNeeded] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WR-01: fetch is lifted to ReportPageClient — no useEffect here.
  // current is null while the parent is loading; render a spinner in that case.

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await authFetch("/api/ambassador/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatWorked: whatWorked.trim(),
          whatBlocked: whatBlocked.trim(),
          whatNeeded: whatNeeded.trim(),
        }),
      });
      if (res.status === 201) {
        toast.success("Report submitted — thank you for showing up this month.");
        // WR-02: re-fetch from server to hydrate state with the server's stored
        // representation (correct submittedAt timestamp, deadline, etc.) rather
        // than constructing an optimistic object from client-side values.
        const refreshRes = await authFetch("/api/ambassador/report/current");
        if (refreshRes.ok) {
          const refreshed = (await refreshRes.json()) as CurrentResponse;
          onCurrentChange(refreshed);
        }
        return;
      }
      if (res.status === 409) {
        toast.error("You've already submitted your report for this month.");
        return;
      }
      setError("Could not submit your report. Check your connection and try again.");
    } catch {
      setError("Could not submit your report. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Show spinner while parent is still loading the current report status.
  if (current === null) {
    return (
      <section className="py-12 text-center">
        <span className="loading loading-spinner loading-md" aria-label="Loading report status" />
      </section>
    );
  }

  return (
    <section className="card bg-base-100 shadow-xl">
      <div className="card-body gap-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Monthly Self-Report</h1>
          <p className="text-base-content/70">
            Share what you worked on this month — it takes 3–5 minutes.
          </p>
        </header>

        {current?.submitted ? (
          <div className="alert alert-success">
            <span>
              You&apos;ve submitted your report for {formatMonthHuman(current.month)}. Thank you!
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div role="alert" className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <div className="form-control">
              <label htmlFor="whatWorked" className="label">
                <span className="label-text font-bold">What worked this month?</span>
                <span className="label-text-alt">
                  {whatWorked.length}/{MAX_CHARS}
                </span>
              </label>
              <textarea
                id="whatWorked"
                className="textarea textarea-bordered min-h-[96px]"
                maxLength={MAX_CHARS}
                placeholder="Share wins, events you hosted, referrals you made, or community moments that felt good."
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
                required
              />
            </div>

            <div className="form-control">
              <label htmlFor="whatBlocked" className="label">
                <span className="label-text font-bold">What blocked you?</span>
                <span className="label-text-alt">
                  {whatBlocked.length}/{MAX_CHARS}
                </span>
              </label>
              <textarea
                id="whatBlocked"
                className="textarea textarea-bordered min-h-[96px]"
                maxLength={MAX_CHARS}
                placeholder="Anything that made it harder to show up — life, time, resources. We want to know."
                value={whatBlocked}
                onChange={(e) => setWhatBlocked(e.target.value)}
                required
              />
            </div>

            <div className="form-control">
              <label htmlFor="whatNeeded" className="label">
                <span className="label-text font-bold">What do you need from us?</span>
                <span className="label-text-alt">
                  {whatNeeded.length}/{MAX_CHARS}
                </span>
              </label>
              <textarea
                id="whatNeeded"
                className="textarea textarea-bordered min-h-[96px]"
                maxLength={MAX_CHARS}
                placeholder="Support, resources, introductions, visibility — just ask."
                value={whatNeeded}
                onChange={(e) => setWhatNeeded(e.target.value)}
                required
              />
            </div>

            <div className="card-actions justify-end">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || whatWorked.trim().length === 0 || whatBlocked.trim().length === 0 || whatNeeded.trim().length === 0}
              >
                {submitting && <span className="loading loading-spinner loading-sm" />}
                Submit report
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
