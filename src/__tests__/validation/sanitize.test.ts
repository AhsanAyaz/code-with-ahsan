import { describe, it, expect } from "vitest";
import { sanitizeMarkdown, sanitizeMarkdownRaw } from "@/lib/validation/sanitize";

describe("sanitizeMarkdown", () => {
  it("preserves normal markdown content", async () => {
    const input = "# Hello World\n\nThis is a paragraph.";
    const result = await sanitizeMarkdown(input);
    expect(result).toContain("Hello World");
    expect(result).toContain("paragraph");
  });

  it("preserves code blocks", async () => {
    const input = "```javascript\nconsole.log('hello');\n```";
    const result = await sanitizeMarkdown(input);
    expect(result).toContain("console.log");
  });

  it("preserves links", async () => {
    const input = "[Click here](https://example.com)";
    const result = await sanitizeMarkdown(input);
    expect(result).toContain("https://example.com");
  });

  it("strips script tags", async () => {
    const input = "Normal text <script>alert('xss')</script> more text";
    const result = await sanitizeMarkdown(input);
    expect(result).not.toContain("<script");
    expect(result).toContain("Normal text");
    expect(result).toContain("more text");
  });

  it("strips event handler attributes", async () => {
    const input = '<div onmouseover="alert(1)">hover me</div>';
    const result = await sanitizeMarkdown(input);
    expect(result).not.toContain("onmouseover");
    expect(result).not.toContain("alert");
  });

  it("strips style tags", async () => {
    const input = "<style>body { display: none; }</style>Content";
    const result = await sanitizeMarkdown(input);
    expect(result).not.toContain("<style");
  });

  it("handles empty input", async () => {
    const result = await sanitizeMarkdown("");
    expect(result).toBe("");
  });
});

describe("sanitizeMarkdownRaw", () => {
  it("strips script tags from raw markdown", () => {
    const input = "Hello <script>alert('xss')</script> world";
    const result = sanitizeMarkdownRaw(input);
    expect(result).not.toContain("<script");
    expect(result).toContain("Hello");
    expect(result).toContain("world");
  });

  it("strips javascript: URLs", () => {
    const input = "[click](javascript:alert(1))";
    const result = sanitizeMarkdownRaw(input);
    expect(result).not.toContain("javascript:");
  });

  it("strips data: URLs in markdown links", () => {
    const input = "[click](data:text/html,<script>alert(1)</script>)";
    const result = sanitizeMarkdownRaw(input);
    expect(result).toContain("removed");
    expect(result).not.toContain("data:");
  });

  it("strips event handlers from inline HTML", () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitizeMarkdownRaw(input);
    expect(result).not.toContain("onerror");
  });

  it("preserves normal markdown", () => {
    const input = "# Title\n\n- List item\n- Another item";
    const result = sanitizeMarkdownRaw(input);
    expect(result).toBe(input);
  });
});
