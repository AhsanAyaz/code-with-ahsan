import { describe, it, expect } from "vitest";
import { validateGitHubUrl, isValidGitHubUrl } from "@/lib/validation/urls";

describe("validateGitHubUrl", () => {
  // Valid URLs
  it("accepts standard GitHub repo URL", () => {
    expect(validateGitHubUrl("https://github.com/owner/repo")).toBe("https://github.com/owner/repo");
  });

  it("accepts GitHub repo URL with trailing slash", () => {
    expect(validateGitHubUrl("https://github.com/owner/repo/")).toBe("https://github.com/owner/repo/");
  });

  it("accepts URL with dots and hyphens in names", () => {
    expect(validateGitHubUrl("https://github.com/my-org/my.repo-name")).toBeDefined();
  });

  it("returns undefined for empty string", () => {
    expect(validateGitHubUrl("")).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(validateGitHubUrl(undefined)).toBeUndefined();
  });

  // Invalid URLs
  it("rejects HTTP (non-HTTPS) GitHub URL", () => {
    expect(() => validateGitHubUrl("http://github.com/owner/repo")).toThrow();
  });

  it("rejects non-GitHub URL", () => {
    expect(() => validateGitHubUrl("https://gitlab.com/owner/repo")).toThrow();
  });

  it("rejects GitHub URL without repo name", () => {
    expect(() => validateGitHubUrl("https://github.com/owner")).toThrow();
  });

  it("rejects GitHub URL with extra path segments", () => {
    expect(() => validateGitHubUrl("https://github.com/owner/repo/tree/main")).toThrow();
  });

  it("rejects random string", () => {
    expect(() => validateGitHubUrl("not-a-url")).toThrow();
  });

  it("rejects javascript: URL", () => {
    expect(() => validateGitHubUrl("javascript:alert(1)")).toThrow();
  });
});

describe("isValidGitHubUrl", () => {
  it("returns true for valid GitHub URL", () => {
    expect(isValidGitHubUrl("https://github.com/owner/repo")).toBe(true);
  });

  it("returns false for invalid URL", () => {
    expect(isValidGitHubUrl("https://gitlab.com/owner/repo")).toBe(false);
  });
});
