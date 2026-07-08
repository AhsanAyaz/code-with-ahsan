"use client";

import { useEffect, useState } from "react";
import { socialReach, type SocialPlatform } from "@/data/socialReach";
import { BRAND_ICONS, SOCIAL_ORDER } from "@/data/socialIcons";

type SocialData = Record<string, SocialPlatform>;

function formatCount(count: number): string {
  if (count >= 1000) {
    // One decimal, dropping a trailing ".0" (e.g. 10500 → "10.5k+", 37000 → "37k+").
    const k = (count / 1000).toFixed(1).replace(/\.0$/, "");
    return `${k}k+`;
  }
  return `${count}+`;
}

/** Sum of all platform counts, floored to the nearest 10k (e.g. 205k → "200,000+"). */
function formatTotal(data: SocialData): string {
  const sum = Object.values(data).reduce((acc, p) => acc + (p?.count || 0), 0);
  const floored = Math.floor(sum / 10000) * 10000;
  return `${floored.toLocaleString()}+`;
}

function PlatformIcon({ platformKey }: { platformKey: string }) {
  const icon = BRAND_ICONS[platformKey];
  if (!icon) return null;
  return (
    <svg
      viewBox={icon.viewBox}
      fill="currentColor"
      className={`w-7 h-7 ${icon.colorClass}`}
      aria-hidden="true"
    >
      {icon.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export default function SocialStats({
  label = "Follow along across platforms",
  caption,
  showTotal = true,
  className = "",
}: {
  label?: string;
  caption?: string;
  showTotal?: boolean;
  className?: string;
}) {
  // Start from the static source so the strip always renders (even if /api/stats is
  // unavailable), then override with live-merged data when the fetch succeeds.
  const [social, setSocial] = useState<SocialData>(socialReach);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.social) setSocial(data.social as SocialData);
      })
      .catch(() => {
        /* keep static fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const keys = SOCIAL_ORDER.filter((k) => k in social);

  return (
    <div className={`page-padding ${className}`}>
      <p className="text-center text-xs font-mono text-base-content/40 uppercase tracking-widest mb-4">
        {label}
      </p>

      {showTotal && (
        <p className="text-center mb-6">
          <span className="text-2xl sm:text-3xl font-bold text-base-content">
            {formatTotal(social)}
          </span>{" "}
          <span className="text-base-content/60 text-sm">developers across platforms</span>
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {keys.map((key) => {
          const platform = social[key];
          return (
            <a
              key={key}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 px-5 py-4 rounded-xl bg-base-100 border border-base-300 hover:border-primary/40 hover:shadow-sm transition-all min-w-[112px]"
            >
              <PlatformIcon platformKey={key} />
              <span className="text-xs font-mono text-base-content/60 mt-0.5">
                {platform.label}
              </span>
              <span className="text-base font-bold text-base-content">
                {formatCount(platform.count)}
              </span>
              {platform.sub && (
                <span className="text-[11px] text-base-content/40">{platform.sub}</span>
              )}
            </a>
          );
        })}
      </div>

      {caption && (
        <p className="mt-6 text-center text-sm text-base-content/50 max-w-2xl mx-auto">{caption}</p>
      )}
    </div>
  );
}
