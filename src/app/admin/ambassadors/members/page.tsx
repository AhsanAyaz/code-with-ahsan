/**
 * Phase 4 (D-05): Admin members list page.
 * Server shell — delegates to MembersList client component.
 */
import { MembersList } from "./MembersList";

export const dynamic = "force-dynamic";

export default function AdminMembersPage() {
  return (
    <main className="page-padding mx-auto max-w-6xl space-y-6 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Ambassador Members</h1>
        <p className="text-base-content/70">
          Active ambassadors in the program. Click a member to see their activity and manage strikes.
        </p>
      </header>
      <MembersList />
    </main>
  );
}
