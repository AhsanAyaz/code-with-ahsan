/**
 * Unit tests for requireAdminAccess, logAdminAction and setAdminRole.
 *
 * Mocking strategy:
 *   - vi.mock("@/lib/auth") to control verifyAuth
 *   - vi.mock("@/lib/firebaseAdmin") with an in-memory db.collection().doc() chain
 *   - vi.mock("@/lib/ambassador/roleMutation") to observe syncRoleClaim
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const store = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  add: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ verifyAuth: vi.fn() }));
vi.mock("@/lib/ambassador/roleMutation", () => ({ syncRoleClaim: vi.fn() }));
vi.mock("@/lib/firebaseAdmin", () => {
  const docRef = (collection: string, id: string) => {
    const key = `${collection}/${id}`;
    return {
      get: vi.fn(async () => {
        const data = store.docs.get(key);
        return { exists: data !== undefined, data: () => data };
      }),
      set: vi.fn(async (data: Record<string, unknown>) => {
        store.set(key, data);
        store.docs.set(key, data);
      }),
      update: vi.fn(async (data: Record<string, unknown>) => {
        store.update(key, data);
        store.docs.set(key, { ...(store.docs.get(key) ?? {}), ...data });
      }),
      delete: vi.fn(async () => {
        store.del(key);
        store.docs.delete(key);
      }),
    };
  };
  return {
    db: {
      collection: vi.fn((name: string) => ({
        doc: vi.fn((id: string) => docRef(name, id)),
        add: vi.fn((data: Record<string, unknown>) => store.add(name, data)),
      })),
    },
    auth: { getUser: store.getUser },
  };
});

import { verifyAuth } from "@/lib/auth";
import { syncRoleClaim } from "@/lib/ambassador/roleMutation";
import { requireAdminAccess, logAdminAction, setAdminRole, getAdminRole } from "./server";

const mockVerifyAuth = vi.mocked(verifyAuth);
const mockSync = vi.mocked(syncRoleClaim);

function req() {
  return new NextRequest("http://localhost/api/admin/me", {
    headers: { Authorization: "Bearer t" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  store.docs.clear();
  store.add.mockResolvedValue({ id: "log1" });
  store.getUser.mockResolvedValue({ customClaims: { roles: ["mentor"], admin: false } });
  mockSync.mockResolvedValue({ ok: true });
});

describe("requireAdminAccess", () => {
  it("401 when verifyAuth returns null", async () => {
    mockVerifyAuth.mockResolvedValue(null);
    const res = await requireAdminAccess(req(), "portal.read");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.response.status).toBe(401);
  });

  it("403 No admin access when the user has no admin_roles doc", async () => {
    mockVerifyAuth.mockResolvedValue({ uid: "u1", email: "u1@x.dev" });
    const res = await requireAdminAccess(req(), "portal.read");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.response.status).toBe(403);
    expect(await res.response.json()).toEqual({ error: "No admin access" });
  });

  it("403 No admin access when the role doc holds an unknown role", async () => {
    mockVerifyAuth.mockResolvedValue({ uid: "u1", email: "u1@x.dev" });
    store.docs.set("admin_roles/u1", { role: "superuser" });
    const res = await requireAdminAccess(req(), "portal.read");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(await res.response.json()).toEqual({ error: "No admin access" });
  });

  it("ignores the admin custom claim when there is no role doc", async () => {
    mockVerifyAuth.mockResolvedValue({ uid: "u1", email: "u1@x.dev", admin: true });
    const res = await requireAdminAccess(req(), "portal.read");
    expect(res.ok).toBe(false);
  });

  it("403 Admins only when a moderator calls an admin action", async () => {
    mockVerifyAuth.mockResolvedValue({ uid: "m1", email: "m1@x.dev" });
    store.docs.set("admin_roles/m1", { role: "moderator" });
    const res = await requireAdminAccess(req(), "projects.delete");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.response.status).toBe(403);
    expect(await res.response.json()).toEqual({ error: "Admins only", action: "projects.delete" });
  });

  it("ok for a moderator on a moderator action", async () => {
    mockVerifyAuth.mockResolvedValue({ uid: "m1", email: "m1@x.dev" });
    store.docs.set("admin_roles/m1", { role: "moderator" });
    const res = await requireAdminAccess(req(), "projects.approve");
    expect(res).toEqual({ ok: true, actor: { uid: "m1", email: "m1@x.dev", role: "moderator" } });
  });

  it("ok for an admin on an admin action", async () => {
    mockVerifyAuth.mockResolvedValue({ uid: "a1", email: "a1@x.dev" });
    store.docs.set("admin_roles/a1", { role: "admin" });
    const res = await requireAdminAccess(req(), "staff.manage");
    expect(res).toEqual({ ok: true, actor: { uid: "a1", email: "a1@x.dev", role: "admin" } });
  });
});

describe("getAdminRole", () => {
  it("returns null without a doc and the role with one", async () => {
    expect(await getAdminRole("x")).toBeNull();
    store.docs.set("admin_roles/x", { role: "admin" });
    expect(await getAdminRole("x")).toBe("admin");
  });
});

describe("logAdminAction", () => {
  const actor = { uid: "a1", email: "a1@x.dev", role: "admin" as const };

  it("writes the audit entry and omits meta and label when undefined", async () => {
    await logAdminAction(actor, "projects.delete", { type: "project", id: "p1" });
    expect(store.add).toHaveBeenCalledTimes(1);
    const [collection, data] = store.add.mock.calls[0];
    expect(collection).toBe("admin_audit_log");
    expect(data).toMatchObject({
      actorUid: "a1",
      actorEmail: "a1@x.dev",
      actorRole: "admin",
      action: "projects.delete",
      target: { type: "project", id: "p1" },
    });
    expect("meta" in data).toBe(false);
    expect("label" in data.target).toBe(false);
    expect(data.createdAt).toBeDefined();
  });

  it("strips undefined values inside meta", async () => {
    await logAdminAction(
      actor,
      "mentorship.profile.decline",
      { type: "profile", id: "u2", label: "Jane" },
      { reason: "spam", note: undefined }
    );
    const [, data] = store.add.mock.calls[0];
    expect(data.meta).toEqual({ reason: "spam" });
    expect(data.target).toEqual({ type: "profile", id: "u2", label: "Jane" });
  });

  it("never throws when the write fails", async () => {
    store.add.mockRejectedValue(new Error("firestore down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      logAdminAction(actor, "projects.approve", { type: "project", id: "p1" })
    ).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("setAdminRole", () => {
  const grantor = { uid: "g1", email: "g1@x.dev" };

  it("admin: writes role doc, mirrors isAdmin, sets admin claim preserving roles", async () => {
    store.docs.set("mentorship_profiles/u1", { isAdmin: false });
    const res = await setAdminRole({ uid: "u1", email: "u1@x.dev" }, "admin", grantor);
    expect(res).toEqual({ ok: true, claimSynced: true });
    const roleDoc = store.docs.get("admin_roles/u1")!;
    expect(roleDoc).toMatchObject({ role: "admin", email: "u1@x.dev", grantedBy: grantor });
    expect("displayName" in roleDoc).toBe(false);
    expect(store.docs.get("mentorship_profiles/u1")).toMatchObject({ isAdmin: true });
    expect(mockSync).toHaveBeenCalledWith("u1", { roles: ["mentor"], admin: true });
  });

  it("moderator: role doc written, admin claim false, isAdmin false", async () => {
    store.docs.set("mentorship_profiles/u1", { isAdmin: true });
    await setAdminRole({ uid: "u1", email: "u1@x.dev", displayName: "U" }, "moderator", grantor);
    expect(store.docs.get("admin_roles/u1")).toMatchObject({ role: "moderator", displayName: "U" });
    expect(store.docs.get("mentorship_profiles/u1")).toMatchObject({ isAdmin: false });
    expect(mockSync).toHaveBeenCalledWith("u1", { roles: ["mentor"], admin: false });
  });

  it("null: deletes role doc and clears admin claim", async () => {
    store.docs.set("admin_roles/u1", { role: "admin" });
    await setAdminRole({ uid: "u1", email: "u1@x.dev" }, null, grantor);
    expect(store.docs.has("admin_roles/u1")).toBe(false);
    expect(mockSync).toHaveBeenCalledWith("u1", { roles: ["mentor"], admin: false });
  });

  it("does not create a mentorship profile when none exists", async () => {
    await setAdminRole({ uid: "u1", email: "u1@x.dev" }, "admin", grantor);
    expect(store.update).not.toHaveBeenCalled();
    expect(store.docs.has("mentorship_profiles/u1")).toBe(false);
  });

  it("skips claim sync when current claims cannot be read", async () => {
    store.getUser.mockRejectedValue(new Error("auth down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await setAdminRole({ uid: "u1", email: "u1@x.dev" }, "admin", grantor);
    expect(res).toEqual({ ok: true, claimSynced: false, claimError: "auth down" });
    expect(mockSync).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
