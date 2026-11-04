"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  type MouseEvent,
  type PointerEvent,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Calendar, Clock, MapPin } from "lucide-react";
import { COMMUNITY_DISCORD_URL, EVENT, SECTION_IDS, VENUE } from "../constants";
import { HeroPhotoCluster, HeroPhotoRow } from "./HeroPhotos";
import MagneticLink from "./MagneticLink";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, CONTAINER, DISPLAY_FONT } from "./styles";
import { useFinePointer, useReduceMotion } from "./useReduceMotion";

const EASE = [0.22, 1, 0.36, 1] as const;
const START_DELAY = 0.15;
const LETTER_STAGGER = 0.06;
const SWEEP_DURATION = 1.5;
const SETTLED_WEIGHT = 800;
/** Pointer influence radius in px; letters beyond it ease toward 500. */
const POINTER_RADIUS = 420;

type LetterHandle = {
  el: HTMLSpanElement;
  target: MotionValue<number>;
};

type LetterProps = {
  char: string;
  index: number;
  reduce: boolean | null;
  armed: MotionValue<number>;
  register: (index: number, handle: LetterHandle | null) => void;
};

/**
 * One wordmark letter. Two weight sources: the load sequence (rise + sweep
 * 100 → 900 → 800), then, once armed, a spring that follows the pointer.
 */
