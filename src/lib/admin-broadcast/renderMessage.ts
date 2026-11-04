/**
 * Admin broadcast — render an admin's plain-text message to email HTML (GH#298).
 *
 * The message is admin-authored plain text (not HTML). We escape it to avoid
 * broken/injected markup, preserve line breaks, and wrap it in a minimal branded
 * shell that matches the tone of the existing mentorship emails in src/lib/email.ts.
 */

import { htmlEscape } from "@/lib/email-blast/escapeHtml";

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://codewithahsan.dev";
}

const styles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
  .header h1 { margin: 0; font-size: 22px; }
  .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
  .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
`;

/**
 * Convert an admin's plain-text message into a full, safe HTML email document.
 *
 * @param message Admin-authored plain text. Escaped; newlines become <br/>.
 * @param subject Used as the document <title> (escaped).
 */
export function renderBroadcastHtml(message: string, subject: string): string {
  const safeBody = htmlEscape(message)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "<br/>");
  const safeTitle = htmlEscape(subject);
  const siteUrl = getSiteUrl();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="header">
    <h1>🎓 Code with Ahsan</h1>
  </div>
  <div class="content">
    ${safeBody}
  </div>
  <div class="footer">
    <p>This message was sent to you by the Code with Ahsan team.</p>
    <p><a href="${siteUrl}">codewithahsan.dev</a></p>
  </div>
</body>
</html>`;
}
