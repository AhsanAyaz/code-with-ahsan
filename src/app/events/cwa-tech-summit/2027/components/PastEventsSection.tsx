"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Camera, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { PAST_EVENTS, PAST_EVENTS_INTRO, SECTION_IDS, type PastEvent } from "../constants";
import KineticHeading from "./KineticHeading";
import PhotoLightbox from "./PhotoLightbox";
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

/** Placeholder tiles per strip when an event has no photos yet. */
const PLACEHOLDER_COUNT = TILE_WIDTHS.length * 2;

/** Left inset matching the content column, used as padding and snap offset. */
const STRIP_INSET = "pl-4 sm:pl-6 lg:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]";
const STRIP_SNAP_INSET =
  "scroll-pl-4 sm:scroll-pl-6 lg:scroll-pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]";
const TILE_BASE =
  "relative h-48 shrink-0 overflow-hidden rounded-2xl border border-(--sm-lilac)/15 sm:h-64";
const STRIP_BUTTON = `inline-flex h-11 w-11 items-center justify-center rounded-full border border-(--sm-lilac)/40 text-(--sm-paper) transition-colors hover:border-(--sm-lilac) hover:bg-(--sm-lilac)/10 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-(--sm-lilac)/40 disabled:hover:bg-transparent ${FOCUS_RING}`;

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
 * One event: header block, then a horizontally scrollable photo strip (wheel,
 * trackpad, swipe, keyboard, or the arrow buttons) that snaps per photo.
 * Each photo opens in a lightbox with the rest of that event's photos.
 */
const PastEventBlock = ({ event }: { event: PastEvent }) => {
  const reduce = useReduceMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const hasPhotos = event.photos.length > 0;
  const photoCount = event.photos.length;
  const headingId = `past-${event.key}`;

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateEdges]);

  const scrollStrip = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * el.clientWidth * 0.8,
      behavior: reduce === false ? "smooth" : "auto",
    });
  };

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

      {hasPhotos ? (
        <>
          <div
            ref={scrollerRef}
            onScroll={updateEdges}
            className={`mt-8 snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-3 [scrollbar-color:var(--sm-lilac)_transparent] [scrollbar-width:thin] ${STRIP_SNAP_INSET}`}
          >
            <ul
              aria-label={`Photos from ${event.name}`}
              className={`flex w-max gap-3 py-2 pr-4 sm:gap-4 sm:pr-6 ${STRIP_INSET}`}
            >
              {event.photos.map((photo, i) => (
                <li key={photo.src} className="snap-start">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(i)}
                    aria-label={`Open photo ${i + 1} of ${photoCount}: ${photo.alt}`}
                    className={`${TILE_BASE} block cursor-zoom-in ${TILE_WIDTHS[i % TILE_WIDTHS.length]} ${FOCUS_RING}`}
                  >
                    <Image
                      src={photo.src}
                      alt=""
                      fill
                      unoptimized
                      sizes="(min-width: 640px) 384px, 256px"
                      className={`object-cover ${reduce === false ? "transition-transform duration-500 hover:scale-105" : ""}`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className={`${CONTAINER} mt-3 flex justify-end gap-3`}>
            <button
              type="button"
              onClick={() => scrollStrip(-1)}
              disabled={atStart}
              aria-label={`Scroll ${event.name} photos back`}
              className={STRIP_BUTTON}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => scrollStrip(1)}
              disabled={atEnd}
              aria-label={`Scroll ${event.name} photos forward`}
              className={STRIP_BUTTON}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <PhotoLightbox
            title={event.name}
            photos={event.photos}
            index={openIndex}
            onIndexChange={setOpenIndex}
            onClose={() => setOpenIndex(null)}
          />
        </>
      ) : (
        <>
          <div className="mt-8 overflow-hidden" aria-hidden>
            <ul className={`flex h-48 w-max gap-3 sm:h-64 sm:gap-4 ${STRIP_INSET}`}>
              {Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
                <li key={i} className={`${TILE_BASE} ${TILE_WIDTHS[i % TILE_WIDTHS.length]}`}>
                  <PastEventPlaceholder event={event} index={i} />
                </li>
              ))}
            </ul>
          </div>
          <p className={`${CONTAINER} mt-3 text-sm text-(--sm-lilac)`}>Photos coming soon</p>
        </>
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
      {PAST_EVENTS.map((event) => (
        <PastEventBlock key={event.key} event={event} />
      ))}
    </section>
  );
};

export default PastEventsSection;
