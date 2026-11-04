"use client";

import { motion } from "framer-motion";
import { useReduceMotion } from "./useReduceMotion";

// Fractal noise rendered once as a data URI and tiled: a faint film grain.
const GRAIN_SVG = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`
)}")`;

/**
 * Ink base, two slow-drifting violet/indigo light pools and a faint grain.
 * Fixed behind the page and never interactive. The pools are soft radial
 * gradients moved by transform only (no CSS blur filter), so drifting them
 * stays cheap on the compositor.
 */
const AnimatedBackground = () => {
  const reduce = useReduceMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-(--sm-ink)"
    >
      <motion.div
        className="absolute -left-[25vw] -top-[30vh] h-[100vh] w-[95vw] opacity-40 will-change-transform"
        style={{
          background: "radial-gradient(closest-side, var(--sm-violet), transparent)",
        }}
        animate={
          reduce !== false
            ? undefined
            : { x: ["0vw", "18vw", "4vw", "0vw"], y: ["0vh", "12vh", "28vh", "0vh"] }
        }
        transition={{ duration: 46, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-[35vh] -right-[30vw] h-[110vh] w-[100vw] opacity-90 will-change-transform"
        style={{
          background: "radial-gradient(closest-side, var(--sm-dusk), transparent)",
        }}
        animate={
          reduce !== false
            ? undefined
            : { x: ["0vw", "-16vw", "-6vw", "0vw"], y: ["0vh", "-18vh", "-6vh", "0vh"] }
        }
        transition={{ duration: 58, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{ backgroundImage: GRAIN_SVG, backgroundSize: "180px 180px" }}
      />
    </div>
  );
};

export default AnimatedBackground;
