"use client";

import { init, destroy } from "@loupeink/web-sdk";
import { useEffect } from "react";

export default function LoupeFeedback() {
  const apiKey = process.env.NEXT_PUBLIC_LOUPE_API_KEY;

  useEffect(() => {
    if (apiKey) {
      init({
        apiKey,
        position: "bottom-right",
        showDelayMs: 3000,
      });
      return () => destroy();
    }
  }, [apiKey]);

  if (!apiKey) return null;

  return null;
}
