import { describe, it, expect } from "vitest";
import {
  isValidVideoUrl,
  classifyVideoUrl,
  extractLoomId,
  extractDriveFileId,
  extractYouTubeId,
} from "@/lib/ambassador/videoUrl";

describe("isValidVideoUrl", () => {
  it.each([
    "https://loom.com/share/abc123",
    "https://www.loom.com/share/XYZ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/shorts/abc",
    "https://drive.google.com/file/d/1AbCdEfGh/view",
  ])("accepts %s", (url) => {
    expect(isValidVideoUrl(url)).toBe(true);
  });

  it.each([
    "https://vimeo.com/123",
    "https://tiktok.com/@x/video/1",
    "https://example.com",
    "",
    "not a url",
    "https://fakeloom.com/share/x",
    "javascript:alert(1)",
  ])("rejects %s", (url) => {
    expect(isValidVideoUrl(url)).toBe(false);
  });
});

describe("classifyVideoUrl", () => {
  it("returns youtube for youtube.com/watch", () => {
    expect(classifyVideoUrl("https://www.youtube.com/watch?v=abc")).toBe("youtube");
  });
  it("returns youtube for youtu.be short link", () => {
    expect(classifyVideoUrl("https://youtu.be/abc")).toBe("youtube");
  });
  it("returns youtube for youtube.com/shorts", () => {
    expect(classifyVideoUrl("https://youtube.com/shorts/abc")).toBe("youtube");
  });
  it("returns loom for loom.com/share", () => {
    expect(classifyVideoUrl("https://loom.com/share/xyz")).toBe("loom");
  });
  it("returns drive for drive.google.com/file/d", () => {
    expect(classifyVideoUrl("https://drive.google.com/file/d/1abc/view")).toBe("drive");
  });
  it("returns unknown for unrecognized URL", () => {
    expect(classifyVideoUrl("https://vimeo.com/123")).toBe("unknown");
  });
  it("returns unknown for empty string", () => {
    expect(classifyVideoUrl("")).toBe("unknown");
  });
});

describe("extractLoomId", () => {
  it("extracts id from loom.com/share/{id}", () => {
    expect(extractLoomId("https://loom.com/share/a1b2c3d4e5")).toBe("a1b2c3d4e5");
  });
  it("extracts id from www.loom.com/share/{id}", () => {
    expect(extractLoomId("https://www.loom.com/share/zzz")).toBe("zzz");
  });
  it("returns null for non-loom URL", () => {
    expect(extractLoomId("https://youtube.com/watch?v=abc")).toBeNull();
  });
});

describe("extractDriveFileId", () => {
  it("extracts id from /file/d/{id}/view", () => {
    expect(extractDriveFileId("https://drive.google.com/file/d/1AbCdEf/view")).toBe("1AbCdEf");
  });
  it("extracts id from /file/d/{id} without trailing segment", () => {
    expect(extractDriveFileId("https://drive.google.com/file/d/1AbCdEf")).toBe("1AbCdEf");
  });
  it("returns null for non-drive URL", () => {
    expect(extractDriveFileId("https://youtu.be/abc")).toBeNull();
  });
});

describe("extractYouTubeId", () => {
  it("extracts id from youtu.be/{id}", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("extracts id from youtube.com/watch?v={id}", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("extracts id from youtube.com/shorts/{id}", () => {
    expect(extractYouTubeId("https://youtube.com/shorts/abc123")).toBe("abc123");
  });
  it("returns null for non-youtube URL", () => {
    expect(extractYouTubeId("https://loom.com/share/x")).toBeNull();
  });
});
