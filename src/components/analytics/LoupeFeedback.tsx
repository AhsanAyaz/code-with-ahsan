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
        // Lift the button above the bottom-right toast stack so they don't overlap.
        offset: { x: 16, y: 90 },
        showDelayMs: 3000,
      });
      return () => destroy();
    }
  }, [apiKey]);

  if (!apiKey) return null;

  return null;
}
