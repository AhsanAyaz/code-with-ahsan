/**
 * src/lib/adminAccess/server.ts
 *
 * Server-side admin portal access: per-person roles stored in
 * `admin_roles/{uid}`, checked on every admin request (one Firestore read, so
 * revocation is immediate and never waits on ID token claim refresh).
 *
 * Admins additionally carry the `admin: true` custom claim (and the
 * `mentorship_profiles.isAdmin` mirror) so existing Firestore/Storage rules keep
 * working. Moderators get no claim: they only act through API routes.
 */

import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/auth";
import { auth, db } from "@/lib/firebaseAdmin";
import { syncRoleClaim } from "@/lib/ambassador/roleMutation";
import { can, isAdminRole, type AdminAction, type AdminRole } from "./actions";

export const ADMIN_ROLES_COLLECTION = "admin_roles";
export const ADMIN_AUDIT_LOG_COLLECTION = "admin_audit_log";

export interface AdminActor {
  uid: string;
  email: string;
  role: AdminRole;
}

export type AdminAccessResult =
  | { ok: true; actor: AdminActor }
  | { ok: false; response: NextResponse };

/** Read the admin role for uid from admin_roles/{uid}. Null when absent or invalid. */
export async function getAdminRole(uid: string): Promise<AdminRole | null> {
  const snap = await db.collection(ADMIN_ROLES_COLLECTION).doc(uid).get();
  if (!snap.exists) return null;
  const role = snap.data()?.role;
  return isAdminRole(role) ? role : null;
}

/**
 * Authorize an admin portal request for one operation.
 *   401 when the Bearer ID token is missing or invalid
 *   403 { error: "No admin access" } when the user has no admin_roles doc
 *   403 { error: "Admins only", action } when the role is below the action's minimum
 */
export async function requireAdminAccess(
  request: Request,
  action: AdminAction
): Promise<AdminAccessResult> {
  const authCtx = await verifyAuth(request);
  if (!authCtx) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const role = await getAdminRole(authCtx.uid);
  if (!role) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No admin access" }, { status: 403 }),
    };
  }

  if (!can(role, action)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Admins only", action }, { status: 403 }),
    };
  }

  return { ok: true, actor: { uid: authCtx.uid, email: authCtx.email, role } };
}

export interface AdminAuditTarget {
  type: string;
  id: string;
  label?: string;
}

/**
 * Append an entry to admin_audit_log. Never throws: an audit write failure must
 * not fail the operation it describes, so errors are logged and swallowed.
 */
export async function logAdminAction(
  actor: AdminActor,
  action: AdminAction,
  target: AdminAuditTarget,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const cleanTarget = {
      type: target.type,
      id: target.id,
      ...(target.label !== undefined ? { label: target.label } : {}),
    };
    const cleanMeta =
      meta === undefined
        ? undefined
        : Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== undefined));

    await db.collection(ADMIN_AUDIT_LOG_COLLECTION).add({
      actorUid: actor.uid,
      actorEmail: actor.email,
      actorRole: actor.role,
      action,
      target: cleanTarget,
      ...(cleanMeta !== undefined ? { meta: cleanMeta } : {}),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error("[adminAccess] logAdminAction failed", {
      action,
      target,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export interface AdminRoleSubject {
  uid: string;
  email: string;
  displayName?: string;
}

export interface AdminRoleGrantor {
  uid: string;
  email: string;
}

export type SetAdminRoleResult =
  | { ok: true; claimSynced: boolean; claimError?: string }
  | { ok: false; error: string };

/**
 * Grant, change or revoke a person's admin portal role.
 *   role "admin":     admin_roles doc + admin claim true + mentorship_profiles.isAdmin true
 *   role "moderator": admin_roles doc + admin claim false + isAdmin false
 *   role null:        delete admin_roles doc + admin claim false + isAdmin false
 *
 * The existing `roles` claim is preserved. Claim sync failure is non-fatal (the
 * admin_roles doc is authoritative for portal access) and reported in the result.
 */
export async function setAdminRole(
  subject: AdminRoleSubject,
  role: AdminRole | null,
  grantedBy: AdminRoleGrantor
): Promise<SetAdminRoleResult> {
  try {
    const roleRef = db.collection(ADMIN_ROLES_COLLECTION).doc(subject.uid);

    if (role) {
      const existing = await roleRef.get();
      await roleRef.set({
        role,
        email: subject.email,
        ...(subject.displayName !== undefined ? { displayName: subject.displayName } : {}),
        grantedBy: { uid: grantedBy.uid, email: grantedBy.email },
        grantedAt: existing.exists
          ? (existing.data()?.grantedAt ?? FieldValue.serverTimestamp())
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await roleRef.delete();
    }

    const isAdmin = role === "admin";

    const profileRef = db.collection("mentorship_profiles").doc(subject.uid);
    const profileSnap = await profileRef.get();
    if (profileSnap.exists) {
      await profileRef.update({
        isAdmin,
        adminUpdatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Preserve the current `roles` claim. If it cannot be read, skip the sync
    // rather than risk overwriting roles with an empty array.
    let existingRoles: string[] = [];
    try {
      const userRecord = await auth.getUser(subject.uid);
      const claimRoles = (userRecord.customClaims as Record<string, unknown> | undefined)?.roles;
      if (Array.isArray(claimRoles)) {
        existingRoles = claimRoles.filter((r): r is string => typeof r === "string");
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error("[adminAccess] setAdminRole could not read claims", {
        uid: subject.uid,
        error,
      });
      return { ok: true, claimSynced: false, claimError: error };
    }

    const sync = await syncRoleClaim(subject.uid, { roles: existingRoles, admin: isAdmin });
    if (!sync.ok) {
      console.error("[adminAccess] setAdminRole claim sync failed", {
        uid: subject.uid,
        error: sync.error,
      });
      return { ok: true, claimSynced: false, claimError: sync.error };
    }
    return { ok: true, claimSynced: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
