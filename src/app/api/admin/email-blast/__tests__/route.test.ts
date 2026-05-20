import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/ambassador/adminAuth", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/ghost/admin", () => ({
  getDraftHtml: vi.fn(),
  listEmailBlastDrafts: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: vi.fn().mockReturnValue({ _type: "serverTimestamp" }),
  },
}));

// Firestore mock — use vi.hoisted so variables are available in the factory
const { mockSet, mockUpdate, mockDocRef, mockDoc, mockCollection } = vi.hoisted(() => {
  const mockUpdate = vi.fn().mockResolvedValue(undefined);
  const mockSet = vi.fn().mockResolvedValue(undefined);
  const mockDocRef = { id: "blast-doc-id", set: mockSet, update: mockUpdate };
  const mockDoc = vi.fn().mockReturnValue(mockDocRef);
  const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });
  return { mockSet, mockUpdate, mockDocRef, mockDoc, mockCollection };
});

vi.mock("@/lib/firebaseAdmin", () => ({
  db: { collection: mockCollection },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { POST } from "../route";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import { getDraftHtml } from "@/lib/ghost/admin";
import { sendEmail } from "@/lib/email";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, adminToken = "valid-token"): NextRequest {
  return new NextRequest("http://localhost/api/admin/email-blast", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": adminToken,
    },
    body: JSON.stringify(body),
  });
}

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockGetDraftHtml = vi.mocked(getDraftHtml);
const mockSendEmail = vi.mocked(sendEmail);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/admin/email-blast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);
    mockDoc.mockReturnValue(mockDocRef);
    mockCollection.mockReturnValue({ doc: mockDoc });
  });

  it("returns 401 when admin token is missing or invalid", async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: "Admin token required",
    });

    const req = makeRequest({}, "");
    const res = await POST(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/admin token/i);
  });

  it("returns 400 when ghostPostId is missing", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });

    const req = makeRequest({ subject: "Hello", recipients: [{ name: "Ali", email: "ali@example.com" }] });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/ghostPostId/i);
  });

  it("returns 400 when subject is missing", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });

    const req = makeRequest({ ghostPostId: "abc123", recipients: [{ name: "Ali", email: "ali@example.com" }] });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/subject/i);
  });

  it("returns 400 when recipients is empty array", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });

    const req = makeRequest({ ghostPostId: "abc123", subject: "Hi", recipients: [] });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 413 when recipients exceed 500", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });

    const recipients = Array.from({ length: 501 }, (_, i) => ({
      name: `User ${i}`,
      email: `user${i}@example.com`,
    }));

    const req = makeRequest({ ghostPostId: "abc123", subject: "Hi", recipients });
    const res = await POST(req);

    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toMatch(/500/);
  });

  it("returns 404 when draft is not found in Ghost", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce(null);

    const req = makeRequest({
      ghostPostId: "nonexistent",
      subject: "Test",
      recipients: [{ name: "Ali", email: "ali@example.com" }],
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/draft not found/i);
  });

  it("happy path: 2 recipients — sendEmail called twice, Firestore doc created + updated, response has sent: 2", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce({
      id: "ghost-post-1",
      title: "Workshop Recap",
      html: "<p>Hello {{name}}, welcome!</p>",
      status: "draft",
      updatedAt: "2026-05-20T00:00:00Z",
      url: null,
    });
    mockSendEmail.mockResolvedValue(true);

    const recipients = [
      { name: "Ali", email: "ali@example.com" },
      { name: "Sara", email: "sara@example.com" },
    ];

    const req = makeRequest({ ghostPostId: "ghost-post-1", subject: "Workshop!", recipients });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();

    // sendEmail called twice with personalized HTML
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    expect(mockSendEmail).toHaveBeenCalledWith(
      "ali@example.com",
      "Workshop!",
      "<p>Hello Ali, welcome!</p>"
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      "sara@example.com",
      "Workshop!",
      "<p>Hello Sara, welcome!</p>"
    );

    // Firestore: set called (pre-create), update called (final)
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet.mock.calls[0][0]).toMatchObject({
      status: "in_progress",
      ghostPostId: "ghost-post-1",
      recipientCount: 2,
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({
      status: "completed",
      sentCount: 2,
      failedCount: 0,
    });

    // Response shape
    expect(json.sent).toBe(2);
    expect(json.failed).toBe(0);
    expect(json.blastId).toBe("blast-doc-id");
    expect(json.results).toHaveLength(2);
    expect(json.results[0]).toMatchObject({ name: "Ali", email: "ali@example.com", ok: true });
    expect(json.results[1]).toMatchObject({ name: "Sara", email: "sara@example.com", ok: true });
  });

  it("1 send failure: sendEmail returns false → failed: 1, audit log failedCount: 1", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce({
      id: "ghost-post-2",
      title: "Event",
      html: "<p>Hi {{name}}</p>",
      status: "draft",
      updatedAt: "2026-05-20T00:00:00Z",
      url: null,
    });
    // First call succeeds, second fails
    mockSendEmail
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const recipients = [
      { name: "Ali", email: "ali@example.com" },
      { name: "Bad", email: "bad@example.com" },
    ];

    const req = makeRequest({ ghostPostId: "ghost-post-2", subject: "Event!", recipients });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.sent).toBe(1);
    expect(json.failed).toBe(1);

    const failedResult = json.results.find((r: { ok: boolean }) => !r.ok);
    expect(failedResult).toBeDefined();
    expect(failedResult.email).toBe("bad@example.com");

    // Audit log updated with failedCount: 1
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({
      status: "completed",
      sentCount: 1,
      failedCount: 1,
    });
  });

  it("{{name}} replacement HTML-escapes the recipient name", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce({
      id: "ghost-post-3",
      title: "XSS Test",
      html: "<p>Dear {{name}},</p>",
      status: "draft",
      updatedAt: "2026-05-20T00:00:00Z",
      url: null,
    });
    mockSendEmail.mockResolvedValue(true);

    const recipients = [{ name: "<b>", email: "xss@example.com" }];

    const req = makeRequest({ ghostPostId: "ghost-post-3", subject: "Test", recipients });
    await POST(req);

    // sendEmail must receive escaped HTML, not raw <b>
    expect(mockSendEmail).toHaveBeenCalledWith(
      "xss@example.com",
      "Test",
      "<p>Dear &lt;b&gt;,</p>"
    );
  });

  it("250ms gap: at least N-1 setTimeout calls for N recipients", async () => {
    const originalSetTimeout = global.setTimeout;
    const setTimeoutMock = vi.fn().mockImplementation((fn: () => void, _delay?: number) => {
      fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });
    global.setTimeout = setTimeoutMock as unknown as typeof setTimeout;

    try {
      mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
      mockGetDraftHtml.mockResolvedValueOnce({
        id: "ghost-post-4",
        title: "Timing Test",
        html: "<p>Hello {{name}}</p>",
        status: "draft",
        updatedAt: "2026-05-20T00:00:00Z",
        url: null,
      });
      mockSendEmail.mockResolvedValue(true);

      const recipients = [
        { name: "A", email: "a@example.com" },
        { name: "B", email: "b@example.com" },
        { name: "C", email: "c@example.com" },
      ];

      const req = makeRequest({ ghostPostId: "ghost-post-4", subject: "Hi", recipients });
      await POST(req);

      // 3 recipients → 2 setTimeout calls with 250ms delay (no delay after last)
      const timedCalls = setTimeoutMock.mock.calls.filter((args) => args[1] === 250);
      expect(timedCalls.length).toBeGreaterThanOrEqual(recipients.length - 1);
    } finally {
      global.setTimeout = originalSetTimeout;
    }
  });
});
