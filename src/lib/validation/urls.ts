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
