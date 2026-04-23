"use client";
/**
 * Phase 4 (EVENT-01, EVENT-02, EVENT-04): EventList — renders the ambassador's
 * own non-hidden events with edit/delete affordances inside the 30-day window.
 * Copy strings from 04-UI-SPEC.md §Event Logger.
 */
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/apiClient";
import { useToast } from "@/contexts/ToastContext";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/ambassador/eventTypes";
import { EVENT_EDIT_WINDOW_MS } from "@/lib/ambassador/constants";

type EventItem = {
  id: string;
  date: string;
  type: EventType;
  attendanceEstimate: number;
  link?: string;
  notes?: string;
};

type Props = {
  refreshKey?: number;
};

export default function EventList({ refreshKey = 0 }: Props) {
  const toast = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/ambassador/events");
      if (!res.ok) {
        toast.error("Could not load events");
        return;
      }
      const data = (await res.json()) as { events: EventItem[] };
      setEvents(data.events ?? []);
    } catch {
      toast.error("Network error — try again");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  function canEdit(dateStr: string): boolean {
    return Date.now() - new Date(dateStr).getTime() <= EVENT_EDIT_WINDOW_MS;
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this event? This action cannot be undone.")) return;
    const res = await authFetch(`/api/ambassador/events/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(error ?? "Could not delete");
      return;
    }
    toast.success("Event deleted");
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
        <div>
          <h3 className="font-bold">No events logged yet</h3>
          <p className="text-sm">
            Log your first event to start building your activity record. Events you host help the
            cohort see your impact.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Your Events</h2>
        <ul className="divide-y">
          {events.map((e) => {
            const editable = canEdit(e.date);
            return (
              <li key={e.id} className="py-4 flex justify-between gap-4">
                <div>
                  <div className="font-bold">
                    {EVENT_TYPE_LABELS[e.type] ?? e.type} —{" "}
                    {new Date(e.date).toLocaleDateString()}
                  </div>
                  <div className="text-sm opacity-80">
                    {e.attendanceEstimate} attendees
                    {e.link ? (
                      <>
                        {" · "}
                        <a href={e.link} target="_blank" rel="noreferrer" className="link">
                          Link
                        </a>
                      </>
                    ) : null}
                  </div>
                  {e.notes ? <div className="text-sm mt-1">{e.notes}</div> : null}
                  {!editable ? (
                    <div className="text-xs opacity-60 mt-1">
                      This event can no longer be edited — the 30-day edit window has closed.
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  {editable ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleDelete(e.id)}
                    >
                      Delete event
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
