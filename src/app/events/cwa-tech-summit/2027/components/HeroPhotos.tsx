"use client";

import Image from "next/image";
import { motion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { HERO_PHOTOS, type HeroPhoto } from "../constants";
import PlaceholderTile from "./PlaceholderTile";

/** Shared frame look. Position (absolute or relative) is set per use. */
const FRAME =
  "overflow-hidden rounded-2xl border border-(--sm-lilac)/30 bg-(--sm-dusk) shadow-[0_24px_60px_-28px_rgba(0,0,0,0.8)]";

/**
 * Cluster layout (lg+), as percentages of the cluster box. Mixed portrait and
 * landscape, each slightly rotated, overlapping a little. `depth` is how many
 * px the frame travels at the pointer's far edge: different per frame, so the
 * stack separates as the pointer moves.
 */
const CLUSTER = [
  { pos: "left-0 top-[8%] w-[60%] aspect-[4/3]", rotate: -5, depth: 10, z: "z-10" },
  { pos: "right-[1%] top-0 w-[42%] aspect-[3/4]", rotate: 4, depth: 18, z: "z-20" },
  { pos: "left-[6%] bottom-0 w-[38%] aspect-[3/4]", rotate: 3, depth: 26, z: "z-30" },
  { pos: "right-[2%] bottom-[7%] w-[54%] aspect-[4/3]", rotate: -3, depth: 14, z: "z-20" },
] as const;

/** Below lg: a short row of three, landscape / portrait / landscape. */
const ROW = [
  { flex: "flex-[4]", rotate: -2 },
  { flex: "flex-[3]", rotate: 2 },
  { flex: "flex-[4]", rotate: -1 },
] as const;

const FrameContent = ({ photo, sizes }: { photo: HeroPhoto | undefined; sizes: string }) =>
  photo ? (
    <Image
      src={photo.src}
      alt={photo.alt}
      fill
      unoptimized
      sizes={sizes}
      className="object-cover"
    />
  ) : (
    <PlaceholderTile />
  );

const SPRING = { stiffness: 110, damping: 18, mass: 0.6 };

type Pointer = { x: MotionValue<number>; y: MotionValue<number> };

const ClusterFrame = ({ index, pointer }: { index: number; pointer: Pointer }) => {
  const frame = CLUSTER[index];
  const springX = useSpring(pointer.x, SPRING);
  const springY = useSpring(pointer.y, SPRING);
  // Frames drift against the pointer, nearer frames (larger depth) further.
  const x = useTransform(springX, (v) => -v * frame.depth);
  const y = useTransform(springY, (v) => -v * frame.depth);

  return (
    <motion.div
      className={`absolute ${frame.pos} ${frame.z} ${FRAME}`}
      style={{ x, y, rotate: frame.rotate }}
    >
      <FrameContent photo={HERO_PHOTOS[index]} sizes="(min-width: 1024px) 240px, 0px" />
    </motion.div>
  );
};

/**
 * lg+: the photo cluster beside the hero copy. Absolutely positioned at the
 * bottom of its (relative) column, so it takes no part in the hero's height.
 * `pointer` holds the pointer position normalised to -1..1; it stays at 0
 * (frames still) for reduced motion and touch, since the hero only feeds it
 * from a mouse.
 */
export const HeroPhotoCluster = ({ pointer }: { pointer: Pointer }) => {
  const hasPhotos = HERO_PHOTOS.length > 0;
  return (
    <div
      className="absolute bottom-0 right-0 hidden aspect-[24/25] w-full max-w-sm lg:block"
      aria-hidden={hasPhotos ? undefined : true}
    >
      {CLUSTER.map((_, i) => (
        <ClusterFrame key={i} index={i} pointer={pointer} />
      ))}
    </div>
  );
};

/** Below lg: three small frames under the CTAs. */
export const HeroPhotoRow = () => {
  const hasPhotos = HERO_PHOTOS.length > 0;
  return (
    <div
      className="mt-10 flex h-28 gap-3 sm:h-40 sm:gap-4 lg:hidden"
      aria-hidden={hasPhotos ? undefined : true}
    >
      {ROW.map((frame, i) => (
        <div
          key={i}
          className={`relative min-w-0 ${frame.flex} ${FRAME}`}
          style={{ transform: `rotate(${frame.rotate}deg)` }}
        >
          <FrameContent photo={HERO_PHOTOS[i]} sizes="(min-width: 640px) 240px, 140px" />
        </div>
      ))}
    </div>
  );
};
