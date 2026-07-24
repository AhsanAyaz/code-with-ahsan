/**
 * Admin broadcast — message → HTML rendering (GH#298).
 * Admin-authored plain text is escaped and newline-preserved before send.
 */

import { describe, it, expect } from "vitest";
import { renderBroadcastHtml } from "@/lib/admin-broadcast/renderMessage";

describe("renderBroadcastHtml", () => {
  it("escapes HTML so admin text can't inject markup", () => {
    const html = renderBroadcastHtml("<script>alert(1)</script>", "Hello");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("converts newlines to <br/> so line breaks survive", () => {
    const html = renderBroadcastHtml("line one\nline two", "Subj");
    expect(html).toContain("line one<br/>line two");
  });

  it("normalizes CRLF newlines", () => {
    const html = renderBroadcastHtml("a\r\nb", "Subj");
    expect(html).toContain("a<br/>b");
    expect(html).not.toContain("\r");
  });

  it("includes the subject in the document title", () => {
    const html = renderBroadcastHtml("body", "My Subject");
    expect(html).toContain("<title>My Subject</title>");
  });

  it("escapes the subject in the title too", () => {
    const html = renderBroadcastHtml("body", "A & B <x>");
    expect(html).toContain("A &amp; B &lt;x&gt;");
    expect(html).not.toContain("<x>");
  });

  it("produces a full HTML document", () => {
    const html = renderBroadcastHtml("hi", "Subj");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html.toLowerCase()).toContain("</html>");
  });
});
