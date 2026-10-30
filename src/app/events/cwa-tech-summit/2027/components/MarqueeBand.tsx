"use client";

import { Fragment, useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "framer-motion";
import { MARQUEE_ITEMS } from "../constants";
import { DISPLAY_FONT } from "./styles";
import { useReduceMotion } from "./useReduceMotion";

/** Four-point star used between items. */
const Star = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={`h-[0.6em] w-[0.6em] shrink-0 ${className}`}>
    <path
      d="M12 0c.6 6.2 5.8 11.4 12 12-6.2.6-11.4 5.8-12 12-.6-6.2-5.8-11.4-12-12C6.2 11.4 11.4 6.2 12 0Z"
      fill="currentColor"
    />
  </svg>
);

/** Wraps v into [min, max). */
const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

type StripProps = {
  /** Percent of one copy per second; the sign sets direction. */
  baseVelocity: number;
  velocityFactor: MotionValue<number>;
  skew: MotionValue<number>;
  reduce: boolean | null;
  rotate: number;
  className: string;
  starClassName: string;
};

const Strip = ({
  baseVelocity,
  velocityFactor,
  skew,
  reduce,
  rotate,
  className,
  starClassName,
}: StripProps) => {
  const baseX = useMotionValue(0);
  const direction = useRef(1);
  // Two identical halves: wrapping at -50% is seamless.
  const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    if (reduce !== false) return;
    const factor = velocityFactor.get();
    if (factor < 0) direction.current = -1;
    else if (factor > 0) direction.current = 1;
    const step = baseVelocity * (delta / 1000);
    baseX.set(baseX.get() + step * direction.current * (1 + Math.abs(factor)));
  });

  const run = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div
      className={`absolute left-1/2 top-1/2 w-[130vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden py-3 sm:py-4 ${className}`}
      style={{ rotate: `${rotate}deg` }}
    >
      <motion.div
        className="flex w-max whitespace-nowrap"
        style={reduce === false ? { x, skewX: skew } : undefined}
      >
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center" aria-hidden={half === 1}>
            {run.map((item, i) => (
              <Fragment key={`${half}-${i}`}>
                <span
                  className={`${DISPLAY_FONT} px-5 text-3xl font-extrabold uppercase leading-none sm:px-8 sm:text-5xl`}
                >
                  {item}
                </span>
                <Star className={starClassName} />
              </Fragment>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

/**
 * Two crossing strips moving in opposite directions. Base speed is constant;
 * scrolling boosts it and skews the type with the scroll velocity. Reduced
 * motion: two static strips.
 */
const MarqueeBand = () => {
  const reduce = useReduceMotion();
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 4], { clamp: false });
  const skew = useTransform(smoothVelocity, [-2500, 2500], [12, -12]);
  const skewReverse = useTransform(skew, (v) => -v);

  return (
    <section aria-label="At the summit" className="relative h-44 overflow-hidden sm:h-56">
      {/* One readable list for assistive tech; the strips are decorative. */}
      <ul className="sr-only">
        {MARQUEE_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div aria-hidden className="absolute inset-0">
        <Strip
          baseVelocity={2}
          velocityFactor={velocityFactor}
          skew={skewReverse}
          reduce={reduce}
          rotate={1.5}
          className="bg-(--sm-violet) text-(--sm-paper)"
          starClassName="text-(--sm-lilac)"
        />
        <Strip
          baseVelocity={-2.6}
          velocityFactor={velocityFactor}
          skew={skew}
          reduce={reduce}
          rotate={-2}
          className="bg-(--sm-amber) text-(--sm-ink) shadow-[0_18px_50px_-20px_rgba(0,0,0,0.6)]"
          starClassName="text-(--sm-ink)"
        />
      </div>
    </section>
  );
};

export default MarqueeBand;
