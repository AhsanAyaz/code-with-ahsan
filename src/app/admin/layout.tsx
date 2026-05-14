import { Metadata } from "next";
import { MentorshipProvider } from "@/contexts/MentorshipContext";
import AdminAuthGate from "@/components/admin/AdminAuthGate";
import { AdminSidebarContent, AdminDrawerToggle } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
  title: "Admin Dashboard | Code with Ahsan",
  description: "Administrative dashboard for managing mentorship, projects, and roadmaps",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MentorshipProvider>
      <AdminAuthGate>
        <div className="drawer lg:drawer-open min-h-screen">
          <input id="admin-drawer" type="checkbox" className="drawer-toggle" />

          {/* Page content */}
          <div className="drawer-content flex flex-col">
            {/* Mobile top bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-base-300 lg:hidden">
              <AdminDrawerToggle />
              <span className="font-bold">Admin Panel</span>
            </div>

            <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>

          {/* Sidebar */}
          <div className="drawer-side z-40">
            <label htmlFor="admin-drawer" className="drawer-overlay" />
            <AdminSidebarContent />
          </div>
        </div>
      </AdminAuthGate>
    </MentorshipProvider>
  );
}
