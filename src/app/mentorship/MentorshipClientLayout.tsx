"use client";

import { MentorshipProvider } from "@/contexts/MentorshipContext";
import { usePathname } from "next/navigation";

export default function MentorshipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Hide header and alert on dashboard routes
  const isDashboardRoute = pathname?.startsWith("/mentorship/dashboard");

  return (
    <MentorshipProvider>
      <div className="min-h-screen bg-base-200">
        {/* Header Banner - Hidden on dashboard */}
        {!isDashboardRoute && (
          <div className="bg-gradient-to-r from-primary to-secondary text-primary-content py-8 px-4">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold">
                Mentorship Program
              </h1>
              <p className="mt-2 text-primary-content/80">
                Your digital compass for career growth
              </p>
            </div>
          </div>
        )}

        {/* Confidentiality Notice - Hidden on dashboard */}
        {!isDashboardRoute && (
          <div className="max-w-6xl mx-auto px-4 mt-4">
            <div className="alert alert-info shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <div>
                <span className="font-semibold">Confidentiality Assured:</span>{" "}
                All mentorship discussions are private and separate from
                performance evaluations. This is a safe space for growth.
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </div>
    </MentorshipProvider>
  );
}
