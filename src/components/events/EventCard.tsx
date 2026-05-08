import Link from "next/link";
import type { EventContent } from "@/types/content";

interface EventCardProps {
  event: EventContent;
}

const TYPE_BADGE_CLASS: Record<string, string> = {
  workshop: "badge-info",
  hackathon: "badge-secondary",
  "tech-talk": "badge-accent",
  webinar: "badge-warning",
  conference: "badge-success",
  other: "badge-neutral",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function EventCard({ event }: EventCardProps) {
  const typeBadge = TYPE_BADGE_CLASS[event.type] ?? "badge-neutral";
  const statusBadge = event.status === "upcoming" ? "badge-primary" : event.status === "cancelled" ? "badge-error" : "badge-ghost";
  const detailHref = `/events/${event.slug}`;

  return (
    <article className="card bg-base-200 border border-base-300 h-full">
      <div className="card-body">
        <div className="flex flex-wrap gap-2 mb-2">
          <span className={`badge ${typeBadge} capitalize`}>{event.type.replace("-", " ")}</span>
          <span className={`badge ${statusBadge} capitalize`}>{event.status}</span>
        </div>
        <h2 className="card-title text-base-content">{event.title}</h2>
        <p className="text-sm text-base-content/60">
          {formatDate(event.date)}
          {event.endDate ? ` — ${formatDate(event.endDate)}` : ""}
        </p>
        {event.location ? (
          <p className="text-sm text-base-content/60">📍 {event.location}</p>
        ) : null}
        {event.speaker ? (
          <p className="text-sm text-base-content/60">🎤 {event.speaker}</p>
        ) : null}
        <p className="text-base-content/70 text-sm mt-1">{event.description}</p>
        <div className="card-actions mt-4">
          <Link href={detailHref} className="btn btn-primary btn-sm">
            View Event
          </Link>
        </div>
      </div>
    </article>
  );
}
