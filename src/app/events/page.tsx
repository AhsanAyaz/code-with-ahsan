import { getEvents } from "@/lib/content/contentProvider";
import EventsListClient from "@/components/events/EventsListClient";

export const metadata = {
  title: "Events | CodeWithAhsan",
  description: "Explore all CodeWithAhsan community events — from hackathons to AI challenges. Connect, build, and grow with fellow developers.",
};

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div>
      <section className="bg-base-200 page-padding py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-base-content">Events</h1>
          <p className="text-lg text-base-content/70">
            Explore all CodeWithAhsan community events — from hackathons to AI challenges. Connect, build, and grow with fellow developers.
          </p>
        </div>
      </section>

      <section className="bg-base-100 page-padding py-16">
        <div className="max-w-6xl mx-auto">
          <EventsListClient events={events} />
        </div>
      </section>
    </div>
  );
}
