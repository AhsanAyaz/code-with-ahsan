import { NextRequest, NextResponse } from "next/server";

const CWA_CHANNEL_ID = "UCAys-Lg76QcRNGc0dOr_bXA"; // Code With Ahsan channel — scopes all proxy searches to Ahsan's videos only.
const SHORTS_MAX_SECONDS = 60; // Videos <= this are treated as Shorts and excluded.
const SEARCH_OVERFETCH = 10; // Over-fetch to compensate for Shorts dropped during duration filter.
const RESULT_LIMIT = 5;

function parseIsoDurationSeconds(iso: string): number {
  // ISO 8601 PT#H#M#S — YouTube returns this in contentDetails.duration.
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim() === "") {
    return NextResponse.json({ error: "Missing q param" }, { status: 400 });
  }

  if (!process.env.YT_API_KEY) {
    return NextResponse.json(
      { error: "YT_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const searchUrl =
      `https://www.googleapis.com/youtube/v3/search` +
      `?key=${process.env.YT_API_KEY}` +
      `&q=${encodeURIComponent(q)}` +
      `&type=video` +
      `&channelId=${CWA_CHANNEL_ID}` +
      `&part=snippet` +
      `&maxResults=${SEARCH_OVERFETCH}` +
      `&order=relevance`;

    const upstreamRes = await fetch(searchUrl, {
      next: { revalidate: 3600, tags: ["content:youtube"] },
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: "YouTube upstream error", status: upstreamRes.status },
        { status: 502 }
      );
    }

    const data = await upstreamRes.json();
    const items: Array<{
      id: { videoId: string };
      snippet: {
        title: string;
        description: string;
        publishedAt: string;
        thumbnails: {
          default?: { url: string };
          medium?: { url: string };
          high?: { url: string };
        };
        channelTitle: string;
      };
    }> = data.items || [];

    if (items.length === 0) {
      return NextResponse.json({ videos: [], count: 0 }, { status: 200 });
    }

    const ids = items.map((i) => i.id.videoId).filter(Boolean);
    const videosUrl =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?key=${process.env.YT_API_KEY}` +
      `&id=${ids.join(",")}` +
      `&part=contentDetails`;

    const detailsRes = await fetch(videosUrl, {
      next: { revalidate: 3600, tags: ["content:youtube"] },
    });

    const durationById = new Map<string, number>();
    if (detailsRes.ok) {
      const detailsJson = await detailsRes.json();
      const detailItems: Array<{ id: string; contentDetails?: { duration?: string } }> =
        detailsJson.items || [];
      for (const item of detailItems) {
        const dur = item.contentDetails?.duration;
        if (dur) durationById.set(item.id, parseIsoDurationSeconds(dur));
      }
    }
    // If detailsRes failed we fall through with an empty map — that drops every video.
    // Better to return zero than to leak Shorts past the filter.

    const longForm = items.filter((item) => {
      const seconds = durationById.get(item.id.videoId) ?? 0;
      return seconds > SHORTS_MAX_SECONDS;
    });

    const shaped = longForm.slice(0, RESULT_LIMIT).map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: (item.snippet.description || "").slice(0, 300),
      url: `https://youtube.com/watch?v=${item.id.videoId}`,
      thumbnail:
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.medium?.url ||
        item.snippet.thumbnails?.default?.url ||
        null,
      published_at: item.snippet.publishedAt,
      channel_title: item.snippet.channelTitle,
      duration_seconds: durationById.get(item.id.videoId) ?? 0,
    }));

    return NextResponse.json(
      { videos: shaped, count: shaped.length },
      { status: 200 }
    );
  } catch (err) {
    console.error("YouTube search error:", err);
    return NextResponse.json(
      { error: "Failed to search YouTube" },
      { status: 500 }
    );
  }
}
