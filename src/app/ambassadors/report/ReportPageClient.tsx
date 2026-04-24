"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/apiClient";
import { MonthlyReportForm } from "./MonthlyReportForm";
import { ReportStatusBadge, type ReportCurrent } from "./ReportStatusBadge";
import LogEventForm from "./LogEventForm";
import EventList from "./EventList";

export function ReportPageClient() {
  const [current, setCurrent] = useState<ReportCurrent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/ambassador/report/current");
        if (!res.ok) return;
        const json = (await res.json()) as ReportCurrent;
        if (!cancelled) setCurrent(json);
      } catch {
        /* silent — MonthlyReportForm will render its own error */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

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
