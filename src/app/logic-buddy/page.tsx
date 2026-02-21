import { Metadata } from "next";
import LogicBuddyClient from "./LogicBuddyClient";

export const metadata: Metadata = {
  title: "Logic Buddy - CodeWithAhsan",
  description:
    "Master your programming logic with your AI mentor. Solve problems, get feedback, and climb the leaderboard!",
  openGraph: {
    title: "Logic Buddy - CodeWithAhsan",
    description:
      "Master your programming logic with your AI mentor. Solve problems, get feedback, and climb the leaderboard!",
    images: ["/images/logic-buddy-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Logic Buddy - CodeWithAhsan",
    description:
      "Master your programming logic with your AI mentor. Solve problems, get feedback, and climb the leaderboard!",
    images: ["/images/logic-buddy-og.png"],
  },
};

export default function Page() {
  return <LogicBuddyClient />;
}
