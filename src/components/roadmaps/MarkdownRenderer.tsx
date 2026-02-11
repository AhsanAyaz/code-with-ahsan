"use client";

import ReactMarkdown from "react-markdown";
import rehypePrism from "rehype-prism-plus";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypePrism]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
