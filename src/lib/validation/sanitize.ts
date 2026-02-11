import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

// Custom schema: default GitHub-style sanitization with extra restrictions
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames || []).filter(
    (tag) =>
      !["script", "style", "object", "embed", "applet", "link", "meta", "base", "svg", "math"].includes(tag)
  ),
  attributes: {
    ...defaultSchema.attributes,
    // Strip all event handler attributes from every element
    "*": (defaultSchema.attributes?.["*"] || []).filter(
      (attr) => typeof attr === "string" ? !attr.startsWith("on") : true
    ),
  },
};

/**
 * Sanitizes Markdown content to prevent XSS attacks.
 * Converts Markdown to HTML, strips dangerous elements, returns sanitized HTML.
 *
 * @param markdown - Raw Markdown string
 * @returns Sanitized HTML string
 */
export async function sanitizeMarkdown(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .process(markdown);

  return String(file);
}

/**
 * Sanitizes raw Markdown by stripping potentially dangerous patterns
 * without converting to HTML. Useful for storing sanitized Markdown.
 *
 * Strips: script tags, javascript: URLs, data: URLs in links, event handlers
 *
 * @param markdown - Raw Markdown string
 * @returns Cleaned Markdown string
 */
export function sanitizeMarkdownRaw(markdown: string): string {
  return markdown
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove event handlers in any HTML
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "")
    // Remove javascript: URLs
    .replace(/javascript\s*:/gi, "")
    // Remove data: URLs in markdown links (potential XSS vector)
    .replace(/\[([^\]]*)\]\(data:[^)]+\)/gi, "[$1](removed)")
    // Remove vbscript: URLs
    .replace(/vbscript\s*:/gi, "");
}
