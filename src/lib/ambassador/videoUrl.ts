/**
 * src/lib/ambassador/videoUrl.ts
 *
 * Stateless video URL validator + classifier for ambassador application submissions.
 *
 * DECISIONS:
 *   D-06: External video links only (no Firebase Storage video upload).
 *   D-07: Regex-only validation — never fetch the URL server-side.
 *   D-08: Classifier output drives admin embed rendering (react-lite-youtube-embed /
 *         Google Drive /preview iframe / Loom embed iframe).
 *
 * NOTE: VideoEmbedType is re-exported here; when src/types/ambassador.ts is available
 * (Plan 01), the import below should be updated to:
 *   import type { VideoEmbedType } from "@/types/ambassador";
 * and the local type definition removed.
 */

/** Classifier output for video URL embed rendering (D-08). Mirrors Plan 01 definition. */
export type VideoEmbedType = "youtube" | "loom" | "drive" | "unknown";

const LOOM_SHARE_REGEX = /^https:\/\/(?:www\.)?loom\.com\/share\/([A-Za-z0-9]+)/;
const YOUTUBE_WATCH_REGEX =
  /^https:\/\/(?:www\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([A-Za-z0-9_-]+)/;
const YOUTUBE_SHORT_REGEX = /^https:\/\/youtu\.be\/([A-Za-z0-9_-]+)/;
const YOUTUBE_SHORTS_REGEX =
  /^https:\/\/(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]+)/;
const DRIVE_FILE_REGEX =
  /^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/;

/** Returns true if url matches one of the accepted patterns (D-07). */
export function isValidVideoUrl(url: string): boolean {
  if (typeof url !== "string" || url.length === 0) return false;
  return (
    LOOM_SHARE_REGEX.test(url) ||
    YOUTUBE_WATCH_REGEX.test(url) ||
    YOUTUBE_SHORT_REGEX.test(url) ||
    YOUTUBE_SHORTS_REGEX.test(url) ||
    DRIVE_FILE_REGEX.test(url)
  );
}

/** Classifies a video URL for the admin embed renderer (D-08). */
export function classifyVideoUrl(url: string): VideoEmbedType {
  if (typeof url !== "string" || url.length === 0) return "unknown";
  if (LOOM_SHARE_REGEX.test(url)) return "loom";
  if (
    YOUTUBE_WATCH_REGEX.test(url) ||
    YOUTUBE_SHORT_REGEX.test(url) ||
    YOUTUBE_SHORTS_REGEX.test(url)
  ) {
    return "youtube";
  }
  if (DRIVE_FILE_REGEX.test(url)) return "drive";
  return "unknown";
}

/** Extracts the Loom share ID from a loom.com/share/{id} URL. Returns null for non-loom URLs. */
export function extractLoomId(url: string): string | null {
  return url.match(LOOM_SHARE_REGEX)?.[1] ?? null;
}

/** Extracts the Google Drive file ID from a drive.google.com/file/d/{id}/... URL. Returns null for non-drive URLs. */
export function extractDriveFileId(url: string): string | null {
  return url.match(DRIVE_FILE_REGEX)?.[1] ?? null;
}

/**
 * Extracts the YouTube video ID from:
 *   - youtu.be/{id}
 *   - youtube.com/watch?v={id}
 *   - youtube.com/shorts/{id}
 * Returns null for non-YouTube URLs.
 */
export function extractYouTubeId(url: string): string | null {
  return (
    url.match(YOUTUBE_WATCH_REGEX)?.[1] ??
    url.match(YOUTUBE_SHORT_REGEX)?.[1] ??
    url.match(YOUTUBE_SHORTS_REGEX)?.[1] ??
    null
  );
}
