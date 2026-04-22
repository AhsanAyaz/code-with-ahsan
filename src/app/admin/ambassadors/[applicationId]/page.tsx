import ApplicationDetail from "./ApplicationDetail";

// Admin auth + feature flag are inherited from src/app/admin/layout.tsx (AdminAuthGate)
// and src/app/admin/ambassadors/layout.tsx (isAmbassadorProgramEnabled).
// D-09: This is the reference admin detail-page pattern for future admin detail pages.

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ applicationId: string }> };

export default async function AdminApplicationDetailPage({
  params,
}: RouteParams) {
  const { applicationId } = await params;
  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <nav className="text-sm mb-4">
        <a href="/admin/ambassadors" className="link">
          &larr; All applications
        </a>
      </nav>
      <ApplicationDetail applicationId={applicationId} />
    </div>
  );
}
