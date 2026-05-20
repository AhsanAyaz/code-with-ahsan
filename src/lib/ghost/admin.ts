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
export async function listEmailBlastDrafts(): Promise<EmailBlastDraft[]> {
  const admin = getGhostAdmin();
  if (!admin) return [];

  try {
    const posts = await admin.posts.browse({
      filter: "tag:hash-email-blast+status:draft",
      limit: 50,
      formats: ["html"],
    });

    return posts.map((post) => ({
      id: post.id,
      title: post.title,
      html: post.html ?? "",
      status: post.status,
      updatedAt: post.updated_at,
      url: post.url,
    }));
  } catch (err) {
    console.error("[ghost/admin] listEmailBlastDrafts failed:", err);
    return [];
  }
}

/**
 * Fetch a single Ghost post by ID and return its rendered HTML.
 * Returns null if the API key is missing, the post is not found, or the request fails.
 */
export async function getDraftHtml(
  postId: string
): Promise<EmailBlastDraft | null> {
  const admin = getGhostAdmin();
  if (!admin) return null;

  try {
    const post = await admin.posts.read({ id: postId }, { formats: ["html"] });

    return {
      id: post.id,
      title: post.title,
      html: post.html ?? "",
      status: post.status,
      updatedAt: post.updated_at,
      url: post.url,
    };
  } catch (err) {
    console.error(`[ghost/admin] getDraftHtml(${postId}) failed:`, err);
    return null;
  }
}
