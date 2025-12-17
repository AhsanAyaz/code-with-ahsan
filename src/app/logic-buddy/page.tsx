import { Metadata } from "next";
import LogicBuddyClient from "./LogicBuddyClient";

export const metadata: Metadata = {
  title: "Logic Buddy (beta) - CodeWithAhsan",
  description:
    "Master your programming logic with your AI mentor. Solve problems, get feedback, and climb the leaderboard!",
};

export default function Page() {
  return <LogicBuddyClient />;
}
