import ApplicationsList from "./ApplicationsList";

// Admin auth + feature gate are inherited from src/app/admin/layout.tsx (AdminAuthGate)
// and src/app/admin/ambassadors/layout.tsx (isAmbassadorProgramEnabled).
// This page is a server component only for routing; all interactivity is in ApplicationsList.

export const dynamic = "force-dynamic";

export default function AdminAmbassadorsPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ambassador Applications</h1>
          <p className="text-sm opacity-70">Review and decide on applications.</p>
        </div>
        <a href="/admin/ambassadors/cohorts" className="btn btn-outline btn-sm">
          Manage cohorts
        </a>
      </header>
      <ApplicationsList />
    </div>
  );
}
