import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim() === "") {
    return NextResponse.json({ error: "Missing q param" }, { status: 400 });
  }

  if (!process.env.GHOST_CONTENT_API_KEY) {
    return NextResponse.json(
      { error: "GHOST_CONTENT_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const filter = encodeURIComponent(`title:~'${q}',excerpt:~'${q}'`);
    const url =
      `https://blog.codewithahsan.dev/ghost/api/content/posts/` +
      `?key=${process.env.GHOST_CONTENT_API_KEY}` +
      `&limit=5` +
      `&filter=${filter}` +
      `&fields=title,slug,excerpt,published_at,feature_image,reading_time`;

    const upstreamRes = await fetch(url, {
      next: { revalidate: 3600, tags: ["content:blog"] },
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: "Ghost upstream error", status: upstreamRes.status },
        { status: 502 }
      );
    }

    const json = await upstreamRes.json();
    const posts: Array<{
      title: string;
      slug: string;
      excerpt: string;
      published_at: string;
      feature_image: string | null;
      reading_time: number;
    }> = json.posts || [];

    const shaped = posts.map((post) => ({
      title: post.title,
      slug: post.slug,
      url: `https://blog.codewithahsan.dev/${post.slug}/`,
      excerpt: post.excerpt,
      published_at: post.published_at,
      feature_image: post.feature_image,
      reading_time: post.reading_time,
    }));

    return NextResponse.json({ posts: shaped, count: shaped.length }, { status: 200 });
  } catch (err) {
    console.error("Blog search error:", err);
    return NextResponse.json(
      { error: "Failed to search blog" },
      { status: 500 }
    );
  }
}
