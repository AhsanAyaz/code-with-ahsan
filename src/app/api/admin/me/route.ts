import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/adminAccess/server";

/**
 * GET /api/admin/me
 * Returns the signed-in staff member's admin portal role.
 *   401 when not signed in, 403 when the user has no admin_roles doc.
 */
export async function GET(request: NextRequest) {
  const access = await requireAdminAccess(request, "portal.read");
  if (!access.ok) return access.response;

  const { uid, email, role } = access.actor;
  return NextResponse.json({ uid, email, role });
}
