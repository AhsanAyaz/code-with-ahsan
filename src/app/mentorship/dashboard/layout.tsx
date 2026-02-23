import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentorship Dashboard | Code with Ahsan",
  description: "Your mentorship dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
