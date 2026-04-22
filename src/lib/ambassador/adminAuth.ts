/**
 * src/lib/ambassador/adminAuth.ts
 *
 * Shared admin-session validator for all /api/ambassador/* routes.
 * Mirrors the existing pattern in src/app/api/mentorship/admin/auth/route.ts.
 *
 * Return shape rationale: requireAdmin returns { ok: true; uid: string } so
 * Plan 06 (accept/decline) can persist `reviewedBy = uid` on application docs
 * without every caller synthesising its own identifier. The uid is derived from
 * the admin_sessions token (first 12 chars, prefixed `admin:`) because the
 * legacy admin flow is password-based — there is no real Firebase user behind
 * an admin session. This can be replaced with a true uid if admin auth is ever
 * migrated to Firebase Auth.
 */

import { db } from "@/lib/firebaseAdmin";

/** Synthesise a stable per-session admin identifier from the raw token. */
function deriveAdminUid(token: string): string {
  // Keep it short enough to fit comfortably in audit fields, long enough to be unique per session.
  return `admin:${token.slice(0, 12)}`;
}

/**
 * Validate an admin session token against the admin_sessions/{token} doc.
 * Returns true if token exists and expiresAt > now.
 */
export async function isValidAdminToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const sessionDoc = await db.collection("admin_sessions").doc(token).get();
    if (!sessionDoc.exists) return false;
    const session = sessionDoc.data();
    if (!session?.expiresAt) return false;
    const expiresAt = session.expiresAt.toDate
      ? session.expiresAt.toDate()
      : new Date(session.expiresAt);
    return expiresAt > new Date();
  } catch {
    return false;
  }
}

/**
 * Read the admin token from x-admin-token header on an incoming Request.
 */
export function getAdminToken(request: Request): string | null {
  return request.headers.get("x-admin-token");
}

/**
 * Validate and return a discriminated-union result.
 *
 * On success: `{ ok: true; uid: string }` where uid is synthesised from the admin_sessions
 *             token (deriveAdminUid above). Plan 06 uses this for `reviewedBy`.
 * On failure: `{ ok: false; status; error }` suitable for direct return to NextResponse.
 */
export async function requireAdmin(
  request: Request,
): Promise<
  | { ok: true; uid: string }
  | { ok: false; status: number; error: string }
> {
  const token = getAdminToken(request);
  if (!token) return { ok: false, status: 401, error: "Admin token required" };
  const valid = await isValidAdminToken(token);
  if (!valid) return { ok: false, status: 401, error: "Invalid or expired admin session" };
  return { ok: true, uid: deriveAdminUid(token) };
}
