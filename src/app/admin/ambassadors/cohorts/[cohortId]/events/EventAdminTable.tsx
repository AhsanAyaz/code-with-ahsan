"use client";
/**
 * Phase 4 (EVENT-03, EVENT-04): Admin table showing all events for a cohort,
 * with a hide/unhide toggle per row. Uses adminHeaders() for token auth.
 */
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/ambassador/eventTypes";

const ADMIN_TOKEN_KEY = "cwa_admin_token";

type AdminEventItem = {
  id: string;
  ambassadorId: string;
  date: string;
  type: EventType;
  attendanceEstimate: number;
  link?: string;
  notes?: string;
  hidden: boolean;
};

function adminHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  return { "Content-Type": "application/json", "x-admin-token": token ?? "" };
}

type Props = { cohortId: string };

export default function EventAdminTable({ cohortId }: Props) {
  const toast = useToast();
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ambassador/events/admin?cohortId=${encodeURIComponent(cohortId)}`, {
        headers: adminHeaders(),
      });
      if (!res.ok) {
        toast.error("Could not load events");
        return;
      }
      const data = (await res.json()) as { events: AdminEventItem[] };
      setEvents(data.events ?? []);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [cohortId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleHidden(eventId: string, nextHidden: boolean) {
    const res = await fetch("/api/ambassador/events/admin", {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ eventId, hidden: nextHidden }),
    });
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(error ?? "Could not update");
      return;
    }
    toast.success(nextHidden ? "Event hidden" : "Event unflagged");
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="alert alert-info">
        <span>No events logged in this cohort yet.</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>Ambassador</th>
            <th>Date</th>
            <th>Type</th>
            <th>Attendees</th>
            <th>Link</th>
            <th>Hidden</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td className="font-mono text-xs">{e.ambassadorId}</td>
              <td>{new Date(e.date).toLocaleDateString()}</td>
              <td>{EVENT_TYPE_LABELS[e.type] ?? e.type}</td>
              <td>{e.attendanceEstimate}</td>
              <td>
                {e.link ? (
                  <a href={e.link} target="_blank" rel="noreferrer" className="link">
                    link
                  </a>
                ) : (
                  <span className="opacity-50">—</span>
                )}
              </td>
              <td>
                <input
                  type="checkbox"
                  className="toggle toggle-error"
                  checked={e.hidden}
                  onChange={() => toggleHidden(e.id, !e.hidden)}
                  aria-label={e.hidden ? "Unhide event" : "Hide event"}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
