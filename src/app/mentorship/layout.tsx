import type { Metadata } from "next";
import { MentorshipProvider } from "@/contexts/MentorshipContext";

export const metadata: Metadata = {
  title: "Mentorship Program | Code with Ahsan",
  description:
    "Connect with mentors and mentees to accelerate your career growth through structured guidance and support.",
  openGraph: {
    title: "Mentorship Program | Code with Ahsan",
    description:
      "Connect with mentors and mentees to accelerate your career growth through structured guidance and support.",
    url: "https://codewithahsan.dev/mentorship",
    siteName: "Code with Ahsan",
    images: [
      {
        url: "https://codewithahsan.dev/images/mentorship-og-v3.png",
        width: 1200,
        height: 630,
        alt: "Code with Ahsan Mentorship Program",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mentorship Program | Code with Ahsan",
    description:
      "Connect with mentors and mentees to accelerate your career growth through structured guidance and support.",
    images: ["https://codewithahsan.dev/images/mentorship-og-v3.png"],
  },
};

export default function MentorshipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MentorshipProvider>
      <div className="min-h-screen bg-base-200">
        {/* Header Banner */}
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

        {/* Confidentiality Notice */}
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

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </div>
    </MentorshipProvider>
  );
}
