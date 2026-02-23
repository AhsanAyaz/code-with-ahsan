import { Metadata } from "next";
// @ts-ignore
import siteMetadata from "@/data/siteMetadata";

export const metadata: Metadata = {
  title: `Events - ${siteMetadata.title}`,
  description:
    "Discover all CodeWithAhsan community events — hackathons, prompt-a-thons, and more. Browse upcoming and past events.",
  openGraph: {
    title: `Events - ${siteMetadata.title}`,
    description:
      "Discover all CodeWithAhsan community events — hackathons, prompt-a-thons, and more. Browse upcoming and past events.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
