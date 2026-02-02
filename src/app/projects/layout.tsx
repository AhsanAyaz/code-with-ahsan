import { MentorshipProvider } from "@/contexts/MentorshipContext";

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MentorshipProvider>{children}</MentorshipProvider>;
}
