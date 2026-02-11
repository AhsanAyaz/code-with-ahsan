import { MentorshipProvider } from "@/contexts/MentorshipContext";

export default function RoadmapsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MentorshipProvider>{children}</MentorshipProvider>;
}
