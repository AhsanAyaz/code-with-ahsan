import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock @tryghost/admin-api with a proper class constructor
// ---------------------------------------------------------------------------
const mockBrowse = vi.fn();
const mockRead = vi.fn();

vi.mock("@tryghost/admin-api", () => {
  class MockGhostAdminAPI {
    posts = {
      browse: mockBrowse,
      read: mockRead,
    };
  }
  return { default: MockGhostAdminAPI };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const FAKE_POST = {
  id: "abc123",
  title: "Welcome to our workshop!",
  html: "<p>Hello world</p>",
  status: "draft" as const,
  updated_at: "2026-05-20T10:00:00.000Z",
  url: null,
};

const MAPPED_DRAFT = {
  id: "abc123",
  title: "Welcome to our workshop!",
  html: "<p>Hello world</p>",
  status: "draft",
  updatedAt: "2026-05-20T10:00:00.000Z",
  url: null,
};

// ---------------------------------------------------------------------------
// Tests
// We import the module functions dynamically after resetting the singleton
// by re-importing the module each time via vi.importActual-style.
// Instead we directly import once and reset the internal client via module reset.
// ---------------------------------------------------------------------------
describe("Ghost Admin API client", () => {
  beforeEach(() => {
    mockBrowse.mockReset();
    mockRead.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("listEmailBlastDrafts()", () => {
    it("returns empty array and logs warn when GHOST_ADMIN_API_KEY is missing", async () => {
      const originalKey = process.env.GHOST_ADMIN_API_KEY;
      delete process.env.GHOST_ADMIN_API_KEY;

      const warnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);

      // Re-import to get a fresh module without cached singleton
      const { listEmailBlastDrafts } = await import("@/lib/ghost/admin");
      const result = await listEmailBlastDrafts();

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("GHOST_ADMIN_API_KEY is not set")
      );
      expect(mockBrowse).not.toHaveBeenCalled();

      if (originalKey !== undefined) {
        process.env.GHOST_ADMIN_API_KEY = originalKey;
      }
    });

    it("returns mapped EmailBlastDraft array on happy path", async () => {
      process.env.GHOST_ADMIN_API_KEY = "fake-id:fake-secret";
      mockBrowse.mockResolvedValueOnce([FAKE_POST]);

      const { listEmailBlastDrafts } = await import("@/lib/ghost/admin");
      const result = await listEmailBlastDrafts();

      expect(result).toEqual([MAPPED_DRAFT]);
      expect(mockBrowse).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "tag:hash-email-blast+status:draft",
        })
      );
    });

    it("returns empty array (no throw) when SDK rejects", async () => {
      process.env.GHOST_ADMIN_API_KEY = "fake-id:fake-secret";
      mockBrowse.mockRejectedValueOnce(new Error("Network error"));

      const errorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      const { listEmailBlastDrafts } = await import("@/lib/ghost/admin");
      const result = await listEmailBlastDrafts();

      expect(result).toEqual([]);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("getDraftHtml()", () => {
    it("returns mapped EmailBlastDraft on happy path", async () => {
      process.env.GHOST_ADMIN_API_KEY = "fake-id:fake-secret";
      mockRead.mockResolvedValueOnce(FAKE_POST);

      const { getDraftHtml } = await import("@/lib/ghost/admin");
      const result = await getDraftHtml("abc123");

      expect(result).toEqual(MAPPED_DRAFT);
      expect(mockRead).toHaveBeenCalledWith(
        { id: "abc123" },
        { formats: ["html"] }
      );
    });

    it("returns null (no throw) when SDK rejects (e.g. 404)", async () => {
      process.env.GHOST_ADMIN_API_KEY = "fake-id:fake-secret";
      mockRead.mockRejectedValueOnce(new Error("Not found"));

      const errorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      const { getDraftHtml } = await import("@/lib/ghost/admin");
      const result = await getDraftHtml("nonexistent");

      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