const WordmarkLetter = ({ char, index, reduce, armed, register }: LetterProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const rise = useMotionValue(105);
  const loadWeight = useMotionValue(100);
  const target = useMotionValue(SETTLED_WEIGHT);
  const pointerWeight = useSpring(target, { stiffness: 170, damping: 24, mass: 0.6 });

  const fontWeight = useTransform(
    [loadWeight, pointerWeight, armed] as MotionValue<number>[],
    ([load, pointer, isArmed]: number[]) => Math.round(isArmed ? pointer : load)
  );
  const y = useTransform(rise, (v) => `${v}%`);

  useEffect(() => {
    if (ref.current) register(index, { el: ref.current, target });
    return () => register(index, null);
  }, [index, register, target]);

  useEffect(() => {
    if (reduce === null) return;
    if (reduce) {
      rise.set(0);
      loadWeight.set(SETTLED_WEIGHT);
      return;
    }
    const delay = START_DELAY + index * LETTER_STAGGER;
    const riseAnim = animate(rise, 0, { delay, duration: 0.9, ease: EASE });
    const sweepAnim = animate(loadWeight, [100, 900, SETTLED_WEIGHT], {
      delay,
      duration: SWEEP_DURATION,
      times: [0, 0.55, 1],
      ease: "easeInOut",
    });
    return () => {
      riseAnim.stop();
      sweepAnim.stop();
    };
  }, [reduce, index, rise, loadWeight]);

  return (
    <span className="inline-block overflow-hidden align-bottom leading-[0.86]">
      <motion.span ref={ref} className="inline-block" style={{ y, fontWeight }}>
        {char}
      </motion.span>
    </span>
  );
};

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReduceMotion();
  const finePointer = useFinePointer();
  const interactive = reduce === false && finePointer;

  const letters = useRef<(LetterHandle | null)[]>([]);
  const centres = useRef<{ x: number; y: number }[]>([]);
  const frame = useRef<number | null>(null);
  const armed = useMotionValue(0);
  // Pointer position normalised to -1..1 across the viewport, for the photo
  // cluster's parallax. Only ever set from a mouse with motion allowed.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const words = EVENT.wordmark.split(" ");
  const letterCount = words.join("").length;
  const wordOffsets = words.map((_, w) => words.slice(0, w).join("").length);

  const register = useCallback((index: number, handle: LetterHandle | null) => {
    letters.current[index] = handle;
  }, []);

  // Pointer weight only switches on after the load sequence has finished.
  useEffect(() => {
    if (!interactive) {
      armed.set(0);
      return;
    }
    const total = (START_DELAY + letterCount * LETTER_STAGGER + SWEEP_DURATION) * 1000;
    const timer = window.setTimeout(() => armed.set(1), total);
    return () => window.clearTimeout(timer);
  }, [interactive, armed, letterCount]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    []
  );

  // Letter centres in page coordinates, measured on entry rather than on every
  // move so the width change from the weight shift cannot feed back into it.
  const measure = () => {
    centres.current = letters.current.map((handle) => {
      if (!handle) return { x: -1e5, y: -1e5 };
      const rect = handle.el.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 + window.scrollX,
        y: rect.top + rect.height / 2 + window.scrollY,
      };
    });
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!interactive || event.pointerType !== "mouse") return;
    pointerX.set((event.clientX / window.innerWidth) * 2 - 1);
    pointerY.set((event.clientY / window.innerHeight) * 2 - 1);
    if (armed.get() !== 1) return;
    if (centres.current.length === 0) measure();
    const px = event.pageX;
    const py = event.pageY;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      letters.current.forEach((handle, i) => {
        const centre = centres.current[i];
        if (!handle || !centre) return;
        const distance = Math.hypot(centre.x - px, (centre.y - py) * 1.4);
        const t = Math.max(0, 1 - distance / POINTER_RADIUS);
        const eased = t * t * (3 - 2 * t);
        handle.target.set(500 + 400 * eased);
      });
    });
  };

  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    letters.current.forEach((handle) => handle?.target.set(SETTLED_WEIGHT));
  };

  // "2027" slides sideways as the hero scrolls away.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const yearX = useTransform(scrollYProgress, [0, 1], ["0%", "45%"]);

  const scrollToTiers = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(SECTION_IDS.sponsorshipTiers);
    if (!target) return;
    event.preventDefault();
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
  }, []);

  const venueLabel = VENUE.name
    ? `${VENUE.name}, ${VENUE.city}`
    : `${VENUE.city}, venue announced soon`;

  return (
    <section
      ref={sectionRef}
      onPointerEnter={interactive ? measure : undefined}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerLeave={interactive ? handlePointerLeave : undefined}
      className="relative overflow-hidden pb-16 pt-12 sm:pb-24 sm:pt-20"
    >
      <div className={CONTAINER}>
        <p className="text-base text-(--sm-lilac) sm:text-lg">{EVENT.presenter}</p>

        {/* The h1 is a size container so the wordmark can be sized against the
            content column (cqw) rather than the viewport, which would also
            count the scrollbar and the side gutters. */}
        <h1 className={`${DISPLAY_FONT} @container mt-2 text-(--sm-paper)`}>
          <span className="sr-only">{EVENT.name}</span>
          <span
            aria-hidden
            // Below lg: 18vw (fills a phone width). lg+: "TECH SUMMIT" at its
            // settled weight is ~4.79em wide, so 100cqw / 4.82 fills the
            // column to its right edge without overflowing.
            className="block text-[length:clamp(4rem,18vw,11rem)] uppercase leading-[0.86] tracking-[-0.01em] lg:text-[length:20.7cqw]"
          >
            {words.map((word, w) => (
              <Fragment key={word}>
                <span className="inline-block whitespace-nowrap">
                  {word.split("").map((char, c) => {
                    const i = wordOffsets[w] + c;
                    return (
                      <WordmarkLetter
                        key={`${char}-${i}`}
                        char={char}
                        index={i}
                        reduce={reduce}
                        armed={armed}
                        register={register}
                      />
                    );
                  })}
                </span>
                {w < words.length - 1 ? " " : null}
              </Fragment>
            ))}
          </span>
        </h1>

        <motion.div
          aria-hidden
          className={`${DISPLAY_FONT} -mt-1 select-none leading-none text-transparent sm:-mt-2`}
          style={{
            fontSize: "clamp(3.75rem, 16vw, 9.5rem)",
            fontWeight: 800,
            WebkitTextStroke: "2px var(--sm-amber)",
            x: reduce === false ? yearX : 0,
          }}
        >
          {EVENT.year}
        </motion.div>

        {/* lg+: copy on the left, the photo cluster in the space to its right.
            The cluster is absolutely positioned in its column (anchored to the
            bottom of the copy and rising into the empty space beside "2027"),
            so it never sets the row height or pushes the copy down. */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:gap-16">
          <div>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-(--sm-paper)/90 sm:text-xl">
              {EVENT.intro}
            </p>

            <ul className="mt-8 flex flex-col gap-3 text-base text-(--sm-paper) sm:flex-row sm:flex-wrap sm:gap-x-8">
              <li className="flex items-center gap-2.5">
                <Calendar className="h-5 w-5 shrink-0 text-(--sm-amber)" aria-hidden />
                {EVENT.dateLabel}
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="h-5 w-5 shrink-0 text-(--sm-amber)" aria-hidden />
                {EVENT.timeLabel}
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="h-5 w-5 shrink-0 text-(--sm-amber)" aria-hidden />
                {venueLabel}
              </li>
            </ul>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <MagneticLink
                href={`#${SECTION_IDS.sponsorshipTiers}`}
                onClick={scrollToTiers}
                className={BUTTON_PRIMARY}
              >
                Become a sponsor
              </MagneticLink>
              <MagneticLink href={COMMUNITY_DISCORD_URL} external className={BUTTON_SECONDARY}>
                Join the Discord
              </MagneticLink>
            </div>
            <HeroPhotoRow />
          </div>
          <div className="relative hidden lg:block">
            <HeroPhotoCluster pointer={{ x: pointerX, y: pointerY }} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
