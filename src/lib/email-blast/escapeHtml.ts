/**
 * HTML-escape a string for safe insertion into HTML attributes or body content.
 * Used to sanitize recipient names before substituting {{name}} in blast HTML.
 */
export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
