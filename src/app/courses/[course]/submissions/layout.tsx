import type { Metadata } from "next";

// Submissions is a client-only Firestore view with no SSR content (empty shell to crawlers)
// and is auth-gated behind project submission flows. Explicitly noindex so any
// internal-link rediscovery does not pollute the search index. See GSC 2026-05-28.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function SubmissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
