"use client";

import { useEffect, useState } from "react";

type SocialPlatform = {
  label: string;
  count: number;
  url: string;
};

type SocialData = Record<string, SocialPlatform>;

function formatCount(count: number): string {
  if (count >= 1000) {
    return `${Math.floor(count / 1000)}k+`;
  }
  return `${count}+`;
}

const PLATFORM_ICONS: Record<string, string> = {
  youtube: "▶",
  instagram: "📷",
  facebook: "f",
  linkedin: "in",
  github: "⌥",
  x: "𝕏",
  discord: "🎮",
};

const PLATFORM_COLORS: Record<string, string> = {
  youtube: "text-red-500",
  instagram: "text-pink-500",
  facebook: "text-blue-500",
  linkedin: "text-blue-600",
  github: "text-base-content",
  x: "text-base-content",
  discord: "text-indigo-500",
};

const PLATFORM_ORDER = [
  "youtube",
  "instagram",
  "facebook",
  "linkedin",
  "github",
  "x",
  "discord",
];

export default function SocialLinksSection() {
  const [social, setSocial] = useState<SocialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchSocial() {
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (!cancelled) {
          setSocial(data.social as SocialData);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    fetchSocial();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return null;

  return (
    <section className="border-t border-base-300 bg-base-200 py-16">
      <div className="page-padding">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-base-content mb-8">
            Connect With Me
          </h2>

          {loading ? (
            <div className="flex flex-wrap gap-4">
              {PLATFORM_ORDER.map((key) => (
                <div key={key} className="skeleton h-24 w-36 rounded-xl" />
              ))}
            </div>
          ) : social ? (
            <div className="flex flex-wrap gap-4">
              {PLATFORM_ORDER.filter((key) => key in social).map((key) => {
                const platform = social[key];
                const iconClass = PLATFORM_COLORS[key] ?? "text-base-content";
                const icon = PLATFORM_ICONS[key] ?? "•";
                return (
                  <a
                    key={key}
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl bg-base-100 border border-base-300 hover:border-primary/40 hover:shadow-md transition-all min-w-[120px]"
                  >
                    <span
                      className={`text-2xl font-bold leading-none ${iconClass}`}
                      aria-hidden="true"
                    >
                      {icon}
                    </span>
                    <span className="text-xs font-mono text-base-content/60">
                      {platform.label}
                    </span>
                    <span className="text-base font-bold text-base-content">
                      {formatCount(platform.count)}
                    </span>
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
