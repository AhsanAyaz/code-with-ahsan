import { db } from "@/lib/firebaseAdmin";

export async function verifyAdminRequest(request: Request): Promise<boolean> {
  const token = request.headers.get("x-admin-token");

  if (!token) return false;

  const sessionDoc = await db.collection("admin_sessions").doc(token).get();
  if (!sessionDoc.exists) return false;

  const session = sessionDoc.data();
  const expiresAt = session?.expiresAt?.toDate?.() || new Date(0);

  if (expiresAt < new Date()) {
    await db.collection("admin_sessions").doc(token).delete();
    return false;
  }

  return true;
}
