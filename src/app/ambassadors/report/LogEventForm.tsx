"use client";
/**
 * Phase 4 (EVENT-01): LogEventForm — submit a new ambassador event.
 *
 * Copy strings come from 04-UI-SPEC.md §Event Logger (verbatim).
 * Posts to /api/ambassador/events via authFetch.
 */
import { useState } from "react";
import { authFetch } from "@/lib/apiClient";
import { useToast } from "@/contexts/ToastContext";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/ambassador/eventTypes";

const DEFAULT_TYPE: EventType = "workshop";

type Props = {
  onCreated?: () => void;
};

export default function LogEventForm({ onCreated }: Props) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState("");
  const [type, setType] = useState<EventType>(DEFAULT_TYPE);
  const [attendanceEstimate, setAttendanceEstimate] = useState<number>(0);
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!date) {
      toast.error("Event date is required");
      return;
    }
    setSaving(true);
    try {
      const isoDate = new Date(date).toISOString();
      const body: Record<string, unknown> = {
        date: isoDate,
        type,
        attendanceEstimate,
      };
      if (link.trim()) body.link = link.trim();
      if (notes.trim()) body.notes = notes.trim();
      const res = await authFetch("/api/ambassador/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(error ?? "Could not save your event. Check your connection and try again.");
        return;
      }
      toast.success("Event saved");
      // Reset form
      setDate("");
      setType(DEFAULT_TYPE);
      setAttendanceEstimate(0);
      setLink("");
      setNotes("");
      onCreated?.();
    } catch {
      toast.error("Could not save your event. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl">
      <div className="card-body gap-4">
        <h2 className="card-title">Log an event</h2>

        <div className="form-control">
          <label className="label" htmlFor="event-date">
            <span className="label-text font-bold">Event date</span>
          </label>
          <input
            id="event-date"
            type="date"
            className="input input-bordered"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="form-control">
          <label className="label" htmlFor="event-type">
            <span className="label-text font-bold">Event type</span>
          </label>
          <select
            id="event-type"
            className="select select-bordered"
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
          >
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-control">
          <label className="label" htmlFor="event-attendance">
            <span className="label-text font-bold">Estimated attendance</span>
          </label>
          <input
            id="event-attendance"
            type="number"
            className="input input-bordered"
            min={0}
            max={100000}
            value={attendanceEstimate}
            onChange={(e) => setAttendanceEstimate(parseInt(e.target.value, 10) || 0)}
          />
        </div>

        <div className="form-control">
          <label className="label" htmlFor="event-link">
            <span className="label-text font-bold">Event link (optional)</span>
          </label>
          <input
            id="event-link"
            type="url"
            className="input input-bordered"
            placeholder="https://..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </div>

        <div className="form-control">
          <label className="label" htmlFor="event-notes">
            <span className="label-text font-bold">Notes (optional)</span>
          </label>
          <textarea
            id="event-notes"
            className="textarea textarea-bordered"
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="card-actions justify-end">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="loading loading-spinner loading-sm" /> : "Save event"}
          </button>
        </div>
      </div>
    </form>
  );
}
