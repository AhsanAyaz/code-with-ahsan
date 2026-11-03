import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Every mentorship admin handler must reject requests that lack a valid
// `x-admin-token` (an unexpired doc in `admin_sessions`) before touching data.

// ─── Mocks ────────────────────────────────────────────────────────────────────

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
vi.mock("@/lib/ambassador/adminAuth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/mentorship/deleteMenteeCascade", () => ({ cascadeDeleteMentee: vi.fn() }));
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: vi.fn().mockReturnValue({ _type: "serverTimestamp" }),
    delete: vi.fn().mockReturnValue({ _type: "delete" }),
  },
}));

const hoisted = vi.hoisted(() => {
  const sessions: Record<string, Date> = {
    "valid-token": new Date(Date.now() + 60 * 60 * 1000),
    "expired-token": new Date(Date.now() - 60 * 1000),
  };
  // Records every non-session collection touched, so tests can assert that
  // rejected requests never reach business data.
  const dataAccess: string[] = [];

  const mockCollection = vi.fn((name: string) => {
    if (name === "admin_sessions") {
      return {
        doc: (id: string) => ({
          get: async () => ({
            exists: id in sessions,
            data: () => ({ expiresAt: { toDate: () => sessions[id] } }),
          }),
          delete: vi.fn().mockResolvedValue(undefined),
        }),
      };
    }
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

import { GET as statsGET } from "../stats/route";
import { GET as matchesGET } from "../matches/route";
import { GET as reviewsGET } from "../reviews/route";
import { PUT as alertsPUT } from "../alerts/route";
import { GET as profilesGET, PUT as profilesPUT } from "../profiles/route";
import { PUT as sessionsPUT, DELETE as sessionsDELETE } from "../sessions/route";
import { POST as regeneratePOST } from "../sessions/regenerate-channel/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Handler = (req: NextRequest) => Promise<Response>;

function makeRequest(
  method: string,
  path: string,
  token: string | null,
  body?: unknown
): NextRequest {
  return new NextRequest(`http://localhost/api/mentorship/admin/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-admin-token": token } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

// Each case uses input that fails the handler's own validation (400) once past
// the guard, so the "valid token" case proves the gate lets admins through
// without needing to mock the business logic.
const cases: Array<{
  name: string;
  handler: Handler;
  method: string;
  path: string;
  body?: unknown;
  validStatus?: number;
}> = [
  { name: "GET stats", handler: statsGET, method: "GET", path: "stats" },
  { name: "GET matches", handler: matchesGET, method: "GET", path: "matches", validStatus: 400 },
  { name: "GET reviews", handler: reviewsGET, method: "GET", path: "reviews", validStatus: 400 },
  {
    name: "PUT alerts",
    handler: alertsPUT,
    method: "PUT",
    path: "alerts",
    body: {},
    validStatus: 400,
  },
  { name: "GET profiles", handler: profilesGET, method: "GET", path: "profiles?role=mentor" },
  {
    name: "PUT profiles",
    handler: profilesPUT,
    method: "PUT",
    path: "profiles",
    body: {},
    validStatus: 400,
  },
  {
    name: "PUT sessions",
    handler: sessionsPUT,
    method: "PUT",
    path: "sessions",
    body: {},
    validStatus: 400,
  },
  {
    name: "DELETE sessions",
    handler: sessionsDELETE,
    method: "DELETE",
    path: "sessions",
    validStatus: 400,
  },
  {
    name: "POST sessions/regenerate-channel",
    handler: regeneratePOST,
    method: "POST",
    path: "sessions/regenerate-channel",
    body: {},
    validStatus: 400,
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("mentorship admin endpoints require an admin session", () => {
  beforeEach(() => {
    hoisted.dataAccess.length = 0;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe.each(cases)("$name", ({ handler, method, path, body, validStatus }) => {
    it("returns 401 with no x-admin-token header", async () => {
      const res = await handler(makeRequest(method, path, null, body));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
      expect(hoisted.dataAccess).toEqual([]);
    });

    it("returns 401 with an unknown token", async () => {
      const res = await handler(makeRequest(method, path, "forged-token", body));
      expect(res.status).toBe(401);
      expect(hoisted.dataAccess).toEqual([]);
    });

    it("returns 401 with an expired token", async () => {
      const res = await handler(makeRequest(method, path, "expired-token", body));
      expect(res.status).toBe(401);
      expect(hoisted.dataAccess).toEqual([]);
    });

    it("lets a valid admin session past the guard", async () => {
      const res = await handler(makeRequest(method, path, "valid-token", body));
      expect(res.status).not.toBe(401);
      if (validStatus) expect(res.status).toBe(validStatus);
    });
  });
});
