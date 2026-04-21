import * as admin from "firebase-admin";

/**
 * Authentication context returned from verifyAuth().
 *
 * Extended in Phase 1 Plan 06 to expose the `roles`, `admin`, and legacy `role`
 * custom claims from the decoded Firebase ID token so API routes can authorize
 * without a Firestore round-trip (structurally compatible with
 * src/lib/permissions.ts DecodedRoleClaim per D-08).
 *
 * The three claim fields are OPTIONAL so existing callers that destructure
 * only { uid, email } continue to compile unchanged.
 */
export interface AuthContext {
  uid: string;
  email: string;
  /** from decoded token.roles custom claim */
  roles?: string[];
  /** from decoded token.admin custom claim */
  admin?: boolean;
  /** legacy single-role claim — removed in Deploy #5 */
  role?: string;
}

/**
 * Legacy alias — kept for backward compatibility. New callers should use AuthContext.
 * @deprecated Use AuthContext instead.
 */
export type AuthResult = AuthContext;

/**
 * Verify Firebase ID token from Authorization header.
 * Returns the decoded token's uid + email + role claims, or null if invalid/missing.
 */
export async function verifyAuth(request: Request): Promise<AuthContext | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split("Bearer ")[1];
  if (!token) return null;

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      roles: Array.isArray(decoded.roles) ? (decoded.roles as string[]) : undefined,
      admin: decoded.admin === true ? true : undefined,
      role: typeof decoded.role === "string" ? decoded.role : undefined,
    };
  } catch {
    return null;
  }
}
