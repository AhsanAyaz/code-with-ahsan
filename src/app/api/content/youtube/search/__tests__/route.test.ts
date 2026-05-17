import { describe, it, expect, vi, beforeEach } from "vitest";

import { GET } from "../route";
import { NextRequest } from "next/server";

beforeEach(() => {
  vi.unstubAllGlobals();
  process.env.YT_API_KEY = "test-key";
});

function mockSearchAndVideos(
  searchItems: Array<{ videoId: string; title?: string }>,
  durationsById: Record<string, string>
) {
  // First fetch = search.list, second fetch = videos.list.
  const mockFetch = vi
    .fn()
    .mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        items: searchItems.map((s) => ({
          id: { videoId: s.videoId },
          snippet: {
            title: s.title ?? `Video ${s.videoId}`,
            description: "desc",
            publishedAt: "2025-01-01T00:00:00Z",
            thumbnails: {
              high: { url: `https://i.ytimg.com/vi/${s.videoId}/hqdefault.jpg` },
            },
            channelTitle: "Code With Ahsan",
          },
        })),
      }),
    }))
    .mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        items: Object.entries(durationsById).map(([id, duration]) => ({
          id,
          contentDetails: { duration },
        })),
      }),
    }));
  vi.stubGlobal("fetch", mockFetch);
  return mockFetch;
}

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

  it("returns shaped long-form videos and scopes search to CWA channelId", async () => {
    const mockFetch = mockSearchAndVideos(
      [{ videoId: "abc123", title: "Angular Signals Deep Dive" }],
      { abc123: "PT12M34S" } // 12m34s — long-form
    );

    const req = new NextRequest(
      "http://test.local/api/content/youtube/search?q=signals"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.videos[0].url).toBe("https://youtube.com/watch?v=abc123");
    expect(body.videos[0].duration_seconds).toBe(12 * 60 + 34);
    expect(body.count).toBe(1);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [searchUrl, searchOpts] = mockFetch.mock.calls[0];
    expect(searchUrl).toContain("channelId=UC");
    expect(searchUrl).toContain("youtube/v3/search");
    expect(searchUrl).toContain("maxResults=10"); // over-fetch for shorts filter
    expect(searchOpts?.next?.revalidate).toBe(3600);

    const [videosUrl] = mockFetch.mock.calls[1];
    expect(videosUrl).toContain("youtube/v3/videos");
    expect(videosUrl).toContain("part=contentDetails");
    expect(videosUrl).toContain("id=abc123");
  });

  it("filters out Shorts (duration <= 60s)", async () => {
    mockSearchAndVideos(
      [
        { videoId: "shortA", title: "Quick tip" },
        { videoId: "longB", title: "Full tutorial" },
        { videoId: "shortC", title: "30 sec recap" },
        { videoId: "longD", title: "Deep dive" },
      ],
      {
        shortA: "PT45S",
        longB: "PT15M",
        shortC: "PT30S",
        longD: "PT1H5M",
      }
    );

    const req = new NextRequest(
      "http://test.local/api/content/youtube/search?q=anything"
    );
    const res = await GET(req);
    const body = await res.json();
    const ids = body.videos.map((v: { videoId: string }) => v.videoId);
    expect(ids).toEqual(["longB", "longD"]);
    expect(ids).not.toContain("shortA");
    expect(ids).not.toContain("shortC");
  });

  it("treats duration exactly 60s as a Short (excluded)", async () => {
    mockSearchAndVideos(
      [
        { videoId: "exact60" },
        { videoId: "sixtyOne" },
      ],
      {
        exact60: "PT1M",
        sixtyOne: "PT1M1S",
      }
    );

    const req = new NextRequest(
      "http://test.local/api/content/youtube/search?q=x"
    );
    const res = await GET(req);
    const body = await res.json();
    const ids = body.videos.map((v: { videoId: string }) => v.videoId);
    expect(ids).toEqual(["sixtyOne"]);
  });

  it("returns empty list when videos.list fails (fail-closed, no Shorts leak)", async () => {
    const mockFetch = vi
      .fn()
      .mockImplementationOnce(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: { videoId: "vidX" },
              snippet: {
                title: "T",
                description: "",
                publishedAt: "2025-01-01",
                thumbnails: {},
                channelTitle: "Code With Ahsan",
              },
            },
          ],
        }),
      }))
      .mockImplementationOnce(async () => ({
        ok: false,
        status: 500,
        json: async () => ({}),
      }));
    vi.stubGlobal("fetch", mockFetch);

    const req = new NextRequest(
      "http://test.local/api/content/youtube/search?q=x"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.videos).toEqual([]);
    expect(body.count).toBe(0);
  });

  it("returns 502 on YouTube search upstream non-2xx", async () => {
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

  it("returns empty when search returns no items (no videos.list call)", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const req = new NextRequest(
      "http://test.local/api/content/youtube/search?q=zzz"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.videos).toEqual([]);
    expect(body.count).toBe(0);
    expect(mockFetch).toHaveBeenCalledOnce(); // no second call
  });
});
