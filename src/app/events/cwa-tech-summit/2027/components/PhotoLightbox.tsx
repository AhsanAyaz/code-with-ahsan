"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PastEventPhoto } from "../constants";
import { FOCUS_RING } from "./styles";

const NAV_BUTTON = `inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-(--sm-lilac)/40 bg-(--sm-dusk)/90 text-(--sm-paper) transition-colors hover:border-(--sm-lilac) hover:bg-(--sm-lilac)/15 ${FOCUS_RING}`;

type Props = {
  /** Event name, used for the dialog's accessible name. */
  title: string;
  photos: PastEventPhoto[];
  /** Index of the photo on show, or null when closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

/**
 * Full-screen photo viewer on a native modal <dialog>: the browser traps
 * focus inside it and Escape closes it. Arrow keys step through the event's
 * photos, a click on the backdrop closes, and page scroll is locked while open.
 * Focus goes back to whatever opened it (the clicked photo) on close.
 */
const PhotoLightbox = ({ title, photos, index, onIndexChange, onClose }: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = index !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [open]);

  const count = photos.length;
  const step = (delta: number) => {
    if (index === null || count === 0) return;
    onIndexChange((index + delta + count) % count);
  };

  const photo = index === null ? null : photos[index];

  return (
    <dialog
      ref={dialogRef}
      aria-label={`${title} photos`}
      // Escape fires "cancel"; let the parent close so state stays the source of truth.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Clicks on the dialog element itself (not its content) are backdrop clicks.
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          step(1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          step(-1);
        }
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-(--sm-paper) backdrop:bg-(--sm-ink)/90"
    >
      {photo && (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-4 p-4 sm:p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="flex w-full max-w-6xl items-center justify-between gap-4">
            <p className="text-sm text-(--sm-lilac)" aria-live="polite">
              {(index ?? 0) + 1} of {count}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close photo viewer"
              className={NAV_BUTTON}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <figure className="flex min-h-0 w-full max-w-6xl flex-1 flex-col items-center gap-3">
            {/* Plain img: next/image `fill` needs a sized box, and object-contain
                must letterbox any aspect ratio here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              alt={photo.alt}
              className="min-h-0 w-full flex-1 rounded-2xl object-contain"
            />
            <figcaption className="max-w-3xl text-center text-sm leading-relaxed text-(--sm-paper)/85 sm:text-base">
              {photo.alt}
            </figcaption>
          </figure>
          {count > 1 && (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className={NAV_BUTTON}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photo"
                className={NAV_BUTTON}
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
};

export default PhotoLightbox;
