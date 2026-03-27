import { Metadata } from "next";
import { Bebas_Neue } from "next/font/google";
import ForceDarkTheme from "./components/ForceDarkTheme";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const promptathonOgImage =
  "https://www.codewithahsan.dev/images/cwa-promptathon-2026-og.png";

export const metadata: Metadata = {
  title: "CWA Prompt-a-thon 2026 | Code with Ahsan",
  description:
    "Join CWA Prompt-a-thon 2026 on March 28: a 1-day online Generative AI hackathon with 50 participants, mentors, and tool partners.",
  alternates: {
    canonical: "/events/cwa-promptathon/2026",
  },
  openGraph: {
    title: "CWA Prompt-a-thon 2026 | Code with Ahsan",
    description:
      "1-day online Generative AI hackathon on March 28, 2026. Join 50 builders and ship in teams.",
    url: "https://www.codewithahsan.dev/events/cwa-promptathon/2026",
    siteName: "Code with Ahsan",
    type: "website",
    images: [
      {
        url: promptathonOgImage,
        width: 1200,
        height: 630,
        alt: "CWA Prompt-a-thon 2026 - Generative AI Hackathon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CWA Prompt-a-thon 2026 | Code with Ahsan",
    description:
      "1-day online Generative AI hackathon on March 28, 2026. Join 50 builders and ship in teams.",
    images: [promptathonOgImage],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={bebasNeue.variable}>
      <ForceDarkTheme />
      {children}
    </div>
  );
}
