"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { socialReach, type SocialPlatform } from "@/data/socialReach";
import { BRAND_ICONS, SOCIAL_ORDER } from "@/data/socialIcons";
import { SECTION_IDS } from "../constants";

type SocialData = Record<string, SocialPlatform>;

/** 37000 → "37k+", 10500 → "10.5k+" */
const formatCount = (count: number) =>
  count >= 1000 ? `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k+` : `${count}+`;

/** Combined reach, floored to the nearest 10k so the headline never overstates. */
const formatTotal = (data: SocialData) => {
  const sum = Object.values(data).reduce((acc, p) => acc + (p?.count || 0), 0);
  return `${(Math.floor(sum / 10000) * 10000).toLocaleString()}+`;
};

const PlatformIcon = ({ platformKey }: { platformKey: string }) => {
  const icon = BRAND_ICONS[platformKey];
  if (!icon) return null;
  return (
    // colorClass carries each platform's brand colour (YouTube red, Facebook
    // blue, …). Monochrome marks such as GitHub and X use text-base-content,
    // which resolves to near-white on this dark section.
    <svg
      viewBox={icon.viewBox}
      fill="currentColor"
      className={`h-8 w-8 transition-transform duration-300 group-hover:scale-110 ${icon.colorClass}`}
      aria-hidden="true"
    >
      {icon.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
};

const SocialReachSection = () => {
  // Render from the static source immediately, then swap in live counts when
  // /api/stats resolves. A failed fetch simply leaves the fallback in place.
  const [social, setSocial] = useState<SocialData>(socialReach);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.social) setSocial(data.social as SocialData);
      })
      .catch(() => {
        /* keep the static fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const keys = SOCIAL_ORDER.filter((k) => k in social);

  return (
    <section id={SECTION_IDS.social} className="relative overflow-hidden py-16 sm:py-24">
      <div className="container relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-primary sm:text-3xl md:text-4xl">
              Follow the Community
            </h2>
          </div>
          <p className="mx-auto max-w-2xl text-sm text-base-content/70 sm:text-base">
            <span className="font-bold text-base-content">{formatTotal(social)}</span> developers
            follow Code With Ahsan across platforms. Come build with us.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          {keys.map((key, index) => {
            const platform = social[key];
            return (
              <motion.a
                key={key}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.3, delay: (index % 4) * 0.05 }}
                whileHover={{ y: -4 }}
                className="group flex min-w-[120px] flex-col items-center gap-1.5 rounded-2xl border border-primary/15 bg-base-200 px-5 py-4 text-center shadow-[0_0_16px_rgba(143,39,224,0.08)] transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_28px_rgba(143,39,224,0.22)]"
              >
                <PlatformIcon platformKey={key} />
                <span className="font-mono text-[11px] uppercase tracking-wider text-base-content/50">
                  {platform.label}
                </span>
                <span className="text-lg font-bold text-base-content">
                  {formatCount(platform.count)}
                </span>
                {platform.sub && (
                  <span className="text-[10px] text-base-content/40">{platform.sub}</span>
                )}
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SocialReachSection;
