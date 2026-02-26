import { Metadata } from "next";
import siteMetadata from "@/data/siteMetadata";

export const metadata: Metadata = {
  title: "CWA Prompt-a-thon 2026",
  description:
    "Join the CWA Prompt-a-thon 2026 - A Generative AI & Build with AI Hackathon. Ignite your ideas, collaborate, and build the future of tech.",
  openGraph: {
    images: [`${siteMetadata.siteUrl}/static/images/og-default.png`], // Fallback, can update when we have an image
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
