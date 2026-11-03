import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Every mentorship admin handler must authorize the caller per action
// (requireAdminAccess) before touching data: 401 when signed out, 403 when the
// user has no staff role, 403 "Admins only" when a moderator calls an
// admin-only action.

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock(
  "@/lib/adminAccess/server",
  async () => (await import("@/lib/adminAccess/testing")).adminAccessServerMock
);
vi.mock("@/lib/discord", () => ({
  sendMentorChangesRequestedNotification: vi.fn(),
  sendChannelMessage: vi.fn(),
  sendChannelMessageWithComponents: vi.fn(),
  isDiscordConfigured: vi.fn().mockReturnValue(false),
  deleteMentorshipChannel: vi.fn(),
  unarchiveMentorshipChannel: vi.fn(),
  createMentorshipChannel: vi.fn(),
  deleteDiscordChannel: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendRegistrationStatusEmail: vi.fn(),
  sendAccountStatusEmail: vi.fn(),
  sendMentorshipRemovedEmail: vi.fn(),
}));
vi.mock("@/lib/ambassador/roleMutation", () => ({ syncRoleClaim: vi.fn() }));
vi.mock("@/lib/mentorship/deleteMenteeCascade", () => ({ cascadeDeleteMentee: vi.fn() }));
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: vi.fn().mockReturnValue({ _type: "serverTimestamp" }),
    delete: vi.fn().mockReturnValue({ _type: "delete" }),
  },
}));

const hoisted = vi.hoisted(() => {
  // Records every collection touched, so tests can assert that rejected
  // requests never reach business data.
  const dataAccess: string[] = [];
  const mockCollection = vi.fn((name: string) => {
    dataAccess.push(name);
    throw new Error(`unexpected data access: ${name}`);
  });
  return { dataAccess, mockCollection };
});

vi.mock("@/lib/firebaseAdmin", () => ({
  db: { collection: hoisted.mockCollection },
  auth: {},
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { actAs, logAdminActionMock } from "@/lib/adminAccess/testing";
import { GET as statsGET } from "../stats/route";
import { GET as matchesGET } from "../matches/route";
import { GET as reviewsGET } from "../reviews/route";
import { PUT as alertsPUT } from "../alerts/route";
import { GET as profilesGET, PUT as profilesPUT } from "../profiles/route";
import { PUT as sessionsPUT, DELETE as sessionsDELETE } from "../sessions/route";
import { POST as regeneratePOST } from "../sessions/regenerate-channel/route";
import { DELETE as deleteArchivedDELETE } from "../sessions/delete-archived-channels/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Handler = (req: NextRequest) => Promise<Response>;

function makeRequest(method: string, path: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/mentorship/admin/${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

// Each case uses input that fails the handler's own validation (400) once past
// the guard (or a 503 before any data access), so "allowed" cases prove the
// gate lets the role through without mocking the business logic.
const cases: Array<{
  name: string;
  handler: Handler;
  method: string;
  path: string;
  body?: unknown;
  passStatus?: number;
  adminOnly?: boolean;
}> = [
  { name: "GET stats", handler: statsGET, method: "GET", path: "stats" },
  { name: "GET matches", handler: matchesGET, method: "GET", path: "matches", passStatus: 400 },
  { name: "GET reviews", handler: reviewsGET, method: "GET", path: "reviews", passStatus: 400 },
  {
    name: "PUT alerts",
    handler: alertsPUT,
    method: "PUT",
    path: "alerts",
    body: {},
    passStatus: 400,
  },
  { name: "GET profiles", handler: profilesGET, method: "GET", path: "profiles?role=mentor" },
  {
    name: "PUT profiles (field edit)",
    handler: profilesPUT,
    method: "PUT",
    path: "profiles",
    body: {},
    passStatus: 400,
  },
  {
    name: "PUT profiles (accept)",
    handler: profilesPUT,
    method: "PUT",
    path: "profiles",
    body: { status: "accepted" },
    passStatus: 400,
  },
  {
    name: "PUT profiles (decline)",
    handler: profilesPUT,
    method: "PUT",
    path: "profiles",
    body: { status: "declined" },
    passStatus: 400,
    adminOnly: true,
  },
  {
    name: "PUT profiles (disable)",
    handler: profilesPUT,
    method: "PUT",
    path: "profiles",
    body: { status: "disabled" },
    passStatus: 400,
    adminOnly: true,
  },
  {
    name: "PUT sessions",
    handler: sessionsPUT,
    method: "PUT",
    path: "sessions",
    body: {},
    passStatus: 400,
  },
  {
    name: "DELETE sessions",
    handler: sessionsDELETE,
    method: "DELETE",
    path: "sessions",
    passStatus: 400,
    adminOnly: true,
  },
  {
    name: "POST sessions/regenerate-channel",
    handler: regeneratePOST,
    method: "POST",
    path: "sessions/regenerate-channel",
    body: {},
    passStatus: 400,
    adminOnly: true,
  },
  {
    name: "DELETE sessions/delete-archived-channels",
    handler: deleteArchivedDELETE as Handler,
    method: "DELETE",
    path: "sessions/delete-archived-channels",
    passStatus: 503,
    adminOnly: true,
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("mentorship admin endpoints authorize per action", () => {
  beforeEach(() => {
    hoisted.dataAccess.length = 0;
    logAdminActionMock.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe.each(cases)("$name", ({ handler, method, path, body, passStatus, adminOnly }) => {
    it("returns 401 when signed out", async () => {
      actAs("signed-out");
      const res = await handler(makeRequest(method, path, body));
      expect(res.status).toBe(401);
      expect(hoisted.dataAccess).toEqual([]);
    });

    it("returns 403 for a signed-in user with no staff role", async () => {
      actAs("no-role");
      const res = await handler(makeRequest(method, path, body));
      expect(res.status).toBe(403);
      expect(hoisted.dataAccess).toEqual([]);
    });

    if (adminOnly) {
      it("returns 403 Admins only for a moderator, without touching data", async () => {
        actAs("moderator");
        const res = await handler(makeRequest(method, path, body));
        expect(res.status).toBe(403);
        expect((await res.json()).error).toBe("Admins only");
        expect(hoisted.dataAccess).toEqual([]);
        expect(logAdminActionMock).not.toHaveBeenCalled();
      });
    } else {
      it("lets a moderator past the guard", async () => {
        actAs("moderator");
        const res = await handler(makeRequest(method, path, body));
        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
        if (passStatus) expect(res.status).toBe(passStatus);
      });
    }

    it("lets an admin past the guard", async () => {
      actAs("admin");
      const res = await handler(makeRequest(method, path, body));
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
      if (passStatus) expect(res.status).toBe(passStatus);
    });
  });
});
