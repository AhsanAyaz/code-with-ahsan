import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import LayoutWrapper from "@/components/LayoutWrapper";
import Analytics from "@/components/analytics";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import siteMetadata from "@/data/siteMetadata";

config.autoAddCss = false;

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  title: siteMetadata.title,
  description: siteMetadata.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={siteMetadata.language} suppressHydrationWarning>
      <body className={`${rubik.variable} antialiased`}>
        <Providers>
          <LayoutWrapper>
            <Analytics />
            {children}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
