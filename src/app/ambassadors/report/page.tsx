/**
 * Phase 4 (D-01): Ambassador Monthly Self-Report page.
 * Composition order (UI-SPEC §Visual Hierarchy Notes):
 *   1. Page heading + ReportStatusBadge (inline)
 *   2. MonthlyReportForm (focal point)
 *   3. LogEventForm
 *   4. EventList
 */
import { ReportPageClient } from "./ReportPageClient";

export const dynamic = "force-dynamic";

export default function AmbassadorReportPage() {
  return (
    <main className="page-padding mx-auto max-w-4xl space-y-8 py-8">
      <ReportPageClient />
    </main>
  );
}
