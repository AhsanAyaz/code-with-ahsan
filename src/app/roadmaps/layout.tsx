import { MentorshipProvider } from "@/contexts/MentorshipContext";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning Roadmaps | Code with Ahsan",
  description:
    "Browse curated learning paths and roadmaps created by mentors to guide your developer journey.",
  openGraph: {
    title: "Learning Roadmaps | Code with Ahsan",
    description:
      "Browse curated learning paths and roadmaps created by mentors to guide your developer journey.",
    images: ["/images/roadmaps-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Learning Roadmaps | Code with Ahsan",
    description:
      "Browse curated learning paths and roadmaps created by mentors to guide your developer journey.",
    images: ["/images/roadmaps-og.png"],
  },
};

export default function RoadmapsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MentorshipProvider>{children}</MentorshipProvider>;
}
