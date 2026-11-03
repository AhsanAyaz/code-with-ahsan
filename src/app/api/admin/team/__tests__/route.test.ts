import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock(
  "@/lib/adminAccess/server",
  async () => (await import("@/lib/adminAccess/testing")).adminAccessServerMock
);

// In-memory admin_roles collection + Firebase Auth users.
const hoisted = vi.hoisted(() => {
  const roles = new Map<string, Record<string, unknown>>();
  const users = new Map<string, { uid: string; email: string; displayName?: string }>();

  const ts = (iso: string) => ({ toDate: () => new Date(iso) });

  const docSnap = (id: string) => ({
    id,
    exists: roles.has(id),
    data: () => roles.get(id),
  });

  const collection = vi.fn((name: string) => {
    if (name !== "admin_roles") throw new Error(`unexpected collection ${name}`);
    return {
      doc: (id: string) => ({ get: async () => docSnap(id) }),
      get: async () => ({ docs: Array.from(roles.keys()).map(docSnap) }),
      where: (field: string, _op: string, value: unknown) => ({
        get: async () => {
          const docs = Array.from(roles.entries())
            .filter(([, d]) => d[field] === value)
            .map(([id]) => docSnap(id));
          return { docs, size: docs.length };
        },
      }),
    };
  });

  const getUserByEmail = vi.fn(async (email: string) => {
    const user = Array.from(users.values()).find((u) => u.email === email);
    if (!user) throw Object.assign(new Error("not found"), { code: "auth/user-not-found" });
    return user;
  });

  return { roles, users, ts, collection, getUserByEmail };
});

vi.mock("@/lib/firebaseAdmin", () => ({
  db: { collection: hoisted.collection },
  auth: { getUserByEmail: hoisted.getUserByEmail },
}));

import { GET, POST } from "../route";
import { PATCH, DELETE } from "../[uid]/route";
import {
  actAs,
  adminAccessServerMock,
  getAdminRoleMock,
  logAdminActionMock,
  TEST_ACTOR_UID,
  TEST_ACTOR_EMAIL,
} from "@/lib/adminAccess/testing";

const setAdminRoleMock = adminAccessServerMock.setAdminRole as unknown as ReturnType<typeof vi.fn>;

