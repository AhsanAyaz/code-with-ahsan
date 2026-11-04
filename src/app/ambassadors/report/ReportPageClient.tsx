"use client";

import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/apiClient";
import { MonthlyReportForm } from "./MonthlyReportForm";
import { ReportStatusBadge, type ReportCurrent } from "./ReportStatusBadge";
import LogEventForm from "./LogEventForm";
import EventList from "./EventList";
import { useToast } from "@/contexts/ToastContext";

export function ReportPageClient() {
  const [current, setCurrent] = useState<ReportCurrent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    (async () => {
      try {
        const res = await authFetch("/api/ambassador/report/current");
        if (!res.ok) {
          if (res.status === 403) {
            if (!cancelled.current) {
              setError("You don't have permission to access the ambassador report page.");
              toast.error("Ambassador role required to view this page.");
            }
          } else if (res.status === 401) {
            if (!cancelled.current) setError("Please log in to view your report.");
          } else {
            if (!cancelled.current) setError("Failed to load report status. Please try again.");
          }
          return;
        }
        const json = (await res.json()) as ReportCurrent;
        if (!cancelled.current) setCurrent(json);
      } catch {
        if (!cancelled.current)
          setError("Network error. Please check your connection and try again.");
      } finally {
        if (!cancelled.current) setLoading(false);
      }
    })();
    return () => {
      cancelled.current = true;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <section className="py-12 text-center">
        <span className="loading loading-spinner loading-md" aria-label="Loading report status" />
      </section>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" role="alert">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Monthly Self-Report</h1>
        <ReportStatusBadge current={current} />
      </header>

      <MonthlyReportForm current={current} onCurrentChange={setCurrent} />

      <section className="space-y-4">
        <LogEventForm onCreated={() => setRefreshKey((k) => k + 1)} />
        <EventList refreshKey={refreshKey} />
      </section>
    </>
  );
}
