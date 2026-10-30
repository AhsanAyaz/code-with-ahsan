// Shared class strings. Kept as literals so Tailwind picks them up.

/** Visible keyboard focus for every interactive element on the page. */
export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--sm-amber) focus-visible:outline-solid";

export const DISPLAY_FONT = "font-(family-name:--font-summit)";

export const SECTION_SPACING = "relative py-20 sm:py-28";

export const CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export const BUTTON_PRIMARY = `inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-(--sm-violet) px-6 py-3 text-base font-semibold text-(--sm-paper) shadow-[0_10px_40px_-12px_var(--sm-violet)] transition-colors hover:bg-(--sm-violet)/85 ${FOCUS_RING}`;

export const BUTTON_SECONDARY = `inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-(--sm-lilac)/50 px-6 py-3 text-base font-semibold text-(--sm-paper) transition-colors hover:border-(--sm-lilac) hover:bg-(--sm-lilac)/10 ${FOCUS_RING}`;
