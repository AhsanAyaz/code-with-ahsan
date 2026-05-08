"use client";
import { useMemo, useState } from "react";
import EventCard from "./EventCard";
import type { EventContent, EventType } from "@/types/content";

const TYPE_OPTIONS: Array<EventType | "all"> = ["all", "workshop", "hackathon", "tech-talk", "webinar", "conference", "other"];

export default function EventsListClient({ events }: { events: EventContent[] }) {
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const filtered = useMemo(() => {
    const base = typeFilter === "all" ? events : events.filter((e) => e.type === typeFilter);
    const sorted = [...base].sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      return sortOrder === "newest" ? tb - ta : ta - tb;
    });
    return sorted;
  }, [events, typeFilter, sortOrder]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <select
          className="select select-bordered"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as EventType | "all")}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "all" ? "All types" : opt.charAt(0).toUpperCase() + opt.slice(1).replace("-", " ")}
            </option>
          ))}
        </select>
        <select
          className="select select-bordered"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <p className="text-sm text-base-content/60 ml-auto">
          {filtered.length} {filtered.length === 1 ? "event" : "events"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="text-base-content/60 text-center py-12">No events match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((event) => (
            <EventCard key={event.slug} event={event} />
          ))}
        </div>
      )}
    </>
  );
}
