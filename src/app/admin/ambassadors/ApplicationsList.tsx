"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import type { ApplicationDoc, ApplicationStatus } from "@/types/ambassador";

type ApplicationRow = ApplicationDoc & { applicationId: string };
type CohortRow = { cohortId: string; name: string };

const STATUS_OPTIONS: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "accepted",
  "declined",
];

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  submitted: "badge badge-info",
  under_review: "badge badge-warning",
  accepted: "badge badge-success",
  declined: "badge badge-error",
};

const PAGE_SIZE = 20;

function fmtDate(ts: unknown): string {
  if (!ts) return "";
  if (
    typeof ts === "object" &&
    ts !== null &&
    "_seconds" in (ts as Record<string, unknown>)
  ) {
    return new Date(
      (ts as { _seconds: number })._seconds * 1000
    ).toLocaleDateString();
  }
  if (typeof ts === "string") return new Date(ts).toLocaleDateString();
  return "";
}

export default function ApplicationsList() {
  const router = useRouter();
  const params = useSearchParams();

  const statusFilter = params.get("status") as ApplicationStatus | null;
  const cohortFilter = params.get("cohort");

  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [rows, setRows] = useState<ApplicationRow[] | null>(null);
  // Stack of previous cursors for "back" — Firestore cursor pagination is forward-only.
  const [pages, setPages] = useState<string[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load cohort list once for the filter dropdown (scope=all shows closed cohorts too).
  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(ADMIN_TOKEN_KEY)
        : null;
    fetch("/api/ambassador/cohorts?scope=all", {
      headers: token ? { "x-admin-token": token } : {},
    })
      .then((r) => r.json())
      .then((b) =>
        setCohorts(
          (b.items ?? []).map((c: CohortRow) => ({
            cohortId: c.cohortId,
            name: c.name,
          }))
        )
      )
      .catch(() => setCohorts([]));
  }, []);

  const loadPage = useCallback(
    async (c: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem(ADMIN_TOKEN_KEY)
            : null;
        const url = new URL(
          "/api/ambassador/applications",
          window.location.origin
        );
        if (statusFilter) url.searchParams.set("status", statusFilter);
        if (cohortFilter) url.searchParams.set("cohortId", cohortFilter);
        if (c) url.searchParams.set("cursor", c);
        url.searchParams.set("pageSize", String(PAGE_SIZE));
        const res = await fetch(url.toString(), {
          headers: token ? { "x-admin-token": token } : {},
        });
        if (!res.ok) {
          setError(`Failed to load (HTTP ${res.status})`);
          return;
        }
        const body = await res.json();
        setRows(body.items ?? []);
        setNextCursor(body.nextCursor ?? null);
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, cohortFilter]
  );

  // Reload whenever filters change; reset pagination on filter change.
  useEffect(() => {
    setPages([]);
    setCursor(null);
    loadPage(null);
  }, [loadPage]);

  const setFilter = (k: "status" | "cohort", v: string | null) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    if (v) next.set(k, v);
    else next.delete(k);
    router.push(`/admin/ambassadors?${next.toString()}`);
  };

  const onNext = () => {
    if (!nextCursor) return;
    setPages((p) => [...p, cursor ?? ""]);
    setCursor(nextCursor);
    loadPage(nextCursor);
  };

  const onPrev = () => {
    if (pages.length === 0) return;
    const prev = pages[pages.length - 1];
    setPages((p) => p.slice(0, -1));
    setCursor(prev || null);
    loadPage(prev || null);
  };

  return (
    <section>
      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select
          className="select select-bordered select-sm"
          value={statusFilter ?? ""}
          onChange={(e) => setFilter("status", e.target.value || null)}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="select select-bordered select-sm"
          value={cohortFilter ?? ""}
          onChange={(e) => setFilter("cohort", e.target.value || null)}
        >
          <option value="">All cohorts</option>
          {cohorts.map((c) => (
            <option key={c.cohortId} value={c.cohortId}>
              {c.name}
            </option>
          ))}
        </select>
        {(statusFilter || cohortFilter) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => router.push("/admin/ambassadors")}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="loading loading-spinner" />}
      {!loading && rows && rows.length === 0 && (
        <div className="card bg-base-200 p-6 text-center">
          <p className="opacity-70">No applications match these filters.</p>
        </div>
      )}
      {!loading && rows && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Name</th>
                <th>University</th>
                <th>Target Cohort</th>
                <th>Status</th>
                <th>Submitted</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.applicationId}>
                  <td>{r.applicantName}</td>
                  <td>{r.university}</td>
                  <td>
                    {cohorts.find((c) => c.cohortId === r.targetCohortId)
                      ?.name ?? r.targetCohortId}
                  </td>
                  <td>
                    <span className={STATUS_BADGE[r.status]}>{r.status}</span>
                  </td>
                  <td>{fmtDate(r.submittedAt)}</td>
                  <td>
                    <Link
                      href={`/admin/ambassadors/${r.applicationId}`}
                      className="link link-primary"
                    >
                      Review &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between mt-4">
        <button
          className="btn btn-sm btn-ghost"
          disabled={pages.length === 0 || loading}
          onClick={onPrev}
        >
          &larr; Previous
        </button>
        <button
          className="btn btn-sm"
          disabled={!nextCursor || loading}
          onClick={onNext}
        >
          Next &rarr;
        </button>
      </div>
    </section>
  );
}
