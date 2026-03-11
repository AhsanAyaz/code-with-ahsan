import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// ─────────────────────────────────────────────
// Auth helper
// ─────────────────────────────────────────────

function checkAdminAuth(request: NextRequest): NextResponse | null {
  const token = request.headers.get('x-admin-token');
  if (token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// ─────────────────────────────────────────────
// YouTube chapter timestamp parser
//
// YouTube chapter lines appear in video descriptions as:
//   "0:00 Introduction"
//   "5:30 Setting Up"
//   "1:02:45 Advanced Topics"
// ─────────────────────────────────────────────

interface ChapterTimestamp {
  title: string;
  timestampSeconds: number;
}

function parseChapterTimestamps(description: string): ChapterTimestamp[] {
  const chapters: ChapterTimestamp[] = [];

  // Match patterns: H:MM:SS Title  or  MM:SS Title  or  M:SS Title
  const chapterRegex = /^(?:(\d+):)?(\d{1,2}):(\d{2})\s+(.+)$/gm;
  let match;

  while ((match = chapterRegex.exec(description)) !== null) {
    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const title = match[4].trim();

    const timestampSeconds = hours * 3600 + minutes * 60 + seconds;

    chapters.push({ title, timestampSeconds });
  }

  return chapters;
}

// ─────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = checkAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  const playlistId = searchParams.get('playlistId');

  if (!videoId && !playlistId) {
    return NextResponse.json(
      { error: 'Provide either videoId or playlistId query param' },
      { status: 400 }
    );
  }

  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YT_API_KEY,
    });

    // ── Video info + chapter timestamps ──────────────────────────
    if (videoId) {
      const response = await youtube.videos.list({
        part: ['snippet', 'contentDetails'],
        id: [videoId],
      });

      const items = response.data.items || [];
      if (items.length === 0) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }

      const video = items[0];
      const snippet = video.snippet;
      const description = snippet?.description || '';
      const chapters = parseChapterTimestamps(description);

      return NextResponse.json({
        videoId,
        title: snippet?.title || '',
        description,
        thumbnail:
          snippet?.thumbnails?.maxres?.url ||
          snippet?.thumbnails?.high?.url ||
          snippet?.thumbnails?.default?.url ||
          null,
        duration: video.contentDetails?.duration || null,
        chapters,
      });
    }

    // ── Playlist items ────────────────────────────────────────────
    if (playlistId) {
      const response = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId,
        maxResults: 50,
      });

      const items = (response.data.items || []).map((item) => ({
        videoId: item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || '',
        title: item.snippet?.title || '',
        position: item.snippet?.position ?? 0,
      }));

      return NextResponse.json({ playlistId, items });
    }
  } catch (error) {
    console.error('YouTube API error:', error);
    const message = error instanceof Error ? error.message : 'YouTube API request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
