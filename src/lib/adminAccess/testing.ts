/**
 * src/lib/adminAccess/testing.ts
 *
 * Test double for "@/lib/adminAccess/server". Route tests swap the real module
 * for this one so they can act as an admin, a moderator, a signed-in user with
 * no role, or nobody, while the per-action decision still comes from the real
 * ACL in ./actions (so a test cannot drift from the approved action map).
 *
 *   vi.mock("@/lib/adminAccess/server", async () =>
 *     (await import("@/lib/adminAccess/testing")).adminAccessServerMock
 *   );
 *   import { actAs, logAdminActionMock } from "@/lib/adminAccess/testing";
 *
 *   actAs("moderator");   // requireAdminAccess -> 403 "Admins only" on admin actions
 *
 * Test-only: never import this from application code.
 */

import { vi } from "vitest";
import { NextResponse } from "next/server";
import { can, type AdminAction, type AdminRole } from "./actions";
import type { AdminAccessResult, AdminActor, AdminAuditTarget } from "./server";

export type TestPrincipal = AdminRole | "no-role" | "signed-out";

export const TEST_ACTOR_UID = "staff-uid-1";
export const TEST_ACTOR_EMAIL = "staff@example.com";

const state: { principal: TestPrincipal } = { principal: "admin" };

/** Choose who the next requests are made by. Defaults to "admin". */
export function actAs(principal: TestPrincipal): void {
  state.principal = principal;
}

export function currentTestActor(): AdminActor | null {
  const p = state.principal;
  if (p === "admin" || p === "moderator") {
    return { uid: TEST_ACTOR_UID, email: TEST_ACTOR_EMAIL, role: p };
  }
  return null;
}

export const requireAdminAccessMock = vi.fn(
  async (_request: Request, action: AdminAction): Promise<AdminAccessResult> => {
    const p = state.principal;
    if (p === "signed-out") {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
    if (p === "no-role") {
      return {
        ok: false,
        response: NextResponse.json({ error: "No admin access" }, { status: 403 }),
      };
    }
    if (!can(p, action)) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Admins only", action }, { status: 403 }),
      };
    }
    return { ok: true, actor: currentTestActor()! };
  }
);

export const logAdminActionMock = vi.fn<
  (
    actor: AdminActor,
    action: AdminAction,
    target: AdminAuditTarget,
    meta?: Record<string, unknown>
  ) => Promise<void>
>(async () => {});

export const getAdminRoleMock = vi.fn<(uid: string) => Promise<AdminRole | null>>(async () => {
  const p = state.principal;
  return p === "admin" || p === "moderator" ? p : null;
});

export const adminAccessServerMock = {
  ADMIN_ROLES_COLLECTION: "admin_roles",
  ADMIN_AUDIT_LOG_COLLECTION: "admin_audit_log",
  requireAdminAccess: requireAdminAccessMock,
  logAdminAction: logAdminActionMock,
  getAdminRole: getAdminRoleMock,
  setAdminRole: vi.fn(),
};
