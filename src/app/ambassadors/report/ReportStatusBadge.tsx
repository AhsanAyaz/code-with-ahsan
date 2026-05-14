"use client";

/**
 * Phase 4 (REPORT-03): Report status badge.
 * Copy strings from UI-SPEC §Copywriting — Monthly Report.
 * Color usage from UI-SPEC §Color (semantic tokens only).
 */

export type ReportCurrent =
  | { submitted: false; month: string; deadlineIso: string }
  | {
      submitted: true;
      month: string;
      deadlineIso: string;
      report: { submittedAt: string; whatWorked: string; whatBlocked: string; whatNeeded: string };
    };

export function ReportStatusBadge({ current }: { current: ReportCurrent | null }) {
  if (!current) return null;

  if (current.submitted) {
    return (
      <span
        className="badge badge-success font-bold"
        role="status"
        aria-label="Report submitted for this month"
      >
        Submitted
      </span>
    );
  }

  const deadlineMs = Date.parse(current.deadlineIso);
  const isOverdue = Number.isFinite(deadlineMs) && Date.now() > deadlineMs;

  if (isOverdue) {
    return (
      <span
        className="badge badge-warning font-bold"
        role="status"
        aria-label="Report overdue"
      >
        Overdue
      </span>
    );
  }

  return (
    <span
      className="badge badge-info font-bold"
      role="status"
      aria-label="Report on time"
    >
      On time
    </span>
  );
}
