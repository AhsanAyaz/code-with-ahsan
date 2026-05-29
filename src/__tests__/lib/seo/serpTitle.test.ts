import { describe, it, expect } from "vitest";
import { buildSerpTitle, SERP_TITLE_MAX } from "@/lib/seo/serpTitle";

describe("buildSerpTitle", () => {
  it("appends course name when combined fits the budget", () => {
    const out = buildSerpTitle("Intro", "Short Course");
    expect(out).toBe("Intro - Short Course");
    expect(out.length).toBeLessThanOrEqual(SERP_TITLE_MAX);
  });

  it("omits course name when combined exceeds the budget", () => {
    const longCourse = "A".repeat(60);
    const out = buildSerpTitle("Some Post Title", longCourse);
    expect(out).toBe("Some Post Title");
  });

  it("returns post title alone when course name is empty", () => {
    expect(buildSerpTitle("Just A Title", "")).toBe("Just A Title");
    expect(buildSerpTitle("Just A Title", "   ")).toBe("Just A Title");
  });

  it("trims whitespace on inputs", () => {
    expect(buildSerpTitle("  Title  ", "  Course  ")).toBe("Title - Course");
  });

  it("respects a custom max", () => {
    const out = buildSerpTitle("Hello", "World", 20);
    expect(out).toBe("Hello - World");
    const overflow = buildSerpTitle("Hello", "Long Course Name Here", 20);
    expect(overflow).toBe("Hello");
  });

  it("keeps combined when length is exactly the max", () => {
    const title = "A".repeat(10);
    const course = "B".repeat(10);
    const out = buildSerpTitle(title, course, 23);
    expect(out.length).toBe(23);
    expect(out).toBe(`${title} - ${course}`);
  });
});
