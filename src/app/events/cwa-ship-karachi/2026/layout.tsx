import { Metadata } from "next";
import { Bebas_Neue } from "next/font/google";
import ForceDarkTheme from "./components/ForceDarkTheme";
import { EVENT } from "./constants";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const TITLE = `${EVENT.name} | Code with Ahsan`;
const DESCRIPTION = `${EVENT.name} on ${EVENT.dateLabel}: a single-day, on-site hackathon in Karachi. Bring your team, build and ship an AI product, and demo to the judges the same evening.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: EVENT.path,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `https://www.codewithahsan.dev${EVENT.path}`,
    siteName: "Code with Ahsan",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
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
