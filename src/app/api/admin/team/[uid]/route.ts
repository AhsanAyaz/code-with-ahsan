import { NextRequest, NextResponse } from "next/server";
import {
  logAdminAction,
  requireAdminAccess,
  setAdminRole,
  type AdminActor,
} from "@/lib/adminAccess/server";
import { isAdminRole, type AdminRole } from "@/lib/adminAccess/actions";
import {
  getTeamMember,
  lastAdminResponse,
  selfChangeResponse,
  wouldRemoveLastAdmin,
} from "../shared";

type Params = { params: Promise<{ uid: string }> };

async function changeRole(actor: AdminActor, uid: string, next: AdminRole | null) {
  if (uid === actor.uid) return selfChangeResponse();

  const member = await getTeamMember(uid);
  if (!member) {
    return NextResponse.json({ error: "That person is not on the team." }, { status: 404 });
  }
  if (await wouldRemoveLastAdmin(member.role, next)) return lastAdminResponse();

  const result = await setAdminRole(
    {
      uid,
      email: member.email,
      ...(member.displayName ? { displayName: member.displayName } : {}),
    },
    next,
    { uid: actor.uid, email: actor.email }
  );
  if (!result.ok) {
    console.error("[admin/team] setAdminRole failed", result.error);
    return NextResponse.json({ error: "Could not save the role." }, { status: 500 });
  }

  await logAdminAction(
    actor,
    "staff.manage",
    { type: "user", id: uid, label: member.email },
    { role: next, previousRole: member.role }
  );

  return NextResponse.json({
    member: next ? await getTeamMember(uid) : null,
    claimSynced: result.claimSynced,
  });
}

/** PATCH /api/admin/team/[uid] { role }: change a team member's role. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const access = await requireAdminAccess(request, "staff.manage");
  if (!access.ok) return access.response;

  const { uid } = await params;
  const body = (await request.json().catch(() => null)) as { role?: unknown } | null;
  if (!isAdminRole(body?.role)) {
    return NextResponse.json({ error: "Role must be admin or moderator." }, { status: 400 });
  }
  return changeRole(access.actor, uid, body.role);
}

/** DELETE /api/admin/team/[uid]: revoke a team member's portal access. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const access = await requireAdminAccess(request, "staff.manage");
  if (!access.ok) return access.response;

  const { uid } = await params;
  return changeRole(access.actor, uid, null);
}
