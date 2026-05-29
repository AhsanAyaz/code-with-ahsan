import { describe, it, expect } from "vitest";
import {
  extractYouTubeId,
  buildVideoObjectLd,
} from "@/lib/seo/videoSchema";

describe("extractYouTubeId", () => {
  it("parses watch?v= URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=NqDEt2FbvCA")).toBe(
      "NqDEt2FbvCA"
    );
  });

  it("parses watch?v= with &t= timestamp", () => {
    expect(
      extractYouTubeId("https://www.youtube.com/watch?v=NqDEt2FbvCA&t=0s")
    ).toBe("NqDEt2FbvCA");
  });

  it("parses watch?v= with &list= playlist suffix", () => {
    expect(
      extractYouTubeId(
        "https://www.youtube.com/watch?v=NqDEt2FbvCA&list=PLABCDEF"
      )
    ).toBe("NqDEt2FbvCA");
  });

  it("parses youtu.be short URL", () => {
    expect(extractYouTubeId("https://youtu.be/Knn0TN2j8vc")).toBe(
      "Knn0TN2j8vc"
    );
  });

  it("parses youtu.be with ?si= share suffix", () => {
    expect(
      extractYouTubeId("https://youtu.be/Knn0TN2j8vc?si=abc123")
    ).toBe("Knn0TN2j8vc");
  });

  it("parses /embed/ URL", () => {
    expect(
      extractYouTubeId("https://www.youtube.com/embed/Knn0TN2j8vc")
    ).toBe("Knn0TN2j8vc");
  });

  it("parses /shorts/ URL", () => {
    expect(
      extractYouTubeId("https://www.youtube.com/shorts/Knn0TN2j8vc")
    ).toBe("Knn0TN2j8vc");
  });

  it("returns null for non-YouTube hosts", () => {
    expect(extractYouTubeId("https://vimeo.com/123456")).toBeNull();
  });

  it("returns null for malformed URLs", () => {
    expect(extractYouTubeId("not a url")).toBeNull();
  });

  it("returns null for null / undefined", () => {
    expect(extractYouTubeId(null)).toBeNull();
    expect(extractYouTubeId(undefined)).toBeNull();
    expect(extractYouTubeId("")).toBeNull();
  });

  it("returns null when /watch is missing v param", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch")).toBeNull();
  });
});

describe("buildVideoObjectLd", () => {
  const baseInput = {
    name: "Intro to React 19",
    description: "Learn the new use() hook and Suspense patterns in React 19.",
    uploadDate: "2026-03-01T00:00:00.000Z",
    videoUrl: "https://www.youtube.com/watch?v=NqDEt2FbvCA&t=0s",
    pageUrl: "https://www.codewithahsan.dev/courses/react/intro",
  };

  it("builds a full VideoObject for happy path", () => {
    const ld = buildVideoObjectLd(baseInput);
    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: "Intro to React 19",
      description: baseInput.description,
      uploadDate: baseInput.uploadDate,
      embedUrl: "https://www.youtube.com/embed/NqDEt2FbvCA",
    });
  });

  it("emits 2 thumbnail URLs (max + hq) without override", () => {
    const ld = buildVideoObjectLd(baseInput);
    expect(ld?.thumbnailUrl).toEqual([
      "https://img.youtube.com/vi/NqDEt2FbvCA/maxresdefault.jpg",
      "https://img.youtube.com/vi/NqDEt2FbvCA/hqdefault.jpg",
    ]);
  });

  it("prepends override thumbnail", () => {
    const ld = buildVideoObjectLd({
      ...baseInput,
      thumbnailOverride: "https://cdn.example/custom.jpg",
    });
    expect((ld?.thumbnailUrl as string[])[0]).toBe(
      "https://cdn.example/custom.jpg"
    );
    expect((ld?.thumbnailUrl as string[]).length).toBe(3);
  });

  it("returns null when description is empty after trim", () => {
    expect(buildVideoObjectLd({ ...baseInput, description: "  " })).toBeNull();
  });

  it("returns null when name is empty after trim", () => {
    expect(buildVideoObjectLd({ ...baseInput, name: "" })).toBeNull();
  });

  it("returns null when videoUrl is unrecoverable", () => {
    expect(
      buildVideoObjectLd({ ...baseInput, videoUrl: "https://vimeo.com/x" })
    ).toBeNull();
  });

  it("sets mainEntityOfPage to the page URL", () => {
    const ld = buildVideoObjectLd(baseInput);
    expect(ld?.mainEntityOfPage).toEqual({
      "@type": "WebPage",
      "@id": baseInput.pageUrl,
    });
  });
});
