declare module "@tryghost/admin-api" {
  interface GhostAdminAPIOptions {
    url: string;
    key: string;
    version: string;
  }

  interface GhostPost {
    id: string;
    title: string;
    html: string;
    status: "draft" | "published" | "scheduled";
    updated_at: string;
    url: string | null;
  }

  class GhostAdminAPI {
    constructor(options: GhostAdminAPIOptions);
    posts: {
      browse(query: Record<string, unknown>): Promise<GhostPost[]>;
      read(
        query: { id: string },
        options?: { formats?: string[] }
      ): Promise<GhostPost>;
    };
  }

  export default GhostAdminAPI;
}
