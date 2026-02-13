import type { Metadata } from "next";
import { MentorshipProvider } from "@/contexts/MentorshipContext";

export const metadata: Metadata = {
  title: "Book a Session | Code with Ahsan",
  description: "Book a mentorship session with a mentor.",
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <MentorshipProvider>
      <div className="min-h-screen bg-base-200">
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      </div>
    </MentorshipProvider>
  );
}
