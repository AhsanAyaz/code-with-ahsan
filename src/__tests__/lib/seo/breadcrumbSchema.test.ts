import { describe, it, expect } from "vitest";
import { buildBreadcrumbLd } from "@/lib/seo/breadcrumbSchema";

const BASE = "https://www.codewithahsan.dev";

describe("buildBreadcrumbLd", () => {
  it("builds 3-position list for course page", () => {
    const ld = buildBreadcrumbLd([
      { name: "Home", url: `${BASE}/` },
      { name: "Courses", url: `${BASE}/courses` },
      { name: "Web Dev Bootcamp", url: `${BASE}/courses/web-dev-bootcamp` },
    ]);
    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
    });
    expect((ld.itemListElement as unknown[])).toHaveLength(3);
    expect((ld.itemListElement as Array<Record<string, unknown>>)[2]).toEqual({
      "@type": "ListItem",
      position: 3,
      name: "Web Dev Bootcamp",
      item: `${BASE}/courses/web-dev-bootcamp`,
    });
  });

  it("builds 4-position list for post page", () => {
    const ld = buildBreadcrumbLd([
      { name: "Home", url: `${BASE}/` },
      { name: "Courses", url: `${BASE}/courses` },
      { name: "Web Dev Bootcamp", url: `${BASE}/courses/web-dev-bootcamp` },
      { name: "Day 1", url: `${BASE}/courses/web-dev-bootcamp/day-1` },
    ]);
    expect((ld.itemListElement as unknown[])).toHaveLength(4);
    expect(
      (ld.itemListElement as Array<Record<string, unknown>>)[3].position
    ).toBe(4);
  });

  it("preserves item order", () => {
    const items = [
      { name: "A", url: "https://x/a" },
      { name: "B", url: "https://x/b" },
    ];
    const ld = buildBreadcrumbLd(items);
    const list = ld.itemListElement as Array<Record<string, unknown>>;
    expect(list[0].name).toBe("A");
    expect(list[0].position).toBe(1);
    expect(list[1].name).toBe("B");
    expect(list[1].position).toBe(2);
  });
});
