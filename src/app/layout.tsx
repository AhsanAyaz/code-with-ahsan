import type { Metadata } from "next";
import { Rubik, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import LayoutWrapper from "@/components/LayoutWrapper";
import Analytics from "@/components/analytics";
import GoogleAdsense from "@/components/analytics/GoogleAdsense";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import siteMetadata from "@/data/siteMetadata";

config.autoAddCss = false;

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://codewithahsan.dev"),
  title: siteMetadata.title,
  description: siteMetadata.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    siteName: "Code with Ahsan",
    type: "website",
    locale: "en_US",
    url: "https://codewithahsan.dev",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/static/favicons/site.webmanifest",
  icons: {
    icon: [
      {
        url: "/static/favicons/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/static/favicons/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/static/favicons/android-chrome-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        url: "/static/favicons/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/static/favicons/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/static/favicons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/static/favicons/safari-pinned-tab.svg",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={siteMetadata.language} suppressHydrationWarning>
      <body
        className={`${rubik.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>
          <LayoutWrapper>
            <Analytics />
            <GoogleAdsense pId="ca-pub-9844853681537365" />
            {children}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
