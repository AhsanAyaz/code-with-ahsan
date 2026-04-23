/**
 * POST /api/dev/sync-claims
 *
 * Dev-only endpoint. Reads the authenticated user's current roles from
 * mentorship_profiles/{uid} and syncs them to Firebase Auth custom claims.
 *
 * Useful when Firestore roles are edited manually (e.g. setting roles to
 * ["ambassador"] directly in the emulator UI) without going through the
 * acceptance flow that normally calls syncRoleClaim().
 *
 * Hard-gated: returns 404 in production.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/auth";
import { syncRoleClaim } from "@/lib/ambassador/roleMutation";

export async function POST(request: NextRequest) {
  if (
    process.env.NODE_ENV !== "development" ||
    !process.env.FIREBASE_AUTH_EMULATOR_HOST
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ctx = await verifyAuth(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await db.collection("mentorship_profiles").doc(ctx.uid).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const profile = snap.data() as { roles?: string[]; isAdmin?: boolean };
  const roles = Array.isArray(profile.roles) ? profile.roles : [];
  const admin = profile.isAdmin === true;

  const result = await syncRoleClaim(ctx.uid, { roles, admin });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, roles, admin });
}
