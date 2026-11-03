import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebaseAdmin";
import {
  ADMIN_ROLES_COLLECTION,
  getAdminRole,
  logAdminAction,
  requireAdminAccess,
  setAdminRole,
} from "@/lib/adminAccess/server";
import { isAdminRole } from "@/lib/adminAccess/actions";
import {
  getTeamMember,
  lastAdminResponse,
  selfChangeResponse,
  toTeamMember,
  wouldRemoveLastAdmin,
  type TeamMember,
} from "./shared";

/**
 * GET /api/admin/team
 * Everyone with an admin portal role. Admin only (staff.manage).
 */
export async function GET(request: NextRequest) {
  const access = await requireAdminAccess(request, "staff.manage");
  if (!access.ok) return access.response;

  const snap = await db.collection(ADMIN_ROLES_COLLECTION).get();
  const members = snap.docs
    .map((doc) => toTeamMember(doc.id, doc.data()))
    .filter((m): m is TeamMember => m !== null)
    .sort((a, b) =>
      a.role === b.role ? a.email.localeCompare(b.email) : a.role === "admin" ? -1 : 1
    );

  return NextResponse.json({ members });
}

function isUserNotFound(err: unknown): boolean {
  return (err as { code?: unknown } | null)?.code === "auth/user-not-found";
}

/**
 * POST /api/admin/team { email, role }
 * Grant (or change) a role for an existing site account, looked up by email.
 */
export async function POST(request: NextRequest) {
  const access = await requireAdminAccess(request, "staff.manage");
  if (!access.ok) return access.response;
  const { actor } = access;

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    role?: unknown;
  } | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const role = body?.role;
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "Role must be admin or moderator." }, { status: 400 });
  }

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (err) {
    if (isUserNotFound(err)) {
      return NextResponse.json(
        {
          error: "No account with that email. They need to sign in to the site once first.",
        },
        { status: 404 }
      );
    }
    console.error("[admin/team] getUserByEmail failed", err);
    return NextResponse.json({ error: "Could not look up that account." }, { status: 500 });
  }

  if (user.uid === actor.uid) return selfChangeResponse();

  const previousRole = await getAdminRole(user.uid);
  if (await wouldRemoveLastAdmin(previousRole, role)) return lastAdminResponse();

  const subjectEmail = user.email ?? email;
  const result = await setAdminRole(
    {
      uid: user.uid,
      email: subjectEmail,
      ...(user.displayName ? { displayName: user.displayName } : {}),
    },
    role,
    { uid: actor.uid, email: actor.email }
  );
  if (!result.ok) {
    console.error("[admin/team] setAdminRole failed", result.error);
    return NextResponse.json({ error: "Could not save the role." }, { status: 500 });
  }

  await logAdminAction(
    actor,
    "staff.manage",
    { type: "user", id: user.uid, label: subjectEmail },
    { role, previousRole }
  );

  const member = await getTeamMember(user.uid);
  return NextResponse.json(
    { member, claimSynced: result.claimSynced },
    { status: previousRole ? 200 : 201 }
  );
}
