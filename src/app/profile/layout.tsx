import type { Metadata } from "next";
import { MentorshipProvider } from "@/contexts/MentorshipContext";

export const metadata: Metadata = {
  title: "Profile | Code with Ahsan",
  description: "Manage your profile settings and preferences.",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MentorshipProvider>
      <div className="min-h-screen bg-base-200">
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </div>
    </MentorshipProvider>
  );
}
