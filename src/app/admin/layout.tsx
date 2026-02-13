import { Metadata } from "next";
import { MentorshipProvider } from "@/contexts/MentorshipContext";
import AdminAuthGate from "@/components/admin/AdminAuthGate";
import AdminNavigation from "@/components/admin/AdminNavigation";

export const metadata: Metadata = {
  title: "Admin Dashboard | Code with Ahsan",
  description: "Administrative dashboard for managing mentorship, projects, and roadmaps",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MentorshipProvider>
      <AdminAuthGate>
        <AdminNavigation />
        <div className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </div>
      </AdminAuthGate>
    </MentorshipProvider>
  );
}
