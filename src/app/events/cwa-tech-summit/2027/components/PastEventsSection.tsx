"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Calendar, Camera, MapPin } from "lucide-react";
import { PAST_EVENTS, PAST_EVENTS_INTRO, SECTION_IDS, type PastEvent } from "../constants";
import KineticHeading from "./KineticHeading";
import PlaceholderTile from "./PlaceholderTile";
import { CONTAINER, DISPLAY_FONT, FOCUS_RING, SECTION_SPACING } from "./styles";
import { useReduceMotion } from "./useReduceMotion";

/** Tile widths for a landscape/portrait mix; heights are shared per strip. */
const TILE_WIDTHS = [
  "w-64 sm:w-96",
  "w-40 sm:w-56",
  "w-56 sm:w-80",
  "w-44 sm:w-60",
  "w-64 sm:w-96",
  "w-40 sm:w-56",
];

/** Tiles per strip: the 6 widths above, twice. */
const TILE_COUNT = TILE_WIDTHS.length * 2;
/** Horizontal drift range in px across the strip's pass through the viewport. */
const DRIFT = 240;

/** Placeholder content alternates between the event's mark and a camera. */
const PastEventPlaceholder = ({ event, index }: { event: PastEvent; index: number }) => (
  <PlaceholderTile>
    {index % 2 === 0 ? (
      <span
        className={`${DISPLAY_FONT} text-5xl font-black text-(--sm-lilac)/25 sm:text-6xl`}
        aria-hidden
      >
        {event.mark}
      </span>
    ) : (
      <Camera className="h-8 w-8 text-(--sm-lilac)/25" aria-hidden />
    )}
  </PlaceholderTile>
);

/**
 * One event: header block, then a photo strip that drifts sideways as it
 * scrolls past. `direction` alternates per event so neighbouring strips move
 * against each other. Reduced motion keeps the strip still.
 */
const PastEventBlock = ({ event, direction }: { event: PastEvent; direction: 1 | -1 }) => {
  const reduce = useReduceMotion();
  const stripRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: stripRef,
    offset: ["start end", "end start"],
  });
  // Drift in px, not %, so the edges are predictable: with motion on, the
  // strip starts 40px past the left edge (-ml-10) and slides between 0 and
  // -DRIFT. Twelve tiles (at least 2,600px wide even at phone sizes) keep the
  // right end well past a 1920px viewport at the far end of the drift.
  const x = useTransform(scrollYProgress, [0, 1], direction === 1 ? [-DRIFT, 0] : [0, -DRIFT]);
  const moving = reduce === false;

  const hasPhotos = event.photos.length > 0;
  // Repeat the 6 photos (or placeholders) to fill the strip.
  const tiles = Array.from({ length: TILE_COUNT }, (_, i) =>
    hasPhotos ? event.photos[i % event.photos.length] : null
  );
  const headingId = `past-${event.key}`;

  return (
    <article aria-labelledby={headingId} className="mt-16 first:mt-0">
      <div
        className={`${CONTAINER} grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16`}
      >
        <div>
          <h3
            id={headingId}
            className={`${DISPLAY_FONT} text-4xl font-extrabold leading-none text-(--sm-paper) sm:text-5xl`}
          >
            {event.name}
          </h3>
          <ul className="mt-4 flex flex-col gap-2 text-(--sm-paper)/85 sm:flex-row sm:flex-wrap sm:gap-x-6">
            <li className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-(--sm-amber)" aria-hidden />
              {event.date}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-(--sm-amber)" aria-hidden />
              {event.where}
            </li>
          </ul>
        </div>
        <div>
          <p className="text-lg leading-relaxed text-(--sm-paper)/85">{event.summary}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            {event.stat && (
              <p className={`${DISPLAY_FONT} text-3xl font-black text-(--sm-amber)`}>
                {event.stat}
              </p>
            )}
            <Link
              href={event.url}
              className={`font-semibold text-(--sm-paper) underline decoration-(--sm-lilac)/50 underline-offset-4 hover:decoration-(--sm-amber) ${FOCUS_RING}`}
            >
              See the event page
            </Link>
          </div>
        </div>
      </div>

      <div ref={stripRef} className="mt-8 overflow-hidden">
        <motion.ul
          className={`flex h-48 w-max gap-3 sm:h-64 sm:gap-4 ${
            moving
              ? "-ml-10"
              : // Static: start flush with the content column's left edge.
                "pl-4 sm:pl-6 lg:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]"
          }`}
          style={moving ? { x } : undefined}
          aria-label={hasPhotos ? `Photos from ${event.name}` : undefined}
          aria-hidden={hasPhotos ? undefined : true}
        >
          {tiles.map((photo, i) => (
            <li
              key={i}
              // Repeats are decorative; only the first run of photos is announced.
              aria-hidden={photo && i >= event.photos.length ? true : undefined}
              className={`relative h-full shrink-0 overflow-hidden rounded-2xl border border-(--sm-lilac)/15 ${TILE_WIDTHS[i % TILE_WIDTHS.length]}`}
            >
              {photo ? (
                <Image
                  src={photo.src}
                  alt={i < event.photos.length ? photo.alt : ""}
                  fill
                  unoptimized
                  sizes="(min-width: 640px) 384px, 256px"
                  className="object-cover"
                />
              ) : (
                <PastEventPlaceholder event={event} index={i} />
              )}
            </li>
          ))}
        </motion.ul>
      </div>
      {!hasPhotos && (
        <p className={`${CONTAINER} mt-3 text-sm text-(--sm-lilac)`}>Photos coming soon</p>
      )}
    </article>
  );
};

const PastEventsSection = () => {
  return (
    <section
      id={SECTION_IDS.pastEvents}
      aria-labelledby="past-events-heading"
      className={`${SECTION_SPACING} overflow-hidden`}
    >
      <div className={`${CONTAINER} mb-12`}>
        <div className="max-w-3xl">
          <KineticHeading id="past-events-heading" text="Glimpses from past events" />
          <p className="mt-5 text-lg leading-relaxed text-(--sm-paper)/85">{PAST_EVENTS_INTRO}</p>
        </div>
      </div>
      {PAST_EVENTS.map((event, i) => (
        <PastEventBlock key={event.key} event={event} direction={i % 2 === 0 ? 1 : -1} />
      ))}
    </section>
  );
};

export default PastEventsSection;
