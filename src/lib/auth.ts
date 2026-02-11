import * as admin from "firebase-admin";

export interface AuthResult {
  uid: string;
  email?: string;
}

/**
 * Verify Firebase ID token from Authorization header.
 * Returns the decoded token's uid, or null if invalid/missing.
 */
export async function verifyAuth(request: Request): Promise<AuthResult | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split("Bearer ")[1];
  if (!token) return null;

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}
