/**
 * Phase 4 (EVENT-03): Admin view of cohort events.
 * Server shell — delegates rendering to the client component EventAdminTable.
 */
import EventAdminTable from "./EventAdminTable";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ cohortId: string }> };

export default async function AdminCohortEventsPage({ params }: RouteParams) {
  const { cohortId } = await params;
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <nav className="text-sm mb-4">
        <a href="/admin/ambassadors/cohorts" className="link">
          &larr; All cohorts
        </a>
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Cohort Events</h1>
        <p className="text-sm opacity-80">All events logged by ambassadors in this cohort.</p>
      </header>
      <EventAdminTable cohortId={cohortId} />
    </div>
  );
}
