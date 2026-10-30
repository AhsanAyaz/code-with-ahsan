"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import { socialReach, type SocialPlatform } from "@/data/socialReach";
import { BRAND_ICONS, SOCIAL_ORDER } from "@/data/socialIcons";
import { SECTION_IDS } from "../constants";
import KineticHeading from "./KineticHeading";
import { CONTAINER, DISPLAY_FONT, FOCUS_RING, SECTION_SPACING } from "./styles";
import { useReduceMotion } from "./useReduceMotion";

type SocialData = Record<string, SocialPlatform>;

/** Same shape as the shared CommunityStats reads from /api/stats. */
type StatsResponse = {
  community?: {
    mentors?: number;
    mentees?: number;
    activeMentorships?: number;
    completedMentorships?: number;
    averageRating?: number;
  };
  social?: SocialData;
};

type Count = { key: string; label: string; value: number; decimals: number; suffix: string };

const buildCounts = (data: StatsResponse | null): Count[] => {
  if (!data) return [];
  const c = data.community ?? {};
  const items: Count[] = [
    { key: "mentors", label: "Mentors", value: c.mentors ?? 0, decimals: 0, suffix: "" },
    { key: "mentees", label: "Mentees", value: c.mentees ?? 0, decimals: 0, suffix: "" },
    {
      key: "active",
      label: "Active mentorships",
      value: c.activeMentorships ?? 0,
      decimals: 0,
      suffix: "",
    },
    {
      key: "completed",
      label: "Completed mentorships",
      value: c.completedMentorships ?? 0,
      decimals: 0,
      suffix: "",
    },
    {
      key: "rating",
      label: "Average mentor rating",
      value: c.averageRating ?? 0,
      decimals: 1,
      suffix: " / 5",
    },
    {
      key: "discord",
      label: "Discord members",
      value: data.social?.discord?.count ?? 0,
      decimals: 0,
      suffix: "",
    },
  ];
  // Every count shows whenever the request succeeds, zeros included. A
  // missing or non-numeric value reads as 0.
  return items.map((item) => (Number.isFinite(item.value) ? item : { ...item, value: 0 }));
};

const formatNumber = (value: number, decimals: number) =>
  value.toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

/** 37000 → "37k+", 10500 → "10.5k+" */
const formatCount = (count: number) =>
  count >= 1000 ? `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k+` : `${count}+`;

/** Combined reach, floored to the nearest 10k so the headline never overstates. */
const formatTotal = (data: SocialData) => {
  const sum = Object.values(data).reduce((acc, p) => acc + (p?.count || 0), 0);
  return `${(Math.floor(sum / 10000) * 10000).toLocaleString("en-GB")}+`;
};

/**
 * Counts up from 0 the first time it scrolls into view. Reduced motion (or a
 * preference not known yet) shows the final value straight away.
 */
const CountUp = ({ value, decimals }: { value: number; decimals: number }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReduceMotion();
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (reduce !== false || !inView) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(v),
    });
    return () => controls.stop();
  }, [reduce, inView, value]);

  // Before the count starts (motion on, not yet in view) hold at 0.
  const display = reduce !== false ? value : (shown ?? 0);
  return (
    <span ref={ref} className="tabular-nums">
      {formatNumber(display, decimals)}
    </span>
  );
};

const PlatformIcon = ({ platformKey }: { platformKey: string }) => {
  const icon = BRAND_ICONS[platformKey];
  if (!icon) return null;
  return (
    // colorClass carries each platform's brand colour. Monochrome marks such
    // as GitHub and X use text-base-content, near-white on this dark page.
    <svg
      viewBox={icon.viewBox}
      fill="currentColor"
      className={`h-7 w-7 transition-transform duration-300 motion-safe:group-hover:scale-110 ${icon.colorClass}`}
      aria-hidden="true"
    >
      {icon.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
};

const CommunityNumbersSection = () => {
  // One request feeds both halves. `null` = loading or failed: the counts row
  // stays hidden and the tiles use the static socialReach figures. On success
  // all six counts show, even a 0.
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((res) => (res.ok ? (res.json() as Promise<StatsResponse>) : null))
      .then((data) => {
        if (!cancelled && data) setStats(data);
      })
      .catch(() => {
        /* keep the static fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = buildCounts(stats);
  const social: SocialData = stats?.social ?? socialReach;
  // Discord shows once: in the counts row when it is there, else as a tile.
  const discordInCounts = counts.some((c) => c.key === "discord");
  // Platforms with no count yet ("0+") are left out.
  const keys = SOCIAL_ORDER.filter(
    (k) => (social[k]?.count ?? 0) > 0 && !(discordInCounts && k === "discord")
  );
  const gridCols =
    keys.length % 3 === 0
      ? "grid-cols-3 sm:grid-cols-5 xl:grid-cols-9"
      : "grid-cols-4 xl:grid-cols-8";

  return (
    <section
      id={SECTION_IDS.community}
      aria-labelledby="community-heading"
      className={`${SECTION_SPACING} overflow-hidden`}
    >
      <div className={CONTAINER}>
        <div className="max-w-3xl">
          <KineticHeading id="community-heading" text="The community behind the summit" />
          <p className="mt-5 text-lg leading-relaxed text-(--sm-paper)/85">
            Mentors, mentees and developers who learn, build and ship together with Code with Ahsan.
          </p>
        </div>

        {counts.length > 0 && (
          <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:flex lg:flex-wrap lg:justify-between lg:gap-x-10">
            {counts.map((count, i) => (
              <div key={count.key} className="flex flex-col-reverse gap-2">
                <dt className="text-sm text-(--sm-lilac)">{count.label}</dt>
                <dd
                  className={`${DISPLAY_FONT} text-5xl font-black leading-none sm:text-6xl ${
                    i === 0 ? "text-(--sm-amber)" : "text-(--sm-paper)"
                  }`}
                >
                  <CountUp value={count.value} decimals={count.decimals} />
                  {count.suffix && (
                    <span className="text-2xl font-bold text-(--sm-lilac) sm:text-3xl">
                      {count.suffix}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-16 border-t border-(--sm-lilac)/15 pt-10">
          <p className="max-w-3xl text-lg leading-relaxed text-(--sm-paper)/85">
            <span className={`${DISPLAY_FONT} text-3xl font-black text-(--sm-amber)`}>
              {formatTotal(social)}
            </span>{" "}
            developers follow Code with Ahsan across platforms. Your sponsor posts reach them too.
          </p>

          <ul className={`mt-8 grid gap-3 sm:gap-4 ${gridCols}`}>
            {keys.map((key) => {
              const platform = social[key];
              return (
                <li key={key}>
                  <a
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex h-full flex-col items-center gap-1.5 rounded-2xl border border-(--sm-lilac)/15 px-2 py-4 text-center transition-colors duration-300 hover:border-(--sm-amber)/60 hover:bg-(--sm-dusk)/60 ${FOCUS_RING}`}
                  >
                    <PlatformIcon platformKey={key} />
                    <span className="text-xs text-(--sm-lilac)">{platform.label}</span>
                    <span
                      className={`${DISPLAY_FONT} text-2xl font-extrabold leading-none text-(--sm-paper)`}
                    >
                      {formatCount(platform.count)}
                    </span>
                    {platform.sub && (
                      <span className="text-[11px] text-(--sm-paper)/60">{platform.sub}</span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default CommunityNumbersSection;
