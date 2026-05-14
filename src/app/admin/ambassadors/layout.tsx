import { notFound } from "next/navigation";
import { isAmbassadorProgramEnabled } from "@/lib/features";

/**
 * Route-tree gate for all /admin/ambassadors/* pages (per D-10, D-12 in 01-CONTEXT.md).
 * Note: admin auth gating is separate — this layout only enforces the feature flag.
 * Admin session auth continues via the existing admin middleware / per-page pattern.
 */
export default function AdminAmbassadorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAmbassadorProgramEnabled()) {
    notFound();
  }
  return <>{children}</>;
}
