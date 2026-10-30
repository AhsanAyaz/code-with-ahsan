import { Metadata } from "next";
import { Big_Shoulders } from "next/font/google";
import ForceDarkTheme from "./components/ForceDarkTheme";
import SummitFooterScope from "./components/SummitFooterScope";
import { EVENT, SUMMIT_FOOTER_CSS } from "./constants";

// Google Fonts folded "Big Shoulders Display" into the single "Big Shoulders"
// family (weight 100–900 plus an optical-size axis). With the opsz axis loaded
// and the browser default font-optical-sizing: auto, large headings get the
// Display cut automatically.
const summitDisplay = Big_Shoulders({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-summit",
  display: "swap",
  // next/font has no fallback metrics for Big Shoulders yet; name a condensed
  // fallback instead of letting it warn on every build.
  fallback: ["Impact", "Arial Narrow", "sans-serif"],
  adjustFontFallback: false,
});

const TITLE = `${EVENT.name} | Code with Ahsan`;
const DESCRIPTION =
  "A one-day tech summit in Karachi, end of March 2027: talks, a panel and a live pitch final.";

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
    <div className={summitDisplay.variable}>
      <ForceDarkTheme />
      <SummitFooterScope />
      {/* Scoped to body[data-summit]: inert on every other page. */}
      <style>{SUMMIT_FOOTER_CSS}</style>
      {children}
    </div>
  );
}
