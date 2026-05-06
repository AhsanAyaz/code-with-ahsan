/**
 * Phase 5 (DASH-01): Ambassador Dashboard page.
 */
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default function AmbassadorDashboardPage() {
  return (
    <main className="page-padding mx-auto max-w-4xl space-y-8 py-8">
      <DashboardClient />
    </main>
  );
}
