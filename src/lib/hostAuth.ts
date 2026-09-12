import { db } from "@/lib/firebaseAdmin";

export async function verifyHostRequest(request: Request): Promise<boolean> {
  const token = request.headers.get("x-host-token");

  if (!token) return false;

  const sessionDoc = await db.collection("host_sessions").doc(token).get();
  if (!sessionDoc.exists) return false;

  const session = sessionDoc.data();
  const expiresAt = session?.expiresAt?.toDate?.() || new Date(0);

  if (expiresAt <= new Date()) {
    await db.collection("host_sessions").doc(token).delete();
    return false;
  }

  return true;
}
