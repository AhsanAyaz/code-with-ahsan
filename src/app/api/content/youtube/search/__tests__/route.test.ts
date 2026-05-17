import { describe, it, expect, vi, beforeEach } from "vitest";

import { GET } from "../route";
import { NextRequest } from "next/server";

beforeEach(() => {
  vi.unstubAllGlobals();
  process.env.YT_API_KEY = "test-key";
});

describe("GET /api/content/youtube/search", () => {
  it("returns 400 when q is missing", async () => {
    const req = new NextRequest("http://test.local/api/content/youtube/search");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing q/i);
  });

  it("returns 500 when YT_API_KEY is unset", async () => {
    delete process.env.YT_API_KEY;
    const req = new NextRequest(
      "http://test.local/api/content/youtube/search?q=signals"
    );
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/not configured/i);
  });

  it("returns shaped videos and scopes search to CWA channelId", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            id: { videoId: "abc123" },
            snippet: {
              title: "Angular Signals Deep Dive",
              description: "All about signals.",
              publishedAt: "2025-01-01T00:00:00Z",
              thumbnails: {
                high: { url: "https://i.ytimg.com/vi/abc123/hqdefault.jpg" },
              },
              channelTitle: "Code With Ahsan",
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const req = new NextRequest(
      "http://test.local/api/content/youtube/search?q=signals"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.videos[0].url).toBe("https://youtube.com/watch?v=abc123");
    expect(body.count).toBe(1);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain("channelId=UC");
    expect(calledUrl).toContain("youtube/v3/search");
    expect(calledOptions?.next?.revalidate).toBe(3600);
  });

  it("returns 502 on YouTube upstream non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) })
    );
    const req = new NextRequest(
      "http://test.local/api/content/youtube/search?q=angular"
    );
    const res = await GET(req);
    expect(res.status).toBe(502);
  });

  it("returns 500 on fetch throw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );
    const req = new NextRequest(
      "http://test.local/api/content/youtube/search?q=angular"
    );
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
