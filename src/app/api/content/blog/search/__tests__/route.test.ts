import { describe, it, expect, vi, beforeEach } from "vitest";

import { GET } from "../route";
import { NextRequest } from "next/server";

beforeEach(() => {
  vi.unstubAllGlobals();
  process.env.GHOST_CONTENT_API_KEY = "test-key";
});

describe("GET /api/content/blog/search", () => {
  it("returns 400 when q is missing", async () => {
    const req = new NextRequest("http://test.local/api/content/blog/search");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Missing q/i);
  });

  it("returns 500 when GHOST_CONTENT_API_KEY is unset", async () => {
    delete process.env.GHOST_CONTENT_API_KEY;
    const req = new NextRequest("http://test.local/api/content/blog/search?q=angular");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/not configured/i);
  });

  it("returns shaped posts on Ghost success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        posts: [
          {
            title: "Signals Deep Dive",
            slug: "signals-deep-dive",
            excerpt: "...",
            published_at: "2025-01-01",
            feature_image: null,
            reading_time: 5,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const req = new NextRequest("http://test.local/api/content/blog/search?q=signals");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts[0].url).toBe("https://blog.codewithahsan.dev/signals-deep-dive/");
    expect(body.count).toBe(1);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain("blog.codewithahsan.dev/ghost/api/content/posts/");
    expect(calledOptions?.next?.revalidate).toBe(3600);
  });

  it("escapes single quotes and backslashes in NQL filter", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ posts: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const req = new NextRequest(
      "http://test.local/api/content/blog/search?q=" +
        encodeURIComponent("Developer's \\guide")
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const [calledUrl] = mockFetch.mock.calls[0];
    // Ghost NQL requires backslash-escaped single quotes inside filter strings.
    // The double-escape \\\\' represents the literal sequence \' after URL decoding.
    expect(calledUrl).toContain("filter=" + encodeURIComponent("title:~'Developer\\'s \\\\guide'"));
  });

  it("returns 502 on Ghost upstream non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) })
    );
    const req = new NextRequest("http://test.local/api/content/blog/search?q=angular");
    const res = await GET(req);
    expect(res.status).toBe(502);
  });

  it("returns 500 on fetch throw", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const req = new NextRequest("http://test.local/api/content/blog/search?q=angular");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
