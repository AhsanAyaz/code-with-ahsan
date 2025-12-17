"use client";

import { useState } from "react";
import LegitMarkdown from "@/components/LegitMarkdown";

interface Banner {
  content: string;
  isActive: boolean;
  dismissable: boolean;
}

export default function HomeBanners({ banners }: { banners: Banner[] }) {
  const [visibleBanners, setVisibleBanners] = useState(banners);

  if (visibleBanners.length === 0) return null;

  const handleDismiss = (index: number) => {
    const newBanners = [...visibleBanners];
    newBanners.splice(index, 1);
    setVisibleBanners(newBanners);
  };

  return (
    <div className="flex flex-col justify-center">
      {visibleBanners.map((banner: Banner, index: number) => (
        <div
          className="top-banner mb-4 relative bg-primary text-primary-content px-6 py-3 rounded-md [&_a]:text-yellow-300 [&_a]:underline"
          key={index}
        >
          <span className="animate-ping absolute -right-1 -top-1 inline-flex h-4 w-4 rounded-full bg-yellow-700 dark:bg-yellow-300 z-10 opacity-75"></span>
          <LegitMarkdown>{banner.content}</LegitMarkdown>
          {banner.dismissable && (
            <button
              onClick={() => handleDismiss(index)}
              className="absolute top-0 bottom-0 my-auto cursor-pointer right-2 hover:bg-white/20 rounded-full w-6 h-6 flex items-center justify-center transition-colors"
              aria-label="Dismiss banner"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
