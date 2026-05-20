import GhostAdminAPI from "@tryghost/admin-api";

export interface EmailBlastDraft {
  id: string;
  title: string;
  html: string; // rendered HTML body (Ghost handles styling + images)
  status: "draft" | "published" | "scheduled";
  updatedAt: string; // ISO
  url: string | null; // null for drafts
}

let _adminClient: GhostAdminAPI | null = null;

/**
 * Lazy-init Ghost Admin API client.
 * Returns null if GHOST_ADMIN_API_KEY is not configured.
 */
export function getGhostAdmin(): GhostAdminAPI | null {
  if (_adminClient) return _adminClient;

  const key = process.env.GHOST_ADMIN_API_KEY;
  if (!key) {
    console.warn(
      "[ghost/admin] GHOST_ADMIN_API_KEY is not set — Ghost Admin API unavailable."
    );
    return null;
  }

  const url =
    process.env.GHOST_ADMIN_URL ?? "https://blog.codewithahsan.dev";

  _adminClient = new GhostAdminAPI({ url, key, version: "v5.0" });
  return _adminClient;
}

/**
 * List Ghost draft posts tagged with the internal tag #email-blast.
 * Returns an empty array if the API key is missing or the request fails.
 */
function mapDraft(item: {
  id: string;
  title: string;
  html?: string | null;
  status: string;
  updated_at: string;
  url?: string | null;
}): EmailBlastDraft {
  return {
    id: item.id,
    title: item.title,
    html: item.html ?? "",
    status: item.status as EmailBlastDraft["status"],
    updatedAt: item.updated_at,
    url: item.url ?? null,
  };
}

/**
 * List Ghost draft posts AND pages tagged with the internal tag #email-blast.
 * Ghost pages (type=page) and posts are separate resources — both are queried
 * so authors can use either in Ghost when composing blast copy.
 * Returns an empty array if the API key is missing or all requests fail.
 */
export async function listEmailBlastDrafts(): Promise<EmailBlastDraft[]> {
  const admin = getGhostAdmin();
  if (!admin) return [];

  const filter = "tag:hash-email-blast+status:draft";
  const opts = { filter, limit: 50, formats: ["html"] };

  const [postsResult, pagesResult] = await Promise.allSettled([
    admin.posts.browse(opts),
    admin.pages.browse(opts),
  ]);

  const posts =
    postsResult.status === "fulfilled" ? postsResult.value.map(mapDraft) : [];
  const pages =
    pagesResult.status === "fulfilled" ? pagesResult.value.map(mapDraft) : [];

  if (postsResult.status === "rejected") {
    console.error("[ghost/admin] posts.browse failed:", postsResult.reason);
  }
  if (pagesResult.status === "rejected") {
    console.error("[ghost/admin] pages.browse failed:", pagesResult.reason);
  }

  return [...posts, ...pages];
}

/**
 * Fetch a single Ghost post by ID and return its rendered HTML.
 * Returns null if the API key is missing, the post is not found, or the request fails.
 */
/**
 * Fetch a single Ghost post or page by ID and return its rendered HTML.
 * Tries posts first, falls back to pages (so both content types work).
 * Returns null if not found in either or on error.
 */
export async function getDraftHtml(
  postId: string
): Promise<EmailBlastDraft | null> {
  const admin = getGhostAdmin();
  if (!admin) return null;

  const readOpts = { formats: ["html"] };

  // Try post first
  try {
    const post = await admin.posts.read({ id: postId }, readOpts);
    return mapDraft(post);
  } catch {
    // Not a post — try page
  }

  try {
    const page = await admin.pages.read({ id: postId }, readOpts);
    return mapDraft(page);
  } catch (err) {
    console.error(`[ghost/admin] getDraftHtml(${postId}) failed:`, err);
    return null;
  }
}
