import { notFound, redirect } from "next/navigation";
import { getEventBySlug } from "@/lib/content/contentProvider";
import LegitMarkdown from "@/components/LegitMarkdown";

interface PageProps {
  params: Promise<{ "event-slug": string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { "event-slug": slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Event Not Found" };
  return {
    title: `${event.title} | CodeWithAhsan`,
    description: event.description,
    openGraph: {
      title: event.title,
      description: event.description,
      images: event.bannerImage ? [event.bannerImage] : [],
    },
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { "event-slug": slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) notFound();

  // If a dedicated route is configured, hand off to it.
  if (event.dedicatedRoute) {
    redirect(event.dedicatedRoute);
  }

  return (
    <div>
      <section className="bg-base-200 page-padding py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="badge badge-secondary capitalize">{event.type.replace("-", " ")}</span>
            <span className={`badge capitalize ${event.status === "upcoming" ? "badge-primary" : event.status === "cancelled" ? "badge-error" : "badge-ghost"}`}>
              {event.status}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 text-base-content">{event.title}</h1>
          <p className="text-base-content/70 mb-2">{event.description}</p>
          <p className="text-sm text-base-content/60">
            {new Date(event.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            {event.endDate ? ` — ${new Date(event.endDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}` : ""}
          </p>
          {event.location ? <p className="text-sm text-base-content/60">📍 {event.location}</p> : null}
          {event.speaker ? <p className="text-sm text-base-content/60">🎤 {event.speaker}</p> : null}
        </div>
      </section>

      <section className="bg-base-100 page-padding py-12">
        <div className="max-w-3xl mx-auto prose prose-base">
          <LegitMarkdown>{event.body}</LegitMarkdown>
        </div>
      </section>
    </div>
  );
}
