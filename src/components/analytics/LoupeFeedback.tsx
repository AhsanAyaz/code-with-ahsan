"use client";

import Script from "next/script";

export default function LoupeFeedback() {
  const apiKey = process.env.NEXT_PUBLIC_LOUPE_API_KEY;

  if (!apiKey) return null;

  return (
    <Script
      src="https://cdn.jsdelivr.net/npm/@loupeink/web-sdk/dist/index.global.js"
      strategy="lazyOnload"
      onLoad={() => {
        (window as any).Loupe?.init({
          apiKey,
          position: "bottom-right",
        });
      }}
    />
  );
}
