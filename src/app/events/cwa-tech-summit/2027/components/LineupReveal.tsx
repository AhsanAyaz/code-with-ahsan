"use client";

import { motion } from "framer-motion";
import { useReduceMotion } from "./useReduceMotion";

type Props = {
  /** Number of placeholder tiles. */
  count?: number;
  copy: string;
};

/**
 * The deliberate "line-up reveal" state for an empty speaker or judge list:
 * portrait silhouette tiles with a slow light sweep, plus honest copy. Reduced motion
 * keeps the tiles and drops the sweep.
 */
const LineupReveal = ({ count = 4, copy }: Props) => {
  const reduce = useReduceMotion();

  return (
    <div>
      <ul
        className={`grid gap-3 sm:gap-5 ${
          count === 3 ? "max-w-3xl grid-cols-3" : "grid-cols-2 lg:grid-cols-4"
        }`}
        aria-hidden
      >
        {Array.from({ length: count }, (_, i) => (
          <li
            key={i}
            className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-(--sm-lilac)/15 bg-(--sm-dusk)"
          >
            <svg
              viewBox="0 0 100 125"
              className="absolute inset-x-0 bottom-0 h-[82%] w-full text-(--sm-lilac)/12"
              preserveAspectRatio="xMidYMax meet"
            >
              <circle cx="50" cy="44" r="19" fill="currentColor" />
              <path d="M12 125c0-24 17-40 38-40s38 16 38 40Z" fill="currentColor" />
            </svg>
            {reduce === false && (
              <motion.span
                className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-(--sm-lilac)/12 to-transparent"
                animate={{ x: ["0%", "400%"] }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  repeatDelay: 1.6,
                  delay: i * 0.35,
                  ease: "easeInOut",
                }}
              />
            )}
            <span className="absolute bottom-4 left-4 right-4 h-2.5 rounded-full bg-(--sm-lilac)/12" />
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-(--sm-paper)/85">{copy}</p>
    </div>
  );
};

export default LineupReveal;
