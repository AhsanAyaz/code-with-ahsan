import { notFound } from "next/navigation";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { MentorshipProvider } from "@/contexts/MentorshipContext";

/**
 * Route-tree gate for all /ambassadors/* pages (per D-10, D-12 in 01-CONTEXT.md).
 * When FEATURE_AMBASSADOR_PROGRAM is off, this 404s every child page in one shot —
 * no per-page gate needed. Header/footer nav filtering lives in src/data/headerNavLinks.js
 * and src/components/Footer.tsx.
 *
 * MentorshipProvider is required because ApplyWizard + EligibilityStep call
 * useMentorship() for the auth'd user. Matches the pattern in /admin, /profile,
 * /projects, /roadmaps, /mentorship layouts.
 */
export default function AmbassadorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAmbassadorProgramEnabled()) {
    notFound();
  }
  return (
    <MentorshipProvider>
      <div className="min-h-screen bg-base-200">
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </div>
    </MentorshipProvider>
  );
}
