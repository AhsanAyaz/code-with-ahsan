import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
  sendEmailBatch: vi.fn(),
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
import { sendEmailBatch } from "@/lib/email";

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

function makeDraft(overrides: Partial<{ id: string; title: string; html: string }> = {}) {
  return {
    id: "ghost-post-1",
    title: "Workshop Recap",
    html: "<p>Hello {{name}}, welcome!</p>",
    status: "draft",
    updatedAt: "2026-05-20T00:00:00Z",
    url: null,
    ...overrides,
  };
}

function allOk(payload: Array<{ to: string }>) {
  return payload.map((e) => ({ to: e.to, ok: true }));
}

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockGetDraftHtml = vi.mocked(getDraftHtml);
const mockSendEmailBatch = vi.mocked(sendEmailBatch);

function batchPayload() {
  return mockSendEmailBatch.mock.calls[0][0];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/admin/email-blast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);
    mockDoc.mockReturnValue(mockDocRef);
    mockCollection.mockReturnValue({ doc: mockDoc });
    mockSendEmailBatch.mockImplementation(async (emails) => allOk(emails));
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(mockSendEmailBatch).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("returns 400 when ghostPostId is missing", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });

    const req = makeRequest({
      subject: "Hello",
      recipients: [{ name: "Ali", email: "ali@example.com" }],
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/ghostPostId/i);
  });

  it("returns 400 when subject is missing", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });

    const req = makeRequest({
      ghostPostId: "abc123",
      recipients: [{ name: "Ali", email: "ali@example.com" }],
    });
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

  it("returns 400 when a recipient is missing name or email", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });

    const req = makeRequest({
      ghostPostId: "abc123",
      subject: "Hi",
      recipients: [{ name: "Ali", email: "ali@example.com" }, { name: "NoEmail" }],
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/recipients\[1\]/);
    expect(mockSendEmailBatch).not.toHaveBeenCalled();
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
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("happy path: one batch call with per-recipient payloads, audit doc created + completed, sent: 2", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce(makeDraft());

    const recipients = [
      { name: "Ali", email: "ali@example.com" },
      { name: "Sara", email: "sara@example.com" },
    ];

    const req = makeRequest({ ghostPostId: "ghost-post-1", subject: "Workshop!", recipients });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(mockSendEmailBatch).toHaveBeenCalledTimes(1);
    expect(batchPayload()).toEqual([
      {
        to: "ali@example.com",
        subject: "Workshop!",
        html: "<p>Hello Ali, welcome!</p>",
      },
      {
        to: "sara@example.com",
        subject: "Workshop!",
        html: "<p>Hello Sara, welcome!</p>",
      },
    ]);

    expect(mockCollection).toHaveBeenCalledWith("email-blasts");
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet.mock.calls[0][0]).toMatchObject({
      status: "in_progress",
      ghostPostId: "ghost-post-1",
      ghostPostTitle: "Workshop Recap",
      subject: "Workshop!",
      sentBy: "admin:test123456",
      recipientCount: 2,
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({
      status: "completed",
      sentCount: 2,
      failedCount: 0,
    });
    expect(mockUpdate.mock.calls[0][0].recipients).toEqual([
      { name: "Ali", email: "ali@example.com", ok: true },
      { name: "Sara", email: "sara@example.com", ok: true },
    ]);

    // Response shape
    expect(json.sent).toBe(2);
    expect(json.failed).toBe(0);
    expect(json.blastId).toBe("blast-doc-id");
    expect(json.results).toEqual([
      { name: "Ali", email: "ali@example.com", ok: true },
      { name: "Sara", email: "sara@example.com", ok: true },
    ]);
  });

  it("batches all recipients into a single sendEmailBatch call (no per-email fan-out)", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce(makeDraft({ html: "<p>Hello {{name}}</p>" }));

    const recipients = Array.from({ length: 25 }, (_, i) => ({
      name: `User${i}`,
      email: `user${i}@example.com`,
    }));

    const req = makeRequest({ ghostPostId: "ghost-post-4", subject: "Hi", recipients });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSendEmailBatch).toHaveBeenCalledTimes(1);
    expect(batchPayload()).toHaveLength(25);
    expect(batchPayload().map((e) => e.to)).toEqual(recipients.map((r) => r.email));
  });

  it("trims the subject before sending and before writing the audit log", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce(makeDraft());

    const req = makeRequest({
      ghostPostId: "  ghost-post-1  ",
      subject: "  Padded Subject  ",
      recipients: [{ name: "Ali", email: "ali@example.com" }],
    });
    await POST(req);

    expect(batchPayload()[0].subject).toBe("Padded Subject");
    expect(mockSet.mock.calls[0][0]).toMatchObject({
      subject: "Padded Subject",
      ghostPostId: "ghost-post-1",
    });
    expect(mockGetDraftHtml).toHaveBeenCalledWith("ghost-post-1");
  });

  it("per-recipient failure: ok:false entries become failed count + propagate the error string", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce(
      makeDraft({ id: "ghost-post-2", title: "Event", html: "<p>Hi {{name}}</p>" })
    );

    mockSendEmailBatch.mockResolvedValueOnce([
      { to: "ali@example.com", ok: true },
      { to: "bad@example.com", ok: false, error: "Resend rejected recipient" },
    ]);

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

    expect(json.results).toEqual([
      { name: "Ali", email: "ali@example.com", ok: true },
      {
        name: "Bad",
        email: "bad@example.com",
        ok: false,
        error: "Resend rejected recipient",
      },
    ]);

    // Audit log records the failure and the error text.
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({
      status: "completed",
      sentCount: 1,
      failedCount: 1,
    });
    expect(mockUpdate.mock.calls[0][0].recipients[1]).toMatchObject({
      ok: false,
      error: "Resend rejected recipient",
    });
  });

  it("all recipients failing yields sent: 0 and failed: N but still completes", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce(makeDraft());

    mockSendEmailBatch.mockResolvedValueOnce([
      { to: "a@example.com", ok: false, error: "Resend not configured" },
      { to: "b@example.com", ok: false, error: "Resend not configured" },
    ]);

    const req = makeRequest({
      ghostPostId: "ghost-post-1",
      subject: "Hi",
      recipients: [
        { name: "A", email: "a@example.com" },
        { name: "B", email: "b@example.com" },
      ],
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sent).toBe(0);
    expect(json.failed).toBe(2);
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({
      status: "completed",
      sentCount: 0,
      failedCount: 2,
    });
  });

  it("sendEmailBatch throwing marks the blast errored and returns 500", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce(makeDraft());
    mockSendEmailBatch.mockRejectedValueOnce(new Error("Resend network failure"));

    const req = makeRequest({
      ghostPostId: "ghost-post-1",
      subject: "Hi",
      recipients: [
        { name: "Ali", email: "ali@example.com" },
        { name: "Sara", email: "sara@example.com" },
      ],
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/partially failed/i);
    expect(json.blastId).toBe("blast-doc-id");

    expect(json.results).toEqual([]);
    expect(json.sent).toBe(0);
    expect(json.failed).toBe(0);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({
      status: "errored",
      errorMessage: "Resend network failure",
      sentCount: 0,
      failedCount: 0,
    });

    expect(consoleSpy).toHaveBeenCalled();
  });

  it("still returns 500 when the errored-state Firestore update itself fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce(makeDraft());
    mockSendEmailBatch.mockRejectedValueOnce(new Error("Resend down"));
    mockUpdate.mockRejectedValueOnce(new Error("Firestore unavailable"));

    const req = makeRequest({
      ghostPostId: "ghost-post-1",
      subject: "Hi",
      recipients: [{ name: "Ali", email: "ali@example.com" }],
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/partially failed/i);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("a short batch result array fails safe rather than mis-mapping recipients", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce(makeDraft());
    mockSendEmailBatch.mockResolvedValueOnce([{ to: "ali@example.com", ok: true }]);

    const req = makeRequest({
      ghostPostId: "ghost-post-1",
      subject: "Hi",
      recipients: [
        { name: "Ali", email: "ali@example.com" },
        { name: "Sara", email: "sara@example.com" },
      ],
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({ status: "errored" });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("{{name}} replacement HTML-escapes angle brackets in the recipient name", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce(
      makeDraft({ id: "ghost-post-3", title: "XSS Test", html: "<p>Dear {{name}},</p>" })
    );

    const req = makeRequest({
      ghostPostId: "ghost-post-3",
      subject: "Test",
      recipients: [{ name: "<b>", email: "xss@example.com" }],
    });
    await POST(req);

    expect(batchPayload()[0]).toEqual({
      to: "xss@example.com",
      subject: "Test",
      html: "<p>Dear &lt;b&gt;,</p>",
    });
  });

  it("escapes a script-injection attempt in the recipient name", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce(makeDraft({ html: "<p>Dear {{name}}</p>" }));

    const req = makeRequest({
      ghostPostId: "ghost-post-3",
      subject: "Test",
      recipients: [{ name: "<script>alert(1)</script>", email: "xss@example.com" }],
    });
    await POST(req);

    const html = batchPayload()[0].html;
    expect(html).toBe("<p>Dear &lt;script&gt;alert(1)&lt;/script&gt;</p>");
    expect(html).not.toContain("<script>");
  });

  it("escapes quotes and ampersands without double-escaping", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce(makeDraft({ html: "<p>Dear {{name}}</p>" }));

    const req = makeRequest({
      ghostPostId: "ghost-post-1",
      subject: "Test",
      recipients: [{ name: `O'Brien & "Co" <x>`, email: "punct@example.com" }],
    });
    await POST(req);

    expect(batchPayload()[0].html).toBe("<p>Dear O&#x27;Brien &amp; &quot;Co&quot; &lt;x&gt;</p>");
  });

  it("replaces every {{name}} occurrence in the template, not just the first", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce(
      makeDraft({ html: "<p>Hi {{name}}</p><p>Bye {{name}}</p>" })
    );

    const req = makeRequest({
      ghostPostId: "ghost-post-1",
      subject: "Test",
      recipients: [{ name: "Ali", email: "ali@example.com" }],
    });
    await POST(req);

    expect(batchPayload()[0].html).toBe("<p>Hi Ali</p><p>Bye Ali</p>");
  });

  it("personalises each recipient independently within the same batch", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, uid: "admin:test123456" });
    mockGetDraftHtml.mockResolvedValueOnce(makeDraft({ html: "<p>Hi {{name}}</p>" }));

    const req = makeRequest({
      ghostPostId: "ghost-post-1",
      subject: "Test",
      recipients: [
        { name: "Ali", email: "ali@example.com" },
        { name: "<b>Sara</b>", email: "sara@example.com" },
      ],
    });
    await POST(req);

    expect(batchPayload().map((e) => e.html)).toEqual([
      "<p>Hi Ali</p>",
      "<p>Hi &lt;b&gt;Sara&lt;/b&gt;</p>",
    ]);
  });
});
