import { NextRequest, NextResponse } from "next/server";

const CWA_CHANNEL_ID = "UCAys-Lg76QcRNGc0dOr_bXA"; // Code With Ahsan channel — scopes all proxy searches to Ahsan's videos only.

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
    const url =
      `https://www.googleapis.com/youtube/v3/search` +
      `?key=${process.env.YT_API_KEY}` +
      `&q=${encodeURIComponent(q)}` +
      `&type=video` +
      `&channelId=${CWA_CHANNEL_ID}` +
      `&part=snippet` +
      `&maxResults=5` +
      `&order=relevance`;

    const upstreamRes = await fetch(url, {
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

    const shaped = items.map((item) => ({
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
