import type { Metadata } from "next";
import MentorshipClientLayout from "./MentorshipClientLayout";

export const metadata: Metadata = {
  title: "Mentorship Program | Code with Ahsan",
  description:
    "Connect with experienced mentors, seek guidance, and accelerate your career. Join our free mentorship program.",
  openGraph: {
    title: "Mentorship Program | Code with Ahsan",
    description:
      "Connect with experienced mentors, seek guidance, and accelerate your career. Join our free mentorship program.",
    images: ["/images/mentorship-new-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mentorship Program | Code with Ahsan",
    description:
      "Connect with experienced mentors, seek guidance, and accelerate your career. Join our free mentorship program.",
    images: ["/images/mentorship-new-og.png"],
  },
};

export default function MentorshipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MentorshipClientLayout>{children}</MentorshipClientLayout>;
}
