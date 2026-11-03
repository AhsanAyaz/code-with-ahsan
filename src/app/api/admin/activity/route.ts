import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireAdminAccess } from "@/lib/adminAccess/server";
import { isAdminAction } from "@/lib/adminAccess/actions";
import { toIso } from "../team/shared";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export interface ActivityEntry {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  target: { type: string; id: string; label?: string } | null;
  meta: Record<string, unknown> | null;
  createdAt: string | null;
}

function activityQuery(actor: string, action: string) {
  if (actor) {
    return db
      .collection("admin_audit_log")
      .where("actorUid", "==", actor)
      .orderBy("createdAt", "desc");
  }
  if (action) {
    return db
      .collection("admin_audit_log")
      .where("action", "==", action)
      .orderBy("createdAt", "desc");
  }
  return db.collection("admin_audit_log").orderBy("createdAt", "desc");
}

/**
 * GET /api/admin/activity?actor=&action=&cursor=&limit=
 * admin_audit_log, newest first. Filter by one actor uid or one action id (not
 * both). `cursor` is the id of the last entry of the previous page.
 *
 * Composite indexes (firestore.indexes.json):
 *   admin_audit_log (actorUid ASC, createdAt DESC)
 *   admin_audit_log (action ASC, createdAt DESC)
 */
export async function GET(request: NextRequest) {
  const access = await requireAdminAccess(request, "audit.read");
  if (!access.ok) return access.response;

  const params = request.nextUrl.searchParams;
  const actor = params.get("actor")?.trim() || "";
  const action = params.get("action")?.trim() || "";
  const cursor = params.get("cursor")?.trim() || "";
  const rawLimit = Number(params.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.floor(rawLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  if (actor && action) {
    return NextResponse.json(
      { error: "Filter by person or by action, not both." },
      { status: 400 }
    );
  }
  if (action && !isAdminAction(action)) {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  let query = activityQuery(actor, action);

  if (cursor) {
    const cursorSnap = await db.collection("admin_audit_log").doc(cursor).get();
    if (!cursorSnap.exists) {
      return NextResponse.json({ error: "Invalid cursor." }, { status: 400 });
    }
    query = query.startAfter(cursorSnap);
  }

  try {
    const snap = await query.limit(limit + 1).get();
    const docs = snap.docs.slice(0, limit);
    const entries: ActivityEntry[] = docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        actorUid: typeof d.actorUid === "string" ? d.actorUid : "",
        actorEmail: typeof d.actorEmail === "string" ? d.actorEmail : "",
        actorRole: typeof d.actorRole === "string" ? d.actorRole : "",
        action: typeof d.action === "string" ? d.action : "",
        target: d.target && typeof d.target === "object" ? d.target : null,
        meta: d.meta && typeof d.meta === "object" ? d.meta : null,
        createdAt: toIso(d.createdAt),
      };
    });
    const nextCursor = snap.docs.length > limit ? docs[docs.length - 1].id : null;
    return NextResponse.json({ entries, nextCursor });
  } catch (err) {
    console.error("[admin/activity] query failed", err);
    return NextResponse.json({ error: "Could not load activity." }, { status: 500 });
  }
}
