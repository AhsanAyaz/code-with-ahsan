import { notFound, redirect } from "next/navigation";
import { getEventBySlug, getEvents } from "@/lib/content/contentProvider";
import LegitMarkdown from "@/components/LegitMarkdown";
import { getEventDisplayStatus, getStatusDisplay } from "@/components/events/eventUtils";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.codewithahsan.dev";

interface PageProps {
  params: Promise<{ "event-slug": string }>;
}

export async function generateStaticParams() {
  const events = await getEvents();
  return events
    .filter((e) => !!e?.slug)
    .map((e) => ({ "event-slug": e.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { "event-slug": slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) {
    return {
      title: "Event Not Found",
      alternates: {
        canonical: `${BASE_URL}/events`,
      },
    };
  }
  return {
    title: `${event.title} | CodeWithAhsan`,
    description: event.description,
    alternates: {
      canonical: `${BASE_URL}/events/${slug}`,
    },
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

  const { label: statusLabel, badgeClass: statusBadge } = getStatusDisplay(getEventDisplayStatus(event));

  return (
    <div>
      <section className="bg-base-200 page-padding py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="badge badge-secondary capitalize">{event.type.replace("-", " ")}</span>
            <span className={`badge ${statusBadge}`}>{statusLabel}</span>
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
