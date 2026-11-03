"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useAdminAccess } from "@/lib/adminAccess/client";
import type { AdminAction } from "@/lib/adminAccess/actions";

/**
 * Page-level guard for admin portal pages a moderator can't use. The API
 * routes behind the page enforce the same ACL; this keeps a moderator who
 * follows a direct link from landing on a page full of failing requests.
 */
export default function AdminOnlyPage({
  action,
  children,
}: {
  action: AdminAction;
  children: ReactNode;
}) {
  const { can } = useAdminAccess();
  if (can(action)) return <>{children}</>;

  return (
    <div className="flex justify-center py-16">
      <div className="card w-full max-w-md bg-base-200">
        <div className="card-body items-center text-center">
          <h1 className="card-title">Admins only</h1>
          <p className="text-sm text-base-content/70">
            This page needs the admin role. Your moderator access covers reviews, approvals and
            edits elsewhere in the portal.
          </p>
          <div className="card-actions mt-2">
            <Link href="/admin" className="btn btn-sm btn-outline">
              Back to overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
