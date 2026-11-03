/**
 * Shared helpers for the /api/admin/team routes (staff role management).
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { ADMIN_ROLES_COLLECTION } from "@/lib/adminAccess/server";
import { isAdminRole, type AdminRole } from "@/lib/adminAccess/actions";

export interface TeamMember {
  uid: string;
  email: string;
  displayName: string | null;
  role: AdminRole;
  grantedBy: { uid: string; email: string } | null;
  grantedAt: string | null;
}

/** Firestore Timestamp (or anything with toDate) to ISO string. */
export function toIso(value: unknown): string | null {
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export function toTeamMember(
  uid: string,
  data: Record<string, unknown> | undefined
): TeamMember | null {
  if (!data || !isAdminRole(data.role)) return null;
  const grantedBy = data.grantedBy as { uid?: unknown; email?: unknown } | undefined;
  return {
    uid,
    email: typeof data.email === "string" ? data.email : "",
    displayName: typeof data.displayName === "string" ? data.displayName : null,
    role: data.role,
    grantedBy:
      grantedBy && typeof grantedBy.uid === "string"
        ? { uid: grantedBy.uid, email: typeof grantedBy.email === "string" ? grantedBy.email : "" }
        : null,
    grantedAt: toIso(data.grantedAt),
  };
}

export async function getTeamMember(uid: string): Promise<TeamMember | null> {
  const snap = await db.collection(ADMIN_ROLES_COLLECTION).doc(uid).get();
  if (!snap.exists) return null;
  return toTeamMember(uid, snap.data());
}

/** Number of people holding the admin role. Equality-only query: no composite index. */
export async function countAdmins(): Promise<number> {
  const snap = await db.collection(ADMIN_ROLES_COLLECTION).where("role", "==", "admin").get();
  return snap.size;
}

export function selfChangeResponse(): NextResponse {
  return NextResponse.json(
    { error: "You can't change or remove your own role. Ask another admin." },
    { status: 400 }
  );
}

export function lastAdminResponse(): NextResponse {
  return NextResponse.json(
    { error: "This is the last admin. Make someone else an admin first." },
    { status: 409 }
  );
}

/**
 * True when moving `current` to `next` would leave the portal with no admin.
 * Only a change away from admin can do that.
 */
export async function wouldRemoveLastAdmin(
  current: AdminRole | null,
  next: AdminRole | null
): Promise<boolean> {
  if (current !== "admin" || next === "admin") return false;
  return (await countAdmins()) <= 1;
}
