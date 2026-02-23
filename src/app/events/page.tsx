import Link from "next/link";

interface EventItem {
  name: string;
  date: Date;
  href: string;
  description: string;
  status: "Upcoming" | "Completed";
}

const events: EventItem[] = [
  {
    name: "CWA Prompt-a-thon 2026",
    date: new Date("2026-03-28"),
    href: "/events/cwa-promptathon/2026",
    status: "Upcoming",
    description:
      "A Generative AI & Build with AI Hackathon. Collaborate, build, and showcase innovative solutions using Generative AI.",
  },
  {
    name: "HackStack Pakistan 2023",
    date: new Date("2023-10-01"),
    href: "/events/hackstack/2023",
    status: "Completed",
    description:
      "Pakistan's premier 2-week hybrid hackathon focused on Full Stack Development. Organized with GDG Kolachi.",
  },
];

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function EventsPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-base-200 page-padding py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-base-content">
            Events
          </h1>
          <p className="text-lg text-base-content/70">
            Explore all CodeWithAhsan community events — from hackathons to AI
            challenges. Connect, build, and grow with fellow developers.
          </p>
        </div>
      </section>

      {/* Events Grid Section */}
      <section className="bg-base-100 page-padding py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((event) => (
              <div
                key={event.href}
                className="card bg-base-200 border border-base-300"
              >
                <div className="card-body">
                  <div className="mb-2">
                    <span
                      className={`badge ${
                        event.status === "Upcoming"
                          ? "badge-primary"
                          : "badge-ghost"
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                  <h2 className="card-title text-base-content">{event.name}</h2>
                  <p className="text-sm text-base-content/60">
                    {formatDate(event.date)}
                  </p>
                  <p className="text-base-content/70 text-sm mt-1">
                    {event.description}
                  </p>
                  <div className="card-actions mt-4">
                    <Link
                      href={event.href}
                      className="btn btn-primary btn-sm"
                    >
                      View Event
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
