import type { ReactNode } from "react";

const STRIPES =
  "repeating-linear-gradient(135deg, color-mix(in srgb, var(--sm-lilac) 7%, transparent) 0 2px, transparent 2px 14px)";

/**
 * Striped Dusk fill that stands in for a photo until one is added. Fills its
 * parent; the parent sets the size, radius and border.
 */
const PlaceholderTile = ({ children }: { children?: ReactNode }) => (
  <div
    className="flex h-full w-full items-center justify-center bg-(--sm-dusk)"
    style={{ backgroundImage: STRIPES }}
  >
    {children}
  </div>
);

export default PlaceholderTile;
