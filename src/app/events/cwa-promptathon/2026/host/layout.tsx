import { Space_Mono } from "next/font/google";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
});

export default function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={spaceMono.variable}>{children}</div>;
}