function req(method: string, body?: unknown, url = "http://localhost/api/admin/team") {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer t" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const params = (uid: string) => ({ params: Promise.resolve({ uid }) });

function seedRole(uid: string, email: string, role: "admin" | "moderator") {
  hoisted.roles.set(uid, {
    role,
    email,
    grantedBy: { uid: "cli", email: "cli:ahsan" },
    grantedAt: hoisted.ts("2026-11-01T10:00:00.000Z"),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  actAs("admin");
  hoisted.roles.clear();
  hoisted.users.clear();

  // Me (the acting admin) plus one other admin and one moderator.
  seedRole(TEST_ACTOR_UID, TEST_ACTOR_EMAIL, "admin");
  seedRole("admin-2", "second@example.com", "admin");
  seedRole("mod-1", "mod@example.com", "moderator");
  hoisted.users.set("new-1", { uid: "new-1", email: "new@example.com", displayName: "New Person" });
  hoisted.users.set("mod-1", { uid: "mod-1", email: "mod@example.com" });
  hoisted.users.set(TEST_ACTOR_UID, { uid: TEST_ACTOR_UID, email: TEST_ACTOR_EMAIL });

  getAdminRoleMock.mockImplementation(async (uid: string) => {
    const role = hoisted.roles.get(uid)?.role;
    return role === "admin" || role === "moderator" ? role : null;
  });

  // Behave like the real setAdminRole against the in-memory store.
  setAdminRoleMock.mockImplementation(
    async (
      subject: { uid: string; email: string; displayName?: string },
      role: "admin" | "moderator" | null,
      grantedBy: { uid: string; email: string }
    ) => {
      if (role) {
        hoisted.roles.set(subject.uid, {
          role,
          email: subject.email,
          ...(subject.displayName ? { displayName: subject.displayName } : {}),
          grantedBy,
          grantedAt: hoisted.ts("2026-11-03T09:00:00.000Z"),
        });
      } else {
        hoisted.roles.delete(subject.uid);
      }
      return { ok: true, claimSynced: true };
    }
  );
});

describe("GET /api/admin/team", () => {
  it("is admin only: moderators get 403", async () => {
    actAs("moderator");
    const res = await GET(req("GET"));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Admins only");
  });

  it("lists everyone with a role, admins first", async () => {
    const res = await GET(req("GET"));
    expect(res.status).toBe(200);
    const { members } = await res.json();
    expect(members.map((m: { uid: string }) => m.uid)).toEqual([
      "admin-2",
      TEST_ACTOR_UID,
      "mod-1",
    ]);
    expect(members[2]).toMatchObject({
      email: "mod@example.com",
      role: "moderator",
      grantedBy: { uid: "cli", email: "cli:ahsan" },
      grantedAt: "2026-11-01T10:00:00.000Z",
    });
  });
});

describe("POST /api/admin/team", () => {
  it("is admin only: moderators get 403 and nothing is written", async () => {
    actAs("moderator");
    const res = await POST(req("POST", { email: "new@example.com", role: "moderator" }));
    expect(res.status).toBe(403);
    expect(setAdminRoleMock).not.toHaveBeenCalled();
  });

  it("adds an existing account by email and audits it", async () => {
    const res = await POST(req("POST", { email: "new@example.com", role: "moderator" }));
    expect(res.status).toBe(201);
    const { member } = await res.json();
    expect(member).toMatchObject({ uid: "new-1", role: "moderator", displayName: "New Person" });

    expect(setAdminRoleMock).toHaveBeenCalledWith(
      { uid: "new-1", email: "new@example.com", displayName: "New Person" },
      "moderator",
      { uid: TEST_ACTOR_UID, email: TEST_ACTOR_EMAIL }
    );
    expect(logAdminActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ uid: TEST_ACTOR_UID }),
      "staff.manage",
      { type: "user", id: "new-1", label: "new@example.com" },
      { role: "moderator", previousRole: null }
    );
  });

  it("returns a friendly 404 for an email with no account", async () => {
    const res = await POST(req("POST", { email: "nobody@example.com", role: "admin" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe(
      "No account with that email. They need to sign in to the site once first."
    );
    expect(setAdminRoleMock).not.toHaveBeenCalled();
    expect(logAdminActionMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid role", async () => {
    const res = await POST(req("POST", { email: "new@example.com", role: "owner" }));
    expect(res.status).toBe(400);
  });

  it("refuses to change your own role (400)", async () => {
    const res = await POST(req("POST", { email: TEST_ACTOR_EMAIL, role: "moderator" }));
    expect(res.status).toBe(400);
    expect(setAdminRoleMock).not.toHaveBeenCalled();
  });

  it("records the previous role when re-granting", async () => {
    const res = await POST(req("POST", { email: "mod@example.com", role: "admin" }));
    expect(res.status).toBe(200);
    expect(logAdminActionMock).toHaveBeenCalledWith(
      expect.anything(),
      "staff.manage",
      expect.objectContaining({ id: "mod-1" }),
      { role: "admin", previousRole: "moderator" }
    );
  });
});

describe("PATCH /api/admin/team/[uid]", () => {
  it("is admin only: moderators get 403", async () => {
    actAs("moderator");
    const res = await PATCH(req("PATCH", { role: "admin" }), params("mod-1"));
    expect(res.status).toBe(403);
  });

  it("changes a role and audits it", async () => {
    const res = await PATCH(req("PATCH", { role: "admin" }), params("mod-1"));
    expect(res.status).toBe(200);
    expect(hoisted.roles.get("mod-1")?.role).toBe("admin");
    expect(logAdminActionMock).toHaveBeenCalledWith(
      expect.anything(),
      "staff.manage",
      { type: "user", id: "mod-1", label: "mod@example.com" },
      { role: "admin", previousRole: "moderator" }
    );
  });

  it("refuses to change your own role (400)", async () => {
    const res = await PATCH(req("PATCH", { role: "moderator" }), params(TEST_ACTOR_UID));
    expect(res.status).toBe(400);
    expect(setAdminRoleMock).not.toHaveBeenCalled();
  });

  it("refuses to demote the last admin (409)", async () => {
    // Only admin-2 holds the admin role (inconsistent state the guard must still catch).
    hoisted.roles.delete(TEST_ACTOR_UID);
    const res = await PATCH(req("PATCH", { role: "moderator" }), params("admin-2"));
    expect(res.status).toBe(409);
    expect(setAdminRoleMock).not.toHaveBeenCalled();
    expect(logAdminActionMock).not.toHaveBeenCalled();
  });

  it("returns 404 for someone not on the team", async () => {
    const res = await PATCH(req("PATCH", { role: "admin" }), params("stranger"));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/team/[uid]", () => {
  it("is admin only: moderators get 403", async () => {
    actAs("moderator");
    const res = await DELETE(req("DELETE"), params("mod-1"));
    expect(res.status).toBe(403);
    expect(hoisted.roles.has("mod-1")).toBe(true);
  });

  it("revokes access and audits it", async () => {
    const res = await DELETE(req("DELETE"), params("admin-2"));
    expect(res.status).toBe(200);
    expect(hoisted.roles.has("admin-2")).toBe(false);
    expect(setAdminRoleMock).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "admin-2" }),
      null,
      { uid: TEST_ACTOR_UID, email: TEST_ACTOR_EMAIL }
    );
    expect(logAdminActionMock).toHaveBeenCalledWith(
      expect.anything(),
      "staff.manage",
      { type: "user", id: "admin-2", label: "second@example.com" },
      { role: null, previousRole: "admin" }
    );
  });

  it("refuses to remove yourself (400)", async () => {
    const res = await DELETE(req("DELETE"), params(TEST_ACTOR_UID));
    expect(res.status).toBe(400);
    expect(hoisted.roles.has(TEST_ACTOR_UID)).toBe(true);
  });

  it("refuses to remove the last admin (409)", async () => {
    hoisted.roles.delete(TEST_ACTOR_UID);
    const res = await DELETE(req("DELETE"), params("admin-2"));
    expect(res.status).toBe(409);
    expect(hoisted.roles.has("admin-2")).toBe(true);
  });

  it("lets an admin remove a moderator even when they are the only admin", async () => {
    hoisted.roles.delete("admin-2");
    const res = await DELETE(req("DELETE"), params("mod-1"));
    expect(res.status).toBe(200);
  });
});
