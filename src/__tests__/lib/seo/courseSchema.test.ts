import { describe, it, expect } from "vitest";
import { buildCourseLd } from "@/lib/seo/courseSchema";

const BASE = "https://www.codewithahsan.dev";

describe("buildCourseLd", () => {
  const baseInput = {
    name: "Web Development Bootcamp",
    description:
      "A 10-week guided learning path covering HTML5, CSS3, JavaScript, and modern web tooling.",
    url: `${BASE}/courses/web-dev-bootcamp`,
    baseUrl: BASE,
  };

  it("builds Course schema with required fields", () => {
    const ld = buildCourseLd(baseInput);
    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Course",
      name: baseInput.name,
      description: baseInput.description,
      url: baseInput.url,
      provider: {
        "@type": "Organization",
        name: "Code with Ahsan",
        url: BASE,
        sameAs: BASE,
      },
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "online",
      },
    });
  });

  it("includes image when provided", () => {
    const ld = buildCourseLd({
      ...baseInput,
      imageUrl: "https://cdn.example/banner.jpg",
    });
    expect(ld?.image).toBe("https://cdn.example/banner.jpg");
  });

  it("omits image when not provided", () => {
    const ld = buildCourseLd(baseInput);
    expect(ld).not.toHaveProperty("image");
  });

  it("includes author when provided", () => {
    const ld = buildCourseLd({ ...baseInput, authorName: "Muhammad Ahsan Ayaz" });
    expect(ld?.author).toEqual({
      "@type": "Person",
      name: "Muhammad Ahsan Ayaz",
    });
  });

  it("returns null when name is empty", () => {
    expect(buildCourseLd({ ...baseInput, name: "" })).toBeNull();
    expect(buildCourseLd({ ...baseInput, name: "   " })).toBeNull();
  });

  it("returns null when description is empty", () => {
    expect(buildCourseLd({ ...baseInput, description: "" })).toBeNull();
  });
});
