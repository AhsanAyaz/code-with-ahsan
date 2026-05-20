"use client";

interface PreviewIframeProps {
  html: string;
}

export function PreviewIframe({ html }: PreviewIframeProps) {
  if (!html) {
    return (
      <div className="w-full border border-base-300 rounded flex items-center justify-center bg-base-200 text-base-content/70 text-sm italic" style={{ minHeight: 400 }}>
        Select a draft to preview the email HTML
      </div>
    );
  }

  return (
    <div className="w-full" style={{ maxWidth: 600 }}>
      <iframe
        srcDoc={html}
        sandbox="allow-same-origin"
        title="Email preview"
        className="w-full border border-base-300 rounded"
        style={{ minHeight: 400 }}
        onLoad={(e) => {
          try {
            const iframe = e.currentTarget;
            const body = iframe.contentDocument?.body;
            if (body) {
              iframe.style.height = body.scrollHeight + "px";
            }
          } catch {
            // cross-origin or other error — leave at minHeight
          }
        }}
      />
    </div>
  );
}
