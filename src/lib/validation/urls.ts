import { z } from "zod";

// Matches: https://github.com/owner/repo or https://github.com/owner/repo/
// Does NOT match: http://, github.com without https, or non-github URLs
const githubRepoSchema = z
  .string()
  .url("Must be a valid URL")
  .regex(
    /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/,
    "Must be a valid GitHub repository URL (https://github.com/owner/repo)"
  );

/**
 * Validates a GitHub repository URL.
 * @param url - The URL to validate (optional field - undefined/empty skips validation)
 * @returns The validated URL string
 * @throws ZodError if URL is invalid
 */
export function validateGitHubUrl(url?: string): string | undefined {
  if (!url || url.trim() === "") return undefined;
  return githubRepoSchema.parse(url.trim());
}

/**
 * Check if a string is a valid GitHub repo URL without throwing.
 * @returns true if valid, false otherwise
 */
export function isValidGitHubUrl(url: string): boolean {
  return githubRepoSchema.safeParse(url).success;
}

// Matches LinkedIn post/activity URLs on linkedin.com (any subdomain), e.g.
// https://www.linkedin.com/posts/username_slug-activity-123-abc/
// https://www.linkedin.com/feed/update/urn:li:activity:123/
// Does NOT match: non-linkedin hosts or http:// URLs.
const linkedinPostSchema = z
  .string()
  .url("Must be a valid URL")
  .regex(
    /^https:\/\/([\w-]+\.)?linkedin\.com\/.+/i,
    "Must be a valid LinkedIn post URL (https://www.linkedin.com/...)"
  );

/**
 * Validates a LinkedIn post URL.
 * @param url - The URL to validate
 * @returns The validated URL string
 * @throws ZodError if URL is invalid
 */
export function validateLinkedInUrl(url: string): string {
  return linkedinPostSchema.parse(url.trim());
}

/**
 * Check if a string is a valid LinkedIn post URL without throwing.
 * @returns true if valid, false otherwise
 */
export function isValidLinkedInUrl(url: string): boolean {
  return linkedinPostSchema.safeParse(url).success;
}
