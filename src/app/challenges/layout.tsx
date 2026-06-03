import { MentorshipProvider } from "@/contexts/MentorshipContext";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Monthly Challenges | Code with Ahsan",
  description:
    "Join monthly Code with Ahsan community challenges, submit projects, and climb the leaderboard.",
};

export default function ChallengesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MentorshipProvider>{children}</MentorshipProvider>;
}
