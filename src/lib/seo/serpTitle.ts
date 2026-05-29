// Build effective SERP title for a course post.
// When `${title} - ${courseName}` exceeds the SERP budget, drop the course
// suffix instead of letting Google truncate it mid-word. Keeps the post-level
// signal intact for the snippet that actually fits.
//
// Audit `scripts/content/audit-seo.js` mirrors this contract so PASS/FAIL
// reflects what ships to Google.

export const SERP_TITLE_MAX = 70;

export function buildSerpTitle(
  postTitle: string,
  courseName: string,
  max: number = SERP_TITLE_MAX
): string {
  const title = (postTitle || "").trim();
  const course = (courseName || "").trim();
  if (!course) return title;
  const combined = `${title} - ${course}`;
  return combined.length <= max ? combined : title;
}
