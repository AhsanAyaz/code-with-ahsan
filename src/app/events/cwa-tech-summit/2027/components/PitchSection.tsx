"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Check } from "lucide-react";
import { COMMUNITY_DISCORD_URL, PITCH, SECTION_IDS, type PitchStep } from "../constants";
import KineticHeading from "./KineticHeading";
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  CONTAINER,
  DISPLAY_FONT,
  SECTION_SPACING,
} from "./styles";
import { useReduceMotion } from "./useReduceMotion";

type StepProps = {
  step: PitchStep;
  index: number;
  total: number;
  progress: MotionValue<number>;
  reduce: boolean | null;
};

/** A step's number goes from outline to filled, and heavier, as the line reaches it. */
const RoadStep = ({ step, index, total, progress, reduce }: StepProps) => {
  const at = total > 1 ? index / (total - 1) : 0;
  const fill = useTransform(progress, [Math.max(0, at - 0.12), at], [0, 1]);
  const weight = useTransform(progress, [Math.max(0, at - 0.12), at], [300, 900]);
  const settled = reduce === true;

  return (
    <li className="relative grid grid-cols-[3.5rem_minmax(0,1fr)] gap-4 pb-12 pl-7 last:pb-0 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-6 sm:pl-10">
      <div className="flex justify-start">
        <span
          aria-hidden
          data-step-number
          className={`${DISPLAY_FONT} relative block text-6xl leading-none sm:text-7xl`}
        >
          {/* Outline layer, always there. */}
          <motion.span
            className="block text-transparent"
            style={{
              WebkitTextStroke: "1.5px var(--sm-amber)",
              fontWeight: settled ? 900 : weight,
            }}
          >
            {index + 1}
          </motion.span>
          {/* Filled layer fades in as the progress line arrives. */}
          <motion.span
            className="absolute inset-0 block text-(--sm-amber)"
            style={{ opacity: settled ? 1 : fill, fontWeight: settled ? 900 : weight }}
          >
            {index + 1}
          </motion.span>
        </span>
      </div>
      <div className="pt-1">
        <h3 className={`${DISPLAY_FONT} text-3xl font-bold leading-tight text-(--sm-paper)`}>
          <span className="sr-only">Step {index + 1}: </span>
          {step.title}
        </h3>
        <p className="mt-2 max-w-md leading-relaxed text-(--sm-paper)/80">{step.body}</p>
      </div>
    </li>
  );
};

const PODIUM = [
  { place: "2nd", height: "62%" },
  { place: "1st", height: "100%" },
  { place: "3rd", height: "44%" },
];

const Podium = ({ reduce }: { reduce: boolean | null }) => (
  <div aria-hidden className="flex h-48 items-end gap-3 sm:h-56">
    {PODIUM.map((bar, i) => (
      <motion.div
        key={bar.place}
        className={`flex flex-1 origin-bottom items-start justify-center rounded-t-2xl pt-3 ${
          bar.place === "1st"
            ? "bg-(--sm-amber) text-(--sm-ink)"
            : "bg-(--sm-violet) text-(--sm-paper)"
        }`}
        style={{ height: bar.height }}
        initial={{ scaleY: 0 }}
        animate={reduce === true ? { scaleY: 1 } : undefined}
        whileInView={reduce === false ? { scaleY: 1 } : undefined}
        viewport={{ once: true, amount: 0.6 }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 0.9, delay: [0.15, 0, 0.3][i], ease: [0.22, 1, 0.36, 1] }
        }
      >
        <span className={`${DISPLAY_FONT} text-3xl font-black`}>{bar.place}</span>
      </motion.div>
    ))}
  </div>
);

const LG_QUERY = "(min-width: 1024px)";

/** True at the lg breakpoint and up, where the steps column is sticky. */
const useIsLg = () =>
  useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(LG_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(LG_QUERY).matches,
    () => false
  );

