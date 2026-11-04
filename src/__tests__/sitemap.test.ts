import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/content/contentProvider", () => ({
  getCourses: vi.fn(async () => []),
  getEvents: vi.fn(async () => []),
}));

import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("includes the sponsorship rate card so it is discoverable/indexable", async () => {
    const entries = await sitemap();
    const paths = entries.map((entry) => new URL(entry.url).pathname);

    expect(paths).toContain("/rates");
  });

  it("keeps the sponsors page listed alongside it", async () => {
    const entries = await sitemap();
    const paths = entries.map((entry) => new URL(entry.url).pathname);

    expect(paths).toContain("/sponsors");
  });

  it("does not emit duplicate URLs", async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(new Set(urls).size).toBe(urls.length);
  });
});
