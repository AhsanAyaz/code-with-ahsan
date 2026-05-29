// VideoObject JSON-LD builder for YouTube-hosted course posts.
// See docs/SEO_CONTENT_RUBRIC.md and .planning/phases/tools-seo-indexability-uplift/01-videoobject-schema-PLAN.md.

const YT_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

export function extractYouTubeId(
  url: string | undefined | null
): string | null {
  if (!url || typeof url !== "string") return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!YT_HOSTS.has(parsed.hostname)) return null;

  if (parsed.hostname.endsWith("youtu.be")) {
    const id = parsed.pathname.replace(/^\//, "").split("/")[0];
    return isValidId(id) ? id : null;
  }

  if (parsed.pathname === "/watch") {
    const id = parsed.searchParams.get("v");
    return id && isValidId(id) ? id : null;
  }

  if (parsed.pathname.startsWith("/embed/")) {
    const id = parsed.pathname.slice("/embed/".length).split("/")[0];
    return isValidId(id) ? id : null;
  }

  if (parsed.pathname.startsWith("/shorts/")) {
    const id = parsed.pathname.slice("/shorts/".length).split("/")[0];
    return isValidId(id) ? id : null;
  }

  return null;
}

function isValidId(id: string | undefined | null): id is string {
  return !!id && /^[A-Za-z0-9_-]{6,}$/.test(id);
}

export interface VideoSchemaInput {
  name: string;
  description: string;
  uploadDate: string;
  videoUrl: string;
  thumbnailOverride?: string;
  pageUrl: string;
}

export function buildVideoObjectLd(
  input: VideoSchemaInput
): Record<string, unknown> | null {
  const name = (input.name || "").trim();
  const description = (input.description || "").trim();
  if (!name || !description) return null;

  const id = extractYouTubeId(input.videoUrl);
  if (!id) return null;

  const thumbnails: string[] = [];
  if (input.thumbnailOverride) thumbnails.push(input.thumbnailOverride);
  thumbnails.push(`https://img.youtube.com/vi/${id}/maxresdefault.jpg`);
  thumbnails.push(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name,
    description,
    thumbnailUrl: thumbnails,
    uploadDate: input.uploadDate,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": input.pageUrl,
    },
  };
}