const PitchSection = () => {
  const reduce = useReduceMotion();
  const isLg = useIsLg();
  const gridRef = useRef<HTMLDivElement>(null);
  const roadRef = useRef<HTMLOListElement>(null);
  const [railHeight, setRailHeight] = useState<number | null>(null);

  // lg+: the steps column is pinned while the taller right column scrolls past,
  // so progress follows the whole two-column block. Below lg the steps scroll
  // normally and progress follows the steps list itself.
  const { scrollYProgress: gridProgress } = useScroll({
    target: gridRef,
    offset: ["start 60%", "end 90%"],
  });
  const { scrollYProgress: roadProgress } = useScroll({
    target: roadRef,
    offset: ["start 75%", "end 55%"],
  });
  const progress = isLg ? gridProgress : roadProgress;
  const lineScale = reduce === true ? 1 : progress;

  // The rail runs from step 1 down to the middle of step 4's number, not to
  // the bottom of step 4's text.
  useEffect(() => {
    const road = roadRef.current;
    if (!road) return;
    const measure = () => {
      const last = road.lastElementChild as HTMLElement | null;
      const number = last?.querySelector<HTMLElement>("[data-step-number]");
      if (!last || !number) return;
      setRailHeight(last.offsetTop + number.offsetTop + number.offsetHeight / 2);
    };
    measure();
    // Re-measure once the display font has loaded: it changes the step heights.
    document.fonts?.ready.then(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(road);
    return () => observer.disconnect();
  }, []);

  return (
    <section id={SECTION_IDS.pitch} aria-labelledby="pitch-heading" className={SECTION_SPACING}>
      <div className={CONTAINER}>
        <div className="max-w-3xl">
          <KineticHeading id="pitch-heading" text="The road to the stage" />
          <p className="mt-5 text-lg leading-relaxed text-(--sm-paper)/85">
            Build something worth pitching. Every team submits ahead of time, and the best three
            pitch it live at the summit.
          </p>
        </div>

        <div
          ref={gridRef}
          className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-20"
        >
          <div className="relative self-start lg:sticky lg:top-32">
            {/* Track and the amber progress line that fills with scroll. */}
            <span
              aria-hidden
              className="absolute left-[1px] top-0 w-px bg-(--sm-lilac)/25"
              style={{ height: railHeight ?? "100%" }}
            />
            <motion.span
              aria-hidden
              className="absolute left-0 top-0 w-[3px] origin-top rounded-full bg-(--sm-amber)"
              style={{ height: railHeight ?? "100%", scaleY: lineScale }}
            />
            <ol ref={roadRef} className="relative">
              {PITCH.steps.map((step, index) => (
                <RoadStep
                  key={step.title}
                  step={step}
                  index={index}
                  total={PITCH.steps.length}
                  progress={progress}
                  reduce={reduce}
                />
              ))}
            </ol>
          </div>

          <div className="flex flex-col gap-10">
            <div className="rounded-3xl border border-(--sm-lilac)/20 bg-(--sm-dusk)/70 p-6 sm:p-8">
              <Podium reduce={reduce} />
              <p className="mt-5 leading-relaxed text-(--sm-paper)/85">
                First, second and third are announced on stage at the close of the day.
              </p>
            </div>

            <div>
              <h3 className={`${DISPLAY_FONT} text-3xl font-bold text-(--sm-paper)`}>
                What to submit
              </h3>
              <ul className="mt-4 space-y-3">
                {PITCH.whatToSubmit.map((item) => (
                  <li key={item} className="flex gap-3 leading-relaxed text-(--sm-paper)/85">
                    <Check className="mt-1 h-5 w-5 shrink-0 text-(--sm-amber)" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-(--sm-lilac)">Submissions open</dt>
                  <dd className="mt-1 text-(--sm-paper)">{PITCH.opensLabel}</dd>
                </div>
                <div>
                  <dt className="text-sm text-(--sm-lilac)">Submissions close</dt>
                  <dd className="mt-1 text-(--sm-paper)">{PITCH.closesLabel}</dd>
                </div>
              </dl>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {PITCH.submitUrl ? (
                  <a
                    href={PITCH.submitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={BUTTON_PRIMARY}
                  >
                    Submit your pitch
                  </a>
                ) : (
                  <span className="inline-flex min-h-12 items-center justify-center rounded-full border border-dashed border-(--sm-lilac)/50 px-6 py-3 font-semibold text-(--sm-lilac)">
                    Submissions open soon
                  </span>
                )}
                <a
                  href={COMMUNITY_DISCORD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={BUTTON_SECONDARY}
                >
                  Get notified on Discord
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PitchSection;
