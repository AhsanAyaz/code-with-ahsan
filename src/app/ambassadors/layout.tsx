import { notFound } from "next/navigation";
import { isAmbassadorProgramEnabled } from "@/lib/features";

/**
 * Route-tree gate for all /ambassadors/* pages (per D-10, D-12 in 01-CONTEXT.md).
 * When FEATURE_AMBASSADOR_PROGRAM is off, this 404s every child page in one shot —
 * no per-page gate needed. Header/footer nav filtering lives in src/data/headerNavLinks.js
 * and src/components/Footer.tsx.
 */
export default function AmbassadorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAmbassadorProgramEnabled()) {
    notFound();
  }
  return <>{children}</>;
}
