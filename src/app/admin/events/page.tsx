import Link from "next/link";
import { Trophy, Users, Calendar } from "lucide-react";

const EVENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  hackathon: <Trophy className="w-4 h-4" />,
  meetup: <Users className="w-4 h-4" />,
};

const EVENT_TYPE_BADGE: Record<string, string> = {
  hackathon: "badge-warning",
  meetup: "badge-info",
};

const ADMIN_EVENTS = [
  {
    id: "cwa-promptathon-2026",
    name: "CWA Prompt-A-Thon 2026",
    type: "hackathon",
    date: "28 March 2026",
    href: "/admin/events/cwa-promptathon-2026",
  },
];

export default function AdminEventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="text-base-content/60 mt-1">
          Manage event details, winners, and announcements.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_EVENTS.map((event) => (
          <Link
            key={event.id}
            href={event.href}
            className="card bg-base-200 hover:bg-base-300 transition-colors shadow-sm"
          >
            <div className="card-body gap-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="card-title text-base leading-snug">{event.name}</h2>
                <span className={`badge ${EVENT_TYPE_BADGE[event.type] ?? "badge-ghost"} gap-1 shrink-0`}>
                  {EVENT_TYPE_ICONS[event.type]}
                  {event.type}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-base-content/60">
                <Calendar className="w-3.5 h-3.5" />
                {event.date}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
